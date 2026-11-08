---
kind: technical
title: Frontend technical contracts
---

# Frontend contracts

The canonical technical and requirement identifiers are defined in the [canonical technical specification](../../specs/frontend-technical.md) and [canonical functional specification](../../specs/frontend-functional.md).

The parameters and return types below reflect TypeScript declarations or their inferred types. Called dependencies can fail: unless handling is specified, their errors follow their own contracts. Listed local functions are implementation details, not public APIs. Displayed data comes from the active profile; the native application remains responsible for validation and persistence.

## SVG charts

Implements REQ-FRONTEND-HABITS-101. Source: `src/app/core/chart-path.ts`.

Input: an array of numbers and a smoothing flag. Output: an SVG path on a 400 × 100 grid; an empty list produces an empty string. Smoothing preserves points and does not overshoot neighboring values. No storage or network calls; numbers must be usable in numeric calculations.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `chartPath` | `values: readonly number[], smooth = false` | `string` |
| `chartPath.coordinate` | `value: number` | `number` |

## Local clock

Implements REQ-FRONTEND-GHOST-101. Source: `src/app/core/clock.ts`.

Internal callbacks read the system time, update the signal and schedule the next refresh on the minute. Visibility, focus and pageshow force a refresh; destruction cancels the timer and removes listeners. No business return value or persistence.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `LocalClock.refresh` | `none` | `void` |
| `LocalClock.visible` | `none` | `void` |

**LocalClock constructor** — Inputs: `none`. Installs the clock, its listeners and their cleanup on destruction.

## Daily summary and target trajectory

Implements REQ-FRONTEND-HABITS-101. Source: `src/app/core/daily-summary.ts`.

Inputs: observations, local date, instant and targets, depending on the function. Sessions crossing midnight are split by day; timeline events are limited to the past 24 hours. Summaries return null for missing measurements and avoid double-counting total activity. The trajectory returns seven average deviations and their coverage; it is not a diagnosis. No storage effects.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `rowsOnDay` | `observations: Observation[], date: string, now: number` | `Observation[]` |
| `timelineEvents` | `observations: Observation[], now: number` | `{ observation: Observation; time: Date; }[]` |
| `dailyRecap` | `observations: Observation[], date: string, now: number` | `{ events: number; activeMinutes: number \| null; sleepHours: number \| null; socialMinutes: number \| null; screenAndGamingMinutes: number \| null; alcohol: number \| null; tobaccoCigarettes: number \| null; vapingMinutes: number \| null; eveningScreenMinutes: number \| null; sedentaryMinutes: number \| null; }` |
| `dailyRecap.sum` | `...metrics: string[]` | `number \| null` |
| `targetTrajectory` | `observations: Observation[], target: TargetDay, today: string, now = Date.now()` | `{ date: string; deviation: number \| null; coverage: number; total: number; actual: number; hasData: boolean; }[]` |
| `targetTrajectory.latest` | `metric: string` | `number \| undefined` |
| `targetTrajectory.sum` | `metric: string` | `number \| undefined` |

## Dialog focus and dismissal

Implements REQ-FRONTEND-PROFILE-101. Source: `src/app/core/focus-dialog.ts`.

Inputs: host element and keyboard event. Initial focus is deferred; Tab and Shift-Tab stay between the first and last available controls, while Escape emits dismissed. On destruction, the timer is canceled and previous focus restored. These functions manipulate the DOM and return no business data.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `FocusDialog.elements` | `none` | `HTMLElement[]` |
| `FocusDialog.ngAfterViewInit` | `none` | `void` |
| `FocusDialog.onKey` | `e: KeyboardEvent` | `void` |
| `FocusDialog.ngOnDestroy` | `none` | `void` |

## Events and hourly comparisons

Implements REQ-FRONTEND-GHOST-101. Source: `src/app/core/ghost.ts`.

