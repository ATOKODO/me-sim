---
kind: functional
title: Frontend functional specifications
---

# User journeys


## REQ-FRONTEND-PROFILE-101 — Profiles and presentation

The user selects, creates, edits and deletes profiles. The interface uses the locally selected language and theme. The browser preview uses only in-memory demonstration data; persistent personal data is managed by the native application.

## REQ-FRONTEND-JOURNAL-101 — Journal and data

The user records and corrects observations. They can prepare an import, inspect its preview and confirm its application, export measurements, and preview and then confirm a restore. File exchanges require the native application. Missing data is shown as unknown.

## REQ-FRONTEND-HABITS-101 — Habits and target day

The user configures habits to cultivate or reduce, answers day by day and validates a complete day. They can compare available measurements with a target day. The score and deviation describe the entered data and do not constitute a medical assessment.

## REQ-FRONTEND-GHOST-101 — Hourly comparison

The user views a day, a historical reference or a schedule; they can navigate through time, start or finish a session and configure routines. A missing observation is not interpreted as an absent activity.

## REQ-FRONTEND-SCENE-101 — Scene and animation

The scene lets the user view an avatar and activities in a room, adjust the camera and disable animations according to their preferences. These representations are illustrative and do not predict future appearance.

## REQ-FRONTEND-FUTURES-101 — Scenarios and limits

The user can prepare and manage scenarios. Scientific projections are enabled only once the model and its conditions have been validated; creating a scenario is not a prediction.

## REQ-FRONTEND-COMPANION-101 — Local companion

The user controls the companion service, pairing and revocation from preferences. The service is local to the intended network; the interface shows its status and errors.
