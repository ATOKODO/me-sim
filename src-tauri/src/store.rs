use crate::domain::*;
use rusqlite::{params, Connection};
use std::{cell::Cell, path::Path};
pub struct Store {
    pub conn: Connection,
    revision: Cell<i64>,
}
impl Store {
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        Self::init(conn)
    }
    pub fn init(conn: Connection) -> Result<Self> {
        conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;")?;
        let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
        if version > 1 {
            return Err(AppError::new(
                "UNSUPPORTED_VERSION",
                "Base créée par une version plus récente.",
            ));
        }
        conn.execute_batch("BEGIN; CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS observations(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL REFERENCES profiles(id),date TEXT NOT NULL,metric TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(profile_id,date,metric)); CREATE TABLE IF NOT EXISTS batches(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL REFERENCES profiles(id),data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS scenarios(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL REFERENCES profiles(id),data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL REFERENCES profiles(id),data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS metadata(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL); INSERT OR IGNORE INTO metadata VALUES(1,0); PRAGMA user_version=1; COMMIT;")?;
        let revision =
            conn.query_row("SELECT revision FROM metadata WHERE id=1", [], |r| r.get(0))?;
        Ok(Self {
            conn,
            revision: Cell::new(revision),
        })
    }
    fn rows<T: serde::de::DeserializeOwned>(&self, table: &str) -> Result<Vec<T>> {
        let mut q = self
            .conn
            .prepare(&format!("SELECT data FROM {table} ORDER BY rowid"))?;
        let rows = q.query_map([], |r| r.get::<_, String>(0))?;
        let mut out = vec![];
        for row in rows {
            out.push(serde_json::from_str(&row?)?)
        }
        Ok(out)
    }
    pub fn load(&self) -> Result<Snapshot> {
        let tx = self.conn.unchecked_transaction()?;
        let revision =
            tx.query_row("SELECT revision FROM metadata WHERE id=1", [], |r| r.get(0))?;
        let snapshot = Snapshot {
            version: 1,
            profiles: self.rows("profiles")?,
            observations: self.rows("observations")?,
            batches: self.rows("batches")?,
            scenarios: self.rows("scenarios")?,
            runs: self.rows("runs")?,
            settings: self
                .rows("settings")?
                .into_iter()
                .next()
                .unwrap_or_default(),
        };
        tx.commit()?;
        self.revision.set(revision);
        Ok(snapshot)
    }
    pub fn replace(&mut self, s: &Snapshot) -> Result<()> {
        validate(s)?;
        let tx = self
            .conn
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        let current: i64 =
            tx.query_row("SELECT revision FROM metadata WHERE id=1", [], |r| r.get(0))?;
        if current != self.revision.get() {
            return Err(AppError::new("CONCURRENT_CHANGE","Les données ont changé dans une autre fenêtre. Réessayez pour utiliser leur dernière version."));
        }
        tx.execute_batch("DELETE FROM observations; DELETE FROM batches; DELETE FROM scenarios; DELETE FROM runs; DELETE FROM profiles; DELETE FROM settings;")?;
        for p in &s.profiles {
            tx.execute(
                "INSERT INTO profiles VALUES(?1,?2)",
                params![p.id, serde_json::to_string(p)?],
            )?;
        }
        for o in &s.observations {
            tx.execute(
                "INSERT INTO observations VALUES(?1,?2,?3,?4,?5)",
                params![
                    o.id,
                    o.profile_id,
                    o.date,
                    o.metric,
                    serde_json::to_string(o)?
                ],
            )?;
        }
        for b in &s.batches {
            tx.execute(
                "INSERT INTO batches VALUES(?1,?2,?3)",
                params![b.id, b.profile_id, serde_json::to_string(b)?],
            )?;
        }
        for v in &s.scenarios {
            tx.execute(
                "INSERT INTO scenarios VALUES(?1,?2,?3)",
                params![v.id, v.profile_id, serde_json::to_string(v)?],
            )?;
        }
        for v in &s.runs {
            tx.execute(
                "INSERT INTO runs VALUES(?1,?2,?3)",
                params![v.id, v.profile_id, serde_json::to_string(v)?],
            )?;
        }
        tx.execute(
            "INSERT INTO settings VALUES(1,?1)",
            [serde_json::to_string(&s.settings)?],
        )?;
        tx.execute("UPDATE metadata SET revision=revision+1 WHERE id=1", [])?;
        tx.commit()?;
        self.revision.set(current + 1);
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn backup_roundtrip_and_invalid_restore_are_atomic() {
        let mut db = Store::init(Connection::open_in_memory().unwrap()).unwrap();
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        db.replace(&s).unwrap();
        let raw = serde_json::to_string(&db.load().unwrap()).unwrap();
        let s: Snapshot = serde_json::from_str(&raw).unwrap();
        db.replace(&s).unwrap();
        assert_eq!(raw, serde_json::to_string(&db.load().unwrap()).unwrap());
        let mut bad = s.clone();
        bad.version = 9;
        assert!(db.replace(&bad).is_err());
        bad = s.clone();
        bad.observations[0].profile_id = "missing".into();
        assert!(db.replace(&bad).is_err());
        assert_eq!(raw, serde_json::to_string(&db.load().unwrap()).unwrap());
    }
    #[test]
    fn delete_one_profile_preserves_other() {
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        mutate(&mut s, Mutation::Demo).unwrap();
        let id = s.profiles[0].id.clone();
        mutate(&mut s, Mutation::DeleteProfile(id.clone())).unwrap();
        assert_eq!(s.profiles.len(), 1);
        assert_eq!(s.observations.len(), 140);
        assert!(s.observations.iter().all(|o| o.profile_id != id));
    }
}
#[cfg(test)]
mod concurrency {
    use super::*;
    #[test]
    fn stale_connection_cannot_overwrite_a_newer_commit() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.db");
        let mut a = Store::open(&path).unwrap();
        let mut b = Store::open(&path).unwrap();
        let mut sa = a.load().unwrap();
        let sb = b.load().unwrap();
        mutate(&mut sa, Mutation::Demo).unwrap();
        a.replace(&sa).unwrap();
        assert_eq!(b.replace(&sb).unwrap_err().code, "CONCURRENT_CHANGE");
        assert_eq!(b.load().unwrap().profiles.len(), 1);
    }
}
