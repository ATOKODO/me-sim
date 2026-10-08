# Architecture du projet

## Les trois parties

| Partie          | Responsabilité                                                               |
| --------------- | ---------------------------------------------------------------------------- |
| Angular         | Écrans, formulaires, routes par fonctionnalité et état réactif avec Signals. |
| Tauri 2 et Rust | Commandes natives, validation, SQLite, migrations et échanges de fichiers.   |
| Three.js        | Scène rétro, caméra, animations et gestion des ressources GPU.               |

Le frontal transmet des opérations typées aux commandes Tauri. Rust valide les entrées et l’appartenance des données à un profil avant l’écriture. Le rendu 3D reçoit un mode d’activité et des préférences ; il ne calcule pas de résultat clinique.

## Organisation des sources

| Dossier                     | Contenu                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `src/app/core/`             | Contrats, Store Signals, horloge, calculs quotidiens, traductions et composants de base. |
| `src/app/pages/`            | Tableau de bord, journal, habitudes, scénarios, données, profils et préférences.         |
| `src/app/ui/`               | Composants et directives partagés avec le catalogue.                                     |
| `src/design-system/`        | Tokens de couleurs et d’espacement.                                                      |
| `src/app/scene/`            | Composant de scène, pièce Three.js et chargement des animations d’artiste.               |
| `src-tauri/src/`            | Domaine, persistance, échanges, verrou scientifique et commandes Tauri.                  |
| `public/avatar/`            | Manifeste et fichiers GLB utilisés par l’application.                                    |
| `art/avatar/`               | Sources FBX, texture et fichier Blender éditable.                                        |
| `stories/` et `.storybook/` | Catalogue local, configuration et exemples fictifs.                                      |
| `tests/` et `scripts/`      | Tests fonctionnels, références visuelles, contrôles d’assets et sondes natives.          |
| `docs/`                     | Guides Markdown et configuration VitePress.                                              |

## Contrats et persistance

Les principales entités sont `Profile`, `Observation`, `HabitDefinition`, `HabitDay`, `ImportBatch`, `Scenario` et `SimulationRun`. Le profil possède aussi son `TargetDay`. Les données enregistrées portent leur appartenance à un profil ; les préférences de présentation concernent l’espace local entier.

Les commandes exposées comprennent `initial_state`, `mutate`, `choose_import`, `preview_import`, `commit_import`, `export_data`, `preview_restore`, `commit_restore` et `run_simulation`. Les sélecteurs natifs donnent accès aux fichiers choisis, puis des jetons opaques identifient les aperçus d’import ou de restauration conservés en mémoire côté Rust.

Une révision SQLite accompagne les lectures et les mutations. Une tentative périmée est refusée, les données sont rechargées et l’utilisateur vérifie son brouillon avant de réessayer. L’implémentation actuelle réécrit encore le snapshot complet lors des mutations ordinaires ; les [refactorings proposés](./refactoring-review-2026-10-07.md) décrivent une évolution vers des transactions ciblées.

La sauvegarde JSON possède une version indépendante du numéro de migration SQLite. Une version non prise en charge est refusée avant remplacement. Les transactions et la copie préventive protègent la restauration contre une écriture partielle.

## État métier et rendu

L’horloge locale met à jour calendrier, récap et fenêtre de timeline. Les calculs de récap, de couverture et de déviation sont séparés du rendu. Une observation absente reste inconnue ; une valeur explicitement nulle reste une valeur déclarée.

La scène Three.js est chargée à la demande. La caméra appartient à chaque scène et les ressources sont libérées à la destruction. Si WebGL est indisponible ou que son contexte est perdu, la scène affiche un message avec une action pour réessayer. Aucun avatar 2D n’est généré ; les autres fonctionnalités restent accessibles. Les clips d’un même GLB partagent un modèle et un mixer ; le [guide d’artiste](./artist-animation-guide.md) définit le contrat de remplacement.

Le moteur de recherche du poids reste inaccessible aux projections utilisateur. Voir la [fiche modèle](./model-card.md) pour ses équations implémentées et les critères d’activation manquants.

## Documentation et catalogue

VitePress 1.6.4 transforme directement les guides de `docs/` en site statique, avec navigation française et index de recherche local. Storybook expose les styles et composants de l’application. Ces outils sont des dépendances de développement et ne font pas partie du paquet Tauri.

La configuration du site est dans `docs/.vitepress/config.mts`, son thème dans `docs/.vitepress/theme/` et ses assets dédiés dans `docs/public/`. Cache et sortie de build sont ignorés par Git. La CI est configurée pour construire la documentation et vérifier les liens internes. Aucune publication automatique n’est configurée.

Les [commandes de démarrage](./getting-started.md#lancer-cette-documentation), le [protocole visuel](./design-system.md) et les [preuves de validation](./validation.md) permettent de vérifier les changements avant livraison.
