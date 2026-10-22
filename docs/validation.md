# Validation de la livraison

## Vérification la plus récente — 22 octobre 2026 {#latest-verification-2026-10-22}

- Les builds de production Angular, VitePress et Storybook réussissent. La documentation compte 14 pages par langue et leurs sections FR/EN correspondent.
- Les 46 tests Rust hors ligne et les 64 tests fonctionnels Playwright dans Edge passent. Ils couvrent notamment l’isolation des profils, la persistance SQLite, les imports, les habitudes, les sessions horodatées, les versions Target et les scènes masculine/féminine.
- Les 246 tests visuels Playwright passent sans mise à jour des images. Les 243 références PNG sont classées par catégorie, viewport, langue et thème dans `tests/visual/__screenshots__/win32/chromium/` : huit routes en FR/EN, clair/sombre et quatre formats, ainsi que les références 960/1440, Storybook et les pages de documentation.
- Cette passe n’a pas relancé l’application Tauri dans WebView2, construit d’installateur, exécuté la CI GitHub ni testé un appareil physique. Les captures de téléphone et tablette sont des viewports Chromium sous Windows.
- Les limites et travaux préalables à une publication open source restent détaillés dans [la revue de publication](./open-source-review-2026-10-09.md) ; les licences du code et les droits de redistribution des personnages doivent encore être clarifiés.

Les rubriques datées ci-dessous conservent les résultats historiques des changements précédents.

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
- Zoom conservé lors du redimensionnement, caméras de comparaison indépendantes, commandes masquées et focus retiré lorsque la 3D est indisponible (test de perte de contexte actualisé le 8 octobre). Les écouteurs OrbitControls sont libérés avec la scène.
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

| Défaut                                                                  | Preuve de correction                                                                                                                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vue ancienne écrasant un Target récent                                  | Test Rust avec deux connexions utilisant la même méthode que la commande réelle ; tests de brouillons et de réessai explicite ; refus confirmé via IPC dans WebView2 |
| Récap reprenant une ancienne activité et inventant des zéros            | Calcul pur daté ; tests de données absentes, anciennes et nulles ; affichage natif de zéro explicite et de tabac inconnu                                             |
| Calendrier et timeline figés                                            | Horloge réactive ; tests du passage de septembre à octobre, sélection historique, expiration sans mutation et brouillon du journal à minuit                          |
| Heure Excel transformée en date                                         | Test XLSX avec date, heure 18:30 et durée Excel native ; conversion correcte vers date, HH:mm et minutes                                                             |
| Unité tabac absente                                                     | Choix issu du catalogue de métriques ; aperçu puis import UI de CSV à deux colonnes ; validation Rust de cigarette                                                   |
| Zéro minute refusé et fractions de cigarettes admises par le formulaire | Zéro enregistré sans événement ; validation entière dans le formulaire ; test natif de persistance après rechargement et validation Rust                             |

Contrôles supplémentaires : couverture de la déviation sur 13 indicateurs, règle explicite pour les cibles à zéro, absence de double comptage du total d’activité, conservation des champs non modifiés après conflit et conservation de l’aperçu d’import lors d’un changement de langue. Les habitudes archivées ne consomment plus la limite active ; un test vérifie la conservation de l’historique et le refus de plus de 100 habitudes actives.

`npm run build`, les 21 tests Rust et les 36 tests Playwright ont réussi. Le nouveau script `scripts/native-fixes-smoke.mjs` a réussi dans l’application Tauri debug, avec une base et un cache WebView2 isolés sous `.tmp/native-smoke/fixes`. Il vérifie une mutation périmée via la commande réelle, la conservation du Target, la saisie de zéro minute, sa persistance SQLite après rechargement et le rendu des données inconnues. Aucune erreur JavaScript n’a été capturée.

Pour reproduire le test natif : construire `npm run tauri -- build --debug --no-bundle`, puis lancer le binaire avec `ME_SIM_TEST_DATA_DIR` sous `.tmp/native-smoke/fixes`, un cache `WEBVIEW2_USER_DATA_FOLDER` isolé et `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9231`. Exécuter `node scripts/native-fixes-smoke.mjs` ; le script refuse une autre base. Fermer ensuite cette instance de test. Le débogage distant n’est pas destiné aux données personnelles.

## Paquets corrigés — livraison du 2 octobre 2026

