# Refactoring review — 7 October 2026 {#refactoring-review-—-7-october-2026}

Reviewed the current working tree, including the uncommitted Storybook/design system changes. Scope: Angular state and page components, domain contracts, SQLite mutations, imports, error translation, and shared UI styles. This review changes documentation only.

The existing concurrency, unknown-versus-zero, date rollover and import corrections remain covered by passing tests. The findings below are maintainability and scaling concerns; they are not newly reproduced user-facing defects. Complexity statements come from code inspection, not a performance benchmark.

<!-- prettier-ignore -->
## 1. High priority: replace whole-database writes with targeted transactions {#_1-high-priority-replace-whole-database-writes-with-targeted-transactions}

Evidence: `src-tauri/src/store.rs:29` calls `load`, the domain mutation, and `replace` for every ordinary mutation. `replace` at line 110 validates the whole snapshot and deletes every business/settings table at line 120 before reinserting its rows. `src/app/core/store.ts:143` receives another complete snapshot. Saving a habit answer or changing the theme therefore processes data belonging to every profile.

This makes routine writes grow with total history, holds the shared store lock during that work, and makes storage changes harder to isolate. The frontend also sends complete profiles when editing the Target or adding/archiving a habit. The revision checks currently protect these writes; this is not a claim that the previously fixed lost-update bug has returned.

Refactor in stages:

- Introduce specific operations such as update settings, save a habit day, patch profile fields, set Target, and archive a habit.
- Compare the caller's expected revision inside the write transaction, then update only affected rows and increment the revision in the same transaction.
- Keep full snapshot replacement for complete restore. Preserve the existing JSON backup contract.
- Initially keep compatible responses; later return affected entities/revision and add profile-scoped history queries to reduce snapshot serialization and frontend invalidation.

Start with settings and habit-day writes. Keep the existing two-connection concurrency, rollback, profile isolation and backup round-trip tests as gates.

<!-- prettier-ignore -->
## 2. High priority: index import commit lookups {#_2-high-priority-index-import-commit-lookups}

Evidence: `src-tauri/src/exchange.rs:383` already builds a hash map for preview, but `commit` at line 439 searches the complete observation vector with `iter().position` for each incoming row at line 452. New observations are appended to the vector that later rows scan.

For m incoming rows and n existing observations, the lookup work is O(mn + m²). The reader allows 50,000 rows per sheet, so the small fixtures do not exercise the most expensive path.

Build one index keyed by profile, date, metric and optional time, and update it as rows are appended/replaced. Keep the current observation IDs on replacement and batch provenance. A following step can move indexed conflict resolution into the targeted SQLite import transaction from finding 1.

Verify duplicates both against existing data and within one file, skip/replace policies, equal dates in different profiles, multiple timed events, and rollback on a late failure. Add a separate large synthetic import benchmark rather than a brittle wall-clock assertion to the unit suite.

<!-- prettier-ignore -->
## 3. Medium priority: define one metric contract and separate browser utilities {#_3-medium-priority-define-one-metric-contract-and-separate-browser-utilities}

Evidence: `src/app/core/models.ts:194` defines units, maxima, integer rules and event flags. Rust repeats units and validation in `src-tauri/src/domain.rs:247` and line 263; Target rules also appear in `domain.rs:211` and `src/app/pages/dashboard.ts:612`. Imports maintain their aliases/conversions separately. The tobacco and zero-duration fixes are correct, but future metrics still require coordinated edits in several files.

The same models module also constructs browser preferences using `matchMedia` and local storage at line 434, and generates demo data using the system clock and UUIDs at line 451. Importing contracts is therefore coupled to browser/demo concerns.

Separate pure types, the metric catalogue, browser defaults and demo generation. Give demo generation explicit clock/ID dependencies. Use a checked-in declarative metric contract to generate or verify TypeScript and Rust metadata, including canonical/accepted units, limits, integer rules and event semantics. Keep validation authoritative in Rust; frontend checks only improve feedback. Give Target fields their own explicit schema where their rules differ from observation rules.

Use parity checks and the existing tobacco, zero-value, Excel and daily-summary cases to guard this boundary.

<!-- prettier-ignore -->
## 4. Medium priority: put native IPC and import sessions behind typed services {#_4-medium-priority-put-native-ipc-and-import-sessions-behind-typed-services}

