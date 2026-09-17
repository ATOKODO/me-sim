# Validation de la livraison

## Vérifié sur ce poste Windows

- Build Angular de production : réussi ; environ 348 Ko initiaux, Three.js chargé séparément à la demande.
- 11 tests Rust : isolation et suppression des profils, références croisées, sauvegarde/restauration sans perte, refus des versions inconnues et des données invalides, annulation transactionnelle après échec SQL, concurrence entre deux connexions SQLite, formats CSV/XLS/XLSX/JSON, nombres et dates Excel, feuilles multiples, conversions d’unités, doublons/conflits, formules et fichiers malformés, verrou scientifique.
- 7 tests Playwright dans Microsoft Edge : rendu 3D local sans requête distante, profils et journal, modification/suppression, scénarios sans projection inventée, mode 2D et perte du contexte WebGL, largeur 960 px, focus clavier des dialogues, audit automatisé WCAG A/AA sur les six routes. L’aperçu utilise une CSP avec nonce, comme la version native.
- Exécutable Tauri debug : lancement réel dans WebView2, création de profil, ajout d’une observation, rechargement et lecture de la donnée persistée dans SQLite ; aucune erreur JavaScript capturée. Test effectué dans `.cache/native-smoke`, sans donnée personnelle.
- Capture native : `docs/native-dashboard.png`.

## Limites de vérification

- Audit automatisé d’accessibilité complété, sans certification d’accessibilité ni essai utilisateur avec lecteur d’écran.
- Le rendu est limité à environ 30 images/s et libère géométries, matériaux, observateur et contexte à la fermeture ; pas de benchmark matériel prolongé ni certification de 30 images/s sur toutes les configurations.
- Les sélecteurs de fichiers natifs sont implémentés ; parsing et écriture sont testés en Rust. Leur parcours complet au clavier dans le shell Windows n’a pas été automatisé.
- Fonctionnement sans requête distante vérifié dans le navigateur et lancement natif validé. Installation en machine virtuelle neuve avec le réseau physiquement coupé non effectuée.
- Les installateurs locaux ne sont pas signés avec un certificat d’éditeur.
- Modèle scientifique complet, références numériques publiées et validation clinique : non réalisés ; projections désactivées.

## Reproduire

`npm ci`, `npm run build`, `npm test`, puis `cargo test --locked --manifest-path src-tauri/Cargo.toml`. Edge doit être installé ; le port 1421 doit être libre. La CI Windows reprend les mêmes commandes et construit l’installateur. La CI n’a pas été exécutée sur GitHub dans cette session.

L’intégration Angular/Tauri désactive l’inlining du CSS critique (pas de gestionnaire onload inline) et transmet le nonce de style Tauri à Angular via ngCspNonce. Les styles dynamiques sont autorisés par nonce ; script-src et style-src n’utilisent pas unsafe-inline.
