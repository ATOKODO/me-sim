# Project architecture {#architecture-du-projet}

## The three parts {#les-trois-parties}

| Part             | Responsibility                                                     |
| ---------------- | ------------------------------------------------------------------ |
| Angular          | Screens, forms, feature routes and reactive state with Signals.    |
| Tauri 2 and Rust | Native commands, validation, SQLite, migrations and file exchange. |
| Three.js         | Retro scene, camera, animations and GPU resource management.       |

The frontend sends typed operations to Tauri commands. Rust validates inputs and profile ownership before writing. The 3D renderer receives an activity mode and preferences; it calculates no clinical result.

## Source organization {#organisation-des-sources}

| Folder                       | Contents                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `src/app/core/`              | Contracts, Signals Store, clock, daily calculations, translations and basic components. |
| `src/app/pages/`             | Dashboard, journal, habits, scenarios, data, profiles and preferences.                  |
| `src/app/ui/`                | Components and directives shared with the catalogue.                                    |
| `src/design-system/`         | Color and spacing tokens.                                                               |
| `src/app/scene/`             | Scene component, Three.js room and artist animation loading.                            |
| `src-tauri/src/`             | Domain, persistence, exchange, scientific gate and Tauri commands.                      |
| `public/avatar/`             | Manifest and GLB files used by the application.                                         |
| `art/avatar/`                | FBX sources, texture and editable Blender files.                                        |
| `stories/` and `.storybook/` | Local catalogue, configuration and fictional examples.                                  |
| `tests/` and `scripts/`      | Functional tests, visual references, asset checks and native probes.                    |
| `config/`                    | Reference viewport dimensions shared by Storybook and screenshot tests.                 |
| `docs/`                      | French Markdown guides, English translations in `en/` and VitePress configuration.      |

## Contracts and persistence {#contrats-et-persistance}

The main entities are `Profile`, `Observation`, `HabitDefinition`, `HabitDay`, `ImportBatch`, `Scenario` and `SimulationRun`. A profile also owns its `TargetDay`. Stored data carries its profile ownership; presentation preferences apply to the whole local workspace.

Exposed commands include `initial_state`, `mutate`, `choose_import`, `preview_import`, `commit_import`, `export_data`, `preview_restore`, `commit_restore` and `run_simulation`. Native pickers grant access to chosen files, then opaque tokens identify import/restore previews kept in Rust memory.

A SQLite revision accompanies reads and mutations. Stale attempts are rejected, data is reloaded and users review their draft before retrying. Mutations, imports and synchronization write only changed rows inside a transaction that checks the revision; full replacement is reserved for restoration. Entity order and linked habit/session effects are preserved. IPC still exchanges complete snapshots, so reading, validation and serialization costs continue to grow with history size.

Import confirmation indexes observations by profile, date, metric and canonical temporal key. New rows immediately update that index; repeated rows within a file and precise sessions sharing a wall-clock minute remain distinct according to that key. Frontend refreshes are serialized, deferred during writes and applied only when their revision is newer.

The JSON backup version is independent of the SQLite migration number. Unsupported versions are rejected before replacement. Transactions and the preventive copy protect restoration from partial writes.

## Business state and rendering {#etat-metier-et-rendu}

The local clock updates the calendar, summary and timeline window. Summary, coverage and deviation calculations are separate from rendering. A missing observation remains unknown; an explicitly entered zero remains a reported value.

The Three.js scene loads on demand. Each scene owns its camera and releases resources on destruction. If WebGL is unavailable or its context is lost, the scene displays a message and a retry action. No 2D avatar is generated; other features remain accessible. The scene receives a profile-derived appearance variant (`default` or `female`), without a new persisted field. Clips are indexed by variant and activity; one model and mixer are shared per GLB file. The loader distinguishes loading, ready artist models and procedural fallback: the person stays hidden in the room while the manifest or GLB loads. Procedural fallback appears only when no replacement exists or loading fails. A late load after a profile switch cannot replace the current variant, and cached models are released on destruction. The [artist guide](./artist-animation-guide.md) defines the replacement contract.

Animated rendering is limited to approximately 30 frames per second and suspended while the document is hidden or the scene is offscreen. With animations disabled, camera, size, model or state changes request a frame; no permanent drawing loop is maintained. Observers and listeners are released when the scene is destroyed.

The research weight engine remains inaccessible to user projections. See the [model card](./model-card.md) for implemented equations and missing activation criteria.

## Documentation and catalogue {#documentation-et-catalogue}

The [license and credits review](./licenses.md) describes AGPL-3.0-only, Vinrax asset terms and local dependency checks. External contributions are currently not accepted; cloning and forking remain permitted under the license.

The [functional and technical specifications](./specifications.md) describe the contracts associated with code declarations and their limits.

VitePress 1.6.4 turns the guides in `docs/` and `docs/en/` into a static site, with localized navigation and local search indexes. Storybook exposes application styles and components. These are development dependencies and are not part of the Tauri package.

Site configuration is in `docs/.vitepress/config.mts`, its theme in `docs/.vitepress/theme/` and dedicated assets in `docs/public/`. Cache and build output are ignored by Git. Local checks build the documentation, verify language parity and internal links, and compare screenshots at the four shared reference viewports. The repository contains no GitHub Actions workflow or automatic publication.

The [startup commands](./getting-started.md#lancer-cette-documentation), [visual protocol](./design-system.md) and [validation evidence](./validation.md) explain how to check changes before delivery.
