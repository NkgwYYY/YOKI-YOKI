---
name: Guest-first data migration
description: Rules for allowing YOKI YOKI users to begin without an account and safely back up their data later.
---

Users can start YOKI YOKI without a Clerk account. Their core progress, shop purchases, equipment slots, and item placement settings remain on the current device until they choose to log in for cloud backup.

**Why:** Registration failure must never block App Review or first use, but guest access does not exempt login and registration from review; every advertised auth state must still complete. Browser acquisition also benefits from removing registration from the first-use path, but an existing account's saved profile and settings must never be silently replaced by data from a shared device.

**How to apply:** Keep a prominent guest-start action above the fold on every login, registration, and verification state, including iPad layouts. Localize actionable authentication errors, state password requirements before submission, and complete Clerk client-trust or second-factor email-code states instead of stopping at an error. Allow guest shop purchases from the local point balance and persist inventory, per-genre equipment, and placement settings. At first login, retain account settings as authoritative, union inventories and append-only histories, keep furthest progress, then back up the merged state. Never treat a cloud timeout or failed pull as confirmation that the account is empty; keep account creation/onboarding blocked until a successful pull, and offer a safe retry state. Clearly state that local-only data cannot be recovered after app/browser-data deletion or a device change.