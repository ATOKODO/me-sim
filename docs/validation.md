# Validation de la livraison

## Vérifié sur ce poste Windows

- Build Angular de production : réussi ; environ 411 Ko initiaux, Three.js chargé séparément à la demande.
- 21 tests Rust : isolation et suppression des profils, références croisées, sauvegarde/restauration sans perte, refus des versions inconnues et des données invalides, annulation transactionnelle après échec SQL, concurrence entre deux connexions SQLite, formats CSV/XLS/XLSX/JSON, nombres et dates Excel, feuilles multiples, conversions d’unités, doublons/conflits, formules et fichiers malformés, verrou scientifique.
- 36 tests Playwright dans Microsoft Edge : rendu 3D local sans requête distante, profils et journal, habitudes et Target, modification/suppression, scénarios sans projection inventée, mode 2D et perte du contexte WebGL, largeur 960 px, focus clavier des dialogues, audit automatisé WCAG A/AA sur les sept routes. Le personnage fourni joue les quinze clips avec un seul chargement du GLB, y compris pendant la timeline ; l’arrêt des animations et la recréation de la scène sont vérifiés. L’aperçu utilise une CSP avec nonce, comme la version native.
- Exécutable Tauri debug : lancement réel dans WebView2, création de profil, ajout d’une observation, rechargement et lecture de la donnée persistée dans SQLite ; aucune erreur JavaScript capturée. Quinze modes du personnage fourni vérifiés dans WebView2. Test de données dans `.tmp/native-smoke/avatar` et test de caméra dans `.tmp/native-smoke/camera`, avec caches WebView2 isolés, sans donnée personnelle.
- Capture native : `docs/native-dashboard.png`.

## Personnage fourni — vérification du 30 septembre 2026

- FBX d’origine préservé à l’identique : 25 os, 498 sommets, 952 triangles, UV et poids du rig conservés dans le `.blend`.
- Aucun clip d’animation dans le FBX d’origine ; quinze actions créées, enregistrées et exportées en clips GLB nommés.
- Atlas PNG 256 × 256 embarqué : comparaison des pixels RGBA avec la texture fournie, sans différence.
- `.blend` compressé, texture intégrée et actions conservées avec utilisateurs fictifs. Export du fichier enregistré vérifié avec `scripts/export-avatar.py`.
- GLB autonome d’environ 757 Ko : un squelette de 40 articulations, comprenant les 25 os d’origine et 15 os d’accessoires. Quinze correspondances du manifeste vérifiées par `npm run check:avatar`.
- Captures visuelles des quinze modes inspectées dans Edge, puis personnage texturé confirmé dans la capture native. Les images de test sont dans `test-results/` ; la capture Windows est `docs/native-dashboard.png`.
- `connect-src blob:` autorise la lecture en mémoire de la texture intégrée par Three.js. Aucun serveur distant n’est ajouté à la CSP.
- Installateurs NSIS standard et hors ligne reconstruits avec succès ; exécutable direct actualisé dans `release/`. L’installation sur une machine vierge n’a pas été répétée pour ce changement.

## Caméra 3D — vérification du 30 septembre 2026

- Molette et boutons de zoom vérifiés, avec limites de 70 à 400 %. Les boutons se désactivent à leur limite.
- Orbite par glisser-déposer et flèches du clavier ; bouton de réinitialisation, touche R et touche Début. L’image du rendu, animations arrêtées, est comparée avant manipulation et après réinitialisation : le cadrage d’origine est retrouvé exactement.
- Zoom conservé lors du redimensionnement, caméras de comparaison indépendantes, commandes masquées et focus retiré en mode 2D. Les écouteurs OrbitControls sont libérés avec la scène.
- Test natif WebView2 avec une base isolée : orbite, zoom à la molette et restauration exacte de l’image vérifiés, sans erreur JavaScript. Reproductible avec `node scripts/native-camera-smoke.mjs` après lancement du binaire debug dans `.tmp/native-smoke/` et ouverture de son port de débogage local (défaut 9224, configurable par `ME_SIM_NATIVE_DEBUG_URL`).

## Langues et thème clair — vérification du 1er octobre 2026

