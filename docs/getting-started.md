# Démarrer avec Me-Sim

## Installer sur Windows

La cible actuelle est Windows 11 x64. Les paquets disponibles localement dans `release/` sont décrits dans le README du projet :

| Fichier                              | Usage                                                              |
| ------------------------------------ | ------------------------------------------------------------------ |
| `Me-Sim_0.1.0_x64-setup.exe`         | Installation standard ; WebView2 peut être téléchargé s’il manque. |
| `Me-Sim_0.1.0_x64-offline-setup.exe` | Installation avec l’installateur WebView2 x64 embarqué.            |
| `Me-Sim-0.1.0-updated.exe`           | Exécutable direct ; WebView2 doit déjà être installé.              |

Les paquets sont non signés. La construction de l’installateur hors ligne est vérifiée ; son installation sur une machine vierge sans réseau reste à valider. Consulter l’[état de validation](./validation.md) avant une diffusion.

Après ouverture, créer un profil ou charger la démonstration fictive. Choisir les habitudes, compléter le calendrier ou ajouter des observations au journal. Les [guides des données](./data-guide.md) et de [confidentialité](./privacy.md) précisent les sauvegardes et leurs limites.

## Développer l’application

Prérequis : Node.js 24.15+ dans la branche 24.x, Rust stable MSVC, outils C++ Visual Studio et WebView2. Le premier téléchargement des dépendances nécessite Internet.

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

Ouvrir [la documentation locale](http://127.0.0.1:5174/). Le serveur écoute uniquement sur l’interface locale et échoue si le port est déjà occupé.

Pour vérifier et consulter le site statique :

```powershell
npm run docs:build
npm run docs:preview
```

L’aperçu est sur [127.0.0.1:4174](http://127.0.0.1:4174/). Le résultat se trouve dans `docs/.vitepress/dist/` ; il doit être servi par un serveur HTTP. Les fichiers Markdown restent la source unique des guides. Modifier un guide existant, ou ajouter une page puis son entrée de navigation dans `docs/.vitepress/config.mts`.

Le build refuse les liens internes cassés. La recherche utilise un index local construit avec les pages. Polices, styles et scripts sont embarqués ; aucun service de recherche ou d’analytique distant n’est configuré. La CI est configurée pour vérifier la construction, sans publier le site.

Configuration de référence : [installation VitePress](https://vuejs.github.io/vitepress/v1/guide/getting-started) et [recherche locale](https://vuejs.github.io/vitepress/v1/reference/default-theme-search).

## Exécuter les vérifications

```powershell
npm run build
npm test
npm run test:rust
npm run check:avatar
```

Les tests fonctionnels utilisent Edge et le port 1421. Pour les références visuelles, installer Chromium une fois avec `npx playwright install chromium`, puis lancer `npm run test:visual`. Les procédures natives isolées, limites de couverture et contrôles de livraison sont dans la [validation](./validation.md).
