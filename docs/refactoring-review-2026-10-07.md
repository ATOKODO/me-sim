# Revue des refactorings — 7 octobre 2026 {#refactoring-review-—-7-october-2026}

Revue de l’arbre de travail actuel, y compris les changements Storybook/design système non commités. Périmètre : état et pages Angular, contrats métier, mutations SQLite, imports, traduction des erreurs et styles partagés. Cette revue modifie uniquement la documentation.

**Suivi du 26 octobre 2026 :** les recherches à la confirmation d’import sont maintenant indexées et les transactions ordinaires ne réécrivent que les lignes modifiées. Les sections 1 et 2 ci-dessous décrivent le constat historique ; le contrat IPC conserve des snapshots complets. Les rafraîchissements obsolètes et le rendu 3D permanent des scènes fixes ou hors écran sont également corrigés. Voir l’[architecture actuelle](./architecture.md).

Les corrections de concurrence, données inconnues contre zéro, changement de date et imports restent couvertes par des tests réussis. Les constats concernent la maintenabilité et la montée en charge ; aucun nouveau défaut utilisateur n’est reproduit. Les estimations de complexité viennent de la lecture du code, sans benchmark.

<!-- prettier-ignore -->
## 1. Priorité haute : remplacer les écritures complètes par des transactions ciblées {#_1-high-priority-replace-whole-database-writes-with-targeted-transactions}

Preuves : `src-tauri/src/store.rs:29` appelle `load`, la mutation métier et `replace` pour chaque mutation ordinaire. `replace`, ligne 110, valide tout le snapshot et efface toutes les tables métier et paramètres ligne 120 avant de réinsérer les lignes. `src/app/core/store.ts:143` reçoit un autre snapshot complet. Une réponse à une habitude ou un changement de thème traite donc les données de tous les profils.

Le coût des écritures courantes augmente avec tout l’historique, le verrou partagé reste détenu pendant ce travail et les changements de stockage sont difficiles à isoler. Le frontal envoie aussi des profils complets pour modifier le Target ou ajouter/archiver une habitude. Les révisions protègent actuellement ces écritures ; le défaut de perte de mise à jour corrigé n’est pas considéré comme réapparu.

Procéder par étapes :

- Introduire des opérations spécifiques : paramètres, journée d’habitudes, champs de profil, Target, archivage d’habitude.
- Comparer la révision attendue dans la transaction d’écriture, mettre à jour seulement les lignes concernées et incrémenter la révision dans cette même transaction.
- Réserver le remplacement complet à la restauration et conserver le contrat de sauvegarde JSON.
- Garder d’abord des réponses compatibles ; renvoyer ensuite les entités/révision affectées et ajouter des requêtes d’historique par profil pour réduire sérialisation et invalidations du frontal.

Commencer par les paramètres et journées d’habitudes. Conserver les tests existants de concurrence à deux connexions, rollback, isolation et aller-retour de sauvegarde comme critères.

<!-- prettier-ignore -->
## 2. Priorité haute : indexer les recherches à la confirmation d’import {#_2-high-priority-index-import-commit-lookups}

Preuves : `src-tauri/src/exchange.rs:383` construit déjà une table de hachage pour l’aperçu, mais `commit`, ligne 439, parcourt toutes les observations avec `iter().position` pour chaque ligne entrante, ligne 452. Les observations ajoutées agrandissent le vecteur parcouru par les lignes suivantes.

Pour m lignes entrantes et n observations existantes, le travail de recherche est O(mn + m²). Le lecteur autorise 50 000 lignes par feuille ; les petites fixtures ne couvrent pas le parcours le plus coûteux.

Construire un index par profil, date, métrique et heure facultative, puis le maintenir après ajout/remplacement. Conserver les identifiants d’observation lors des remplacements et la provenance du lot. Une étape ultérieure peut déplacer la résolution indexée des conflits dans la transaction SQLite ciblée du point 1.

Vérifier les doublons avec la base et dans un même fichier, les politiques ignorer/remplacer, les dates identiques entre profils, plusieurs événements horaires et l’annulation après échec tardif. Ajouter un benchmark distinct d’import synthétique volumineux plutôt qu’une assertion fragile de durée dans les tests unitaires.

<!-- prettier-ignore -->
## 3. Priorité moyenne : définir un contrat de métriques et séparer les utilitaires navigateur {#_3-medium-priority-define-one-metric-contract-and-separate-browser-utilities}

Preuves : `src/app/core/models.ts:194` définit unités, maxima, règles entières et événements. Rust répète unités/validation dans `src-tauri/src/domain.rs:247` et ligne 263 ; le Target a aussi ses règles dans `domain.rs:211` et `src/app/pages/dashboard.ts:612`. Les imports maintiennent leurs propres alias/conversions. Les corrections tabac et durée nulle sont correctes, mais chaque nouvelle métrique demande encore des modifications coordonnées.

Le même module construit les préférences navigateur avec `matchMedia` et le stockage local ligne 434, puis génère la démonstration avec horloge système et UUID ligne 451. Importer les contrats couple donc le code au navigateur et à la démonstration.

Séparer types purs, catalogue de métriques, préférences navigateur et génération de démonstration. Injecter explicitement horloge et identifiants dans la génération. Utiliser un contrat déclaratif versionné pour générer ou vérifier les métadonnées TypeScript et Rust : unités canoniques/acceptées, limites, entiers et sémantique des événements. Rust garde l’autorité de validation ; le frontal améliore seulement le retour utilisateur. Donner au Target un schéma explicite lorsque ses règles diffèrent des observations.

