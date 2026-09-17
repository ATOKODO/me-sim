# Modèle scientifique — Hall / NIDDK

Identifiant : `hall-2011` · version de recherche `0.1.0-research` · **désactivé**.

## Sources consultées le 17 septembre 2026

- [NIDDK : recherche derrière le Body Weight Planner](https://www.niddk.nih.gov/research-funding/at-niddk/labs-branches/laboratory-biological-modeling/integrative-physiology-section/research/body-weight-planner).
- Hall KD et al. *Quantification of the effect of energy imbalance on bodyweight*. Lancet 2011;378:826–837. DOI : 10.1016/S0140-6736(11)60812-X.
- [Annexe mathématique publiée](https://www.niddk.nih.gov/-/media/Files/Labs-Branches-Sections/laboratory-biological-modeling/integrative-physiology-section/Hall-Lancet-Web-Appendix_508.pdf).
- [Politique de copyright du NIDDK](https://www.niddk.nih.gov/copyright).

L’accessibilité publique d’un document ne démontre pas à elle seule les droits de redistribution d’un logiciel complet. Aucun code du simulateur NIDDK, figure publiée ou base clinique n’est redistribué ici. Le statut de licence du modèle complet est marqué **à confirmer**, pas « libre de droits ». La technologie de suivi brevetée présentée séparément par le NIDDK n’est pas implémentée.

## Périmètre implémenté

Un module Rust pur reproduit une réponse analytique de la phase tardive linéarisée (équations 11–15). Entrées de recherche : poids initial, masse grasse initiale, activité en kJ/kg/j et variations énergétiques. Sortie interne : série quotidienne déterministe. Les coefficients portent leurs unités en kJ et kg.

Cette approximation suppose les compartiments rapides stabilisés et de modestes variations de composition. Elle n’inclut pas les dynamiques initiales du glycogène, des fluides extracellulaires et de la thermogenèse adaptative. Elle ne doit donc pas être utilisée pour afficher une trajectoire individuelle depuis aujourd’hui.

L’API native ne permet pas d’appeler cette fonction. `run_simulation` vérifie les premières conditions d’entrée puis retourne `MODEL_NOT_VALIDATED`. Aucun horizon, résultat probabiliste ou intervalle de confiance n’est activé.

## Domaine et entrées du candidat complet

La page source réserve l’outil aux adultes, hors grossesse et allaitement. Ces exclusions devront être saisies explicitement avant toute activation. Les profils actuellement enregistrés ne contiennent pas toutes les entrées du modèle complet : composition corporelle, paramètres d’activité, apports initiaux, glucides et sodium nécessitent une spécification validée et une interface dédiée. Une donnée manquante ne doit jamais être remplacée silencieusement par une moyenne.

Les scénarios enregistrent un horizon souhaité de 1, 3, 6 ou 12 mois, une variation d’apports en kcal/j et une variation du paramètre d’activité en kJ/kg/j. Il ne s’agit pas d’horizons scientifiques autorisés ni de recommandations. La conversion énergétique conventionnelle est 1 kcal = 4,184 kJ. Aucune conversion automatique de séances/pas vers énergie.

## Conditions nécessaires à l’activation

1. Confirmer les droits, la version exacte et le domaine du modèle complet.
2. Implémenter tous les compartiments et leur initialisation, puis documenter le solveur et la gestion des entrées.
3. Constituer des fixtures numériques indépendantes et traçables issues de références publiées ; conserver leurs unités, population et provenance.
4. Définir la tolérance à partir de la précision des références et du solveur, avant comparaison. **Aucune tolérance clinique ou numérique validée n’est actuellement fixée.**
5. Reproduire ces références, faire revoir les résultats et n’activer que les horizons réellement étayés.
6. Rendre les hypothèses, versions, entrées et résultats exportables. Une analyse de sensibilité ne doit pas être nommée intervalle de confiance sans justification probabiliste.

Les tests de déterminisme, d’équilibre et de direction actuellement présents ne remplacent aucune de ces étapes. La validation scientifique reste un travail explicitement non achevé de cette livraison.
