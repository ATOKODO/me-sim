---
kind: functional
title: Local engine functional contracts
---

# Local engine functional contracts

The canonical requirement identifiers are defined in the [canonical specification](../../specs/rust-fonctionnelle.md).

## Personal data and profiles

Each profile's data, measurements, habits, scenarios and sessions are stored locally. Deleting a profile removes its associated data. Concurrent changes must not silently overwrite a newer version.

## Data exchange and backups

Users can prepare an import, review errors and conflicts, and then confirm it. Measurements can be exported, and the local workspace can be backed up as versioned JSON. A restore is applied only after validation and creation of a prior backup.

## Activities and schedules

A profile can retain versions of its schedule and an active session. Completing a session creates a timestamped observation; canceling a session does not create an observation. Linked habits can be recorded without automatically validating the day.

## Simulation

Scenarios are retained, but no scientific projection is offered until the model is validated. Missing data and profiles outside the supported domain are reported separately.

## Local companion

The owner can activate a local server for a profile, pair a phone, synchronize its entries and revoke access. Pairing and data remain under the PC's control; no remote service is required.

## File robustness

An imported file must meet size and complexity limits before processing. Malformed or oversized structures are rejected without partially importing their data.

## Regression

Automated tests verify, among other things, profile isolation, transactions, exchange formats, sessions and companion synchronization.
