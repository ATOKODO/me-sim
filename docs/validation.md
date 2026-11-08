# Delivery validation {#validation-de-la-livraison}

This page records dated historical checks. The documentation is now in English at the root and legacy `/en/` paths; earlier references to two documentation languages describe the configuration at the time of those checks.

## Latest verification — 22 October 2026 {#latest-verification-2026-10-22}

- Angular production, VitePress and Storybook builds pass. The documentation contains 14 pages per language with matching French/English section anchors.
- All 46 offline Rust tests and 64 functional Playwright tests in Edge pass. Coverage includes profile isolation, SQLite persistence, imports, habit tracking, timed sessions, versioned Target schedules and male/female scenes.
- All 246 Playwright visual tests pass without updating images. The 243 PNG references are grouped by category, viewport, language and theme in `tests/visual/__screenshots__/win32/chromium/`: eight routes in French/English and light/dark across four formats, plus 960/1440 references, Storybook and documentation pages.
- This pass did not relaunch the Tauri app in WebView2, build an installer, run GitHub CI or test a physical device. Phone and tablet captures are Chromium viewports on Windows.
- Remaining open-source publication work is recorded in the [publication review](./open-source-review-2026-10-09.md); the code license and character redistribution rights still need clarification.

The dated sections below preserve historical results from earlier changes.

As of 27 October 2026, the GitHub Actions workflow has been removed from the repository. CI references in the dated results below describe the previous configuration; current checks run locally.

## Supplied character — verification of 30 September 2026 {#personnage-fourni-—-verification-du-30-septembre-2026}

- Original FBX preserved identically: 25 bones, 498 vertices, 952 triangles, UVs/weights retained in `.blend`.
- Source FBX has no animation clip; fifteen actions created, saved and exported as named GLB clips.
- Embedded 256 × 256 PNG atlas: RGBA pixels compared to supplied texture without differences.
- Compressed `.blend`, packed texture, actions retained with fake users. Saved-file export verified with `scripts/export-avatar.py`.
- Self-contained GLB of roughly 757 KB: 40-joint skeleton comprising 25 original bones and 15 prop bones. Fifteen manifest mappings verified with `npm run check:avatar`.
- All fifteen mode captures inspected in Edge, then textured character confirmed in native capture. Test images in `test-results/`; Windows capture in `docs/native-dashboard.png`.
- `connect-src blob:` permits Three.js to read the embedded texture in memory. No remote CSP server added.
- Standard/offline NSIS installers rebuilt successfully; direct executable updated in `release/`. Clean installation was not repeated for this change.

## 3D camera — verification of 30 September 2026 {#camera-3d-—-verification-du-30-septembre-2026}

- Wheel/buttons checked with 70–400% zoom limits; buttons disable at their limit.
- Drag and keyboard-arrow orbit; reset button, R and Home. With animations stopped, rendering before manipulation and after reset matches exactly.
- Zoom retained on resize, independent comparison cameras, controls/focus removed when 3D is unavailable (context-loss test updated 8 October). OrbitControls listeners released with the scene.
- Native WebView2 with isolated database: orbit, wheel zoom and exact image restoration checked without JavaScript errors. Reproduce with `node scripts/native-camera-smoke.mjs` after starting the debug binary under `.tmp/native-smoke/` and opening its local debug port (default 9224, configurable via `ME_SIM_NATIVE_DEBUG_URL`).

## Languages and light theme — verification of 1 October 2026 {#langues-et-theme-clair-—-verification-du-1er-octobre-2026}

- French/English menu and theme button in top bar, also in preferences. Bundled translations on seven routes, camera controls, forms, dialogs and import messages. Dates, numbers and calendar follow the selected language.
- Light theme inspected in Edge at 960 px, then WebView2. Automated WCAG A/AA audits for seven routes in French/English and a native import preview with conflicts/errors. Character/texture colors retained.
- Immediate switching preserves journal, Target and scenario drafts, plus profile, habit, sheet and file names. Stored metric/unit identifiers are not translated.
- SQLite persistence/JSON round-trip tested in Rust; unknown language/theme rejected, legacy settings/backups default to French/dark. Browser cache contains only presentation preferences.
- Real WebView2: English/light retained after reload, SQLite overrides stale display cache, profiles/observations/days unchanged, translated model card and working GLB scene. No JavaScript errors. Isolated database/cache in `.tmp/native-smoke/appearance/`.
- Reproduce with `node scripts/native-presentation-smoke.mjs`, local port 9226 (or `ME_SIM_NATIVE_DEBUG_URL`) and database under `.tmp/native-smoke/appearance/`. The script rejects other databases.
- Development server at 127.0.0.1:1420: language menu/light theme checked on the served app. Angular build and debug Tauri binary rebuilt; release installers were not rebuilt for this change.