Evidence: `src/app/core/store.ts:113` mixes busy/error handling with concurrency refresh; line 196 implements a second mutation path for browser preview without the complete Rust validation. `src/app/pages/data.ts:529` through line 619 calls six native commands directly and also changes Store state/notices. Command names, DTOs and error handling are distributed between page and Store.

Introduce a small typed application gateway with native and memory implementations. Move import/restore session state and transitions into an exchange service, leaving the page to render forms and dispatch actions. Generate or verify IPC DTOs against Rust serialization. Make completed, cancelled, busy and failed results explicit instead of sharing `undefined` for skipped work and failures.

The memory implementation should enforce the supported domain rules or explicitly declare its limits. Keep the existing native smoke scripts and mocked UI tests; mocks alone cannot establish native validation parity. Preserve drafts on concurrency refresh and continue requiring a new preview before retrying a conflicting import.

<!-- prettier-ignore -->
## 5. Medium priority: extract feature UI and make Storybook reuse it {#_5-medium-priority-extract-feature-ui-and-make-storybook-reuse-it}

Evidence: `src/app/pages/dashboard.ts` is about 780 lines and combines the page template, Target editing/merge logic and replay timers (`Dashboard:589`, `targetForm:612`, `replay:748`). `src/app/pages/data.ts` combines the import mapper, preview table, export actions and restore dialog. The 2,300-line `src/styles.css` mixes application shell, reusable controls and feature-specific layouts.

Storybook already reuses MetricCard and UiButton, but the form/message/empty-state stories in `stories/states.stories.ts:8` are hand-written examples. Most pages still use button class strings instead of UiButton. Changes to the actual feature form or dialog can therefore miss the corresponding catalogue example.

Extract a Target editor, timeline replay controller, import mapping/preview components, and reusable notice/empty-state components. Use real components in stories, including unknown, invalid, conflict and disabled states. Adopt UiButton gradually in the remaining pages. Move feature CSS alongside the extracted components; keep tokens, resets, shell and shared controls global. Preserve cascade order during the move and use the existing visual references to detect unintended changes.

Within these components, cache filtered journal rows, per-profile observation counts and import status counts with computed state/indexes instead of rescanning arrays from template helper methods (`journal.ts:378`, `profiles.ts:201`, `data.ts:514`).

<!-- prettier-ignore -->
## 6. Lower priority: translate stable message identifiers {#_6-lower-priority-translate-stable-message-identifiers}

Evidence: `src/app/core/i18n.ts:33` looks up complete French sentences and returns the source when no key exists. `src-tauri/src/domain.rs:6` supplies a broad error code and French message; many distinct validation failures share INVALID_DATA. Dynamic export/restore messages require a special list of prefixes in the translator.

A wording change in Rust can silently break the English message even when the business behavior is unchanged. Add stable message identifiers and named arguments alongside existing transport error codes. Render messages at the presentation layer and interpolate paths/profile names verbatim. Migrate backend errors and dynamic notices first; there is no need to replace the entire translation catalogue in one change.

Retain the presentation tests for native errors, import rows, literal user text, and preservation of unsaved drafts when switching language/theme.

## Suggested sequence {#suggested-sequence}

Start with the indexed import lookup for a contained change, then the metric contract and typed gateway. Implement targeted writes incrementally with concurrency/rollback tests. Extract UI components while retaining current screenshots, then migrate error identifiers. Keep scientific model activation as a separate validation task. The artist animation manifest, model-per-file cache and existing GPU teardown already form useful boundaries and do not need a general rewrite for these refactors.

## Validation performed for this review {#validation-performed-for-this-review}

| Check                                                                                      | Result    |
| ------------------------------------------------------------------------------------------ | --------- |
| Angular production build (`npm run build`)                                                 | Passed    |
| Existing Rust suite (`cargo test --locked --offline --manifest-path src-tauri/Cargo.toml`) | 21 passed |
| Focused Playwright suite (`npm test -- tests/fixes.spec.ts tests/daily-summary.spec.ts`)   | 13 passed |

These checks use existing tests and fictional/temporary data. No personal database was opened. This review did not rerun the full visual suite, test a fresh Windows installation, or benchmark large histories/imports. No runtime implementation or screenshot reference was changed.
