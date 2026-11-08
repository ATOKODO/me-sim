# Démarrer avec Me-Sim

## Installer sur Windows

Pour Windows, la cible est Windows 11 x64. Les paquets disponibles localement dans `release/` sont décrits dans le README du projet :

| Fichier                              | Usage                                                              |
| ------------------------------------ | ------------------------------------------------------------------ |
| `Me-Sim_0.1.0_x64-setup.exe`         | Installation standard ; WebView2 peut être téléchargé s’il manque. |
| `Me-Sim_0.1.0_x64-offline-setup.exe` | Installation avec l’installateur WebView2 x64 embarqué.            |
| `Me-Sim-0.1.0-updated.exe`           | Exécutable direct ; WebView2 doit déjà être installé.              |

Les paquets sont non signés. La construction de l’installateur hors ligne est vérifiée ; son installation sur une machine vierge sans réseau reste à valider. Consulter l’[état de validation](./validation.md) avant une diffusion.

Après ouverture, créer un profil ou charger la démonstration fictive. Choisir les habitudes, compléter le calendrier ou ajouter des observations au journal. Les [guides des données](./data-guide.md) et de [confidentialité](./privacy.md) précisent les sauvegardes et leurs limites.

## Construire et lancer sous Linux {#installer-sous-linux}

La cible Linux est x86_64 au format Debian. Aucun paquet préconstruit n’est fourni dans `release/` : depuis Linux, `npm run package:linux` crée un `.deb` dans `src-tauri/target/release/bundle/deb/`. Le paquet déclare ses dépendances système, dont WebKitGTK 4.1. Il a été construit sur Ubuntu 24.04 ; son installation et sa compatibilité avec d’autres distributions restent à valider.

Sur Ubuntu ou Debian, installer les dépendances Tauri, puis construire :

```sh
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
npm ci
npm run package:linux
sudo apt install ./src-tauri/target/release/bundle/deb/Me-Sim_0.1.0_amd64.deb
```

Pour lancer en développement, utiliser `npm run desktop` après installation de ces dépendances. Les distributions non Debian utilisent leurs équivalents de WebKitGTK 4.1 et des bibliothèques GTK.

## Développer l’application

Prérequis communs : Node.js 24.15+ dans la branche 24.x et Rust stable. Sous Windows, installer Rust MSVC, les outils C++ Visual Studio et WebView2. Sous Linux, installer WebKitGTK 4.1 et les dépendances indiquées ci-dessus. Le premier téléchargement des dépendances nécessite Internet.

Depuis la racine du projet :

```powershell
npm ci
npm run desktop
```

| Commande                  | Résultat                                                                 |
| ------------------------- | ------------------------------------------------------------------------ |
| `npm start`               | Angular sur `127.0.0.1:1420`.                                            |
| `npm run build`           | Build de production Angular.                                             |
| `npm run preview`         | Aperçu du build sur `127.0.0.1:1420`, avec données fictives temporaires. |
| `npm run desktop`         | Application Tauri en développement.                                      |
| `npm run package`         | Installateur NSIS standard.                                              |
| `npm run package:offline` | Installateur NSIS avec WebView2 embarqué.                                |
| `npm run package:linux`  | Paquet `.deb` ; exécuter sous Linux.                                    |

L’aperçu navigateur garde les données en mémoire et désactive les échanges natifs de fichiers. Utiliser Tauri pour vérifier SQLite, les sélecteurs de fichiers et la persistance.

## Consulter le design système

```powershell
npm run storybook
```

Ouvrir [Storybook local](http://127.0.0.1:6006/). Les composants, thèmes, contrôles et résolutions de référence sont décrits dans le [guide du design système](./design-system.md).

## Lancer cette documentation

```powershell
npm run docs:dev
```

Ouvrir [la documentation locale](http://127.0.0.1:5174/). Les guides français sont à `/`, les guides anglais à `/en/` ; le menu de langue ouvre la page correspondante. Le serveur écoute uniquement sur l’interface locale et échoue si le port est déjà occupé.

Pour vérifier et consulter le site statique :

```powershell
npm run docs:build
npm run docs:preview
```

L’aperçu est sur [127.0.0.1:4174](http://127.0.0.1:4174/). Le résultat se trouve dans `docs/.vitepress/dist/` ; il doit être servi par un serveur HTTP. Les fichiers Markdown sont les sources des guides. Mettre à jour les deux versions ensemble : français dans `docs/`, anglais dans `docs/en/`. Garder les identifiants explicites des titres anglais alignés sur les titres français pour conserver les liens de section lors du changement de langue. Ajouter toute nouvelle page dans les deux langues et dans la navigation de `docs/.vitepress/config.mts`.

Le build local vérifie la parité des pages et sections entre langues et refuse les liens internes cassés. La recherche utilise un index local construit avec les pages de chaque langue. Polices, styles et scripts sont embarqués ; aucun service de recherche ou d’analytique distant n’est configuré.

Configuration de référence : [installation VitePress](https://vuejs.github.io/vitepress/v1/guide/getting-started) et [recherche locale](https://vuejs.github.io/vitepress/v1/reference/default-theme-search).

## Exécuter les vérifications

```powershell
npm run validate:local
```

Cette commande exécute les contrôles de dépendances locales et d’avatars, les tests du compagnon, les builds, les tests fonctionnels et Rust hors ligne, puis la régression visuelle. Les tests fonctionnels utilisent Edge et le port 1421. Installer Chromium une fois avec `npx playwright install chromium` ; ses serveurs de test utilisent les ports 4175, 1423 et 6107. Précharger les dépendances Rust avec `cargo fetch --locked --manifest-path src-tauri/Cargo.toml`. Ces téléchargements initiaux et `npm run check:dependencies` (audit npm en ligne) nécessitent Internet. Construire l’installateur séparément avec `npm run package` ou `npm run package:offline` ; leur première construction peut nécessiter des téléchargements. Aucun workflow GitHub Actions n’est fourni. Les procédures natives isolées et limites de couverture sont dans la [validation](./validation.md).
