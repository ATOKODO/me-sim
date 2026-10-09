# Getting started with Me-Sim {#demarrer-avec-me-sim}

## Install on Windows {#installer-sur-windows}

The current target is Windows 11 x64. The packages available locally in `release/` are described in the project README:

| File                                 | Purpose                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| `Me-Sim_0.1.0_x64-setup.exe`         | Standard installation; WebView2 may be downloaded if missing. |
| `Me-Sim_0.1.0_x64-offline-setup.exe` | Installation with the WebView2 x64 installer included.        |
| `Me-Sim-0.1.0-updated.exe`           | Direct executable; WebView2 must already be installed.        |

The packages are unsigned. Building the offline installer has been verified; installing it on a clean computer without a network connection still needs validation. Check the [validation status](./validation.md) before distribution.

After opening the app, create a profile or load the fictional demo. Choose habits, fill in the calendar or add observations to the journal. The [data guide](./data-guide.md) and [privacy guide](./privacy.md) explain backups and their limits.

## Develop the application {#developper-l-application}

Prerequisites: Node.js 24.15+ in the 24.x branch, stable Rust MSVC, Visual Studio C++ tools and WebView2. Downloading dependencies for the first time requires Internet access.

From the project root:

```powershell
npm ci
npm run desktop
```

| Command                   | Result                                                            |
| ------------------------- | ----------------------------------------------------------------- |
| `npm start`               | Angular at `127.0.0.1:1420`.                                      |
| `npm run build`           | Angular production build.                                         |
| `npm run preview`         | Build preview at `127.0.0.1:1420`, with temporary fictional data. |
| `npm run desktop`         | Tauri application in development.                                 |
| `npm run package`         | Standard NSIS installer.                                          |
| `npm run package:offline` | NSIS installer with WebView2 included.                            |

The browser preview keeps data in memory and disables native file exchange. Use Tauri to verify SQLite, file pickers and persistence.

## Browse the design system {#consulter-le-design-systeme}

```powershell
npm run storybook
```

Open [local Storybook](http://127.0.0.1:6006/). Components, themes, controls and reference resolutions are described in the [design system guide](./design-system.md).

## Run this documentation {#lancer-cette-documentation}

```powershell
npm run docs:dev
```

Open the [local documentation](http://127.0.0.1:5174/). French guides are at `/`, English guides at `/en/`; the language menu opens the corresponding page. The server listens only on the local interface and fails if its port is already in use.

To build and preview the static site:

```powershell
npm run docs:build
npm run docs:preview
```

The preview is at [127.0.0.1:4174](http://127.0.0.1:4174/). Output is in `docs/.vitepress/dist/` and must be served over HTTP. Markdown files are the sources of the guides. Update both versions together: French in `docs/`, English in `docs/en/`. Keep the explicit English heading IDs aligned with the French headings so section links survive language changes. Add each new page to both locales and to the navigation in `docs/.vitepress/config.mts`.

The build checks page/section parity and rejects broken internal links. Search uses a local index built from the pages in each language. Fonts, styles and scripts are bundled; no remote search or analytics service is configured. CI checks the build without publishing the site.

Configuration references: [VitePress installation](https://vuejs.github.io/vitepress/v1/guide/getting-started) and [local search](https://vuejs.github.io/vitepress/v1/reference/default-theme-search).

## Run the checks {#executer-les-verifications}

```powershell
npm run build
npm test
npm run test:rust
npm run check:avatar
```

Functional tests use Edge and port 1421. For visual references, install Chromium once with `npx playwright install chromium`, then run `npm run test:visual`. Application and documentation screenshots cover the four reference formats in French/English and light/dark themes. Isolated native checks, coverage limits and delivery checks are in the [validation guide](./validation.md).
