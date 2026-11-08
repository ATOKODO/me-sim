---
kind: technical
title: Mobile companion — technical contracts
---
# Mobile companion


## TECH-COMPANION-DATA — Operations and validation

This implements the capture and synchronization requirements. Operations are serializable objects associated with a profile and identified by a caller-supplied UUID; the data is neither a prediction nor a medical assessment.

- `localDate(now)` and `localTime(now)` format the local date as `YYYY-MM-DD` and the local time as `HH:mm`, using the current date by default.
- `validDate(date)` accepts only an existing ISO calendar date and returns a boolean.
- `observationOperation` validates identifiers, date, catalogue metric, finite value within its limits, an integer where required, and an `HH:mm` time for a positive activity. It returns an operation containing the unit, mobile provenance and applicable duration; invalid input throws an error.
- `habitOperation` requires identifiers, a valid date and a boolean answer. It returns an answer operation or throws an error for invalid input.
- `applySyncResult(operations, result)` removes accepted identifiers and associates known conflict or rejection statuses and reasons with the remaining operations. The caller validates acknowledgement consistency before calling it.

## TECH-COMPANION-STORAGE — IndexedDB queue and preferences

This implements the capture and synchronization requirements. The `me-sim-companion` IndexedDB database contains the `settings` store and the `operations` store keyed by identifier. Operations written in transactions are retained on the phone subject to the browser’s guarantees.

- `open()` opens or initializes the database and propagates opening errors; `request()` converts an IndexedDB request into a promise, resolved with its result or rejected with its error.
- `withStore(name, mode, task)` executes the task against a store in a transaction and closes the connection after completion. Task, transaction and abort errors are propagated.
- `getSetting` and `putSetting` read and write a preference by key. `addOperation` adds an entry; `replaceOperation` removes the old one and adds the new one in the same transaction; `deleteOperation` removes an entry.
- `allOperations` reads the entire queue. `updateOperations(operations, acceptedIds)` deletes accepted entries and rewrites remaining operations in one transaction. Storage errors are propagated to interface callers.

## TECH-COMPANION-UI — Interface and synchronization

This implements the capture and synchronization requirements. The interface keeps an in-memory copy of profiles, the active profile, the token and the queue. Rendering functions use the local DOM; they do not upload data by themselves.

- `$` retrieves an element by its identifier; `notice` displays a message and its error state; `connection` reports the PC and network status.
- `selectedProfile` finds the active profile; `profileName` returns its name or a fallback label. `renderProfiles` updates the selector and panels; `activeHabits` filters habits by date and archive status; `renderHabits` displays pending answers. `renderQueue` shows at most the latest 30 operations and allows their removal; `renderMetric` updates bounds and time visibility according to the metric.
- `queue` adds or replaces an operation in storage and updates the queue. The queue is limited to 2,000 additions. If paired, synchronization may be attempted without relying on `navigator.onLine`, since the PC may be reachable on a local network without Internet access. Storage errors remain propagated. `saveHabit` builds an answer and displays an error if it cannot be saved.
- `api` requires a secure context, sends a JSON request without cookies and with a token when present, aborts after 10 seconds and propagates HTTP and network errors. A 401 response outside pairing clears the local token without deleting entries.
- `refreshBootstrap` fetches profiles, checks that the response is an array and persists the result. `reconnect` checks the PC at startup, on network changes, on returning to the foreground, and every 15 seconds while the PWA is visible; after a valid response it starts `sync` when operations are pending. These checks contact the PC directly without relying on `navigator.onLine`. `sync` ignores concurrent calls and sends operations without a status in batches of 50; it checks that received identifiers are unique and belong to the batch before updating the queue. Conflicts and rejections remain in the queue; interruption retains unacknowledged operations and indicates disconnection.
- `setTab` displays the selected capture panel. `start` registers the service worker when possible, reloads settings and the queue, initializes dates and metrics, and attempts reconnection if paired. An IndexedDB error stops initialization and displays a message.
