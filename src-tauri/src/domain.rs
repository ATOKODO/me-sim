use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
pub type Result<T> = std::result::Result<T, AppError>;
#[derive(Debug, Serialize)]
pub struct AppError {
    pub code: String,
    pub message: String,
}
impl AppError {
    pub fn new(code: &str, message: impl ToString) -> Self {
        Self {
            code: code.into(),
            message: message.to_string(),
        }
    }
}
impl<E: std::error::Error> From<E> for AppError {
    fn from(e: E) -> Self {
        Self::new("IO", e)
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct TargetDay {
    pub sleep_hours: f64,
    pub steps: f64,
    pub activity_minutes: f64,
    pub exercise_minutes: f64,
    pub walk_minutes: f64,
    pub social_minutes: f64,
    pub screen_minutes: f64,
    pub gaming_minutes: f64,
    pub alcohol_glasses: f64,
    pub tobacco_cigarettes: f64,
    pub vaping_minutes: f64,
    pub evening_screen_minutes: f64,
    pub sedentary_minutes: f64,
}
impl Default for TargetDay {
    fn default() -> Self {
        Self {
            sleep_hours: 8.,
            steps: 8_000.,
            activity_minutes: 30.,
            exercise_minutes: 30.,
            walk_minutes: 30.,
            social_minutes: 60.,
            screen_minutes: 90.,
            gaming_minutes: 60.,
            alcohol_glasses: 0.,
            tobacco_cigarettes: 0.,
            vaping_minutes: 0.,
            evening_screen_minutes: 60.,
            sedentary_minutes: 480.,
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub birth_date: Option<String>,
    pub sex: Option<String>,
    pub height_cm: Option<f64>,
    pub color: String,
    pub demo: bool,
    #[serde(default)]
    pub target: Option<TargetDay>,
    #[serde(default)]
    pub habits: Vec<HabitDefinition>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HabitKind {
    Good,
    Bad,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitDefinition {
    pub id: String,
    pub label: String,
    pub kind: HabitKind,
    pub start_date: String,
    pub archived_at: Option<String>,
    pub metric: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitDay {
    pub profile_id: String,
    pub date: String,
    pub answers: BTreeMap<String, bool>,
    pub validated_at: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Observation {
    pub id: String,
    pub profile_id: String,
    pub date: String,
    pub metric: String,
    pub value: f64,
    pub unit: String,
    pub source: String,
    pub batch_id: Option<String>,
    #[serde(default)]
    pub at: Option<String>,
    #[serde(default)]
    pub duration_minutes: Option<f64>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ImportBatch {
    pub id: String,
    pub profile_id: String,
    pub filename: String,
    pub imported_at: String,
    pub count: usize,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Scenario {
    pub id: String,
    pub profile_id: String,
    pub name: String,
    pub months: u32,
    pub intake_delta: f64,
    pub activity_delta: f64,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SimulationRun {
    pub id: String,
    pub profile_id: String,
    pub model_version: String,
    pub inputs: serde_json::Value,
    pub results: serde_json::Value,
}
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    #[default]
    Fr,
    En,
}
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    Dark,
    Light,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", from = "SettingsInput")]
pub struct Settings {
    pub animations: bool,
    pub jitter: bool,
    #[serde(default)]
    pub language: Language,
    #[serde(default)]
    pub theme: Theme,
}
// Only the retired field is accepted for old databases/backups; it never reaches the domain or exports.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SettingsInput {
    animations: bool,
    jitter: bool,
    #[serde(default, rename = "force2d")]
    _retired_2d: Option<bool>,
    #[serde(default)]
    language: Language,
    #[serde(default)]
    theme: Theme,
}
impl From<SettingsInput> for Settings {
    fn from(value: SettingsInput) -> Self {
        Self {
            animations: value.animations,
            jitter: value.jitter,
            language: value.language,
            theme: value.theme,
        }
    }
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            animations: true,
            jitter: false,
            language: Language::Fr,
            theme: Theme::Dark,
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Snapshot {
    pub version: u32,
    pub profiles: Vec<Profile>,
    pub observations: Vec<Observation>,
    #[serde(default)]
    pub habit_days: Vec<HabitDay>,
    pub batches: Vec<ImportBatch>,
    pub scenarios: Vec<Scenario>,
    pub runs: Vec<SimulationRun>,
    pub settings: Settings,
}
impl Default for Snapshot {
    fn default() -> Self {
        Self {
            version: 1,
            profiles: vec![],
            observations: vec![],
            habit_days: vec![],
            batches: vec![],
            scenarios: vec![],
            runs: vec![],
            settings: Settings::default(),
        }
    }
}
pub fn id() -> String {
    uuid::Uuid::new_v4().to_string()
}
pub fn invalid(s: impl ToString) -> AppError {
    AppError::new("INVALID_DATA", s)
}
fn validate_target(t: &TargetDay) -> Result<()> {
    let values = [
        t.sleep_hours,
        t.steps,
        t.activity_minutes,
        t.exercise_minutes,
        t.walk_minutes,
        t.social_minutes,
        t.screen_minutes,
        t.gaming_minutes,
        t.alcohol_glasses,
        t.tobacco_cigarettes,
        t.vaping_minutes,
        t.evening_screen_minutes,
        t.sedentary_minutes,
    ];
    if values.iter().any(|v| !v.is_finite() || *v < 0.)
        || t.sleep_hours > 24.
        || t.steps > 200_000.
        || t.activity_minutes > 1_440.
        || t.exercise_minutes > 1_440.
        || t.walk_minutes > 1_440.
        || t.social_minutes > 1_440.
        || t.screen_minutes > 1_440.
        || t.gaming_minutes > 1_440.
        || t.alcohol_glasses > 20.
        || t.tobacco_cigarettes.fract() != 0.
        || t.tobacco_cigarettes > 100.
        || t.vaping_minutes > 1_440.
        || t.evening_screen_minutes > 1_440.
        || t.sedentary_minutes > 1_440.
    {
        return Err(invalid("Journée cible invalide."));
    }
    Ok(())
}
pub fn unit(metric: &str) -> Option<&'static str> {
    match metric {
        "weight" => Some("kg"),
        "sleep" => Some("h"),
        "steps" => Some("pas"),
        "activity" => Some("min"),
        "intake" => Some("kcal"),
        "stress" => Some("/10"),
        "exercise" | "walk" | "work" | "social" | "gaming" | "screen" | "reading" | "meal"
        | "rest" => Some("min"),
        "alcohol" => Some("verre"),
        "tobacco" => Some("cigarette"),
        "vaping" | "screen_evening" | "sedentary" => Some("min"),
        _ => None,
    }
}
pub fn validate_observation(o: &Observation) -> Result<()> {
    if o.id.is_empty()
        || o.source.is_empty()
        || o.source.len() > 500
        || NaiveDate::parse_from_str(&o.date, "%Y-%m-%d").is_err()
        || o.date.len() != 10
    {
        return Err(invalid("Date ou provenance invalide."));
    }
    let max = match o.metric.as_str() {
        "weight" => 700.,
        "sleep" => 24.,
        "steps" => 200_000.,
        "activity" => 1440.,
        "intake" => 30_000.,
        "stress" => 10.,
        "exercise" | "walk" | "work" | "social" | "gaming" | "screen" | "reading" | "meal"
        | "rest" => 1440.,
        "alcohol" => 20.,
        "tobacco" => 100.,
        "vaping" | "screen_evening" | "sedentary" => 1440.,
        _ => return Err(invalid("Mesure inconnue.")),
    };
    if !o.value.is_finite()
        || o.value < 0.
        || o.value > max
        || (o.metric == "weight" && o.value == 0.)
        || (o.metric == "steps" && o.value.fract() != 0.)
        || (o.metric == "tobacco" && o.value.fract() != 0.)
        || Some(o.unit.as_str()) != unit(&o.metric)
        || o.at.as_ref().is_some_and(|at| {
            let b = at.as_bytes();
            b.len() != 5
                || b[2] != b':'
                || !b[0].is_ascii_digit()
                || !b[1].is_ascii_digit()
                || !b[3].is_ascii_digit()
                || !b[4].is_ascii_digit()
                || (b[0] - b'0') * 10 + (b[1] - b'0') > 23
                || (b[3] - b'0') * 10 + (b[4] - b'0') > 59
        })
        || o.duration_minutes
            .is_some_and(|d| !d.is_finite() || !(0.0..=1440.0).contains(&d) || d == 0.0)
        || (o.duration_minutes.is_some() && unit(&o.metric) != Some("min"))
        || (o.at.is_some() && unit(&o.metric) == Some("min") && o.duration_minutes != Some(o.value))
    {
        return Err(invalid("Valeur ou unité invalide."));
    }
    Ok(())
}
pub fn validate(s: &Snapshot) -> Result<()> {
    if s.version != 1 {
        return Err(AppError::new(
            "UNSUPPORTED_VERSION",
            "Version de sauvegarde non prise en charge.",
        ));
    }
    if s.profiles.len() > 100 || s.observations.len() > 100_000 || s.habit_days.len() > 100_000 {
        return Err(invalid("Limite : 100 profils et 100 000 observations."));
    }
    let mut ids = HashSet::new();
    let mut habit_ids = HashSet::new();
    for p in &s.profiles {
        if p.id.is_empty()
            || !ids.insert(p.id.as_str())
            || p.name.trim().is_empty()
            || p.name.len() > 120
            || p.color.len() != 7
            || !p.color.starts_with('#')
            || u32::from_str_radix(&p.color[1..], 16).is_err()
        {
            return Err(invalid("Profil invalide."));
        }
        if p.height_cm
            .is_some_and(|h| !h.is_finite() || !(50.0..=250.0).contains(&h))
            || p.sex.as_ref().is_some_and(|v| v != "female" && v != "male")
        {
            return Err(invalid("Données physiques invalides."));
        }
        if let Some(target) = &p.target {
            validate_target(target)?;
        }
        let today = chrono::Local::now().date_naive().to_string();
        let active = p
            .habits
            .iter()
            .filter(|habit| {
                habit.start_date <= today
                    && habit.archived_at.as_ref().is_none_or(|date| date > &today)
            })
            .count();
        if active > 100 || p.habits.len() > 10_000 {
            return Err(invalid(
                "Limite : 100 habitudes actives et 10 000 habitudes au total par profil.",
            ));
        }
        for habit in &p.habits {
            if habit.id.is_empty()
                || !habit_ids.insert((p.id.as_str(), habit.id.as_str()))
                || habit.label.trim().is_empty()
                || habit.label.len() > 100
                || NaiveDate::parse_from_str(&habit.start_date, "%Y-%m-%d").is_err()
                || habit.start_date.len() != 10
                || habit.archived_at.as_ref().is_some_and(|date| {
                    NaiveDate::parse_from_str(date, "%Y-%m-%d").is_err()
                        || date.len() != 10
                        || date < &habit.start_date
                })
                || habit.metric.as_ref().is_some_and(|metric| {
                    unit(metric).is_none()
                        || matches!(
                            metric.as_str(),
                            "weight" | "sleep" | "steps" | "activity" | "intake" | "stress"
                        )
                })
            {
                return Err(invalid("Habitude invalide."));
            }
        }
        if let Some(d) = &p.birth_date {
            let date = NaiveDate::parse_from_str(d, "%Y-%m-%d")
                .map_err(|_| invalid("Date de naissance invalide."))?;
            if date > chrono::Local::now().date_naive() {
                return Err(invalid("Date de naissance future."));
            }
        }
    }
    let mut day_keys = HashSet::new();
    for day in &s.habit_days {
        let profile = s.profiles.iter().find(|p| p.id == day.profile_id);
        if profile.is_none()
            || !day_keys.insert((day.profile_id.as_str(), day.date.as_str()))
            || NaiveDate::parse_from_str(&day.date, "%Y-%m-%d").is_err()
            || day.date.len() != 10
            || day
                .validated_at
                .as_ref()
                .is_some_and(|stamp| chrono::DateTime::parse_from_rfc3339(stamp).is_err())
            || day
                .answers
                .keys()
                .any(|id| !habit_ids.contains(&(day.profile_id.as_str(), id.as_str())))
        {
            return Err(invalid("Journée d’habitudes invalide."));
        }
    }
    let mut batches = HashSet::new();
    let mut batch_ids = HashSet::new();
    for b in &s.batches {
        if b.id.is_empty()
            || !batch_ids.insert(&b.id)
            || !ids.contains(b.profile_id.as_str())
            || !batches.insert((b.profile_id.as_str(), b.id.as_str()))
        {
            return Err(invalid("Lot d’import invalide."));
        }
    }
    let mut obs_ids = HashSet::new();
    let mut keys = HashSet::new();
    for o in &s.observations {
        validate_observation(o)?;
        if !ids.contains(o.profile_id.as_str())
            || !obs_ids.insert(&o.id)
            || !keys.insert((
                &o.profile_id,
                &o.date,
                &o.metric,
                o.at.as_deref().unwrap_or(""),
            ))
            || o.batch_id
                .as_ref()
                .is_some_and(|b| !batches.contains(&(o.profile_id.as_str(), b.as_str())))
        {
            return Err(invalid("Observation orpheline ou dupliquée."));
        }
    }
    let mut scenario_ids = HashSet::new();
    for v in &s.scenarios {
        if v.id.is_empty()
            || !ids.contains(v.profile_id.as_str())
            || !scenario_ids.insert(&v.id)
            || v.name.trim().is_empty()
            || v.name.len() > 120
            || ![1, 3, 6, 12].contains(&v.months)
            || !v.intake_delta.is_finite()
            || v.intake_delta.abs() > 2000.
            || !v.activity_delta.is_finite()
            || v.activity_delta.abs() > 100.
        {
            return Err(invalid("Scénario invalide."));
        }
    }
    let mut run_ids = HashSet::new();
    for r in &s.runs {
        if r.id.is_empty()
            || !ids.contains(r.profile_id.as_str())
            || !run_ids.insert(&r.id)
            || r.model_version.is_empty()
        {
            return Err(invalid("Simulation orpheline ou invalide."));
        }
    }
    Ok(())
}
#[derive(Deserialize)]
#[serde(tag = "type", content = "value", rename_all = "camelCase")]
pub enum Mutation {
    SaveProfile(Profile),
    DeleteProfile(String),
    SaveObservation(Observation),
    SaveHabitDay(HabitDay),
    DeleteObservation {
        id: String,
        #[serde(rename = "profileId")]
        profile_id: String,
    },
    SaveScenario(Scenario),
    DeleteScenario {
        id: String,
        #[serde(rename = "profileId")]
        profile_id: String,
    },
    Settings(Settings),
    Demo,
}
pub fn mutate(s: &mut Snapshot, m: Mutation) -> Result<()> {
    match m {
        Mutation::SaveProfile(p) => {
            s.profiles.retain(|x| x.id != p.id);
            s.profiles.push(p);
        }
        Mutation::DeleteProfile(id) => {
            s.profiles.retain(|x| x.id != id);
            s.observations.retain(|x| x.profile_id != id);
            s.habit_days.retain(|x| x.profile_id != id);
            s.batches.retain(|x| x.profile_id != id);
            s.scenarios.retain(|x| x.profile_id != id);
            s.runs.retain(|x| x.profile_id != id);
        }
        Mutation::SaveObservation(o) => {
            if s.observations
                .iter()
                .any(|x| x.id == o.id && x.profile_id != o.profile_id)
            {
                return Err(invalid("Profil différent."));
            }
            s.observations.retain(|x| x.id != o.id);
            s.observations.push(o);
        }
        Mutation::SaveHabitDay(day) => {
            s.habit_days
                .retain(|x| x.profile_id != day.profile_id || x.date != day.date);
            s.habit_days.push(day);
        }
        Mutation::DeleteObservation { id, profile_id } => s
            .observations
            .retain(|x| x.id != id || x.profile_id != profile_id),
        Mutation::SaveScenario(v) => {
            if s.scenarios
                .iter()
                .any(|x| x.id == v.id && x.profile_id != v.profile_id)
            {
                return Err(invalid("Profil différent."));
            }
            s.scenarios.retain(|x| x.id != v.id);
            s.scenarios.push(v)
        }
        Mutation::DeleteScenario { id, profile_id } => s
            .scenarios
            .retain(|x| x.id != id || x.profile_id != profile_id),
        Mutation::Settings(v) => s.settings = v,
        Mutation::Demo => {
            let pid = id();
            let start_date =
                (chrono::Local::now().date_naive() - chrono::Duration::days(13)).to_string();
            let demo_habits: Vec<HabitDefinition> = [
                ("Courir / faire du sport", HabitKind::Good, "exercise"),
                ("Lire", HabitKind::Good, "reading"),
                ("Fumer", HabitKind::Bad, "tobacco"),
                ("Écran le soir", HabitKind::Bad, "screen_evening"),
            ]
            .into_iter()
            .map(|(label, kind, metric)| HabitDefinition {
                id: id(),
                label: label.into(),
                kind,
                start_date: start_date.clone(),
                archived_at: None,
                metric: Some(metric.into()),
            })
            .collect();
            s.profiles.push(Profile {
                id: pid.clone(),
                name: "Alex · Démo".into(),
                birth_date: Some("1994-04-12".into()),
                sex: Some("male".into()),
                height_cm: Some(178.),
                color: "#bde883".into(),
                demo: true,
                target: Some(TargetDay::default()),
                habits: demo_habits.clone(),
            });
            for offset in (0..14).rev() {
                let date = (chrono::Local::now().date_naive() - chrono::Duration::days(offset))
                    .to_string();
                let answers = demo_habits
                    .iter()
                    .enumerate()
                    .map(|(index, habit)| {
                        (
                            habit.id.clone(),
                            if index < 2 {
                                (offset + index as i64) % 4 != 0
                            } else {
                                (offset + index as i64) % 5 == 0
                            },
                        )
                    })
                    .collect();
                s.habit_days.push(HabitDay {
                    profile_id: pid.clone(),
                    date,
                    answers,
                    validated_at: Some(chrono::Utc::now().to_rfc3339()),
                });
            }
            for day in 0..28 {
                let d = (chrono::Local::now().date_naive() - chrono::Duration::days(27 - day))
                    .to_string();
                for (metric, value) in [
                    (
                        "weight",
                        76.4 - day as f64 * 0.025 + (day as f64 * 1.7).sin() * 0.2,
                    ),
                    ("sleep", 7.1 + (day as f64).sin() * 0.7),
                    (
                        "steps",
                        (6200. + day as f64 * 57. + (day as f64).sin() * 1400.).round(),
                    ),
                    ("activity", if day % 3 == 0 { 45. } else { 20. }),
                    ("stress", 4. + (day % 3) as f64),
                ] {
                    s.observations.push(Observation {
                        id: id(),
                        profile_id: pid.clone(),
                        date: d.clone(),
                        metric: metric.into(),
                        value: (value * 100.).round() / 100.,
                        unit: unit(metric).unwrap().into(),
                        source: "Démonstration fictive".into(),
                        batch_id: None,
                        at: None,
                        duration_minutes: None,
                    });
                }
            }
            let now = chrono::Local::now();
            for (metric, value, minutes_ago) in [
                ("exercise", 30., 90),
                ("walk", 25., 180),
                ("sedentary", 120., 280),
                ("work", 150., 400),
                ("social", 55., 540),
                ("screen", 35., 650),
                ("gaming", 80., 750),
                ("alcohol", 2., 830),
                ("tobacco", 2., 910),
                ("vaping", 10., 990),
                ("screen_evening", 45., 1070),
                ("meal", 30., 1150),
                ("reading", 25., 1230),
                ("rest", 20., 1310),
            ] {
                let when = now - chrono::Duration::minutes(minutes_ago);
                s.observations.push(Observation {
                    id: id(),
                    profile_id: pid.clone(),
                    date: when.date_naive().to_string(),
                    metric: metric.into(),
                    value,
                    unit: unit(metric).unwrap().into(),
                    source: "Démonstration fictive".into(),
                    batch_id: None,
                    at: Some(when.format("%H:%M").to_string()),
                    duration_minutes: if unit(metric) == Some("min") {
                        Some(value)
                    } else {
                        None
                    },
                });
            }
        }
    }
    validate(s)
}
#[cfg(test)]
mod journal_regressions {
    use super::*;
    #[test]
    fn declared_zero_is_valid_without_a_timeline_event_but_counts_are_integers() {
        let mut o = Observation {
            id: "zero".into(),
            profile_id: "p".into(),
            date: "2026-10-01".into(),
            metric: "vaping".into(),
            value: 0.,
            unit: "min".into(),
            source: "Saisie manuelle".into(),
            batch_id: None,
            at: None,
            duration_minutes: None,
        };
        validate_observation(&o).unwrap();
        o.at = Some("12:00".into());
        o.duration_minutes = Some(0.);
        assert!(validate_observation(&o).is_err());
        o.at = None;
        o.duration_minutes = None;
        o.metric = "tobacco".into();
        o.unit = "cigarette".into();
        o.value = 0.5;
        assert!(validate_observation(&o).is_err());
        o.value = 1.;
        validate_observation(&o).unwrap();
    }
    #[test]
    fn retired_habits_do_not_consume_the_active_limit_and_history_remains_valid() {
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        let p = &mut s.profiles[0];
        for n in 0..100 {
            p.habits.push(HabitDefinition {
                id: format!("old-{n}"),
                label: "Old habit".into(),
                kind: HabitKind::Good,
                start_date: "2020-01-01".into(),
                archived_at: Some("2020-01-02".into()),
                metric: None,
            });
        }
        validate(&s).unwrap();
        let p = &mut s.profiles[0];
        for n in 0..101 {
            p.habits.push(HabitDefinition {
                id: format!("new-{n}"),
                label: "Active habit".into(),
                kind: HabitKind::Good,
                start_date: "2020-01-01".into(),
                archived_at: None,
                metric: None,
            });
        }
        assert!(validate(&s).is_err());
    }
}
