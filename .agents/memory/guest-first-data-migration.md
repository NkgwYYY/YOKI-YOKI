---
name: Guest-first data migration
description: Rules for allowing YOKI YOKI users to begin without an account and safely back up their data later.
---

Users can start YOKI YOKI without a Clerk account. Their core progress remains on the current device until they choose to log in for cloud backup.

**Why:** Browser acquisition benefits from removing registration from the first-use path, but an existing account's saved profile and settings must never be silently replaced by data from a shared device.

**How to apply:** At the first guest-to-account login, retain the account's existing settings as authoritative; combine append-only histories and keep the furthest progress values, then back up the resulting state. Clearly state that local-only data cannot be recovered after app/browser-data deletion or a device change.