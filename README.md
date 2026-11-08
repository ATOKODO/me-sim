# Me-Sim

A local desktop application for Windows and Linux, built with Angular 22, Tauri 2, SQLite and Three.js. It provides French and English interfaces, light and dark themes, multiple profiles and a retro PS1-style diorama built entirely from local assets.

**Alpha release: Me-Sim is not stable.** Errors, incompatible changes and data loss are possible; keep backups of your data. The mobile companion is experimental, is not under active development, and its installation and synchronization are not guaranteed.

The companion offers to install a local certificate authority on your phone. This trust extends beyond Me-Sim: if its private key is stolen and an attacker can intercept connections, they could impersonate other sites. Never publish or transfer `companion-ca-key.pem`; verify the public certificate's fingerprint before trusting it. Pending entries and the pairing key are not encrypted by Me-Sim on the phone. See the [companion risks and limitations](docs/en/mobile-companion.md).

![Windows application](docs/native-dashboard.png)

## License and contributions

Me-Sim's original code and documentation are licensed under **AGPL-3.0-only**: [license text](LICENSE). Third-party assets and dependencies retain their own terms. Characters and textures are by **Vinrax**; see [credits and sources](CREDITS.md) and the [license review](docs/en/licenses.md).

**External contributions are not currently accepted.** You are welcome to clone, study, run, fork, modify and redistribute the code in accordance with its license. Please do not open pull requests or send unsolicited patches: see the [contribution policy](CONTRIBUTING.md).

## Windows packages

Release artifacts are located in `release/`:

- `Me-Sim_0.1.0_x64-setup.exe`: standard installer; downloads WebView2 if necessary.
- `Me-Sim_0.1.0_x64-offline-setup.exe`: installer including WebView2.
- `Me-Sim-0.1.0-updated.exe`: standalone executable for this release; requires WebView2.

The packages are unsigned and are not installed automatically.

## Build Linux packages

On x86_64 Linux, `npm run package:linux` produces a Debian `.deb` package in `src-tauri/target/release/bundle/deb/`. No prebuilt Linux artifact is currently provided in `release/`. The package was built on Ubuntu 24.04; installation and compatibility with other distributions remain to be validated.

Development prerequisites for Ubuntu/Debian, in addition to Node 24.15+ and stable Rust:

```sh
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
npm ci
npm run package:linux
sudo apt install ./src-tauri/target/release/bundle/deb/Me-Sim_0.1.0_amd64.deb
```