Functions convert local times and dates, split sessions by day and clock discontinuity, select effective routine versions and compare observations with schedules. Frequencies distinguish known data, matches and total days; ties select no dominant event. recorded merges intervals to prevent double-counting. Preview mutations modify the in-memory snapshot and raise exceptions for missing profiles, session conflicts, future dates and duplicates, among others; native validation remains authoritative.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `minuteOf` | `date: Date` | `number` |
| `timeLabel` | `minute: number` | `string` |
| `localStamp` | `date = new Date()` | `string` |
| `defaultLabel` | `metric: Metric` | `string` |
| `eventLabel` | `o: Observation` | `string` |
| `eventsForDay` | `observations: Observation[], date: string, now: number, active?: ActivitySession \| null` | `GhostEvent[]` |
| `eventsForDay.include` | `id: string, metric: Metric, label: string, start: number, end: number, value: number, point: boolean, running = false, habitId: string \| null = null` | `void` |
| `routineForDay` | `plans: RoutineVersion[], date: string` | `RoutineVersion[]` |
| `plannedEvents` | `plans: RoutineVersion[], date: string` | `GhostEvent[]` |
| `eventsAt` | `events: GhostEvent[], minute: number` | `GhostEvent[]` |
| `referenceDates` | `today: string, days: number, kind: "all" \| "workdays" \| "weekend"` | `string[]` |
| `matches` | `e: GhostEvent, focus: Focus` | `boolean` |
| `unionLength` | `intervals: [number, number][]` | `number` |
| `recorded` | `events: GhostEvent[], minute: number, focus?: Focus` | `number` |
| `frequency` | `days: GhostEvent[][], minute: number, focus: Focus` | `{ known: number; matched: number; total: number; }` |
| `frequencyBins` | `days: GhostEvent[][], focus: Focus` | `GhostEvent[]` |
| `compareSchedule` | `actual: GhostEvent[], plans: GhostEvent[], minute: number` | `{ plan: GhostEvent; match: GhostEvent; status: string; delay: number \| null; durationDelta: number \| null; withinTolerance: boolean \| null; }[]` |
| `dominant` | `days: GhostEvent[][], minute: number` | `GhostEvent \| null` |
| `recordLinkedHabit` | `s: Snapshot, o: Observation` | `void` |
| `applyGhostMutation` | `s: Snapshot, op: Mutation` | `boolean` |
| `observationKey` | `o: Observation` | `string` |

## Habit dates and status

Implements REQ-FRONTEND-HABITS-101. Source: `src/app/core/habit-tracking.ts`.

Inputs are local dates, definitions and answers. Functions calculate active habits and a preview based only on supplied answers. The score is null until the day is complete and validated; no answer is treated as no. Functions return new values without recording data.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `localDate` | `date: Date` | `string` |
| `shiftDate` | `key: string, days: number` | `string` |
| `activeHabits` | `habits: HabitDefinition[], date: string` | `HabitDefinition[]` |
| `evaluateHabitDay` | `habits: HabitDefinition[], day: HabitDay \| undefined, date: string` | `{ total: number; answered: number; matched: number; preview: number \| null; validated: boolean; score: number \| null; }` |

## Language, theme and formatting

Implements REQ-FRONTEND-PROFILE-101. Source: `src/app/core/i18n.ts`.

Inputs: text, language, theme or value to format. Translation keeps the source text when no translation is known, null values are handled explicitly, and pipes use the active locale. Valid changes request a settings mutation; other values are ignored. Angular formatting functions can report invalid values.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `I18n.t` | `source: string \| null \| undefined` | `string` |
| `I18n.setLanguage` | `language: string` | `Promise<boolean \| undefined>` |
| `I18n.setTheme` | `theme: string` | `Promise<boolean \| undefined>` |
| `I18n.save` | `value: { language?: Language; theme?: Theme }` | `Promise<boolean \| undefined>` |
| `I18n.color` | `source: string` | `string` |
| `TranslatePipe.transform` | `value: string \| null \| undefined` | `string` |
| `LocalDatePipe.transform` | `value: string \| number \| Date \| null \| undefined, format = "mediumDate"` | `string \| null` |
| `LocalNumberPipe.transform` | `value: number \| string \| null \| undefined, digits = "1.0-3"` | `string \| null` |

**I18n constructor** — Inputs: `none`. Synchronizes presentation and the document title with the signals.

## Icon paths

Implements REQ-FRONTEND-PROFILE-101. Source: `src/app/core/icon.ts`.

Input: icon identifier; output: a path for SVG rendering or the fallback defined in code. No effect on personal data.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `Icon.path` | `none` | `string` |

## Snapshot and demonstration data

Implements REQ-FRONTEND-PROFILE-101. Source: `src/app/core/models.ts`.

Factories build dates, identifiers and the initial snapshot; addDemo adds fictitious data to the supplied snapshot. Generation depends on the clock and available APIs. The demonstration does not read personal data.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `today` | `none` | `string` |
| `uid` | `none` | `'${string}-${string}-${string}-${string}-${string}'` |
| `emptySnapshot` | `none` | `Snapshot` |
| `addDemo` | `s: Snapshot` | `Profile` |