Protéger cette frontière avec les contrôles de parité et les cas tabac, zéro, Excel et récap existants.

<!-- prettier-ignore -->
## 4. Priorité moyenne : isoler IPC natif et sessions d’import dans des services typés {#_4-medium-priority-put-native-ipc-and-import-sessions-behind-typed-services}

Preuves : `src/app/core/store.ts:113` mélange activité/erreurs et rafraîchissement concurrent ; ligne 196 propose un second parcours de mutation navigateur sans toute la validation Rust. `src/app/pages/data.ts:529` à 619 appelle directement six commandes natives et modifie état/messages du Store. Noms des commandes, DTO et erreurs sont répartis entre page et Store.

Introduire une petite passerelle typée avec implémentations native et mémoire. Déplacer état et transitions d’import/restauration dans un service d’échanges ; la page affiche les formulaires et déclenche les actions. Générer ou vérifier les DTO IPC contre la sérialisation Rust. Rendre explicites les résultats terminé, annulé, occupé et échoué plutôt que partager `undefined` entre opérations ignorées et erreurs.

L’implémentation mémoire doit appliquer les règles prises en charge ou déclarer ses limites. Conserver les sondes natives et tests UI simulés ; les mocks seuls ne prouvent pas la parité native. Préserver les brouillons après rafraîchissement concurrent et exiger un nouvel aperçu avant réessai d’import en conflit.

<!-- prettier-ignore -->
## 5. Priorité moyenne : extraire les composants métier et les réutiliser dans Storybook {#_5-medium-priority-extract-feature-ui-and-make-storybook-reuse-it}

Preuves : `src/app/pages/dashboard.ts` fait environ 780 lignes et combine template, édition/fusion du Target et timers de relecture (`Dashboard:589`, `targetForm:612`, `replay:748`). `src/app/pages/data.ts` combine mapping, aperçu, exports et restauration. Les 2 300 lignes de `src/styles.css` mélangent structure, contrôles partagés et layouts métier.

Storybook réutilise MetricCard et UiButton, mais formulaires/messages/états vides de `stories/states.stories.ts:8` sont des exemples écrits à la main. La plupart des pages utilisent encore des classes de boutons plutôt que UiButton. Une modification du véritable formulaire/dialogue peut donc manquer dans l’exemple du catalogue.

Extraire un éditeur Target, contrôleur de relecture, composants de mapping/aperçu et messages/états vides partagés. Réutiliser les composants réels dans les stories avec états inconnus, invalides, conflits et désactivés. Adopter progressivement UiButton ailleurs. Déplacer le CSS métier près des composants ; garder tokens, resets, structure et contrôles partagés globalement. Conserver l’ordre de cascade et utiliser les références visuelles contre les changements involontaires.

Mettre aussi en cache, via computed/index, les lignes filtrées du journal, comptes par profil et statuts d’import au lieu de parcourir les tableaux dans les helpers du template (`journal.ts:378`, `profiles.ts:201`, `data.ts:514`).

<!-- prettier-ignore -->
## 6. Priorité basse : traduire des identifiants stables de messages {#_6-lower-priority-translate-stable-message-identifiers}

Preuves : `src/app/core/i18n.ts:33` cherche des phrases françaises complètes et renvoie la source si la clé manque. `src-tauri/src/domain.rs:6` fournit un code large et un message français ; plusieurs validations partagent INVALID_DATA. Les messages dynamiques d’export/restauration demandent une liste spéciale de préfixes.

Changer un libellé Rust peut casser silencieusement le message anglais sans modifier le comportement. Ajouter des identifiants stables et arguments nommés à côté des codes de transport. Présenter les messages dans la couche UI, avec chemins/noms interpolés à l’identique. Migrer d’abord erreurs backend et messages dynamiques ; inutile de remplacer tout le catalogue d’un coup.

Conserver les tests de présentation des erreurs natives, lignes d’import, textes utilisateur littéraux et brouillons lors d’un changement de langue/thème.

## Ordre proposé {#suggested-sequence}

Commencer par l’index d’import, puis contrat de métriques et passerelle typée. Introduire les écritures ciblées avec tests concurrence/rollback. Extraire l’UI en conservant les captures, puis migrer les identifiants d’erreur. L’activation scientifique reste une validation distincte. Manifeste artiste, cache par fichier et nettoyage GPU sont déjà des frontières utiles sans besoin de réécriture générale.

## Vérifications effectuées pour cette revue {#validation-performed-for-this-review}

| Vérification                                                                                | Résultat   |
| ------------------------------------------------------------------------------------------- | ---------- |
| Build Angular de production (`npm run build`)                                               | Réussi     |
| Suite Rust existante (`cargo test --locked --offline --manifest-path src-tauri/Cargo.toml`) | 21 réussis |
| Suite Playwright ciblée (`npm test -- tests/fixes.spec.ts tests/daily-summary.spec.ts`)     | 13 réussis |

Ces vérifications utilisent les tests existants et des données fictives/temporaires. Aucune base personnelle ouverte. La revue n’a pas relancé toute la suite visuelle, testé une installation Windows vierge ni mesuré de gros historiques/imports. Aucun code d’exécution ou référence de capture modifié.