The `.deb` package declares its system dependencies, including WebKitGTK 4.1. Other distributions require equivalent development packages and do not yet have a dedicated package format. Build on Linux; clean installation and compatibility with other distributions remain to be validated. See [Tauri's Linux prerequisites](https://v2.tauri.app/start/prerequisites/) and [Linux distribution formats](https://v2.tauri.app/distribute/).

## Getting started

Development requires Node 24.15+ (24.x) and stable Rust. On Windows, also install the Visual Studio C++ tools and WebView2. On Linux, install WebKitGTK 4.1 and the system packages listed above. Initial dependency downloads require Internet access.

```sh
npm ci
npm run desktop
```

- `npm run validate:local`: local dependency and avatar checks, companion tests, builds, offline Playwright and Rust tests, then visual regression. Edge and Chromium must be installed.
- `npm run check:dependencies`: online npm audit and local dependency patch tests; see [dependency and import hardening](docs/en/dependency-import-hardening.md).
- `npm run build`: build Angular.
- `npm run preview`: browser preview at http://127.0.0.1:1420, using temporary fictional data with file exchange disabled.
- `npm test`: Playwright tests with Edge on port 1421; build first.
- `npm run docs:dev`: VitePress documentation at http://127.0.0.1:5174.
- `npm run docs:build`: build documentation and check internal links.
- `npm run docs:preview`: preview the built site at http://127.0.0.1:4174.
- `npm run storybook`: local design system catalog on 127.0.0.1:6006.
- `npm run test:visual`: build and run Playwright visual regression for the application, companion PWA, Storybook and documentation; install Chromium with `npx playwright install chromium`.
- `npm run test:visual:update`: deliberately update visual references after inspection.
- `npm run test:rust`: Rust tests for data, files and the scientific lock.
- `npm run package`: per-user NSIS installer; downloads WebView2 if necessary.
- `npm run package:offline`: NSIS installer including the offline WebView2 installer.
- `npm run package:linux`: Linux `.deb` package, built on Linux.

JavaScript and Rust versions are locked by `package-lock.json` and `src-tauri/Cargo.lock`. Caches can be moved into the project with `$env:CARGO_HOME = "$PWD\.cache\cargo"` in PowerShell or `CARGO_HOME="$PWD/.cache/cargo"` on Linux.

Builds and checks run locally; no GitHub Actions workflow is included. `npm run validate:local` uses Edge/Chromium and is documented for Windows. Preload Rust dependencies with `cargo fetch --locked --manifest-path src-tauri/Cargo.toml` before going offline. Initial installation and `npm audit` require registry access; build packages separately with the commands above. Initial builds may download tools or WebView2.

## Features

- French and English UI, with immediate language changes without altering user-entered text.
- Light and dark themes; language and theme are stored locally and included in JSON backups.
- Profile creation, selection, editing and deletion, plus a separate fictional demo.
- Recording and editing weight, sleep, steps, activity, intake, self-reported stress and timestamped habits.
- A scrolling 24-hour timeline, daily summary and avatar playback of activities.
- A Target profile for a reference day and observed deviations over the last seven days; missing days remain unknown.
- A habits screen with daily yes/no answers, custom habits and a 14-day alignment view; removed habits remain in history.
- Observation history and charts, explicitly marking missing data as unknown.
- A PS1-style scene with activity animations, 3D accessories, avatar colors and animation preferences. If WebGL is unavailable, data remains accessible and the user can retry 3D.
- Interactive 3D camera controls for orbit, zoom and resetting the view, including keyboard controls; comparison previews have independent cameras.
- Male and female FBX characters with embedded textures, fifteen clips each and editable Blender files. Local GLB animations can be replaced; see the [artist guide](docs/en/artist-animation-guide.md) and `npm run check:avatar`.
- Saved personal scenarios and two illustrative avatars side by side.
- UTF-8 CSV, binary XLS, multi-sheet XLSX and JSON imports with mapping, units, dates and paginated preview.
- CSV, binary BIFF8 XLS and XLSX exports, complete JSON backup, and transactional restore preceded by a JSON copy.

## Scientific limitations

**Weight projections are disabled.** The Rust command rejects calculations intended for users. The research module implements only the linearized late-phase equations from Hall 2011; it is not the complete Body Weight Planner. Its tests check mathematical properties, not clinical validation or agreement with published studies.

See the [model card](docs/en/model-card.md) for sources, conditions for enabling the model and remaining work. No coefficient arbitrarily turns sleep, stress or steps into future weight. The avatar is not an anatomical projection.

## Privacy

The database is stored in the local application data directory for the current system account; its exact location is shown in preferences. Only language and theme are also cached in the WebView for startup display; no health data is stored there. Translations are bundled. There are no accounts, remote servers, CDNs, external fonts, analytics, AI services or automatic updates.

Data is not encrypted by the application and is protected by the system account and disk permissions. Profiles are not authenticated accounts. Deleting a profile removes its records from the active database, but not from existing backups, exports or system copies; it is not forensic disk erasure.

The WebView does not access disk or SQL directly. Files go through native Rust dialogs; JavaScript cannot supply arbitrary paths. Imports and restores are prepared in memory and confirmed using opaque tokens. The application sends no telemetry; maintenance of WebView2 on Windows and WebKitGTK on Linux remains the system's responsibility.

## Project layout

- `src/app/core`: TypeScript contracts, Signals state, bundled translations, presentation preferences, icons, charts and focus handling.
- `src/app/pages`: screens and reactive forms.
- `src/app/scene`: on-demand scene and GPU resource cleanup.
- `src-tauri/src`: domain logic, SQLite, file exchange, research engine and native commands.
- `fixtures`: examples without personal data.
- `docs`: guides, model card and validation.

## Documentation and design system

The [VitePress documentation](docs/en/index.md) covers installation, privacy, data entry, animations, architecture, the design system, scientific limitations and reviews. [Functional and technical specifications](docs/en/specifications.md) describe code contracts and declaration references.

The [Storybook and visual regression guide](docs/en/design-system.md) describes shared components, themes, controls and local reference screenshots. Screens and documentation are captured at iPhone 16 Pro, iPad Pro 11-inch, MacBook Pro 14-inch and desktop sizes, in French and English with light and dark themes.

## Isolated native verification on Windows

After `npx tauri build --debug --no-bundle`, start the binary with `ME_SIM_TEST_DATA_DIR` pointing to a test directory and `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223`. `node scripts/native-smoke.mjs` checks that the database path contains `native-smoke` before any mutation.

The data directory override is compiled only in debug builds. Do not enable remote debugging for real personal use.
