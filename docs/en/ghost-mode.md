# Ghost mode {#ghost-mode}

Open **My habits → My ghost**, or **Compare with my ghost** on the overview, to follow a day minute by minute against a reference. This mode describes declared activities, without health projections, medical scores or automatic Instagram/phone tracking.

## Choose a reference {#references}

- **Past day**: choose a date before the tracked day. Time slots replay timestamped observations; gaps remain unknown.
- **Period**: the 7, 14 or 30 days before the tracked day, filtered to every day, Monday–Friday or weekends. These are calendar filters, not inferred working schedules. Compare a category or a custom name such as Instagram.
- **Target**: day templates applicable to the tracked date, with their planned time slots. The hourly schedule complements the overview's numeric goals; it neither replaces nor derives them automatically.

Frequency at the selected time gives the days with this activity among days recorded at that time, alongside coverage across the whole period. Missing data is not zero. Averages use only recorded amounts on days with activities up to the chosen time; they do not claim to measure complete days. A reference without data stays `?`.

## Live view, replay and characters {#live-and-replay}

Live mode follows the local clock at minute precision and refreshes when returning to the app. Moving the cursor enters replay; **Play the day** advances five minutes every 300 ms and stops at day end. **Return to live** returns to today.

The character illustrates the recorded activity at the chosen time; a transparent character illustrates the reference in the same room. Animations use the same replaceable assets as the existing timeline, including the female model. An unknown reference hides the ghost. Simultaneous activities or statistical ties do not arbitrarily select an activity. Disabling animations in preferences keeps information and poses available; unavailable WebGL does not prevent recording or comparison.

Timelines share the 00:00–24:00 axis. Selecting a slot reveals details. Point events, including tobacco and alcohol, retain their quantities rather than becoming artificial minutes. Overlapping durations in the same category are united to avoid double counting. Hatched areas mark unknown or unplanned time.

## Declare an activity {#sessions}

Choose a category, optionally a linked habit, and a custom name. **Start now** opens a local session. **Finish and save** creates a journal observation; **Pause** saves the segment, after which a new session can begin. A linked habit receives a Yes answer on the start date, and its day needs validation again. Performing a habit to reduce remains a Yes answer, without silently reversing its meaning.

Only one session can be open per profile. In the desktop app it survives navigation and closing, retaining its initial instant. It is not ended automatically: correct the end if necessary. A session may last at most 24 hours and cannot end in the future. Discarding requires confirmation and creates no observation. Revision or time-slot conflicts are rejected without losing the session.

The journal can correct the date, time, quantity and name; a manual correction removes absolute session instants and preserves a local declaration. Existing observations remain usable. Sessions retain instants with UTC offsets and their declared time zone: elapsed durations use absolute instants, including daylight-saving changes. Comparison displays hours in the computer's current time zone; a repeated hour may contain several slots. The time-zone name is metadata, without any remote service.

## Plan a change {#target-planning}

Create multiple day templates, select weekdays and add named activities with start times and durations. Slots must fit within one day; split an overnight plan into a slot on each side of midnight. Overlaps remain visible and are flagged.

Each save appends a version. Its effective date is today or a future date; previous days do not change. At equal effective dates, the last saved version wins for that template. An empty version suspends its slots from its effective date. History stays in the profile. **Prepare a change for this time slot** prepares a new activity at the selected time for tomorrow; review and explicitly save it.

## Storage and limits {#storage-and-limits}

Profiles, sessions and schedules stay in the local database and full JSON backups, with transactional revision checks. Older databases and backups without ghost mode remain readable. CSV/XLS/XLSX exports remain tabular measurements: they do not replace JSON for names, habit links, absolute instants, open sessions or schedule versions. Browser preview is temporary in memory and does not survive reload, like the rest of the preview.

Statistical slots display on a 15-minute grid; details use the selected minute. Per-profile limits: 2,000 versions and 128 slots per version. This mode adds no automatic usage surveillance, cloud, notification or mobile connection. Other privacy limits are described in the [privacy guide](./privacy.md).

Target slots can define a start-time margin from 0 to 180 minutes. Planned/recorded details match sessions by habit or category and then nearest start time; custom screen names must match. They show start differences, duration differences, upcoming slots and unknown gaps. Matching is a reading aid rather than proof of completion.

Session segments keep distinct absolute instants even when they start within the same displayed minute. The journal retains the start date; daily summaries and numeric deviation split overnight sessions between the relevant days. Point events can link to a habit of the same category. Later editing or deleting an observation does not automatically remove a calendar answer: review that declaration and its day validation.
