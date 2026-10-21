//! Local activity sessions and append-only routine versions. No network or prediction.
use crate::domain::*;
use chrono::{DateTime, NaiveDate};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GhostState {
    pub plans: Vec<RoutineVersion>,
    pub active: Option<ActivitySession>,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActivityContext {
    pub label: String,
    pub habit_id: Option<String>,
    pub start: Option<String>,
    pub end: Option<String>,
    pub time_zone: String,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ActivitySession {
    pub id: String,
    pub metric: String,
    pub label: String,
    pub habit_id: Option<String>,
    pub start: String,
    pub time_zone: String,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RoutineVersion {
    pub id: String,
    pub routine_id: String,
    pub name: String,
    pub effective_from: String,
    pub weekdays: Vec<u8>,
    pub blocks: Vec<RoutineBlock>,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RoutineBlock {
    pub id: String,
    pub metric: String,
    pub label: String,
    pub habit_id: Option<String>,
    pub start_minute: u32,
    pub duration_minutes: u32,
    #[serde(default)]
    pub tolerance_minutes: u32,
}
fn label(s: &str) -> bool {
    !s.trim().is_empty() && s.len() <= 120
}
fn event(metric: &str) -> bool {
    matches!(
        metric,
        "exercise"
            | "walk"
            | "work"
            | "social"
            | "gaming"
            | "screen"
            | "reading"
            | "meal"
            | "rest"
            | "alcohol"
            | "tobacco"
            | "vaping"
            | "screen_evening"
            | "sedentary"
    )
}
fn link(p: &Profile, habit: &Option<String>, metric: &str) -> bool {
    habit.as_ref().is_none_or(|id| {
        p.habits
            .iter()
            .any(|h| &h.id == id && h.metric.as_ref().is_none_or(|m| m == metric))
    })
}
pub fn validate_profile(p: &Profile) -> Result<()> {
    let Some(state) = &p.ghost else { return Ok(()) };
    if state.plans.len() > 2000 {
        return Err(invalid("Limite : 2 000 versions du planning par profil."));
    }
    let mut ids = HashSet::new();
    for plan in &state.plans {
        if !label(&plan.id)
            || !ids.insert(&plan.id)
            || !label(&plan.routine_id)
            || !label(&plan.name)
            || plan.effective_from.len() != 10
            || NaiveDate::parse_from_str(&plan.effective_from, "%Y-%m-%d").is_err()
            || plan.weekdays.is_empty()
            || plan.weekdays.len() > 7
            || plan.weekdays.iter().any(|d| *d > 6)
            || plan.weekdays.iter().collect::<HashSet<_>>().len() != plan.weekdays.len()
            || plan.blocks.len() > 128
        {
            return Err(invalid("Planning fantôme invalide."));
        }
        let mut blocks = HashSet::new();
        for b in &plan.blocks {
            if !label(&b.id)
                || !blocks.insert(&b.id)
                || !event(&b.metric)
                || unit(&b.metric) != Some("min")
                || !label(&b.label)
                || !link(p, &b.habit_id, &b.metric)
                || b.start_minute >= 1440
                || b.tolerance_minutes > 180
                || b.duration_minutes == 0
                || b.duration_minutes > 1440 - b.start_minute
            {
                return Err(invalid("Créneau du planning invalide."));
            }
        }
    }
    if let Some(a) = &state.active {
        if !label(&a.id)
            || !event(&a.metric)
            || unit(&a.metric) != Some("min")
            || !label(&a.label)
            || !link(p, &a.habit_id, &a.metric)
            || a.time_zone.len() > 100
            || DateTime::parse_from_rfc3339(&a.start).is_err()
        {
            return Err(invalid("Session locale invalide."));
        }
    }
    Ok(())
}
pub fn validate_context(o: &Observation) -> Result<()> {
    let Some(c) = &o.context else { return Ok(()) };
    if !event(&o.metric) || !label(&c.label) || c.time_zone.len() > 100 {
        return Err(invalid("Contexte de l’activité invalide."));
    }
    match (&c.start, &c.end) {
        (None, None) => {}
        (Some(start), Some(end)) => {
            let a = DateTime::parse_from_rfc3339(start)
                .map_err(|_| invalid("Début de session invalide."))?;
            let b = DateTime::parse_from_rfc3339(end)
                .map_err(|_| invalid("Fin de session invalide."))?;
            let duration = (b - a).num_milliseconds() as f64 / 60000.;
            if duration <= 0.
                || duration > 1440.
                || o.duration_minutes
                    .is_none_or(|d| (d - duration).abs() > 0.0001)
                || o.date != a.date_naive().to_string()
                || o.at.as_deref() != Some(a.format("%H:%M").to_string().as_str())
            {
                return Err(invalid("Durée ou horaire de session incohérent."));
            }
        }
        _ => return Err(invalid("Session incomplète.")),
    }
    Ok(())
}
pub fn save_plan(s: &mut Snapshot, profile_id: &str, plan: RoutineVersion) -> Result<()> {
    let p = s
        .profiles
        .iter_mut()
        .find(|p| p.id == profile_id)
        .ok_or_else(|| invalid("Profil introuvable."))?;
    if plan.effective_from < chrono::Local::now().date_naive().to_string() {
        return Err(invalid("Le planning ne peut pas modifier le passé."));
    }
    let g = p.ghost.get_or_insert_with(GhostState::default);
    if g.plans.iter().any(|v| v.id == plan.id) {
        return Err(invalid("Version du planning déjà enregistrée."));
    }
    g.plans.push(plan);
    Ok(())
}
pub fn start(s: &mut Snapshot, profile_id: &str, session: ActivitySession) -> Result<()> {
    let p = s
        .profiles
        .iter_mut()
        .find(|p| p.id == profile_id)
        .ok_or_else(|| invalid("Profil introuvable."))?;
    let g = p.ghost.get_or_insert_with(GhostState::default);
    if g.active.is_some() {
        return Err(invalid("Une activité est déjà en cours."));
    }
    let at = DateTime::parse_from_rfc3339(&session.start)
        .map_err(|_| invalid("Début de session invalide."))?;
    if at > chrono::Utc::now() + chrono::Duration::minutes(1) {
        return Err(invalid("Début de session futur."));
    }
    g.active = Some(session);
    Ok(())
}
pub fn finish(
    s: &mut Snapshot,
    profile_id: &str,
    session_id: &str,
    end: Option<String>,
) -> Result<()> {
    let p = s
        .profiles
        .iter_mut()
        .find(|p| p.id == profile_id)
        .ok_or_else(|| invalid("Profil introuvable."))?;
    let g = p.ghost.get_or_insert_with(GhostState::default);
    let a = g
        .active
        .as_ref()
        .filter(|a| a.id == session_id)
        .ok_or_else(|| invalid("Cette session a changé. Rechargez la page."))?
        .clone();
    if let Some(end) = end {
        let start = DateTime::parse_from_rfc3339(&a.start)
            .map_err(|_| invalid("Début de session invalide."))?;
        let stop =
            DateTime::parse_from_rfc3339(&end).map_err(|_| invalid("Fin de session invalide."))?;
        if stop > chrono::Utc::now() + chrono::Duration::minutes(1) {
            return Err(invalid("Fin de session future."));
        }
        let duration = (stop - start).num_milliseconds() as f64 / 60000.;
        if duration <= 0. || duration > 1440. {
            return Err(invalid(
                "La fin doit suivre le début, sans dépasser 24 h ni être future.",
            ));
        }
        let o = Observation {
            id: a.id.clone(),
            profile_id: profile_id.into(),
            date: start.date_naive().to_string(),
            at: Some(start.format("%H:%M").to_string()),
            metric: a.metric.clone(),
            value: duration,
            unit: "min".into(),
            duration_minutes: Some(duration),
            source: "Session locale".into(),
            batch_id: None,
            context: Some(ActivityContext {
                label: a.label,
                habit_id: a.habit_id.clone(),
                start: Some(a.start),
                end: Some(end),
                time_zone: a.time_zone,
            }),
        };
        validate_observation(&o)?;
        if s.observations.iter().any(|e| {
            e.id == o.id
                || (e.profile_id == o.profile_id
                    && e.date == o.date
                    && e.metric == o.metric
                    && observation_key(e) == observation_key(&o))
        }) {
            return Err(invalid(
                "Cette activité existe déjà à cette heure. Modifiez-la dans le journal.",
            ));
        }
        if let Some(habit) = a.habit_id {
            let index = s
                .habit_days
                .iter()
                .position(|d| d.profile_id == profile_id && d.date == o.date);
            let index = index.unwrap_or_else(|| {
                s.habit_days.push(HabitDay {
                    profile_id: profile_id.into(),
                    date: o.date.clone(),
                    answers: Default::default(),
                    validated_at: None,
                });
                s.habit_days.len() - 1
            });
            s.habit_days[index].answers.insert(habit, true);
            s.habit_days[index].validated_at = None;
        }
        s.observations.push(o);
    }
    g.active = None;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::Store;
    use rusqlite::Connection;
    fn db() -> Store {
        let mut db = Store::init(Connection::open_in_memory().unwrap()).unwrap();
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        db.replace(&s).unwrap();
        db
    }
    fn plan() -> RoutineVersion {
        RoutineVersion {
            id: id(),
            routine_id: "weekday".into(),
            name: "Routine".into(),
            effective_from: chrono::Local::now().date_naive().to_string(),
            weekdays: vec![1, 2, 3, 4, 5],
            blocks: vec![RoutineBlock {
                id: id(),
                metric: "walk".into(),
                label: "Outside".into(),
                habit_id: None,
                start_minute: 1080,
                duration_minutes: 30,
                tolerance_minutes: 0,
            }],
        }
    }
    #[test]
    fn sessions_roundtrip_restart_finish_and_link_without_validating_day() {
        let mut db = db();
        let s = db.current().unwrap();
        let p = &s.snapshot.profiles[0];
        let pid = p.id.clone();
        let habit = p.habits[0].id.clone();
        let session = ActivitySession {
            id: id(),
            metric: "exercise".into(),
            label: "Run".into(),
            habit_id: Some(habit.clone()),
            start: (chrono::Utc::now() - chrono::Duration::minutes(10)).to_rfc3339(),
            time_zone: "UTC".into(),
        };
        let active = db
            .mutate_at_revision(
                Mutation::StartActivity {
                    profile_id: pid.clone(),
                    session: session.clone(),
                },
                s.revision,
            )
            .unwrap();
        let json = serde_json::to_string(&db.load().unwrap()).unwrap();
        let restored: Snapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(
            restored.profiles[0]
                .ghost
                .as_ref()
                .unwrap()
                .active
                .as_ref()
                .unwrap()
                .id,
            session.id
        );
        db.replace(&restored).unwrap();
        let revision = db.current().unwrap().revision;
        assert!(db
            .mutate_at_revision(
                Mutation::FinishActivity {
                    profile_id: pid.clone(),
                    session_id: "stale".into(),
                    end: chrono::Utc::now().to_rfc3339()
                },
                revision
            )
            .is_err());
        assert!(db.load().unwrap().profiles[0]
            .ghost
            .as_ref()
            .unwrap()
            .active
            .is_some());
        let result = db
            .mutate_at_revision(
                Mutation::FinishActivity {
                    profile_id: pid.clone(),
                    session_id: session.id.clone(),
                    end: chrono::Utc::now().to_rfc3339(),
                },
                revision,
            )
            .unwrap();
        assert!(result.snapshot.profiles[0]
            .ghost
            .as_ref()
            .unwrap()
            .active
            .is_none());
        let o = result
            .snapshot
            .observations
            .iter()
            .find(|o| o.id == session.id)
            .unwrap();
        assert!((o.value - 10.).abs() < 0.1);
        assert_eq!(o.context.as_ref().unwrap().label, "Run");
        let day = result
            .snapshot
            .habit_days
            .iter()
            .find(|d| d.profile_id == pid && d.date == o.date)
            .unwrap();
        assert_eq!(day.answers.get(&habit), Some(&true));
        assert!(day.validated_at.is_none());
        assert!(db
            .mutate_at_revision(
                Mutation::CancelActivity {
                    profile_id: pid,
                    session_id: session.id
                },
                active.revision
            )
            .is_err());
    }
    #[test]
    fn invalid_sessions_and_plans_do_not_change_the_database() {
        let mut db = db();
        let current = db.current().unwrap();
        let pid = current.snapshot.profiles[0].id.clone();
        let original = serde_json::to_string(&current.snapshot).unwrap();
        let mut bad = plan();
        bad.blocks[0].start_minute = 1430;
        bad.blocks[0].duration_minutes = 30;
        assert!(db
            .mutate_at_revision(
                Mutation::SaveGhostPlan {
                    profile_id: pid.clone(),
                    plan: bad
                },
                current.revision
            )
            .is_err());
        assert_eq!(
            original,
            serde_json::to_string(&db.load().unwrap()).unwrap()
        );
        let valid = plan();
        let saved = db
            .mutate_at_revision(
                Mutation::SaveGhostPlan {
                    profile_id: pid.clone(),
                    plan: valid.clone(),
                },
                current.revision,
            )
            .unwrap();
        assert!(db
            .mutate_at_revision(
                Mutation::SaveGhostPlan {
                    profile_id: pid.clone(),
                    plan: valid
                },
                saved.revision
            )
            .is_err());
        let mut rewritten = saved.snapshot.profiles[0].clone();
        rewritten.ghost.as_mut().unwrap().plans.clear();
        assert!(db
            .mutate_at_revision(Mutation::SaveProfile(rewritten), saved.revision)
            .is_err());
        let mut past = plan();
        past.effective_from = "2000-01-01".into();
        assert!(db
            .mutate_at_revision(
                Mutation::SaveGhostPlan {
                    profile_id: pid,
                    plan: past
                },
                saved.revision
            )
            .is_err());
        assert_eq!(
            db.load().unwrap().profiles[0]
                .ghost
                .as_ref()
                .unwrap()
                .plans
                .len(),
            1
        );
    }
    #[test]
    fn context_duration_checks_offsets_and_rejects_inconsistent_backup() {
        let mut db = db();
        let mut s = db.load().unwrap();
        let pid = s.profiles[0].id.clone();
        let o = Observation {
            id: id(),
            profile_id: pid,
            date: "2026-10-25".into(),
            at: Some("02:30".into()),
            metric: "walk".into(),
            value: 60.,
            unit: "min".into(),
            source: "Fictional".into(),
            batch_id: None,
            duration_minutes: Some(60.),
            context: Some(ActivityContext {
                label: "Walk".into(),
                habit_id: None,
                start: Some("2026-10-25T02:30:00+02:00".into()),
                end: Some("2026-10-25T02:30:00+01:00".into()),
                time_zone: "Europe/Paris".into(),
            }),
        };
        s.observations.push(o);
        db.replace(&s).unwrap();
        let raw = serde_json::to_string(&db.load().unwrap()).unwrap();
        s.observations.last_mut().unwrap().duration_minutes = Some(30.);
        assert!(db.replace(&s).is_err());
        assert_eq!(raw, serde_json::to_string(&db.load().unwrap()).unwrap());
    }
    #[test]
    fn separate_sessions_in_one_display_minute_keep_their_absolute_identity() {
        use chrono::Timelike;
        let mut db = db();
        let current = db.current().unwrap();
        let pid = current.snapshot.profiles[0].id.clone();
        let original = current.snapshot.observations.len();
        let base = (chrono::Utc::now() - chrono::Duration::minutes(10))
            .with_second(0)
            .unwrap()
            .with_nanosecond(0)
            .unwrap();
        for seconds in [0, 20] {
            let session = ActivitySession {
                id: id(),
                metric: "walk".into(),
                label: "Walk".into(),
                habit_id: None,
                start: (base + chrono::Duration::seconds(seconds)).to_rfc3339(),
                time_zone: "UTC".into(),
            };
            let current = db.current().unwrap();
            let started = db
                .mutate_at_revision(
                    Mutation::StartActivity {
                        profile_id: pid.clone(),
                        session: session.clone(),
                    },
                    current.revision,
                )
                .unwrap();
            db.mutate_at_revision(
                Mutation::FinishActivity {
                    profile_id: pid.clone(),
                    session_id: session.id,
                    end: (base + chrono::Duration::seconds(seconds + 10)).to_rfc3339(),
                },
                started.revision,
            )
            .unwrap();
        }
        let loaded = db.load().unwrap();
        assert_eq!(loaded.observations.len(), original + 2);
        let last = &loaded.observations[original..];
        assert_eq!(last[0].at, last[1].at);
        assert_ne!(observation_key(&last[0]), observation_key(&last[1]));
        let roundtrip: Snapshot =
            serde_json::from_str(&serde_json::to_string(&loaded).unwrap()).unwrap();
        db.replace(&roundtrip).unwrap();
    }
    #[test]
    fn a_linked_negative_point_records_yes_without_validating_or_cross_linking() {
        let mut db = db();
        let current = db.current().unwrap();
        let profile = &current.snapshot.profiles[0];
        let habit = profile
            .habits
            .iter()
            .find(|h| h.metric.as_deref() == Some("tobacco"))
            .unwrap();
        let o = Observation {
            id: id(),
            profile_id: profile.id.clone(),
            date: chrono::Local::now().date_naive().to_string(),
            at: Some("00:01".into()),
            metric: "tobacco".into(),
            value: 2.,
            unit: "cigarette".into(),
            source: "Fictional".into(),
            batch_id: None,
            duration_minutes: None,
            context: Some(ActivityContext {
                label: "Fumer".into(),
                habit_id: Some(habit.id.clone()),
                start: None,
                end: None,
                time_zone: "UTC".into(),
            }),
        };
        let saved = db
            .mutate_at_revision(Mutation::SaveObservation(o.clone()), current.revision)
            .unwrap();
        let day = saved
            .snapshot
            .habit_days
            .iter()
            .find(|d| d.profile_id == profile.id && d.date == o.date)
            .unwrap();
        assert_eq!(day.answers.get(&habit.id), Some(&true));
        assert!(day.validated_at.is_none());
        let raw = serde_json::to_string(&saved.snapshot).unwrap();
        let mut invalid = o;
        invalid.metric = "walk".into();
        invalid.unit = "min".into();
        invalid.duration_minutes = Some(2.);
        assert!(db
            .mutate_at_revision(Mutation::SaveObservation(invalid), saved.revision)
            .is_err());
        assert_eq!(raw, serde_json::to_string(&db.load().unwrap()).unwrap());
    }
    #[test]
    fn open_session_and_schedule_survive_a_real_database_reopen() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("fictional-ghost.db");
        let mut db = Store::open(&path).unwrap();
        let seed = db.mutate_at_revision(Mutation::Demo, 0).unwrap();
        let pid = seed.snapshot.profiles[0].id.clone();
        let saved = db
            .mutate_at_revision(
                Mutation::SaveGhostPlan {
                    profile_id: pid.clone(),
                    plan: plan(),
                },
                seed.revision,
            )
            .unwrap();
        let session = ActivitySession {
            id: id(),
            metric: "walk".into(),
            label: "Outside".into(),
            habit_id: None,
            start: (chrono::Utc::now() - chrono::Duration::minutes(5)).to_rfc3339(),
            time_zone: "UTC".into(),
        };
        db.mutate_at_revision(
            Mutation::StartActivity {
                profile_id: pid.clone(),
                session: session.clone(),
            },
            saved.revision,
        )
        .unwrap();
        drop(db);
        let mut reopened = Store::open(&path).unwrap();
        let loaded = reopened.current().unwrap();
        let ghost = loaded.snapshot.profiles[0].ghost.as_ref().unwrap();
        assert_eq!(ghost.plans.len(), 1);
        assert_eq!(ghost.active.as_ref().unwrap().id, session.id);
        reopened
            .mutate_at_revision(
                Mutation::FinishActivity {
                    profile_id: pid,
                    session_id: session.id.clone(),
                    end: chrono::Utc::now().to_rfc3339(),
                },
                loaded.revision,
            )
            .unwrap();
        drop(reopened);
        let final_db = Store::open(&path).unwrap();
        let snapshot = final_db.load().unwrap();
        assert!(snapshot.profiles[0]
            .ghost
            .as_ref()
            .unwrap()
            .active
            .is_none());
        assert_eq!(
            snapshot
                .observations
                .iter()
                .find(|o| o.id == session.id)
                .unwrap()
                .context
                .as_ref()
                .unwrap()
                .label,
            "Outside"
        );
    }
}

pub fn record_habit(s: &mut Snapshot, o: &Observation) -> Result<()> {
    let Some(hid) = o.context.as_ref().and_then(|c| c.habit_id.as_ref()) else {
        return Ok(());
    };
    let h = s
        .profiles
        .iter()
        .find(|p| p.id == o.profile_id)
        .and_then(|p| p.habits.iter().find(|h| &h.id == hid))
        .ok_or_else(|| invalid("Habitude liée introuvable."))?;
    if h.metric.as_ref().is_some_and(|m| m != &o.metric) {
        return Err(invalid("Habitude liée incompatible."));
    }
    if o.value <= 0.
        || h.start_date > o.date
        || h.archived_at.as_ref().is_some_and(|d| d <= &o.date)
    {
        return Ok(());
    }
    let index = s
        .habit_days
        .iter()
        .position(|d| d.profile_id == o.profile_id && d.date == o.date)
        .unwrap_or_else(|| {
            s.habit_days.push(HabitDay {
                profile_id: o.profile_id.clone(),
                date: o.date.clone(),
                answers: Default::default(),
                validated_at: None,
            });
            s.habit_days.len() - 1
        });
    s.habit_days[index].answers.insert(hid.clone(), true);
    s.habit_days[index].validated_at = None;
    Ok(())
}

pub fn validate_link(s: &Snapshot, o: &Observation) -> Result<()> {
    if let Some(hid) = o.context.as_ref().and_then(|c| c.habit_id.as_ref()) {
        if !s.profiles.iter().any(|p| {
            p.id == o.profile_id
                && p.habits
                    .iter()
                    .any(|h| h.id == *hid && h.metric.as_ref().is_none_or(|m| m == &o.metric))
        }) {
            return Err(invalid("Habitude liée incompatible."));
        }
    }
    Ok(())
}
