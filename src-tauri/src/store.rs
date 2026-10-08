use crate::domain::*;
use rusqlite::{params, Connection};
use std::{cell::Cell, path::Path};
pub struct Store {
    pub conn: Connection,
    revision: Cell<i64>,
}
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionedSnapshot {
    pub snapshot: Snapshot,
    pub revision: i64,
}
impl Store {
    pub fn current(&self) -> Result<VersionedSnapshot> {
        let snapshot = self.load()?;
        Ok(VersionedSnapshot {
            snapshot,
            revision: self.revision.get(),
        })
    }
    // Compare the revision read by the caller, not merely this connection's last load.
    pub fn require_revision(&self, expected: i64) -> Result<()> {
        if expected != self.revision.get() {
            return Err(AppError::new("CONCURRENT_CHANGE", "Les données ont changé dans une autre fenêtre. Rechargez les données avant de recommencer."));
        }
        Ok(())
    }
    pub fn mutate_at_revision(
        &mut self,
        operation: Mutation,
        expected: i64,
    ) -> Result<VersionedSnapshot> {
        let mut snapshot = self.load()?;
        self.require_revision(expected)?;
        mutate(&mut snapshot, operation)?;
        self.replace(&snapshot)?;
        Ok(VersionedSnapshot {
            snapshot,
            revision: self.revision.get(),
        })
    }
    pub fn versioned(&self, snapshot: Snapshot) -> VersionedSnapshot {
        VersionedSnapshot {
            snapshot,
            revision: self.revision.get(),
        }
    }
    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        Self::init(conn)
    }
    pub fn init(conn: Connection) -> Result<Self> {
        conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;")?;
        let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
        if version > 3 {
            return Err(AppError::new(
                "UNSUPPORTED_VERSION",
                "Base créée par une version plus récente.",
            ));
        }
        if version == 0 {
            conn.execute_batch("BEGIN; CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS observations(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL REFERENCES profiles(id),date TEXT NOT NULL,metric TEXT NOT NULL,at TEXT NOT NULL DEFAULT '',data TEXT NOT NULL,UNIQUE(profile_id,date,metric,at)); CREATE TABLE IF NOT EXISTS habit_days(profile_id TEXT NOT NULL REFERENCES profiles(id),date TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(profile_id,date)); CREATE TABLE IF NOT EXISTS batches(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL REFERENCES profiles(id),data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS scenarios(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL REFERENCES profiles(id),data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL REFERENCES profiles(id),data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS metadata(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL); INSERT OR IGNORE INTO metadata VALUES(1,0); PRAGMA user_version=3; COMMIT;")?;
        } else if version == 1 {
            conn.execute_batch("BEGIN; CREATE TABLE observations_v2(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL REFERENCES profiles(id),date TEXT NOT NULL,metric TEXT NOT NULL,at TEXT NOT NULL DEFAULT '',data TEXT NOT NULL,UNIQUE(profile_id,date,metric,at)); INSERT INTO observations_v2(id,profile_id,date,metric,at,data) SELECT id,profile_id,date,metric,COALESCE(json_extract(data,'$.at'),''),data FROM observations; DROP TABLE observations; ALTER TABLE observations_v2 RENAME TO observations; PRAGMA user_version=2; COMMIT;")?;
        }
        if version == 1 || version == 2 {
            conn.execute_batch("BEGIN; CREATE TABLE habit_days(profile_id TEXT NOT NULL REFERENCES profiles(id),date TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(profile_id,date)); PRAGMA user_version=3; COMMIT;")?;
        }
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
            habit_days: self.rows("habit_days")?,
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
            return Err(AppError::new("CONCURRENT_CHANGE","Les données ont changé dans une autre fenêtre. Rechargez les données avant de recommencer."));
        }
        tx.execute_batch("DELETE FROM observations; DELETE FROM habit_days; DELETE FROM batches; DELETE FROM scenarios; DELETE FROM runs; DELETE FROM profiles; DELETE FROM settings;")?;
        for p in &s.profiles {
            tx.execute(
                "INSERT INTO profiles VALUES(?1,?2)",
                params![p.id, serde_json::to_string(p)?],
            )?;
        }
        for o in &s.observations {
            tx.execute(
                "INSERT INTO observations(id,profile_id,date,metric,at,data) VALUES(?1,?2,?3,?4,?5,?6)",
                params![
                    o.id,
                    o.profile_id,
                    o.date,
                    o.metric,
                    o.at.clone().unwrap_or_default(),
                    serde_json::to_string(o)?
                ],
            )?;
        }
        for day in &s.habit_days {
            tx.execute(
                "INSERT INTO habit_days(profile_id,date,data) VALUES(?1,?2,?3)",
                params![day.profile_id, day.date, serde_json::to_string(day)?],
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
    fn migrates_v2_database_and_persists_habit_days() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("CREATE TABLE profiles(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE observations(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,date TEXT NOT NULL,metric TEXT NOT NULL,at TEXT NOT NULL DEFAULT '',data TEXT NOT NULL); CREATE TABLE batches(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,data TEXT NOT NULL); CREATE TABLE scenarios(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,data TEXT NOT NULL); CREATE TABLE runs(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,data TEXT NOT NULL); CREATE TABLE settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL); CREATE TABLE metadata(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL); INSERT INTO metadata VALUES(1,0); PRAGMA user_version=2;").unwrap();
        let mut db = Store::init(conn).unwrap();
        let version: i64 = db
            .conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(version, 3);
        let mut snapshot = Snapshot::default();
        mutate(&mut snapshot, Mutation::Demo).unwrap();
        assert_eq!(snapshot.habit_days.len(), 14);
        db.replace(&snapshot).unwrap();
        let loaded = db.load().unwrap();
        assert_eq!(loaded.habit_days.len(), 14);
        assert_eq!(loaded.profiles[0].habits.len(), 4);
        mutate(
            &mut snapshot,
            Mutation::DeleteProfile(loaded.profiles[0].id.clone()),
        )
        .unwrap();
        db.replace(&snapshot).unwrap();
        assert!(db.load().unwrap().habit_days.is_empty());
    }
    #[test]
    fn delete_one_profile_preserves_other() {
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        mutate(&mut s, Mutation::Demo).unwrap();
        let id = s.profiles[0].id.clone();
        let remaining_count = s.observations.iter().filter(|o| o.profile_id != id).count();
        mutate(&mut s, Mutation::DeleteProfile(id.clone())).unwrap();
        assert_eq!(s.profiles.len(), 1);
        assert_eq!(s.observations.len(), remaining_count);
        assert!(s.observations.iter().all(|o| o.profile_id != id));
    }

    #[test]
    fn migrates_v1_rows_and_keeps_multiple_timed_activities() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("CREATE TABLE profiles(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE observations(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,date TEXT NOT NULL,metric TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(profile_id,date,metric)); CREATE TABLE batches(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,data TEXT NOT NULL); CREATE TABLE scenarios(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,data TEXT NOT NULL); CREATE TABLE runs(id TEXT PRIMARY KEY,profile_id TEXT NOT NULL,data TEXT NOT NULL); CREATE TABLE settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL); CREATE TABLE metadata(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL); INSERT INTO metadata VALUES(1,0); PRAGMA user_version=1;").unwrap();
        let profile = Profile {
            id: "p1".into(),
            name: "Test".into(),
            birth_date: None,
            sex: None,
            height_cm: None,
            color: "#bde883".into(),
            demo: false,
            target: None,
            habits: vec![],
        };
        conn.execute(
            "INSERT INTO profiles VALUES(?1,?2)",
            params![profile.id, serde_json::to_string(&profile).unwrap()],
        )
        .unwrap();
        let old = serde_json::json!({"id":"o1","profileId":"p1","date":"2026-01-01","metric":"weight","value":70.0,"unit":"kg","source":"test","batchId":null});
        conn.execute(
            "INSERT INTO observations VALUES('o1','p1','2026-01-01','weight',?1)",
            [old.to_string()],
        )
        .unwrap();
        let mut db = Store::init(conn).unwrap();
        let mut s = db.load().unwrap();
        assert_eq!(s.observations.len(), 1);
        for at in ["08:00", "18:00"] {
            s.observations.push(Observation {
                id: id(),
                profile_id: "p1".into(),
                date: "2026-01-01".into(),
                metric: "gaming".into(),
                value: 30.,
                unit: "min".into(),
                source: "test".into(),
                batch_id: None,
                at: Some(at.into()),
                duration_minutes: Some(30.),
            });
        }
        db.replace(&s).unwrap();
        assert_eq!(db.load().unwrap().observations.len(), 3);
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

#[cfg(test)]
mod presentation_tests {
    use super::*;
    #[test]
    fn legacy_settings_and_backup_default_to_french_dark() {
        let db = Store::init(Connection::open_in_memory().unwrap()).unwrap();
        db.conn
            .execute(
                "INSERT INTO settings VALUES(1,?1)",
                [r#"{"animations":false,"jitter":true,"force2d":true}"#],
            )
            .unwrap();
        let snapshot = db.load().unwrap();
        assert_eq!(snapshot.settings.language, Language::Fr);
        assert_eq!(snapshot.settings.theme, Theme::Dark);
        assert!(!snapshot.settings.animations);
        assert!(snapshot.settings.jitter);
        assert!(serde_json::to_value(&snapshot.settings)
            .unwrap()
            .get("force2d")
            .is_none());
        let mut backup = serde_json::to_value(&snapshot).unwrap();
        backup["settings"]
            .as_object_mut()
            .unwrap()
            .remove("language");
        backup["settings"].as_object_mut().unwrap().remove("theme");
        backup["settings"]["force2d"] = serde_json::json!(true);
        let restored: Snapshot = serde_json::from_value(backup).unwrap();
        validate(&restored).unwrap();
        assert_eq!(restored.settings.language, Language::Fr);
        assert_eq!(restored.settings.theme, Theme::Dark);
    }
    #[test]
    fn retired_2d_preference_is_ignored_without_losing_backup_data() {
        let mut snapshot = Snapshot::default();
        mutate(&mut snapshot, Mutation::Demo).unwrap();
        snapshot.settings.language = Language::En;
        snapshot.settings.theme = Theme::Light;
        let current = serde_json::to_value(&snapshot).unwrap();
        for enabled in [true, false] {
            let mut old = current.clone();
            old["settings"]["force2d"] = serde_json::json!(enabled);
            let restored: Snapshot = serde_json::from_value(old).unwrap();
            validate(&restored).unwrap();
            assert_eq!(serde_json::to_value(restored).unwrap(), current);
        }
        let mut invalid = current;
        invalid["settings"]["unsupportedPreference"] = serde_json::json!(true);
        assert!(serde_json::from_value::<Snapshot>(invalid).is_err());
    }
    #[test]
    fn presentation_preferences_survive_disk_and_json_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("presentation.db");
        let mut db = Store::open(&path).unwrap();
        let mut snapshot = db.load().unwrap();
        mutate(&mut snapshot, Mutation::Demo).unwrap();
        let original_name = snapshot.profiles[0].name.clone();
        snapshot.settings.language = Language::En;
        snapshot.settings.theme = Theme::Light;
        db.replace(&snapshot).unwrap();
        drop(db);
        let mut db = Store::open(&path).unwrap();
        let saved = db.load().unwrap();
        assert_eq!(saved.settings.language, Language::En);
        assert_eq!(saved.settings.theme, Theme::Light);
        let restored: Snapshot =
            serde_json::from_str(&serde_json::to_string(&saved).unwrap()).unwrap();
        db.replace(&restored).unwrap();
        assert_eq!(db.load().unwrap().profiles[0].name, original_name);
        assert_eq!(
            serde_json::to_value(&saved).unwrap(),
            serde_json::to_value(&restored).unwrap()
        );
        for (field, value) in [("language", "de"), ("theme", "automatic")] {
            let mut invalid = serde_json::to_value(&saved).unwrap();
            invalid["settings"][field] = value.into();
            assert!(serde_json::from_value::<Snapshot>(invalid).is_err());
        }
    }
}
#[cfg(test)]
mod revision_regressions {
    use super::*;
    #[test]
    fn stale_ui_revision_cannot_remove_a_newer_target_and_retry_is_explicit() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("concurrent.db");
        let mut a = Store::open(&path).unwrap();
        let seed = a.mutate_at_revision(Mutation::Demo, 0).unwrap();
        let mut b = Store::open(&path).unwrap();
        let view_a = a.current().unwrap();
        let mut stale_profile = view_a.snapshot.profiles[0].clone();
        let mut changed = stale_profile.clone();
        changed.target = Some(TargetDay {
            steps: 12_000.,
            ..Default::default()
        });
        let saved_b = b
            .mutate_at_revision(Mutation::SaveProfile(changed), seed.revision)
            .unwrap();
        stale_profile.name = "New name".into();
        let before = serde_json::to_string(&saved_b.snapshot).unwrap();
        let error = a
            .mutate_at_revision(Mutation::SaveProfile(stale_profile), view_a.revision)
            .unwrap_err();
        assert_eq!(error.code, "CONCURRENT_CHANGE");
        assert_eq!(before, serde_json::to_string(&b.load().unwrap()).unwrap());
        let fresh = a.current().unwrap();
        let mut merged = fresh.snapshot.profiles[0].clone();
        merged.name = "New name".into();
        let retry = a
            .mutate_at_revision(Mutation::SaveProfile(merged), fresh.revision)
            .unwrap();
        assert_eq!(retry.revision, saved_b.revision + 1);
        assert_eq!(
            retry.snapshot.profiles[0].target.as_ref().unwrap().steps,
            12_000.
        );
        // Disk backup schema stays independent from ephemeral optimistic-lock state.
        assert!(serde_json::to_value(&retry.snapshot)
            .unwrap()
            .get("revision")
            .is_none());
    }
}