## Presentation preferences

Implements REQ-FRONTEND-PROFILE-101. Source: `src/app/core/presentation.ts`.

readPresentation reads only language and theme from browser storage, falling back to French and dark on missing or invalid JSON. applyPresentation updates document language, theme and color-scheme, then attempts to cache them; storage errors are ignored and native settings remain authoritative.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `readPresentation` | `none` | `{ language: Language; theme: Theme; }` |
| `applyPresentation` | `value: { language: Language; theme: Theme }` | `void` |

## Frontend state and mutations

Implements REQ-FRONTEND-PROFILE-101. Source: `src/app/core/store.ts`.

The service exposes signals filtered to the active profile. init loads native state or creates the fictitious preview; external refreshes are serialized and applied only for newer revisions. task and mutate manage busy state and errors and delegate native writes to Tauri commands; previewMutation adapts only the in-memory preview. Series and latest measurements return available observations without inventing values.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `Store.init` | `none` | `Promise<void>` |
| `Store.refreshFromDisk` | `none` | `Promise<void>` |
| `Store.drainRefreshes` | `none` | `Promise<void>` |
| `Store.select` | `id: string` | `void` |
| `Store.fail` | `e: unknown` | `void` |
| `Store.task` | `fn: () => Promise<T>` | `Promise<T \| undefined>` |
| `Store.mutate` | `operation: Mutation` | `Promise<boolean \| undefined>` |
| `Store.saveTarget` | `target: TargetDay` | `Promise<boolean \| undefined>` |
| `Store.apply` | `current: VersionedSnapshot` | `void` |
| `Store.latest` | `metric: string` | `Observation \| undefined` |
| `Store.series` | `metric: string` | `Observation[]` |
| `Store.metric` | `id: string` | `{ id: Metric; label: string; unit: string; icon: string; color: string; max: number; event?: boolean \| undefined; positive?: boolean \| undefined; valueLabel?: string \| undefined; integer?: boolean \| undefined; }` |
| `Store.previewMutation` | `op: Mutation` | `Snapshot` |

## Dashboard

Implements REQ-FRONTEND-HABITS-101. Source: `src/app/pages/dashboard.ts`.

Methods prepare measurements, visual heights and event selection, save a target only if its form is valid, and control sequential activity playback. Playback timers stop on destruction. Mutations and errors go through the state service.

The step chart, date range and counter share the active profile's latest observations, capped at 28 measurements. The counter displays their actual number (including a declared zero) with a translated singular or plural label; an empty history shows zero measurements.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `Dashboard.values` | `metric: string` | `number[]` |
| `Dashboard.barHeight` | `value: number \| null` | `number` |
| `Dashboard.saveTarget` | `none` | `Promise<void>` |
| `Dashboard.selectEvent` | `o: Observation` | `void` |
| `Dashboard.showEvent` | `o: Observation` | `void` |
| `Dashboard.previewMode` | `mode: string` | `void` |
| `Dashboard.replay` | `none` | `Promise<void>` |
| `Dashboard.next` | `none` | `void` |
| `Dashboard.stopReplay` | `none` | `void` |
| `Dashboard.ngOnDestroy` | `none` | `void` |

**Dashboard constructor** — Inputs: `none`. Synchronizes the target when the profile changes without overwriting a modified form, and stops playback when the profile changes.

## Data exchange assistant

Implements REQ-FRONTEND-JOURNAL-101. Source: `src/app/pages/data.ts`.

Methods expose preview columns, samples and pagination, then choose, preview and confirm a native import. Export accepts the requested format and active profile; restore first requires a preview and then confirmation. Commands and their errors go through Store.task; canceling selection triggers no write.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `DataPage.headers` | `none` | `string[]` |
| `DataPage.sample` | `none` | `string[][]` |
| `DataPage.count` | `status: string` | `number` |
| `DataPage.previewRows` | `none` | `{ row: number; observation: Observation \| null; status: string; message: string; }[]` |
| `DataPage.previewPages` | `none` | `number` |
| `DataPage.cancelImport` | `none` | `void` |
| `DataPage.choose` | `none` | `Promise<void>` |
| `DataPage.preview` | `none` | `Promise<void>` |
| `DataPage.commit` | `none` | `Promise<void>` |
| `DataPage.export` | `format: string` | `Promise<void>` |
| `DataPage.restorePreview` | `none` | `Promise<void>` |
| `DataPage.restoreCommit` | `none` | `Promise<void>` |

