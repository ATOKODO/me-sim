---
kind: functional
title: Mobile companion — functional requirements
---
# Mobile companion

The canonical requirement identifiers are defined in the [canonical specification](../../specs/companion-functional.md).

## Capture without a connection

A person can select a profile paired with the PC and record a measurement or a habit answer on their phone. A date is required, as well as a time for an activity with a positive value. Entries remain on the phone until they are sent. The companion offers only the metrics in its catalogue; quantities remain in the journal.

## Synchronize over the local network

Once the phone is paired with the PC, pending operations are sent to the companion service. Accepted operations are removed from the local queue; rejected or conflicting operations remain visible with their reason. If the connection is lost or access is revoked, unsent entries are retained. API access requires a secure context; offline installation depends on browser support for service workers and storage.
