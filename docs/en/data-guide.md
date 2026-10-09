# Data guide {#guide-des-donnees}

## Profile character {#personnage-du-profil}

In **My profiles**, select **Female** in the sex field to display the female character. Male or unspecified selects the male model. Both models play all timeline and comparison animations; their appearance is illustrative, with no quantitative link to measurements or projections. Switching profiles on the dashboard preserves the camera view.

## Journal {#journal}

Choose a profile in the top bar. Add a measurement with its local date (YYYY-MM-DD). Daily indicators are unique per metric and day; activities can repeat in a day if their start times differ. To correct a value, use its row's Edit button. Switching profiles resets pending forms. Positive activities and habits to observe use the same input process, without clinical judgment.

When a timed activity is selected or replayed in the timeline, the avatar uses its dedicated animation: movement for walking and exercise, focused posture and props for work, screens, gaming or reading, smoke animation for tobacco and vaping, and a seated pose for sedentary time.

The dashboard **Preview** selector displays any animation even without an observation. During replay, each row gets two seconds and restarts its own animation; the button stops the sequence. Optional GLB files for replacing the 3D rendering are described in the [artist guide](./artist-animation-guide.md).

Tobacco is entered as a whole number of cigarettes per event. Vaping, evening screen time and sedentary time use minutes and a start time; their duration is retained in the timeline. These are personal reports, without interpretation or automatic estimation.

## Target profile {#profil-target}

The dashboard saves a reference day for the active profile: hours of sleep, steps, minutes of activity, exercise, walking and social time, plus limits for screens, gaming, alcohol, tobacco, vaping, evening screens and sedentary time. Initial values are editable personal references, not medical recommendations. The trajectory shows the mean deviation of available observations for each of the last seven days; a higher bar means data is further from the target. Each day also shows how many of the 13 indicators are recorded. A 0% score with partial coverage does not establish that the whole day matches the target. A day without a usable indicator remains `?` and is not counted as zero. For a positive target, relative deviation is capped at 100% per indicator; with a zero target, any positive quantity counts as a full deviation for that indicator. The mean is a personal reference, not a clinical measure. The target is included in JSON backups and restored with its profile.

## Habit calendar {#calendrier-des-habitudes}

In **My habits**, choose examples or add a custom habit. A positive habit is desired every day; a habit to reduce is desired absent. Configuration belongs to the active profile. Removing a habit stops its tracking from the current day and retains historical days.

Select a date, answer **Yes** or **No** for each habit, then choose **Validate the day**. An answer can be cleared or corrected; the day must then be validated again. The 14-day curve compares validated days with a 100% goal: each answered habit has equal weight, without clinical claims. Unvalidated days leave gaps; a partial answer appears only as a preview for the selected day. Binary tracking and detailed journal observations are separate: checking Yes creates neither a quantity nor a timeline event. Profiles, configurations and days are included in full JSON backups, but not tabular measurement exports.

## Import {#import}

1. Select a profile and file in My data.
2. Choose the sheet and date, value, metric and unit columns. Metric and unit can be fixed for the file. To reconstruct a timeline, also map `time` (HH:mm) and `durationMinutes`.
3. Explicitly choose YYYY-MM-DD, DD/MM/YYYY or MM/DD/YYYY. Native Excel date cells are converted to YYYY-MM-DD: select that format.
4. Review the preview, conversions and errors. Existing values are kept by default. Exact duplicates are skipped. In replace mode, the last row for the same date/metric wins.
5. Confirm. Invalid rows block import unless their exclusion is explicitly checked. A write failure rolls back the entire transaction.

Recognized metrics: `weight`/poids, `sleep`/sommeil, `steps`/pas, `activity`/activité, `intake`/apports/calories, `stress`, `exercise`/sport, `walk`/marche, `work`/travail, `social`, `reading`/lecture, `rest`/repos, `meal`/repas, `screen`/réseaux/écran, `screen_evening`/écran le soir, `gaming`/jeux vidéo, `alcohol`/alcool, `tobacco`/tabac, `vaping`/vapotage and `sedentary`/temps sédentaire. These are the stored identifiers and accepted import aliases, not translated keys. Activities in minutes use `min`, alcohol uses `verre`, tobacco uses `cigarette`. A timed activity in minutes also retains its duration in `durationMinutes`.

CSV supports UTF-8 with or without BOM, commas or semicolons, and decimal commas. Thousands may use spaces. Unit and day/month order are never inferred implicitly. Excel files containing formulas are rejected: export their values only. Macros are never executed. Encrypted files are unsupported.

Limits: 25 MB per import file, 50,000 rows per sheet, 256 Excel columns; up to 100 profiles and 100,000 observations in the database. Tabular JSON is an array of flat objects, with columns defined by the first object.

## Export and restore {#export-et-restauration}

CSV, XLS (actual BIFF8) and XLSX contain the active profile's observations, including `time` and `durationMinutes` when present. CSV protects strings beginning with a formula character with an apostrophe. XLS is limited to 65,535 observations; use XLSX beyond that.

JSON backups contain all profiles, habits, validated/in-progress days, measurements, import batches, scenarios, stored results and preferences. Tabular exports do not replace this backup.

Restoration replaces every profile after preview. The previous state is saved as `avant-restauration-<uuid>.json` next to the database. If this preventive backup fails, restoration does not proceed. Unknown versions and invalid references are rejected before changes. Restore the preventive file to go back.

The examples `fixtures/mesures.csv` and `fixtures/mesures.json` are entirely fictional.

If another window changes data simultaneously, a SQLite revision prevents silent overwrites. Stale attempts are rejected before any write. The app reloads current data and retains the draft when the profile still exists. Review the draft and save again; it is never automatically resubmitted. A stale import preview must be checked again.

## Journal and exchange accuracy — fixes of 2 October 2026 {#precision-du-journal-et-des-echanges-—-corrections-du-2-octobre-2026}

The summary covers local-day observations, independently of the rolling 24-hour timeline. Missing data remains `—`; an explicitly entered zero remains zero. Reported total activity is used when available; otherwise the summary adds recorded exercise and walking sessions. The reported total is not added to these sessions a second time. Future events are excluded.

Zero vaping, screen time or another activity can be recorded without an animation start time or duration: it fills in the day without creating a timeline event. Steps and cigarettes use integers. Correcting an imported observation retains its original batch link.

The calendar, day heading, trajectories and timeline follow a shared local clock. At midnight, a selection following today advances; a selected historical date stays selected. The journal keeps the quantity being entered and advances only its default date. Returning to the foreground updates these references too.

The wizard offers the fixed `cigarette` unit, including tobacco files with no unit column. Dates, native Excel times and durations stay distinct until mapping; 18:30 no longer becomes a date. An invalid duration is reported instead of implicitly replaced with the value. Times are stored to the minute and `durationMinutes` uses minutes.

Tracking is limited to 100 active habits; removing one preserves history without occupying an active slot. A total limit of 10,000 definitions per profile protects backup size.
