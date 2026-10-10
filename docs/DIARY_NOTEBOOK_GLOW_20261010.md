# Notebook reminder — 2026-10-10

- The notebook on the left-hand table at home glows with a gold halo and white/lavender stars while today's entry is unwritten OR today's character letter is unread. Both must be complete to extinguish the glow. Mood-only submissions count as an entry, consistent with the existing diary.
- Character letters receive a persisted, idempotent read timestamp after their page has been laid out and visible in the foreground for 600 ms. Opening storage, viewing the user's page, or browsing the shelf does not mark a letter read. The read transaction does not alter diary revisions, points or mood records.
- Today's state refreshes on home activation and every 30 seconds while active; missed days do not accumulate reminders. Existing pages without a read timestamp show unread until viewed once.
- One shared animation value drives two small SVG layers. It stops when the home scene is inactive; reduced-motion mode retains a stationary glow. No extra image or sound assets.

## Verification

- Local and Replit TypeScript checks pass; all 22 exchange-diary tests pass, including both completion orders, midnight reset, persisted read state, unchanged points/revision and interrupted-write recovery.
- Live 390 px mobile preview: glow surrounds the actual notebook; tapping it opens the character letter. With today's entry already saved, reading the character page and returning home removes the glow. Existing diary text and points were not changed.
- Replit preview updated using scoped patches; no production republish.
