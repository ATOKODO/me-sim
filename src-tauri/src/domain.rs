use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
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
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub birth_date: Option<String>,
    pub sex: Option<String>,
    pub height_cm: Option<f64>,
    pub color: String,
    pub demo: bool,
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
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub animations: bool,
    pub jitter: bool,
    pub force_2d: bool,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            animations: true,
            jitter: false,
            force_2d: false,
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Snapshot {
    pub version: u32,
    pub profiles: Vec<Profile>,
    pub observations: Vec<Observation>,
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
pub fn unit(metric: &str) -> Option<&'static str> {
    match metric {
        "weight" => Some("kg"),
        "sleep" => Some("h"),
        "steps" => Some("pas"),
        "activity" => Some("min"),
        "intake" => Some("kcal"),
        "stress" => Some("/10"),
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
        _ => return Err(invalid("Mesure inconnue.")),
    };
    if !o.value.is_finite()
        || o.value < 0.
        || o.value > max
        || (o.metric == "weight" && o.value == 0.)
        || (o.metric == "steps" && o.value.fract() != 0.)
        || Some(o.unit.as_str()) != unit(&o.metric)
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
    if s.profiles.len() > 100 || s.observations.len() > 100_000 {
        return Err(invalid("Limite : 100 profils et 100 000 observations."));
    }
    let mut ids = HashSet::new();
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
        if let Some(d) = &p.birth_date {
            let date = NaiveDate::parse_from_str(d, "%Y-%m-%d")
                .map_err(|_| invalid("Date de naissance invalide."))?;
            if date > chrono::Local::now().date_naive() {
                return Err(invalid("Date de naissance future."));
            }
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
            || !keys.insert((&o.profile_id, &o.date, &o.metric))
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
            s.profiles.push(Profile {
                id: pid.clone(),
                name: "Alex · Démo".into(),
                birth_date: Some("1994-04-12".into()),
                sex: Some("male".into()),
                height_cm: Some(178.),
                color: "#bde883".into(),
                demo: true,
            });
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
                    });
                }
            }
        }
    }
    validate(s)
}
