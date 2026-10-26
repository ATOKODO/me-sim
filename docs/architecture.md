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
| `config/`                   | Résolutions de référence partagées par Storybook et les tests de captures.              |
| `docs/`                     | Guides français, versions anglaises dans `en/` et configuration VitePress.              |

## Contrats et persistance

Les principales entités sont `Profile`, `Observation`, `HabitDefinition`, `HabitDay`, `ImportBatch`, `Scenario` et `SimulationRun`. Le profil possède aussi son `TargetDay`. Les données enregistrées portent leur appartenance à un profil ; les préférences de présentation concernent l’espace local entier.

Les commandes exposées comprennent `initial_state`, `mutate`, `choose_import`, `preview_import`, `commit_import`, `export_data`, `preview_restore`, `commit_restore` et `run_simulation`. Les sélecteurs natifs donnent accès aux fichiers choisis, puis des jetons opaques identifient les aperçus d’import ou de restauration conservés en mémoire côté Rust.

Une révision SQLite accompagne les lectures et les mutations. Une tentative périmée est refusée, les données sont rechargées et l’utilisateur vérifie son brouillon avant de réessayer. Les mutations, imports et synchronisations écrivent uniquement les lignes modifiées dans une transaction avec contrôle de révision ; le remplacement global est réservé à la restauration. L’ordre des entités et les effets liés aux habitudes et sessions sont conservés. Le contrat IPC échange encore des snapshots complets : la lecture, la validation et la sérialisation dépendent donc toujours du volume de l’historique.

La confirmation d’import indexe les observations par profil, date, métrique et clé temporelle canonique. Les ajouts enrichissent cet index immédiatement ; les doublons d’un même fichier et les sessions précises partageant une minute restent distincts selon cette clé. Les rafraîchissements du frontal sont sérialisés, différés pendant une écriture et appliqués seulement si leur révision est plus récente.

La sauvegarde JSON possède une version indépendante du numéro de migration SQLite. Une version non prise en charge est refusée avant remplacement. Les transactions et la copie préventive protègent la restauration contre une écriture partielle.

## État métier et rendu

L’horloge locale met à jour calendrier, récap et fenêtre de timeline. Les calculs de récap, de couverture et de déviation sont séparés du rendu. Une observation absente reste inconnue ; une valeur explicitement nulle reste une valeur déclarée.

La scène Three.js est chargée à la demande. La caméra appartient à chaque scène et les ressources sont libérées à la destruction. Si WebGL est indisponible ou que son contexte est perdu, la scène affiche un message avec une action pour réessayer. Aucun avatar 2D n’est généré ; les autres fonctionnalités restent accessibles. La scène reçoit la variante d’apparence (`default` ou `female`) dérivée du profil, sans nouvelle donnée persistée. Les clips sont indexés par variante et activité ; un modèle et un mixer sont partagés par fichier GLB. Le chargeur distingue les états de chargement, de modèle d’artiste et de repli procédural : pendant la lecture du manifeste ou du GLB, le personnage reste masqué dans la pièce. Le repli procédural apparaît uniquement lorsqu’aucun remplacement n’est fourni ou qu’un chargement échoue. Un chargement terminé après un changement de profil ne peut pas remplacer la variante courante, et les modèles mis en cache sont libérés à la destruction. Le [guide d’artiste](./artist-animation-guide.md) définit le contrat de remplacement.

Le rendu animé est limité à environ 30 images par seconde et suspendu lorsque le document est masqué ou la scène hors écran. Sans animations, une image est produite après un changement de caméra, de taille, de modèle ou d’état ; aucune boucle de dessin permanente n’est maintenue. Les observateurs et écouteurs sont libérés à la destruction de la scène.

Le moteur de recherche du poids reste inaccessible aux projections utilisateur. Voir la [fiche modèle](./model-card.md) pour ses équations implémentées et les critères d’activation manquants.

## Documentation et catalogue

VitePress 1.6.4 transforme les guides de `docs/` et `docs/en/` en site statique, avec navigation traduite et index de recherche locaux. Storybook expose les styles et composants de l’application. Ces outils sont des dépendances de développement et ne font pas partie du paquet Tauri.

La configuration du site est dans `docs/.vitepress/config.mts`, son thème dans `docs/.vitepress/theme/` et ses assets dédiés dans `docs/public/`. Cache et sortie de build sont ignorés par Git. La CI construit la documentation, vérifie la parité des pages et sections entre langues, les liens internes et les captures aux quatre résolutions partagées. Aucune publication automatique n’est configurée.

Les [commandes de démarrage](./getting-started.md#lancer-cette-documentation), le [protocole visuel](./design-system.md) et les [preuves de validation](./validation.md) permettent de vérifier les changements avant livraison.
