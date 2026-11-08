# Design system and visual regression {#design-systeme-et-regression-visuelle}

Storybook uses the application's styles and real Angular components. Stories are not included in Tauri. Dependencies are locked; Storybook telemetry and crash reports are disabled. No Chromatic account is required. Tests use fictional data and reports stay on the local computer.

## Use the catalogue {#utiliser-le-catalogue}

- `npm run storybook`: local server at http://127.0.0.1:6006, without automatically opening a browser.
- `npm run build:storybook`: static catalogue in `storybook-static/` (ignored by Git).
- Toolbars: dark/light themes, French/English and reference resolutions. Controls edit component arguments. Docs explains contracts/examples; Accessibility provides the local audit.

The palette is in `src/design-system/tokens.css`, imported once by `src/styles.css`. Existing values have been preserved. Semantic aliases `--ds-background`, `--ds-text`, `--ds-surface` and spacing tokens avoid copying values into examples. Global styles serve both catalogue and app.

`UiButton` styles native buttons and links and is used by the dashboard. `MetricCard` is the dashboard's latest-measurement component. Icons and curves reuse core components. Forms, notices and empty states illustrate the same CSS classes as pages.

Stories do not load the real Store: an in-memory preferences provider supplies translations. Values, dates and histories are fictional and no Tauri call is executed. Do not add personal backups to fixtures or screenshots.

## Reference resolutions {#resolutions-de-reference}

Storybook's viewport selector offers these component preview sizes. Dimensions are CSS pixels, width × height, shared with Playwright in `config/viewports.ts`.

| Format          |   Width |  Height |
| --------------- | ------: | ------: |
| iPhone 16 Pro   |  402 px |  874 px |
| iPad Pro 11″    |  834 px | 1194 px |
| MacBook Pro 14″ | 1512 px |  982 px |
| Desktop         | 1920 px | 1080 px |

Choose a format in the Canvas toolbar; Reset viewport returns to the available size. Enlarge the window or hide controls if the available Canvas limits height. Playwright applies the exact viewport dimensions independently of the Storybook window. Full-page PNGs may be taller than the viewport because they include content below the fold.

## Check images {#verifier-les-images}

Install the browser once: `npx playwright install chromium`. Then run `npm run test:visual`: documentation, application and Storybook builds, loopback static servers on 4175, 1423 and 6107, then PNG comparison. The script stops these servers after the test, including on failure. `--skip-build` reuses all three builds after test-only edits.

Stories tagged `visual` are discovered from the built index, automatically covering new stories in both themes. The device matrix covers all eight application routes in French/English, light/dark and the four reference viewports: 128 combinations. French 960/1440 px references, three additional English routes at 1440 px and keyboard focus checks are retained. Documentation home and getting-started pages are checked in English across the reference formats and themes, together with navigation and local search.

The application runs as a browser demo with a fixed date, animations stopped and only GPU canvas pixels hidden in snapshots; no native database is opened. Camera controls and captions remain visible. Functional tests independently check actual 3D rendering, clips, context loss and retry without hiding the canvas. Global horizontal overflow fails device tests; tables can still scroll inside their own containers.

References are grouped by OS, then category, viewport, language and theme: `application/<viewport>/<language>/<theme>/<page>.png`, `storybook/<viewport>/<language>/<theme>/<story>.png`, `documentation/<viewport>/<language>/<theme>/<page>.png` and `companion/<viewport>/fr/dark/<screen>.png`. Companion covers pairing, a measurement and an offline habit entry on iPhone 16 Pro and iPad Pro 11″. Reference viewports keep their names and dimensions, for example `ipadpro11-834x1194` or `desktop-1920x1080`. Historical captures use `960x1000` and `1440x1000`. Chromium comes from locked Playwright, with scale 1, Europe/Paris timezone and fixed dimensions. References depend on the OS; Linux/macOS need their own. Investigate font/system differences instead of hiding them with higher tolerance.

A screenshot permits at most 100 differing pixels with a color threshold of 0.15. Data/animations are stabilized; cards, forms and charts are not hidden. External requests are blocked and fail the test, as do JavaScript errors.

## Accept an intentional change {#accepter-un-changement-volontaire}

1. Run tests and open `npm run test:visual:report` to compare expected, actual and diff.
2. Fix unintended defects.
3. On the OS running visual regression, run `npm run test:visual:update` only for the intended change; add `-- --grep ...` to restrict captures. For new device references use `-- --grep 'devices /' --update-snapshots=missing`; for documentation use `-- --grep 'docs /' --update-snapshots=missing`.
4. Inspect changed PNGs, rerun `npm run test:visual`, then commit code and references together.

With Playwright 1.58, creating a missing reference with `--update-snapshots=missing` writes the PNG but reports a failure on that first run. Inspect the generated file, then rerun comparison without updates; creating a reference alone does not validate the regression.

Local comparison does not update baselines. On failure, the HTML report is in `playwright-report/visual/` and screenshots and traces are in `test-results/visual/`; Git ignores both folders. Do not raise tolerance to pass an uninspected change.

Configuration sources: [Storybook Angular](https://storybook.js.org/docs/get-started/frameworks/angular) and [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots).
