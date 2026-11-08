# Getting started with Me-Sim {#demarrer-avec-me-sim}

## Install on Windows {#installer-sur-windows}

The Windows target is Windows 11 x64. The packages available locally in `release/` are described in the project README:

| File                                 | Purpose                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| `Me-Sim_0.1.0_x64-setup.exe`         | Standard installation; WebView2 may be downloaded if missing. |
| `Me-Sim_0.1.0_x64-offline-setup.exe` | Installation with the WebView2 x64 installer included.        |
| `Me-Sim-0.1.0-updated.exe`           | Direct executable; WebView2 must already be installed.        |

The packages are unsigned. Building the offline installer has been verified; installing it on a clean computer without a network connection still needs validation. Check the [validation status](./validation.md) before distribution.

After opening the app, create a profile or load the fictional demo. Choose habits, fill in the calendar or add observations to the journal. The [data guide](./data-guide.md) and [privacy guide](./privacy.md) explain backups and their limits.

## Build and run on Linux {#installer-sous-linux}

The Linux target is x86_64 in Debian package format. No prebuilt package is provided in `release/`: run `npm run package:linux` on Linux to create a `.deb` under `src-tauri/target/release/bundle/deb/`. The package declares its system dependencies, including WebKitGTK 4.1. It was built on Ubuntu 24.04; installation and compatibility with other distributions still need validation.

On Ubuntu or Debian, install Tauri's dependencies, then build:

```sh
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
npm ci
npm run package:linux
sudo apt install ./src-tauri/target/release/bundle/deb/Me-Sim_0.1.0_amd64.deb
```

To run in development, use `npm run desktop` after installing these dependencies. Other Debian-based distributions use their equivalents for WebKitGTK 4.1 and GTK libraries.

## Develop the application {#developper-l-application}

Common prerequisites: Node.js 24.15+ in the 24.x branch and stable Rust. On Windows, install Rust MSVC, Visual Studio C++ tools and WebView2. On Linux, install WebKitGTK 4.1 and the dependencies listed above. Downloading dependencies for the first time requires Internet access.

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
| `npm run package:linux`  | `.deb` package; run on Linux.                                    |

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

Open the [local documentation](http://127.0.0.1:5174/). English guides are available at `/`; legacy `/en/` paths remain available. The server listens only on the local interface and fails if its port is already in use.

To build and preview the static site:

```powershell
npm run docs:build
npm run docs:preview
```

The preview is at [127.0.0.1:4174](http://127.0.0.1:4174/). Output is in `docs/.vitepress/dist/` and must be served over HTTP. Markdown files are the sources of the guides. Update the English pages in `docs/` and their legacy counterparts in `docs/en/` together, preserving heading IDs. Add each new page to both paths and to the navigation in `docs/.vitepress/config.mts`.

The local build checks page/section parity and rejects broken internal links. Search uses a local index built from the pages in each language. Fonts, styles and scripts are bundled; no remote search or analytics service is configured.

Configuration references: [VitePress installation](https://vuejs.github.io/vitepress/v1/guide/getting-started) and [local search](https://vuejs.github.io/vitepress/v1/reference/default-theme-search).

## Run the checks {#executer-les-verifications}

```powershell
npm run validate:local
```

This command runs local dependency and avatar checks, companion tests, builds, functional and offline Rust tests, then visual regression. Functional tests use Edge and port 1421. Install Chromium once with `npx playwright install chromium`; its test servers use ports 4175, 1423 and 6107. Preload Rust dependencies with `cargo fetch --locked --manifest-path src-tauri/Cargo.toml`. These initial downloads and `npm run check:dependencies` (the online npm audit) require Internet access. Build installers separately with `npm run package` or `npm run package:offline`; their first build may need downloads. No GitHub Actions workflow is provided. Isolated native checks and coverage limits are in the [validation guide](./validation.md).
