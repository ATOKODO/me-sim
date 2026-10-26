use super::*;

fn seeded() -> (Store, VersionedSnapshot) {
    let mut db = Store::init(Connection::open_in_memory().unwrap()).unwrap();
    let first = db.mutate_at_revision(Mutation::Demo, 0).unwrap();
    let current = db
        .mutate_at_revision(Mutation::Demo, first.revision)
        .unwrap();
    (db, current)
}
fn changes(db: &Store) -> i64 {
    db.conn
        .query_row("SELECT total_changes()", [], |r| r.get(0))
        .unwrap()
}

#[test]
fn ordinary_edits_do_not_rewrite_unrelated_rows_and_keep_snapshot_order() {
    let (mut db, seed) = seeded();
    let mut settings = seed.snapshot.settings.clone();
    settings.theme = Theme::Light;
    let before = changes(&db);
    let saved = db
        .mutate_at_revision(Mutation::Settings(settings), seed.revision)
        .unwrap();
    assert_eq!(
        changes(&db) - before,
        2,
        "only settings and revision may change"
    );
    let mut profile = saved.snapshot.profiles[0].clone();
    profile.name = "Renamed".into();
    let before = changes(&db);
    let saved = db
        .mutate_at_revision(Mutation::SaveProfile(profile), saved.revision)
        .unwrap();
    assert_eq!(
        changes(&db) - before,
        2,
        "only that profile and revision may change"
    );
    assert_eq!(db.load().unwrap(), saved.snapshot);
    let mut observation = saved.snapshot.observations[0].clone();
    observation.value += 0.1;
    let before = changes(&db);
    let saved = db
        .mutate_at_revision(Mutation::SaveObservation(observation), saved.revision)
        .unwrap();
    assert_eq!(
        changes(&db) - before,
        3,
        "replace only that observation and revision"
    );
    assert_eq!(db.load().unwrap(), saved.snapshot);
    let mut day = saved.snapshot.habit_days[0].clone();
    day.validated_at = None;
    let before = changes(&db);
    let saved = db
        .mutate_at_revision(Mutation::SaveHabitDay(day), saved.revision)
        .unwrap();
    assert_eq!(changes(&db) - before, 2);
    assert_eq!(db.load().unwrap(), saved.snapshot);
}

#[test]
fn arbitrary_snapshot_order_and_swapped_observation_keys_roundtrip() {
    let (mut db, seed) = seeded();
    let mut next = seed.snapshot;
    // Two weights share a profile but have different dates; swapping their keys is valid.
    let date = next.observations[0].date.clone();
    next.observations[0].date = next.observations[5].date.clone();
    next.observations[5].date = date;
    next.profiles.reverse();
    next.observations.reverse();
    next.habit_days.reverse();
    db.replace(&next).unwrap();
    assert_eq!(db.load().unwrap(), next);
    // Inserts before retained rows also preserve the supplied order.
    let mut inserted = next.observations[0].clone();
    inserted.id = id();
    inserted.date = "1900-01-01".into();
    next.observations.insert(0, inserted);
    db.replace(&next).unwrap();
    assert_eq!(db.load().unwrap(), next);
}

#[test]
fn deleting_a_profile_preserves_other_profiles_and_revokes_only_its_devices() {
    let (mut db, seed) = seeded();
    let removed = &seed.snapshot.profiles[0].id;
    let kept = &seed.snapshot.profiles[1].id;
    for (device, profile) in [("removed", removed), ("kept", kept)] {
        db.conn
            .execute(
                "INSERT INTO companion_devices VALUES(?1,?2,?1,?1)",
                params![device, profile],
            )
            .unwrap();
        db.conn
            .execute("INSERT INTO companion_operations VALUES(?1,'op')", [device])
            .unwrap();
    }
    let saved = db
        .mutate_at_revision(Mutation::DeleteProfile(removed.clone()), seed.revision)
        .unwrap();
    assert_eq!(db.load().unwrap(), saved.snapshot);
    assert_eq!(saved.snapshot.profiles[0].id, *kept);
    let remaining: String = db
        .conn
        .query_row("SELECT id FROM companion_devices", [], |r| r.get(0))
        .unwrap();
    assert_eq!(remaining, "kept");
    let count: i64 = db
        .conn
        .query_row("SELECT COUNT(*) FROM companion_operations", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(count, 1);
}

#[test]
fn finishing_a_linked_session_rolls_back_every_side_effect_on_sql_failure() {
    let (mut db, seed) = seeded();
    let profile = &seed.snapshot.profiles[0];
    let start = chrono::Utc::now() - chrono::Duration::minutes(30);
    let end =
        (start + chrono::Duration::minutes(30) + chrono::Duration::milliseconds(25)).to_rfc3339();
    let session = crate::ghost::ActivitySession {
        id: id(),
        metric: "exercise".into(),
        label: "Run".into(),
        habit_id: Some(profile.habits[0].id.clone()),
        start: start.to_rfc3339(),
        time_zone: "Europe/Paris".into(),
    };
    let started = db
        .mutate_at_revision(
            Mutation::StartActivity {
                profile_id: profile.id.clone(),
                session: session.clone(),
            },
            seed.revision,
        )
        .unwrap();
    db.conn.execute_batch("CREATE TRIGGER fail_session BEFORE INSERT ON observations BEGIN SELECT RAISE(ABORT,'simulated disk failure'); END;").unwrap();
    let finish = || Mutation::FinishActivity {
        profile_id: profile.id.clone(),
        session_id: session.id.clone(),
        end: end.clone(),
    };
    assert!(db.mutate_at_revision(finish(), started.revision).is_err());
    assert_eq!(db.current().unwrap().revision, started.revision);
    assert_eq!(db.load().unwrap(), started.snapshot);
    db.conn.execute_batch("DROP TRIGGER fail_session").unwrap();
    let finished = db.mutate_at_revision(finish(), started.revision).unwrap();
    let reloaded = db.load().unwrap();
    assert_eq!(reloaded.profiles, finished.snapshot.profiles);
    assert_eq!(reloaded.habit_days, finished.snapshot.habit_days);
    for (actual, expected) in reloaded
        .observations
        .iter()
        .zip(&finished.snapshot.observations)
    {
        assert_eq!(actual, expected);
    }
    assert!(finished.snapshot.profiles[0]
        .ghost
        .as_ref()
        .unwrap()
        .active
        .is_none());
    let o = finished
        .snapshot
        .observations
        .iter()
        .find(|o| o.id == session.id)
        .unwrap();
    let day = finished
        .snapshot
        .habit_days
        .iter()
        .find(|d| d.profile_id == profile.id && d.date == o.date)
        .unwrap();
    assert_eq!(day.answers.get(&profile.habits[0].id), Some(&true));
}