## Verification limits {#limites-de-verification}

- Automated accessibility audit completed; no accessibility certification or user screen-reader trial.
- Rendering is limited to roughly 30 fps and releases geometry, materials, observer and context on closing; no prolonged hardware benchmark or 30 fps certification across configurations.
- Native file pickers implemented; Rust parsing/writing tested. Their full Windows-shell keyboard flow is not automated.
- Browser absence of remote requests checked and native startup verified. No clean VM installation with physical network disconnection performed.
- Local installers have no publisher certificate signature.
- Complete scientific model, published numerical references and clinical validation remain unfinished; projections disabled.

## Reproduce {#reproduire}

After installing dependencies and Chromium, run `npm run validate:local` on Windows. Edge must be installed; ports 1421, 1423, 4175 and 6107 must be free. Build installers separately with `npm run package` or `npm run package:offline`.

Angular/Tauri disables critical CSS inlining (no inline onload handler) and passes Tauri's style nonce to Angular through ngCspNonce. Dynamic styles are nonce-authorized; script-src/style-src use no unsafe-inline.

## Review defects — verification of 2 October 2026 {#defauts-de-la-revue-—-verification-du-2-octobre-2026}

The six confirmed defects in `review-2026-10-01.md` are fixed.

| Defect                                                   | Evidence                                                                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Stale view overwriting a recent Target                   | Rust two-connection test using the real command's method; draft/explicit-retry tests; rejection confirmed via WebView2 IPC |
| Summary retaining old activity and inventing zeros       | Dated pure calculation; missing/old/zero data tests; native explicit-zero and unknown-tobacco display                      |
| Frozen calendar/timeline                                 | Reactive clock; September–October rollover, historical selection, expiry without mutation and midnight journal draft       |
| Excel time becoming a date                               | XLSX date, 18:30 and native duration test; correct date, HH:mm and minute conversion                                       |
| Missing tobacco unit                                     | Choices from metric catalogue; preview/UI import of two-column CSV; Rust cigarette validation                              |
| Rejected zero minutes and accepted fractional cigarettes | Zero saved without event; form integer validation; native reload/persistence and Rust tests                                |

Additional checks cover 13-indicator deviation, explicit zero-target rules, no double-counted total activity, retaining unchanged fields after conflict, and import preview on language switching. Archived habits no longer consume active slots; tests preserve history and reject more than 100 active habits.

`npm run build`, 21 Rust tests and 36 Playwright tests passed. `scripts/native-fixes-smoke.mjs` passed in Tauri debug with isolated database/cache under `.tmp/native-smoke/fixes`, checking real-command stale mutation rejection, Target retention, zero-minute input, SQLite persistence after reload and unknown data display. No JavaScript errors.

Reproduce by building `npm run tauri -- build --debug --no-bundle`, then starting the binary with `ME_SIM_TEST_DATA_DIR` under `.tmp/native-smoke/fixes`, isolated `WEBVIEW2_USER_DATA_FOLDER` and `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9231`. Run `node scripts/native-fixes-smoke.mjs`; other databases are rejected. Close this test instance afterwards. Remote debugging is not intended for personal data.

## Fixed packages — delivery of 2 October 2026 {#paquets-corriges-—-livraison-du-2-octobre-2026}

- Standard/offline NSIS installers rebuilt after the final layout fix and copied to `release/`. Offline package includes WebView2 x64 installer; assembly succeeded with Tauri cache access after sandbox access had been refused.
- Direct `Me-Sim.exe` and `Me-Sim-0.1.0-updated.exe` refreshed. Version stays 0.1.0; `release/build-info.json` records size, date, SHA-256 and that fixes were uncommitted.
- Deviation curve inspected: coverage/dates no longer overlap the legend. Target geometry and both light-theme flows passed after the final fix in addition to the previous 36 tests.
- Successful assembly does not confirm clean installation: offline VM testing and installer signing remain. Scientific simulation stays disabled.

## Storybook and visual regression — 7 October 2026 {#storybook-et-regression-visuelle-—-7-octobre-2026}

