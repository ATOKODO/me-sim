# Scientific model — Hall / NIDDK {#modele-scientifique-—-hall-niddk}

Identifier: `hall-2011` · research version `0.1.0-research` · **disabled**.

## Sources consulted on 17 September 2026 {#sources-consultees-le-17-septembre-2026}

- [NIDDK: research behind the Body Weight Planner](https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner).
- Hall KD et al. _Quantification of the effect of energy imbalance on bodyweight_. Lancet 2011;378:826–837. DOI: 10.1016/S0140-6736(11)60812-X.
- [Published mathematical appendix](https://www.niddk.nih.gov/-/media/Files/Labs-Branches-Sections/laboratory-biological-modeling/integrative-physiology-section/Hall-Lancet-Web-Appendix_508.pdf).
- [NIDDK copyright policy](https://www.niddk.nih.gov/copyright).

Public access to a document alone does not establish redistribution rights for complete software. No NIDDK simulator code, published figure or clinical database is redistributed here. The complete model's license status is **to be confirmed**, not royalty-free. The patented tracking technology presented separately by NIDDK is not implemented.

## Implemented scope {#perimetre-implemente}

A pure Rust module reproduces an analytical response of the linearized late phase (equations 11–15). Research inputs: initial weight, initial fat mass, activity in kJ/kg/day and energy changes. Internal output: a deterministic daily series. Coefficients carry kJ and kg units.

This approximation assumes stabilized fast compartments and modest composition changes. It excludes initial glycogen, extracellular fluid and adaptive thermogenesis dynamics. It must therefore not display an individual trajectory starting today.

The native API cannot call this function. `run_simulation` checks initial input conditions then returns `MODEL_NOT_VALIDATED`. No horizon, probabilistic result or confidence interval is enabled.

## Domain and inputs of the complete candidate {#domaine-et-entrees-du-candidat-complet}

The source page reserves the tool for adults, excluding pregnancy and breastfeeding. These exclusions must be explicitly collected before activation. Current profiles do not contain all complete-model inputs: body composition, activity parameters, initial intake, carbohydrates and sodium require a validated specification and dedicated interface. Missing data must never be silently replaced with an average.

Scenarios store a requested horizon of 1, 3, 6 or 12 months, an intake change in kcal/day and an activity-parameter change in kJ/kg/day. These are not scientifically authorized horizons or recommendations. The conventional energy conversion is 1 kcal = 4.184 kJ. No automatic conversion from sessions/steps to energy is provided.

## Conditions required for activation {#conditions-necessaires-a-l-activation}

1. Confirm rights, exact version and domain of the complete model.
2. Implement every compartment and its initialization, then document the solver and input handling.
3. Create independent, traceable numerical fixtures from published references; retain units, population and provenance.
4. Define tolerance from reference precision and the solver before comparison. **No validated clinical or numerical tolerance is currently set.**
5. Reproduce these references, have results reviewed and enable only supported horizons.
6. Make assumptions, versions, inputs and results exportable. A sensitivity analysis must not be called a confidence interval without a probabilistic justification.

Existing determinism, equilibrium and direction tests replace none of these steps. Scientific validation remains an explicitly unfinished part of this delivery.