**DataPage constructor** — Inputs: `none`. Resets the import when the active profile changes.

## Scenario management

Implements REQ-FRONTEND-FUTURES-101. Source: `src/app/pages/futures.ts`.

reset and edit prepare the form; save rejects an invalid form and requests a mutation, and remove requests scenario deletion. Changes are applied through the state service; these functions do not themselves validate or calculate a scientific model.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `Futures.reset` | `none` | `void` |
| `Futures.edit` | `s: Scenario` | `void` |
| `Futures.save` | `none` | `Promise<void>` |
| `Futures.remove` | `s: Scenario` | `Promise<void>` |

**Futures constructor** — Inputs: `none`. Resets the form when the profile changes.

## Hourly comparison screen

Implements REQ-FRONTEND-GHOST-101. Source: `src/app/pages/ghost.ts`.

Inputs are user-supplied dates, minutes, selections and routine fields. Methods control navigation, playback, active sessions, habit links and block editing; saving a routine in the past is rejected. Mutations go through the state service and errors are exposed in its signal. Playback and calculations remain separate from writes.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `GhostPage.slotStatus` | `status: string` | `string` |
| `GhostPage.mode` | `events: GhostEvent[]` | `Metric \| "idle"` |
| `GhostPage.stateLabel` | `events: GhostEvent[]` | `string` |
| `GhostPage.frequencyAt` | `minute: number` | `{ known: number; matched: number; total: number; }` |
| `GhostPage.changeDate` | `value: string` | `void` |
| `GhostPage.goLive` | `none` | `void` |
| `GhostPage.scrub` | `minute: number` | `void` |
| `GhostPage.selectEvent` | `event: GhostEvent` | `void` |
| `GhostPage.stop` | `none` | `void` |
| `GhostPage.togglePlayback` | `none` | `void` |
| `GhostPage.linkSession` | `id: string` | `void` |
| `GhostPage.linkBlock` | `id: string` | `void` |
| `GhostPage.start` | `none` | `Promise<void>` |
| `GhostPage.finish` | `none` | `Promise<void>` |
| `GhostPage.cancel` | `none` | `Promise<void>` |
| `GhostPage.recordPoint` | `none` | `Promise<void>` |
| `GhostPage.prepareChange` | `event: GhostEvent` | `void` |
| `GhostPage.newRoutine` | `none` | `void` |
| `GhostPage.loadRoutine` | `id: string` | `void` |
| `GhostPage.toggleDay` | `day: number, on: boolean` | `void` |
| `GhostPage.addBlock` | `none` | `void` |
| `GhostPage.removeBlock` | `id: string` | `void` |
| `GhostPage.saveRoutine` | `none` | `Promise<void>` |

**GhostPage constructor** — Inputs: `none`. Reads the initial date from the route and sets up effects and playback cleanup.

## Calendar and answers

Implements REQ-FRONTEND-HABITS-101. Source: `src/app/pages/habits.ts`.

Methods build the calendar and chart display, navigate between months, and manage habit selection, addition, archiving, answers and validation. Mutations go through the state service; a day receives a validated score only according to tracking rules.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `Habits.x` | `index: number` | `number` |
| `Habits.y` | `score: number` | `number` |
| `Habits.icon` | `habit: HabitDefinition` | `string` |
| `Habits.answerFor` | `habit: HabitDefinition` | `boolean \| null` |
| `Habits.calendarLabel` | `date: string, status: string` | `string` |
| `Habits.moveMonth` | `delta: number` | `void` |
| `Habits.choosePreset` | `metric: string` | `void` |
| `Habits.addHabit` | `none` | `Promise<void>` |
| `Habits.archive` | `habit: HabitDefinition` | `Promise<void>` |
| `Habits.setAnswer` | `habit: HabitDefinition, value: boolean \| null` | `Promise<void>` |
| `Habits.validateDay` | `none` | `Promise<void>` |

**Habits constructor** — Inputs: `none`. Tracks the date and profile to maintain the calendar selection.

## Entering and correcting observations

Implements REQ-FRONTEND-JOURNAL-101. Source: `src/app/pages/journal.ts`.