- Menu Français / English et bouton de thème dans la barre supérieure ; les préférences proposent aussi les deux langues et les deux thèmes. Traductions embarquées sur les sept routes, commandes de caméra, formulaires, dialogues et messages d’import. Dates, nombres et calendrier suivent la langue choisie.
- Thème clair inspecté visuellement dans Edge à 960 px puis dans WebView2. Audits automatisés WCAG A/AA des sept routes en français et en anglais ; audit supplémentaire de l’aperçu natif d’import avec conflits et erreurs. Les couleurs des textures et du personnage sont conservées.
- Changement immédiat, conservation des brouillons de journal, Target et scénario, ainsi que des noms de profils, habitudes, feuilles et fichiers. Les identifiants de métriques et unités stockées ne sont pas traduits.
- Persistance SQLite et aller-retour JSON vérifiés en Rust, valeurs de langue/thème inconnues refusées, anciennes préférences et sauvegardes chargées avec français/sombre par défaut. Le cache navigateur ne contient que les deux préférences de présentation.
- Test réel WebView2 : préférences anglais/clair conservées après rechargement, priorité à SQLite face à un cache d’affichage obsolète, profils/observations/journées inchangés, fiche scientifique traduite et scène GLB fonctionnelle. Aucune erreur JavaScript. Base et cache de test isolés sous `.tmp/native-smoke/appearance/`.
- Reproduction native : `node scripts/native-presentation-smoke.mjs`, avec le port local 9226 (ou `ME_SIM_NATIVE_DEBUG_URL`) et une base placée sous `.tmp/native-smoke/appearance/`. Le script refuse une autre base.
- Serveur de développement sur 127.0.0.1:1420 : menu de langue et thème clair vérifiés sur la version actuellement servie. Build Angular et binaire debug Tauri reconstruits ; les installateurs de `release/` n’ont pas été reconstruits pour cette modification.

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

## Défauts de la revue — vérification du 2 octobre 2026

Les six défauts confirmés dans `review-2026-10-01.md` sont corrigés.

| Défaut | Preuve de correction |
| --- | --- |
| Vue ancienne écrasant un Target récent | Test Rust avec deux connexions utilisant la même méthode que la commande réelle ; tests de brouillons et de réessai explicite ; refus confirmé via IPC dans WebView2 |
| Récap reprenant une ancienne activité et inventant des zéros | Calcul pur daté ; tests de données absentes, anciennes et nulles ; affichage natif de zéro explicite et de tabac inconnu |
| Calendrier et timeline figés | Horloge réactive ; tests du passage de septembre à octobre, sélection historique, expiration sans mutation et brouillon du journal à minuit |
| Heure Excel transformée en date | Test XLSX avec date, heure 18:30 et durée Excel native ; conversion correcte vers date, HH:mm et minutes |
| Unité tabac absente | Choix issu du catalogue de métriques ; aperçu puis import UI de CSV à deux colonnes ; validation Rust de cigarette |
| Zéro minute refusé et fractions de cigarettes admises par le formulaire | Zéro enregistré sans événement ; validation entière dans le formulaire ; test natif de persistance après rechargement et validation Rust |

Contrôles supplémentaires : couverture de la déviation sur 13 indicateurs, règle explicite pour les cibles à zéro, absence de double comptage du total d’activité, conservation des champs non modifiés après conflit et conservation de l’aperçu d’import lors d’un changement de langue. Les habitudes archivées ne consomment plus la limite active ; un test vérifie la conservation de l’historique et le refus de plus de 100 habitudes actives.

`npm run build`, les 21 tests Rust et les 36 tests Playwright ont réussi. Le nouveau script `scripts/native-fixes-smoke.mjs` a réussi dans l’application Tauri debug, avec une base et un cache WebView2 isolés sous `.tmp/native-smoke/fixes`. Il vérifie une mutation périmée via la commande réelle, la conservation du Target, la saisie de zéro minute, sa persistance SQLite après rechargement et le rendu des données inconnues. Aucune erreur JavaScript n’a été capturée.

Pour reproduire le test natif : construire `npm run tauri -- build --debug --no-bundle`, puis lancer le binaire avec `ME_SIM_TEST_DATA_DIR` sous `.tmp/native-smoke/fixes`, un cache `WEBVIEW2_USER_DATA_FOLDER` isolé et `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9231`. Exécuter `node scripts/native-fixes-smoke.mjs` ; le script refuse une autre base. Fermer ensuite cette instance de test. Le débogage distant n’est pas destiné aux données personnelles.

## Paquets corrigés — livraison du 2 octobre 2026

- Installateurs NSIS standard et hors ligne reconstruits après la dernière correction de mise en page et copiés dans `release/`. Le paquet hors ligne embarque l’installateur WebView2 x64 ; son assemblage a réussi avec accès au cache Tauri après le refus d’accès rencontré dans le bac à sable.
- Exécutables directs `Me-Sim.exe` et `Me-Sim-0.1.0-updated.exe` actualisés. La version reste 0.1.0 ; `release/build-info.json` identifie les fichiers par leurs tailles, dates et empreintes SHA-256, et précise que les corrections ne sont pas encore commitées.
- Courbe de déviation inspectée visuellement : couverture et dates ne chevauchent plus la légende. Le contrôle de géométrie du Target et les deux parcours de thème clair ont réussi après cette dernière correction, en complément des 36 tests précédemment réussis.
- La réussite de l’assemblage ne confirme pas une installation sur machine vierge : le test en VM sans réseau et la signature des installateurs restent à effectuer. La simulation scientifique reste désactivée.