- Installateurs NSIS standard et hors ligne reconstruits après la dernière correction de mise en page et copiés dans `release/`. Le paquet hors ligne embarque l’installateur WebView2 x64 ; son assemblage a réussi avec accès au cache Tauri après le refus d’accès rencontré dans le bac à sable.
- Exécutables directs `Me-Sim.exe` et `Me-Sim-0.1.0-updated.exe` actualisés. La version reste 0.1.0 ; `release/build-info.json` identifie les fichiers par leurs tailles, dates et empreintes SHA-256, et précise que les corrections ne sont pas encore commitées.
- Courbe de déviation inspectée visuellement : couverture et dates ne chevauchent plus la légende. Le contrôle de géométrie du Target et les deux parcours de thème clair ont réussi après cette dernière correction, en complément des 36 tests précédemment réussis.
- La réussite de l’assemblage ne confirme pas une installation sur machine vierge : le test en VM sans réseau et la signature des installateurs restent à effectuer. La simulation scientifique reste désactivée.

## Storybook et régression visuelle — 7 octobre 2026

- Storybook 10.6.1 compatible avec Angular 22 et TypeScript 6 ; versions exactes dans le manifeste et le lockfile. Build statique et serveur de développement sur 127.0.0.1:6006 vérifiés. Palette extraite sans changement de valeurs, boutons et cartes de mesure du tableau de bord partagés avec les stories.
- 19 stories, deux thèmes et contrôles locaux. Le test de l’atelier vérifie le changement d’une valeur vers zéro, le thème clair, le passage au texte anglais et la documentation Docs. Les données restent fictives et le Store natif n’est pas instancié.
- 73 références PNG Windows inspectées par échantillonnage : palette dans les deux thèmes, boutons, mesure inconnue, tableau de bord à largeur minimale et calendrier. Les captures couvrent les sept routes à 960 et 1440 px dans les deux thèmes, trois écrans anglais dans les deux thèmes, les 19 stories dans les deux thèmes et le focus clavier. Les références totalisent environ 5,7 Mio et sont conservées sous `tests/visual/__screenshots__/win32/chromium/`.
- La chaîne complète `npm run test:visual` a réussi : builds Angular et Storybook, puis 74 tests sans mise à jour des références. Un précédent passage de comparaison a aussi réussi ; la sonde temporaire a détecté une couleur de bouton volontairement altérée et a été retirée ensuite.
- Les 36 tests fonctionnels existants ont réussi après l’extraction des composants. Vérification TypeScript des stories et contrôle du diff réussis. Aucun Rust ni format de stockage modifié pour cette intégration.
- Les tests visuels refusent les requêtes externes et les erreurs JavaScript. Télémétrie et rapports de crash Storybook désactivés. La CI Windows Server 2022 est configurée avec le Chromium verrouillé par Playwright ; elle refuse les mises à jour de références et conserve les rapports d’échec. Ce job GitHub n’a pas été exécuté dans cette session ; une éventuelle différence de rendu entre ce poste et le runner doit être examinée.
- Depuis le 8 octobre, seul le canvas GPU est masqué dans les captures de pages ; les contrôles de caméra et les légendes restent visibles. Le rendu 3D, ses animations et le réessai sont couverts par les tests fonctionnels, sans référence pixel du GPU. Ces captures ne constituent pas une certification d’accessibilité. Voir `docs/design-system.md` pour les commandes et le protocole de mise à jour.

- Résolutions de documentation ajoutées au sélecteur Storybook : iPhone 16 Pro 402 × 874, iPad Pro 11″ 834 × 1194, MacBook Pro 14″ 1512 × 982 et Desktop 1920 × 1080 pixels CSS. Dimensions effectives des quatre aperçus et retour au viewport libre contrôlés dans Chromium, sans erreur JavaScript. Build statique, vérification TypeScript et test Playwright de l’atelier réussis après cet ajout. Les références PNG existantes restent inchangées.

## Documentation VitePress — 7 octobre 2026

- VitePress stable 1.6.4 ajouté aux dépendances de développement et verrouillé dans le lockfile. Les sept guides existants sont repris sans copie ; accueil, démarrage, confidentialité et architecture ajoutent quatre pages, pour onze pages de documentation.
- Build statique avec refus des liens internes cassés réussi ; types de configuration/thème et build Angular vérifiés. La CI Windows est configurée pour exécuter `npm run docs:build`, sans publication automatique ; ce changement CI n’a pas été exécuté sur GitHub dans cette session.
- Navigation des onze pages et recherche locale contrôlées dans le build avec Chromium. Aucune requête externe, ressource locale manquante ou erreur JavaScript capturée. Polices et assets locaux vérifiés ; la mémorisation des requêtes de recherche est désactivée.
- Navigation et absence de débordement horizontal global vérifiées à 402 × 874, 834 × 1194, 1512 × 982 et 1920 × 1080. Captures du guide de démarrage inspectées sur mobile et ordinateur. Thèmes clair/sombre, serveur de développement et menu mobile vérifiés séparément.
- Serveur de développement limité à `127.0.0.1:5174`, aperçu statique à `127.0.0.1:4174`, avec ports stricts. Les sorties/cache sous `docs/.vitepress/` sont ignorés par Git. La documentation reste distincte du paquet Tauri et ne lit aucune base personnelle.