Methods filter and paginate observations for the active profile, configure time validators and prepare an entry or correction. save sends a mutation only when the form is valid; remove delegates deletion to the service. Values and validation errors remain visible in the form.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `Journal.updateTimeValidators` | `none` | `void` |
| `Journal.currentMetric` | `none` | `{ id: Metric; label: string; unit: string; icon: string; color: string; max: number; event?: boolean \| undefined; positive?: boolean \| undefined; valueLabel?: string \| undefined; integer?: boolean \| undefined; }` |
| `Journal.filtered` | `none` | `Observation[]` |
| `Journal.pages` | `none` | `number` |
| `Journal.paged` | `none` | `Observation[]` |
| `Journal.reset` | `none` | `void` |
| `Journal.nowTime` | `none` | `string` |
| `Journal.choose` | `metric: Metric` | `void` |
| `Journal.edit` | `o: Observation` | `void` |
| `Journal.save` | `none` | `Promise<void>` |
| `Journal.remove` | `o: Observation` | `Promise<void>` |

**Journal constructor** — Inputs: `none`. Resets entry and synchronizes validators when the profile or metric changes.

## Profile management

Implements REQ-FRONTEND-PROFILE-101. Source: `src/app/pages/profiles.ts`.

Methods count data, initialize or populate the form and request creation, editing or deletion. save sends nothing if the form is invalid; Store handles the mutation and its errors. Selected data remains attached to its profile.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `Profiles.count` | `id: string` | `number` |
| `Profiles.reset` | `none` | `void` |
| `Profiles.edit` | `p: Profile` | `void` |
| `Profiles.save` | `none` | `Promise<void>` |
| `Profiles.remove` | `p: Profile` | `Promise<void>` |

## Preferences and companion service

Implements REQ-FRONTEND-COMPANION-101. Source: `src/app/pages/settings.ts`.

Methods load native companion service state, control its start, stop, pairing code and revocation, and change preferences. companionCommand captures errors in the screen signal; displayed values reflect the service response, not cloud access.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `SettingsPage.ngOnInit` | `none` | `Promise<void>` |
| `SettingsPage.companionCommand` | `command: string, args?: Record<string, string>` | `Promise<void>` |
| `SettingsPage.startCompanion` | `none` | `void` |
| `SettingsPage.newPairingCode` | `none` | `void` |
| `SettingsPage.stopCompanion` | `none` | `void` |
| `SettingsPage.revokeCompanion` | `deviceId: string` | `void` |
| `SettingsPage.profileName` | `id: string` | `string` |
| `SettingsPage.value` | `key: keyof Pick<Settings, "animations" \| "jitter">` | `boolean` |
| `SettingsPage.toggle` | `key: keyof Pick<Settings, "animations" \| "jitter">, v: boolean` | `void` |

## Model loading and animations

Implements REQ-FRONTEND-SCENE-101. Source: `src/app/scene/artist-animations.ts`.

The controller reads the asset manifest, loads models and variants, selects animations, updates their time and adjusts color where possible. Destruction functions release owned geometries, materials and textures. Invalid loads or manifests are handled through controller fallback and error paths; these data are not clinical measurements.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `isRecord` | `value: unknown` | `boolean` |
| `materialsIn` | `root: T.Object3D` | `Set<Material>` |
| `disposeModel` | `root: T.Object3D` | `void` |
| `ArtistAnimations.preload` | `modes: string[]` | `Promise<void>` |
| `ArtistAnimations.setVariant` | `variant: AvatarVariant` | `void` |
| `ArtistAnimations.setColor` | `color: string` | `void` |
| `ArtistAnimations.play` | `mode: string, replayKey: number, animate: boolean` | `void` |
| `ArtistAnimations.tick` | `seconds: number` | `void` |
| `ArtistAnimations.dispose` | `none` | `void` |
| `ArtistAnimations.readManifest` | `none` | `Promise<void>` |
| `ArtistAnimations.key` | `mode: string, variant: AvatarVariant` | `string` |
| `ArtistAnimations.load` | `mode: string, variant: AvatarVariant` | `Promise<void>` |
| `ArtistAnimations.loadModel` | `file: string` | `Promise<LoadedModel \| null>` |
| `ArtistAnimations.activate` | `asset: LoadedAnimation, restart: boolean` | `void` |
| `ArtistAnimations.clearActive` | `source: "loading" \| "procedural"` | `void` |
| `ArtistAnimations.colorShirt` | `scene: T.Object3D` | `void` |

