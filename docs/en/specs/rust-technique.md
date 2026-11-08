---
kind: technical
title: Rust engine technical contracts
---

# Rust engine technical contracts

Canonical technical and requirement identifiers are defined in the [canonical technical specification](../../specs/rust-technique.md) and [canonical functional specification](../../specs/rust-fonctionnelle.md).

This document describes the behavior currently implemented; it does not certify execution or test success. Errors returned in `Result` contain an application, SQLite, input/output or deserialization error, depending on the operation. Mutations of an in-memory snapshot must be validated and saved by the store before they are persisted.

## Domain, units and validation

Implements REQ-RUST-101 and REQ-RUST-103.

`AppError::new` constructs an error from a code and message; `invalid` constructs an invalid-input error. Error conversions and `Default` implementations define the fallback values of their respective structures; `id` produces a UUID identifier. `unit` associates a known metric with its unit, or returns `None`. `observation_key` selects the time key used to identify a measurement.

`validate_target`, `validate_observation` and `validate` respectively receive a target day, an observation and a snapshot. They return `Ok(())` when their format, range and reference constraints are met, or an error otherwise; they do not persist any data. `mutate` receives a mutable snapshot and a typed operation, changes the corresponding collections, then validates the whole snapshot; the caller must work on a copy to preserve the previous state if an error occurs. Deleting a profile also deletes its associated data.

## SQLite storage and concurrency

Implements REQ-RUST-101 and REQ-RUST-102.

`open` opens the supplied path, and `init` configures SQLite and applies migrations through version 4; a newer version is rejected. `load` reads a snapshot and its revision in a transaction; `current` returns both, and `versioned` associates the known revision with a supplied snapshot. `require_revision` rejects a stale revision with `CONCURRENT_CHANGE`. `mutate_at_revision` loads and clones the state, checks the expected revision, applies the mutation, then persists the difference.

`replace`, `replace_with_companion_ops` and `replace_for_restore` delegate to `replace_inner`: the snapshot is validated and then written in an immediate transaction with revision verification and an increment. Companion operations are recorded in the same transaction; a full restore revokes devices. Validation, concurrency or SQLite errors interrupt the transaction.

## Incremental writes

Implements REQ-RUST-101 and REQ-RUST-105.

`changes` compares the before and after collections by key and determines deletions, writes and moves needed for their order. `read` and its helper `rows` reconstruct the snapshot from JSON rows ordered by `rowid`. `owned_rows` and `write` record only differences in the supplied transaction while preserving order and profile relationships. `replace_all` replaces the rows for a restore. SQL or JSON errors are propagated; validation and transaction completion are the responsibility of the calling store.

## Schedules and sessions

Implements REQ-RUST-103.

The `label`, `event` and `link` predicates check the label, supported activity metrics and optional link to a profile habit, respectively. `validate_profile` checks schedule versions, time slots and the active session; `validate_context` checks RFC 3339 dates and consistency between an observation's times and duration. Errors identify invalid elements.

`save_plan` adds a nonduplicate version whose start date is not in the past. `start` opens a session for a profile when no other session is active and the start is not too far in the future. `finish`, when given an end, creates an observation with a positive duration of no more than 24 hours and optionally records the linked habit; without an end, it simply cancels the session. `record_habit` and `validate_link` check and record appropriate links between observations and habits without validating the day. These functions modify the supplied snapshot; errors are persisted only if the caller ignores them.

## Reading and preparing imports

Implements REQ-RUST-102 and REQ-RUST-106.

`read` accepts a CSV, XLS, XLSX or JSON path and checks limits before producing a workbook containing its sheets and a token. `metric_name` normalizes recognized names; `parse_row` uses the mapping, units and selected date to convert a row into an observation or return an error. `preview` receives the workbook, mapping, profile identifier and snapshot; it produces a preview of valid rows, errors, duplicates and conflicts without saving data. Invalid files or mappings are rejected.

## Import confirmation and exports

Implements REQ-RUST-102.

`commit` applies a confirmed import preview to a snapshot according to the conflict policy and the choice of whether to skip erroneous rows; it returns the imported count or an error. The caller validates and then persists the result transactionally. `cells` extracts the profile's measurements for tabular formats. `export` writes CSV, XLS, XLSX or a JSON workspace backup. `atomic_write` writes a temporary file and then places it at the destination. `record`, `bof` and `xls` construct BIFF records for XLS; limits or write errors are propagated.

