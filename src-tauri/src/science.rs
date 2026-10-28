//! Research-only implementation of the linearized late-phase equations (11–15),
//! Hall et al., Lancet 2011 web appendix. NOT the complete adult dynamic model.
//! This module is deliberately unreachable from the production simulation command.
use crate::domain::*;
use serde::Serialize;
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelDefinition {
    pub id: &'static str,
    pub version: &'static str,
    pub name: &'static str,
    pub status: &'static str,
    pub enabled: bool,
    pub reasons: Vec<&'static str>,
    pub source: &'static str,
    pub horizons: Vec<u32>,
}
// @spec TECH-RUST-112
pub fn definition() -> ModelDefinition {
    ModelDefinition{id:"hall-2011",version:"0.1.0-research",name:"Hall · NIDDK (2011)",status:"validation_pending",enabled:false,reasons:vec!["Le module de recherche couvre seulement la phase linéarisée tardive ; glycogène et fluides restent à implémenter.","La licence de redistribution du modèle complet et son domaine d’utilisation doivent être confirmés.","Les courbes de référence publiées ne sont pas encore reproduites : aucun horizon n’est activé."],source:"https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner",horizons:vec![]}
}
// @spec TECH-RUST-112
pub fn run(profile: &Profile, s: &Scenario) -> Result<SimulationRun> {
    if profile.birth_date.is_none() || profile.sex.is_none() || profile.height_cm.is_none() {
        return Err(AppError::new(
            "INSUFFICIENT_DATA",
            "Complétez date de naissance, sexe physiologique et taille.",
        ));
    }
    let date = chrono::NaiveDate::parse_from_str(profile.birth_date.as_ref().unwrap(), "%Y-%m-%d")
        .map_err(|_| invalid("Naissance invalide."))?;
    if chrono::Local::now()
        .date_naive()
        .years_since(date)
        .unwrap_or(0)
        < 18
    {
        return Err(AppError::new(
            "OUTSIDE_DOMAIN",
            "Modèle réservé aux adultes ; aucun calcul effectué.",
        ));
    }
    if ![1, 3, 6, 12].contains(&s.months) {
        return Err(AppError::new(
            "OUTSIDE_DOMAIN",
            "Horizon non pris en charge.",
        ));
    }
    Err(AppError::new("MODEL_NOT_VALIDATED","Projection indisponible : validation du modèle scientifique en cours. Aucun résultat n’a été inventé."))
}
#[allow(dead_code)]
pub struct LinearInputs {
    pub weight_kg: f64,
    pub fat_kg: f64,
    pub activity_kj_kg_day: f64,
    pub intake_delta_kj_day: f64,
    pub activity_delta_kj_kg_day: f64,
}
// @spec TECH-RUST-112
#[allow(dead_code)]
pub fn research_late_phase(p: &LinearInputs, days: u32) -> Result<Vec<f64>> {
    if days > 365
        || ![
            p.weight_kg,
            p.fat_kg,
            p.activity_kj_kg_day,
            p.intake_delta_kj_day,
            p.activity_delta_kj_kg_day,
        ]
        .iter()
        .all(|x| x.is_finite())
        || p.weight_kg <= 0.
        || p.fat_kg <= 0.
        || p.fat_kg >= p.weight_kg
        || p.activity_kj_kg_day + p.activity_delta_kj_kg_day < 0.
    {
        return Err(invalid("Paramètres de recherche invalides."));
    }
    let alpha = 10.4 / p.fat_kg;
    let rho = (39500. + 750. + alpha * (7600. + 960.)) / (1. + alpha);
    let epsilon =
        (13. + alpha * 92.) / (1. + alpha) + p.activity_kj_kg_day + p.activity_delta_kj_kg_day;
    let forcing = 0.76 * p.intake_delta_kj_day - p.activity_delta_kj_kg_day * p.weight_kg;
    Ok((0..=days)
        .map(|t| p.weight_kg + forcing / epsilon * (1. - (-epsilon * t as f64 / rho).exp()))
        .collect())
}
#[cfg(test)]
mod tests {
    use super::*;
    // @spec TECH-RUST-113
    #[test]
    fn equilibrium_and_direction_are_deterministic() {
        let mut p = LinearInputs {
            weight_kg: 80.,
            fat_kg: 20.,
            activity_kj_kg_day: 30.,
            intake_delta_kj_day: 0.,
            activity_delta_kj_kg_day: 0.,
        };
        assert!(research_late_phase(&p, 365)
            .unwrap()
            .iter()
            .all(|w| *w == 80.));
        p.intake_delta_kj_day = -1000.;
        let a = research_late_phase(&p, 365).unwrap();
        assert_eq!(a, research_late_phase(&p, 365).unwrap());
        assert!(a.windows(2).all(|v| v[1] < v[0]));
        assert!(!definition().enabled);
        assert!(definition().horizons.is_empty());
    }
    // @spec TECH-RUST-113
    #[test]
    fn endpoint_never_leaks_research_results() {
        let mut s = Snapshot::default();
        mutate(&mut s, Mutation::Demo).unwrap();
        let scenario = Scenario {
            id: id(),
            profile_id: s.profiles[0].id.clone(),
            name: "test".into(),
            months: 12,
            intake_delta: -100.,
            activity_delta: 0.,
        };
        assert_eq!(
            run(&s.profiles[0], &scenario).unwrap_err().code,
            "MODEL_NOT_VALIDATED"
        );
    }
}