**ArtistAnimations constructor** — Inputs: `root: T.Group, private readonly onSourceChange: (source: AvatarSource) => void, private readonly ghost = false`. Attaches the animation controller to the supplied group and retains its callbacks.

## Avatar lifecycle

Implements REQ-FRONTEND-SCENE-101. Source: `src/app/scene/avatar.ts`.

Methods initialize the room after view creation, retry rendering and adjust zoom, rotation and framing in response to user or keyboard commands. They preload available modes and destroy the scene when closed; rendering failures are exposed in the view state.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `AvatarScene.zoomPercent` | `none` | `number` |
| `AvatarScene.ngAfterViewInit` | `none` | `void` |
| `AvatarScene.createRoom` | `none` | `Promise<void>` |
| `AvatarScene.retry` | `none` | `void` |
| `AvatarScene.focusCamera` | `none` | `void` |
| `AvatarScene.zoomCamera` | `direction: number` | `void` |
| `AvatarScene.resetCamera` | `none` | `void` |
| `AvatarScene.cameraKey` | `event: KeyboardEvent` | `void` |
| `AvatarScene.prepareModes` | `modes: string[]` | `Promise<void>` |
| `AvatarScene.ngOnDestroy` | `none` | `void` |

**AvatarScene constructor** — Inputs: `none`. Synchronizes scene options with view signals.

## Timeline presentation

Implements REQ-FRONTEND-GHOST-101. Source: `src/app/scene/ghost-timeline.ts`.

Methods calculate a width and description from event data and view parameters. The output is used for display and its accessible label; no mutation of history.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `GhostTimeline.width` | `e: GhostEvent` | `number` |
| `GhostTimeline.description` | `e: GhostEvent` | `string` |

## Three.js rendering and resources

Implements REQ-FRONTEND-SCENE-101. Source: `src/app/scene/room.ts`.

The controller builds the room, props and avatar, animates poses and updates ghost elements. Camera parameters and dimensions drive rendering; invalidation and visibility determine which frames to compute. dispose cancels rendering and releases owned resources; context loss is reported to the view. Graphics operations depend on WebGL.

| Declaration | Declared inputs | TypeScript output |
| --- | --- | --- |
| `Room.emitCameraState` | `none` | `void` |
| `Room.requestFrame` | `none` | `void` |
| `Room.invalidate` | `none` | `void` |
| `Room.cancelFrame` | `none` | `void` |
| `Room.onVisibility` | `none` | `void` |
| `Room.onLost` | `e: Event` | `void` |
| `Room.box` | `w: number, h: number, d: number, color: number \| string, x: number, y: number, z: number, parent: T.Object3D = this.root` | `Mesh<BoxGeometry, MeshLambertMaterial, Object3DEventMap>` |
| `Room.buildRoom` | `none` | `void` |
| `Room.buildPerson` | `none` | `void` |
| `Room.buildActivityProps` | `none` | `void` |
| `Room.addVapor` | `parent: T.Group, color: number, height: number` | `void` |
| `Room.setActivityProps` | `mode: string` | `void` |
| `Room.update` | `o: typeof this.options` | `void` |
| `Room.setGhost` | `mode: string \| null, variant: AvatarVariant, animations: boolean` | `void` |
| `Room.preloadModes` | `modes: string[]` | `Promise<void>` |
| `Room.zoomCamera` | `direction: number` | `void` |
| `Room.rotateCamera` | `horizontal: number, vertical: number` | `void` |
| `Room.resetCamera` | `none` | `void` |
| `Room.resize` | `none` | `void` |
| `Room.tick` | `ms: number` | `void` |
| `Room.armPose` | `i: number` | `number` |
| `Room.armZPose` | `_i: number` | `number` |
| `Room.legPose` | `_i: number` | `number` |
| `Room.dispose` | `none` | `void` |

**Room constructor** — Inputs: `private host: HTMLElement, private onUnavailable: () => void, private onAnimationSource?: (source: AvatarSource) => void, private onCameraState?: (state: CameraState) => void, private onGhostSource?: (source: AvatarSource) => void`. Receives the container and scene callbacks, creates the WebGL renderer and installs controls, observers and listeners. It can fail while creating the graphics context.

## Interface initialization

Implements REQ-FRONTEND-PROFILE-101. Source: `src/app/app.ts`.

The root component constructor triggers `Store.init`; the service handles loading and its errors. It receives no parameters and returns no business value.
