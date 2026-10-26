//! Persist only changed rows, preserving snapshot order and the public backup format.
use crate::domain::*;
use rusqlite::{params, Connection, Transaction};
use serde::Serialize;
use std::{collections::HashMap, hash::Hash};

struct Change<'a, T> {
    row: &'a T,
    existing: bool,
    append: bool,
}
struct Changes<'a, T> {
    removed: Vec<&'a T>,
    writes: Vec<Change<'a, T>>,
}
fn changes<'a, T: PartialEq, K: Eq + Hash>(
    before: &'a [T],
    after: &'a [T],
    key: impl Fn(&T) -> K,
) -> Changes<'a, T> {
    let mut previous: HashMap<_, _> = before
        .iter()
        .enumerate()
        .map(|(rank, row)| (key(row), (rank, row)))
        .collect();
    let mut writes = Vec::new();
    let mut last_rank = None;
    let mut tail = false;
    for row in after {
        if let Some((rank, old)) = previous.remove(&key(row)) {
            // Keep rowids unless an entity moves after a later or newly appended row.
            let append = tail || last_rank.is_some_and(|last| rank < last);
            if append {
                tail = true;
            } else {
                last_rank = Some(rank);
            }
            if append || old != row {
                writes.push(Change {
                    row,
                    existing: true,
                    append,
                });
            }
        } else {
            tail = true;
            writes.push(Change {
                row,
                existing: false,
                append: true,
            });
        }
    }
    Changes {
        removed: previous.into_values().map(|(_, row)| row).collect(),
        writes,
    }
}

pub(super) fn read(conn: &Connection) -> Result<Snapshot> {
    fn rows<T: serde::de::DeserializeOwned>(conn: &Connection, table: &str) -> Result<Vec<T>> {
        let mut statement = conn.prepare(&format!("SELECT data FROM {table} ORDER BY rowid"))?;
        let rows = statement.query_map([], |r| r.get::<_, String>(0))?;
        rows.map(|row| Ok(serde_json::from_str(&row?)?)).collect()
    }
    Ok(Snapshot {
        version: 1,
        profiles: rows(conn, "profiles")?,
        observations: rows(conn, "observations")?,
        habit_days: rows(conn, "habit_days")?,
        batches: rows(conn, "batches")?,
        scenarios: rows(conn, "scenarios")?,
        runs: rows(conn, "runs")?,
        settings: rows(conn, "settings")?
            .into_iter()
            .next()
            .unwrap_or_default(),
    })
}

// Table names are internal constants, never imported data or IPC arguments.
fn owned_rows<T: PartialEq + Serialize>(
    tx: &Transaction<'_>,
    table: &str,
    before: &[T],
    after: &[T],
    id: fn(&T) -> &str,
    profile: fn(&T) -> &str,
) -> Result<()> {
    let delta = changes(before, after, |row| id(row).to_owned());
    let mut delete = tx.prepare_cached(&format!("DELETE FROM {table} WHERE id=?1"))?;
    for row in delta.removed {
        delete.execute([id(row)])?;
    }
    let mut write = tx.prepare_cached(&format!("INSERT INTO {table}(id,profile_id,data) VALUES(?1,?2,?3) ON CONFLICT(id) DO UPDATE SET profile_id=excluded.profile_id,data=excluded.data,rowid=CASE WHEN ?4 THEN (SELECT COALESCE(MAX(rowid),0)+1 FROM {table}) ELSE {table}.rowid END"))?;
    for change in delta.writes {
        write.execute(params![
            id(change.row),
            profile(change.row),
            serde_json::to_string(change.row)?,
            change.append
        ])?;
    }
    Ok(())
}