## Rendu exclusivement 3D — 8 octobre 2026

- Option 2D, avatar CSS, animations de remplacement et branche de masquage du moteur supprimés. Les préférences ne conservent que les animations, le tremblement rétro, la langue et le thème.
- Anciennes bases SQLite et sauvegardes JSON compatibles : le lecteur Rust accepte uniquement l’ancien champ booléen `force2d`, l’ignore et ne le réexporte pas. Les tests vérifient la conservation de toutes les données métier pour les anciennes valeurs vrai et faux ; les autres champs inconnus restent refusés.
- WebGL absent ou contexte perdu : message traduit, aucune silhouette de remplacement, retrait des commandes de caméra et du focus. Le bouton de réessai recrée une scène 3D ; l’autre caméra de comparaison reste indépendante. Le journal reste utilisable. Ces parcours sont testés dans Edge, et les messages, le réessai et la 3D réelle ont été inspectés sur mobile dans Chromium.
- Builds Angular et Storybook, types du catalogue, 22 tests Rust, 42 tests fonctionnels et 74 tests visuels réussis. Quatorze références de pages actualisées, puis comparées sans mise à jour ; tableau de bord, paramètres et comparaison inspectés par échantillonnage. Le masquage du canvas est réservé aux tests visuels, sans option correspondante dans l’application.
- Aucun accès à une base personnelle pendant cette vérification. Les installateurs et exécutables de `release/` n’ont pas été reconstruits pour ce changement.

## Personnage féminin — 8 octobre 2026

- Variante féminine locale créée depuis le rig animé existant : silhouette et mâchoire distinctes, coiffure au carré et visage géométrique sans la barbe de l’atlas masculin. Le corps conserve ses 498 sommets, 952 triangles, UV et poids ; la coiffure ajoute 76 triangles et les détails du visage 10 triangles. Le squelette conserve ses 40 articulations et ses quinze actions.
- Source `art/avatar/female-casual-animated.blend` enregistrée avec les actions et la texture intégrée. Export depuis ce fichier vérifié avec Blender 4.2 et `scripts/export-avatar.py -- --model female` ; GLB autonome de 789 828 octets. Les trente correspondances de clips des deux variantes passent `npm run check:avatar`.
- Sélection automatique pour `Profile.sex === 'female'`, dans le tableau de bord et les deux scènes de comparaison. Masculin ou non renseigné garde le modèle par défaut ; aucune migration ou nouvelle donnée métier. Manifestes version 1 compatibles, bloc facultatif `variants.female.overrides` documenté pour l’artiste.
- Tests Edge : quinze clips de chaque variante, timeline, absence de requête distante et d’erreur JavaScript, changement de profil sans recréer la scène ou réinitialiser la caméra, réutilisation des deux modèles et refus d’activer une ancienne variante après un chargement tardif. Modification du profil et deux avatars féminins dans la comparaison vérifiés. Captures des activités et vues rapprochées de face et de profil inspectées.
- Build Angular, build et types Storybook, 45 tests fonctionnels et 74 tests visuels réussis sans actualisation des références. Le serveur de développement sur 1420 charge le modèle féminin sans erreur JavaScript. Les sources et le guide artiste permettent de remplacer les modèles ou leurs animations indépendamment.
- Aucun accès à une base personnelle. Les exécutables et installateurs de `release/` n’ont pas été reconstruits pour ce changement.

## Modèle féminin fourni — 9 octobre 2026

- Le personnage féminin utilise désormais `female_secretary.fbx` et `secretary_tex.png`, copiés dans `art/avatar/` sans modification. SHA-256 vérifiés par comparaison avec les fichiers fournis. La texture PNG 256 × 256 est embarquée à l’identique dans le GLB.
- Modèle d’origine : 488 sommets, 932 triangles, 28 os et aucun clip d’animation. Les positions des sommets, faces, UV, poids de skinning et matrices de repos des articulations sont comparés au FBX après préparation : aucune différence, en tenant compte des alias de noms d’os. Quinze os d’accessoires et quinze actions sont ajoutés au rig fourni.
- Générateur commun paramétré par `--model male` ou `--model female`, avec adaptation de la pose de départ, des prises en main, de l’assise et des accessoires du visage aux proportions féminines. Le modèle masculin est également régénéré avec succès dans un dossier de vérification isolé.
- Fichier Blender féminin avec texture intégrée, actions conservées et rig éditable. Export depuis ce fichier enregistré vérifié avec `scripts/export-avatar.py -- --model female` : GLB identique octet par octet à la préparation initiale, de 777 004 octets. Le matériau `SecretaryAtlas` préserve les vêtements de la texture fournie.
- Build Angular et trente correspondances de clips validés. Huit tests Playwright d’avatar et de caméra réussis : quinze activités par personnage, timeline, chargement unique, changement de profil sans perte du cadrage, chargement tardif et scènes de comparaison. Captures des vues rapprochées et des activités inspectées. Le serveur de développement sur 1420 fournit le modèle féminin sans erreur JavaScript.
- Guide artiste et documentation mis à jour. Aucun accès à une base personnelle ; les exécutables et installateurs de `release/` n’ont pas été reconstruits pour ce changement.