- Storybook 10.6.1, Angular 22 and TypeScript 6 compatible; exact versions in manifest/lockfile. Static build/development server at 127.0.0.1:6006 verified. Palette extracted without changing values; dashboard buttons/metric cards shared with stories.
- 19 stories, two themes and local controls. Workshop test checks changing a value to zero, light theme, English and Docs. Fictional data; native Store not instantiated.
- 73 Windows PNG references sampled: palette in both themes, buttons, unknown metric, minimum-width dashboard and calendar. Seven routes at 960/1440 px in both themes, three English screens in both themes, 19 stories in both themes and keyboard focus. Roughly 5.7 MiB under `tests/visual/__screenshots__/win32/chromium/`.
- Full `npm run test:visual` chain passed: Angular/Storybook builds and 74 tests without baseline updates. A previous comparison also passed; a temporary probe detected a deliberately altered button color and was removed.
- 36 existing functional tests passed after component extraction. Story TypeScript and diff checks passed. No Rust/storage format changed.
- Tests reject external requests and JavaScript errors. Storybook telemetry/crash reports disabled. Windows Server 2022 CI uses locked Chromium, forbids baseline updates and retains failure reports. That GitHub job was not executed in this session; system rendering differences require inspection.
- Since 8 October, only GPU canvas pixels are hidden in page snapshots; camera controls/captions remain. Functional tests check 3D rendering, animation and retry without GPU pixel baselines. These are not accessibility certification. See `docs/design-system.md` for commands/update protocol.
- Storybook reference viewports added: iPhone 16 Pro 402 × 874, iPad Pro 11″ 834 × 1194, MacBook Pro 14″ 1512 × 982 and Desktop 1920 × 1080 CSS pixels. All four actual preview sizes/reset checked in Chromium without JavaScript errors. Static build, types and workshop test passed afterwards; existing PNGs unchanged.

## VitePress documentation — 7 October 2026 {#documentation-vitepress-—-7-octobre-2026}

- Stable VitePress 1.6.4 locked as development dependency. Seven existing guides reused; home, setup, privacy and architecture add four, totaling eleven documentation pages.
- Static build rejecting dead internal links passed; config/theme types and Angular build checked. Windows CI runs `npm run docs:build` without automatic publication; CI change not executed on GitHub in this session.
- Navigation of eleven pages and local search checked in built Chromium site. No external request, missing local asset or JavaScript error. Local fonts/assets verified; search query persistence disabled.
- Navigation/global overflow checked at 402 × 874, 834 × 1194, 1512 × 982 and 1920 × 1080. Setup guide screenshots inspected on mobile/desktop. Light/dark, dev server and mobile menu separately checked.
- Dev restricted to `127.0.0.1:5174`, preview to `127.0.0.1:4174`, strict ports. Output/cache under `docs/.vitepress/` ignored by Git. Documentation separate from Tauri, reads no personal database.

## Exclusively 3D rendering — 8 October 2026 {#rendu-exclusivement-3d-—-8-octobre-2026}

- Removed 2D option, CSS avatar, replacement animations and rendering-hide branch. Preferences retain animation, retro jitter, language and theme.
- Legacy SQLite/JSON compatible: Rust accepts only old boolean `force2d`, ignores it and does not re-export it. Tests retain all business data for old true/false values; other unknown fields remain rejected.
- Absent/lost WebGL: translated message, no replacement silhouette, camera controls/focus removed. Retry creates 3D again; other comparison camera stays independent. Journal stays usable. Edge tests and mobile Chromium inspection cover messages, retry and real 3D.
- Angular/Storybook builds/types, 22 Rust tests, 42 functional tests and 74 visual tests passed. Fourteen page references updated then compared without updates; sampled dashboard, settings and comparison. Canvas hiding is test-only, without an app option.
- No personal database access. Release executables/installers were not rebuilt.

## Female character — 8 October 2026 {#personnage-feminin-—-8-octobre-2026}

- Local female variant created from the existing animated rig: distinct silhouette/jaw, bob haircut and geometric face without atlas beard. Body retained 498 vertices, 952 triangles, UVs/weights; hair added 76 triangles and face details 10. Skeleton retained 40 joints and fifteen actions.
- `art/avatar/female-casual-animated.blend` saved with actions/packed texture. Blender 4.2 export checked with `scripts/export-avatar.py -- --model female`; self-contained GLB of 789,828 bytes. Thirty mappings pass `npm run check:avatar`.
- Automatically selected for `Profile.sex === 'female'` in dashboard/both comparisons. Male/unspecified keeps default; no migration/new business data. Version-1 manifests compatible, optional `variants.female.overrides` documented.
- Edge checks fifteen clips per variant, timeline, no remote requests/JavaScript errors, switching profiles without recreating scene/resetting camera, both models reused and late prior-variant activation rejected. Profile editing and female comparison scenes checked. Activity and close front/side captures inspected.
- Angular/Storybook builds/types, 45 functional tests and 74 visual tests passed without baseline updates. Dev server on 1420 loads female model without JavaScript errors. Artist sources/guide allow independent model/animation replacement.
- No personal database access; release executables/installers not rebuilt.