pub(super) fn write(tx: &Transaction<'_>, before: &Snapshot, after: &Snapshot) -> Result<()> {
    let profiles = changes(&before.profiles, &after.profiles, |p| p.id.clone());
    {
        let mut write = tx.prepare_cached("INSERT INTO profiles(id,data) VALUES(?1,?2) ON CONFLICT(id) DO UPDATE SET data=excluded.data,rowid=CASE WHEN ?3 THEN (SELECT COALESCE(MAX(rowid),0)+1 FROM profiles) ELSE profiles.rowid END")?;
        for change in profiles.writes {
            write.execute(params![
                change.row.id,
                serde_json::to_string(change.row)?,
                change.append
            ])?;
        }
    }
    let observations = changes(&before.observations, &after.observations, |o| o.id.clone());
    if !observations.removed.is_empty() || !observations.writes.is_empty() {
        let mut max_rowid: i64 =
            tx.query_row("SELECT COALESCE(MAX(rowid),0) FROM observations", [], |r| {
                r.get(0)
            })?;
        let mut lookup = tx.prepare_cached("SELECT rowid FROM observations WHERE id=?1")?;
        let mut rowids = Vec::with_capacity(observations.writes.len());
        for change in &observations.writes {
            rowids.push(if change.existing && !change.append {
                lookup.query_row([&change.row.id], |r| r.get::<_, i64>(0))?
            } else {
                max_rowid += 1;
                max_rowid
            });
        }
        // Release changed unique keys together so valid key swaps remain atomic.
        let mut delete = tx.prepare_cached("DELETE FROM observations WHERE id=?1")?;
        for row in observations.removed {
            delete.execute([&row.id])?;
        }
        for change in &observations.writes {
            if change.existing {
                delete.execute([&change.row.id])?;
            }
        }
        let mut write = tx.prepare_cached("INSERT INTO observations(rowid,id,profile_id,date,metric,at,data) VALUES(?1,?2,?3,?4,?5,?6,?7)")?;
        for (change, rowid) in observations.writes.iter().zip(rowids) {
            let o = change.row;
            write.execute(params![
                rowid,
                o.id,
                o.profile_id,
                o.date,
                o.metric,
                observation_key(o),
                serde_json::to_string(o)?
            ])?;
        }
    }
    let days = changes(&before.habit_days, &after.habit_days, |d| {
        (d.profile_id.clone(), d.date.clone())
    });
    {
        let mut delete =
            tx.prepare_cached("DELETE FROM habit_days WHERE profile_id=?1 AND date=?2")?;
        for day in days.removed {
            delete.execute(params![day.profile_id, day.date])?;
        }
        let mut write = tx.prepare_cached("INSERT INTO habit_days(profile_id,date,data) VALUES(?1,?2,?3) ON CONFLICT(profile_id,date) DO UPDATE SET data=excluded.data,rowid=CASE WHEN ?4 THEN (SELECT COALESCE(MAX(rowid),0)+1 FROM habit_days) ELSE habit_days.rowid END")?;
        for change in days.writes {
            let day = change.row;
            write.execute(params![
                day.profile_id,
                day.date,
                serde_json::to_string(day)?,
                change.append
            ])?;
        }
    }
    owned_rows(
        tx,
        "batches",
        &before.batches,
        &after.batches,
        |r| &r.id,
        |r| &r.profile_id,
    )?;
    owned_rows(
        tx,
        "scenarios",
        &before.scenarios,
        &after.scenarios,
        |r| &r.id,
        |r| &r.profile_id,
    )?;
    owned_rows(
        tx,
        "runs",
        &before.runs,
        &after.runs,
        |r| &r.id,
        |r| &r.profile_id,
    )?;
    // Parents are removed after their children; updates never delete a parent.
    let mut delete = tx.prepare_cached("DELETE FROM profiles WHERE id=?1")?;
    for profile in profiles.removed {
        delete.execute([&profile.id])?;
    }
    if before.settings != after.settings {
        tx.execute("INSERT INTO settings(id,data) VALUES(1,?1) ON CONFLICT(id) DO UPDATE SET data=excluded.data", [serde_json::to_string(&after.settings)?])?;
    }
    Ok(())
}

pub(super) fn replace_all(tx: &Transaction<'_>, s: &Snapshot) -> Result<()> {
    tx.execute_batch("DELETE FROM observations; DELETE FROM habit_days; DELETE FROM batches; DELETE FROM scenarios; DELETE FROM runs; DELETE FROM profiles; DELETE FROM settings;")?;
    write(tx, &Snapshot::default(), s)
}