## Chargement des personnages sans flash — 9 octobre 2026

- Le chargeur distingue l’attente du manifeste ou du GLB, le personnage d’artiste prêt et le repli procédural. Le personnage cubique est masqué avant la première frame ; la pièce et la caméra restent utilisables, avec une légende de chargement traduite en français et en anglais.
- Le repli procédural reste disponible après un manifeste ou un fichier absent, une erreur de chargement ou un clip non fourni. Les gardes de variante, d’activité, de relecture et de destruction restent appliquées aux chargements tardifs.
- Trois nouveaux tests Playwright ralentissent séparément le manifeste et le GLB pour les deux personnages, après navigation et après rafraîchissement pour le modèle par défaut. Les captures sans éléments de légende vérifient que la pièce reste identique pendant l’attente puis qu’un personnage apparaît après réussite ou échec réel. Un manifeste absent conserve une animation procédurale utilisable.
- Les trois tests de chargement et les vingt tests existants des parcours, avatars et caméras réussissent. Builds Angular et Storybook, types du catalogue, formatage et 74 tests visuels réussis sans modification des références PNG. Guide artiste et architecture actualisés.
- Aucun accès à une base personnelle ; les exécutables et installateurs de `release/` n’ont pas été reconstruits pour ce changement.

## Documentation bilingue et captures par format — 9 octobre 2026 {#documentation-bilingue-et-captures-par-format-2026-10-09}

- Les onze pages disposent d’une version française et anglaise, y compris les revues historiques. Les URL françaises sont conservées ; les traductions sont sous `/en/`. Navigation, recherche locale et libellés de thème sont traduits. Le menu de langue conserve la page et sa section sur ordinateur et mobile.
- Le build vérifie les types de configuration/thème, les liens internes et la parité des pages et identifiants de sections entre langues avec `scripts/check-docs.mjs`. Les titres anglais utilisent des identifiants explicites afin de préserver les liens de sections français.
- Dimensions partagées entre Storybook et Playwright dans `config/viewports.ts` : iPhone 16 Pro 402 × 874, iPad Pro 11″ 834 × 1194, MacBook Pro 14″ 1512 × 982 et Desktop 1920 × 1080 pixels CSS. Les captures couvrent les sept écrans en FR/EN et clair/sombre (112 combinaisons), ainsi que l’accueil et le démarrage de la documentation (32 combinaisons). Les 73 références précédentes restent couvertes ; la suite comprend 217 références PNG et 220 tests.
- Les parcours de documentation visitent les 22 pages, vérifient leurs sections, le changement de langue et les résultats de recherche locale. Chaque format vérifie la dimension effective de la fenêtre et l’absence de débordement horizontal global. Les requêtes externes et erreurs JavaScript font échouer les tests.
- Sept tests fonctionnels de présentation réussis dans Edge avec un serveur de test isolé sur le port 1424, le port habituel 1421 étant occupé par un autre projet. Le libellé anglais « Sedentary time » est corrigé et vérifié ; les saisies personnalisées restent inchangées lors d’un changement de langue ou de thème.
- Captures inspectées par échantillonnage sur les quatre formats, dans les deux langues et thèmes. Il s’agit de fenêtres Chromium sous Windows, pas d’un test physique sur iPhone, iPad ou macOS. Les PNG pleine page peuvent dépasser la hauteur du viewport. Seul le canvas GPU est masqué ; les contrôles et légendes 3D restent visibles, et les tests fonctionnels couvrent le rendu réel séparément.
- La CI Windows existante est configurée pour construire les trois outils puis comparer les images, sans mise à jour automatique des références. Ce job GitHub n’a pas été exécuté dans cette session. Aucune base personnelle n’est ouverte ; les exécutables et installateurs de `release/` ne sont pas reconstruits pour cette intégration.
- La chaîne complète `npm run test:visual` a réussi : vérification des traductions et types, builds VitePress, Angular et Storybook, puis 220 tests sans modification des références. Les trente captures antérieures de pages non concernées par le nouveau libellé passent également dans un contrôle séparé. Formatage et contrôle du diff réussis ; seules deux références antérieures du journal anglais changent pour la traduction de la sédentarité.