## Supplied female model — 9 October 2026 {#modele-feminin-fourni-—-9-octobre-2026}

- Female now uses `female_secretary.fbx` and `secretary_tex.png`, copied unchanged into `art/avatar/`. SHA-256 compared to supplied files. Original 256 × 256 PNG bytes embedded in GLB.
- Source: 488 vertices, 932 triangles, 28 bones and no clips. Vertex positions, faces, UVs, skin weights and joint rest matrices compared to FBX after preparation: no differences accounting for bone aliases. Fifteen prop bones and actions added.
- Shared generator accepts `--model male`/`--model female`, adapting initial pose, grips, seating and face props to female proportions. Male regenerated successfully in an isolated verification directory.
- Female Blender file with packed texture, retained actions and editable rig. Saved-file export via `scripts/export-avatar.py -- --model female` byte-identical to initial preparation: 777,004-byte GLB. `SecretaryAtlas` preserves supplied clothes.
- Angular build and thirty mappings passed. Eight avatar/camera Playwright tests passed: fifteen activities per character, timeline, single load, switching without camera loss, late loads and comparisons. Close/activity captures inspected. Dev server on 1420 serves female model without JavaScript errors.
- Artist guide/docs updated. No personal database access; release executables/installers not rebuilt.

## Character loading without flashes — 9 October 2026 {#chargement-des-personnages-sans-flash-—-9-octobre-2026}

- Loader distinguishes waiting for manifest/GLB, ready artist character and procedural fallback. Cubic person hidden before the first frame; room/camera remain usable with French/English loading caption.
- Procedural fallback remains for missing manifest/file, failed load or unprovided clip. Variant, activity, replay and destruction guards remain on late loads.
- Three new Playwright tests separately delay manifest and GLB for both characters after navigation, and default model after refresh. Captures without captions check room stability while waiting and a person appearing after success/real failure. Missing manifest retains usable procedural animation.
- Three loading tests and twenty existing route/avatar/camera tests passed. Angular/Storybook builds/types, formatting and 74 visual tests passed without PNG updates. Artist guide/architecture updated.
- No personal database access; release executables/installers not rebuilt.

## Bilingual documentation and device captures — 9 October 2026 {#documentation-bilingue-et-captures-par-format-2026-10-09}

- All eleven pages have French and English versions, including historical reviews. French URLs are preserved; translations are under `/en/`. Navigation, local search and theme labels are translated. The language menu preserves the page and section on desktop and mobile.
- The build checks configuration/theme types, internal links, and matching pages and section IDs across languages with `scripts/check-docs.mjs`. English headings use explicit IDs to preserve French section links.
- Dimensions shared by Storybook and Playwright in `config/viewports.ts`: iPhone 16 Pro 402 × 874, iPad Pro 11″ 834 × 1194, MacBook Pro 14″ 1512 × 982 and Desktop 1920 × 1080 CSS pixels. Captures cover all seven screens in FR/EN and light/dark (112 combinations), plus documentation home and getting-started pages (32 combinations). The previous 73 references remain covered; the suite contains 217 PNG references and 220 tests.
- Documentation flows visit all 22 pages and check section anchors, language switching and local search results. Each format checks the actual viewport dimensions and absence of global horizontal overflow. External requests and JavaScript errors fail tests.
- Seven functional presentation tests passed in Edge using an isolated test server on port 1424, since the usual port 1421 was occupied by another project. The English “Sedentary time” label is corrected and checked; user-entered text remains unchanged when language or theme changes.
- Captures inspected by sampling across all four formats, both languages and themes. These are Chromium viewports on Windows, not physical iPhone, iPad or macOS tests. Full-page PNGs may exceed viewport height. Only GPU canvas pixels are hidden; 3D controls and captions remain visible, while functional tests cover actual rendering separately.
- Existing Windows CI is configured to build all three tools and compare images without automatically updating references. This GitHub job was not run in this session. No personal database is opened; executables and installers in `release/` are not rebuilt for this integration.
- The complete `npm run test:visual` pipeline passed: locale and type checks, VitePress, Angular and Storybook builds, then 220 tests without changing references. The thirty earlier page captures unaffected by the new label also pass a separate check. Formatting and diff checks passed; only two earlier English journal references change for the sedentary-time translation.