## Common import limits

Implements REQ-RUST-106.

`read_file` reads at most 25 MiB, checking both metadata and the actual read. `add` and `rect` check additions, multiplications and limits on rows, columns and cells; `Extent::include` and `Extent::cells` track the rectangular area in use. `u16_at` and `u32_at` read little-endian integers and reject truncated data. Exceeded limits and impossible operations return an error before allocating a large range.

## XLS workbook checks

Implements REQ-RUST-106.

`xls` receives the bytes of a binary workbook and reconstructs a file containing the checked Workbook stream. `biff_record`, `xls_dimensions` and `biff` traverse records and check dimensions and cells; `sst` checks shared strings and their budget. Segment-reader methods advance, read or skip BIFF data, including continuations; truncated structures, prohibited formulas or exceeded limits produce an error.

## XLSX workbook checks

Implements REQ-RUST-106.

`xlsx` checks the supplied archive before reading its sheets. `zip_directory` checks archive entries and sizes, `coordinate` and `decimal` decode cell positions, and `xml` traverses XML content under size and complexity budgets. Malformed archives, invalid coordinates, unsupported formulas or exceeded limits are rejected with an error.

## CSV and JSON checks

Implements REQ-RUST-106.

`csv` traverses the bytes using the supplied delimiter and checks the structure and limits on rows, columns and text. `json` checks a JSON table before conversion; its Serde visitors (`deserialize`, `expecting`, `visit_seq`, `visit_map` and `visit_*`) count elements and accept the supported scalar types. Disallowed nested structures, malformed files and exceeded limits return an error.

## Companion and local synchronization

Implements REQ-RUST-105.

`lan_ip` selects a private or link-local IPv4 address; `ca_and_server` creates or reloads a local authority and builds a TLS certificate for that address. `code` and `new_pairing` create a time-limited pairing code. `start` verifies the profile, opens local port 18439 and starts the server; `status`, `stop`, `refresh_pairing` and `revoke` expose or change its state and devices. Locks, networking, certificates and the database can produce an error.

`authenticated` checks the token for the requested profile. `sync` validates phone operations, their profile and their identity, then applies them with deduplication identifiers in a transaction. `read_request`, `response`, `redirect`, `json_response`, `configure_connection` and `serve` handle local HTTPS requests and responses under size and connection limits; `/companion` redirects to `/companion/`. `sha256_hex` computes a digest and `internal` converts an error into a companion error.

## Tauri commands and simulation

Implements REQ-RUST-102, REQ-RUST-104 and REQ-RUST-105.

`lock` converts a poisoned lock into an error. `initial_state` returns the snapshot, its revision, the local location and the model definition; `mutate` applies an operation under revision control. `choose_import` and `preview_import` read a file and retain temporary tokens; `commit_import` checks the token and revision before writing. `export_data` opens the dialog and checks the format and extension. `preview_restore` validates the selected backup; `commit_restore` backs up the existing state and then restores the preview. Canceling a dialog returns `None`; other errors are propagated.

Companion commands delegate to the local module. `run_simulation` looks up the corresponding profile and scenario, then delegates to the model without saving a result. `definition` describes a disabled model; `science::run` distinguishes missing data and profiles or horizons outside the domain, then returns `MODEL_NOT_VALIDATED`. `research_late_phase` is an isolated deterministic research calculation, limited to 365 days and admissible finite inputs; it is not exposed as a production projection. The `main` and `run` functions initialize the build program and the application, respectively.

## Tests and test helpers

Implements REQ-RUST-107.

Functions under `#[cfg(test)]` construct temporary data and exercise their module's contracts through assertions. Test helpers construct in-memory snapshots, mappings, ZIP archives or BIFF workbooks, among other fixtures; they return their fixtures or fail on an assertion. Individual tests verify the properties indicated by their names: profile isolation, SQLite atomicity and concurrency, import limits, preservation of times, session state, rejection of the unvalidated model and idempotent synchronization. A failed assertion fails the test; these functions are not a production API.
