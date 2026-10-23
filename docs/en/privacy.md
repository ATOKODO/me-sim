# Privacy and storage {#confidentialite-et-stockage}

## Where does the data stay? {#ou-restent-les-donnees}

Me-Sim uses a SQLite database on the Windows computer. The default location is `%LOCALAPPDATA%\fr.mesim.desktop\me-sim.db`; its exact path appears in preferences. Profiles, observations, habits, days, imports and scenarios are stored there.

No remote account, cloud, external API, CDN or application telemetry is required. Translations and character assets are bundled. The WebView has neither general disk access nor SQL access: file operations go through Rust commands and native pickers.

Language and theme are also remembered in the local WebView cache for initial display. The application stores no health data in this cache. In the browser preview, demo data remains temporary and in memory.

## What protection is provided? {#quelle-protection-existe}

Me-Sim does not encrypt the database or exports. Their protection relies on the Windows session and file access permissions. Profiles are separated in the application, but they are not authenticated accounts: someone with access to the session or files can access their contents.

Documentation and Storybook read no personal database. They contain guides and fictional examples. Search is local. Windows and WebView2 maintenance policies remain those of the system.

## Back up and restore {#sauvegarder-et-restaurer}

A JSON backup contains every profile and preference. CSV, XLS and XLSX exports contain only the selected profile's observations; they do not replace a full backup.

Restoration replaces the local workspace after preview and first writes a JSON copy of the previous state next to the database. This file remains readable. Details and validation rules are in the [data guide](./data-guide.md#export-et-restauration).

An export folder may be synchronized by software outside Me-Sim. Choose its location according to your privacy needs; the application does not control copies made by Windows or other software.

## Delete a profile {#supprimer-un-profil}

Deletion removes the profile's data from the active database. It does not remove exports, preventive backups, system copies or files copied elsewhere. It is not forensic disk erasure.

## Local mobile companion {#compagnon-mobile-local}

An [offline companion PWA](./mobile-companion.md) is under development. It should let people enter data on a phone and transfer it to the PC database when both devices are on the local network. Pending entries and the pairing token reside in the phone's browser storage; application-level encryption of this storage is not currently planned. Protection of the phone, its session and browser therefore matters too. The PC network service is off by default and must not become remote access.
