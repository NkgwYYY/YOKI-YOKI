---
name: Guest-first data migration
description: Rules for allowing YOKI YOKI users to begin without an account and safely back up their data later.
---

Users can start YOKI YOKI without a Clerk account. Their core progress, shop purchases, equipment slots, and item placement settings remain on the current device until they choose to log in for cloud backup.

**Why:** Browser acquisition benefits from removing registration from the first-use path, but an existing account's saved profile and settings must never be silently replaced by data from a shared device.

**How to apply:** Allow guest shop purchases from the local point balance and persist inventory, per-genre equipment, and placement settings. At first login, retain account settings as authoritative, union inventories and append-only histories, keep furthest progress, then back up the merged state. Never treat a cloud timeout or failed pull as confirmation that the account is empty; keep account creation/onboarding blocked until a successful pull, and offer a safe retry state. Clearly state that local-only data cannot be recovered after app/browser-data deletion or a device change.