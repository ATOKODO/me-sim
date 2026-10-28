# Spécifications {#specifications}

Ces documents décrivent le comportement du code présent dans le dépôt. Une référence dans une déclaration renvoie au contrat technique correspondant ; elle ne garantit pas à elle seule que le comportement est validé par un test. Les guides utilisateur et les documents de validation restent les références pour l’utilisation et les vérifications effectuées.

## Fonctionnel {#fonctionnel}

- [Interface et parcours](./specs/frontend-functional.md) : profils, journal, habitudes, scènes et préférences.
- [Données et opérations natives](./specs/rust-fonctionnelle.md) : persistance, échanges et limites scientifiques.
- [Compagnon mobile](./specs/companion-functional.md) : saisie locale, appairage et synchronisation.

## Technique {#technique}

- [Frontal Angular et scène 3D](./specs/frontend-technical.md).
- [Services Rust et stockage](./specs/rust-technique.md).
- [Compagnon mobile](./specs/companion-technical.md).
- [Outils et tests](./specs/tooling-technical.md).

Les identifiants de ces contrats sont uniques. Plusieurs fonctions peuvent participer au même contrat ; les méthodes portent leur propre référence. Les bibliothèques tierces, fichiers générés et ressources binaires ne font pas partie du périmètre maintenu ici.

## Limites et évolution {#limites-et-evolution}

Les annotations décrivent une liaison documentaire, pas une preuve d’exécution, de sécurité ou de conformité. Les fonctions anonymes et le code produit par des générateurs ou des macros peuvent échapper à l’indexation. À chaque changement de comportement, mettre à jour la section correspondante, l’annotation si nécessaire et les tests pertinents. Le [guide de validation](./validation.md) explique les contrôles locaux.
