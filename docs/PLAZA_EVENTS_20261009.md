# こもれび広場の出会い — 2026-10-09

- First visit schedules the balloon child after 6.5 seconds. Later encounters choose an unseen daily kind at random, with 5–9 minute persisted cooldowns; maximum four encounters per local calendar day.
- Balloon rescue: +60 pt; suspicious gentleman: explicitly hand over 30 pt, lose exactly that deposit; lost brooch: +25 pt; directions: +20 pt. Declining costs nothing. No real currency or external services.
- Tap a resident or 話しかける to walk over. Dialogue is a transparent scene overlay; the plaza remains full screen. Lightweight SVG props share the existing resident renderer, with balloon retrieval / fleeing animations and reduced-motion support.
- Encounter identity, choice, wallet change, cooldown and outcome persist together in the existing recoverable balance journal and cloud feed state. Returning or reloading preserves an unfinished encounter/outcome. Account ownership guards protect async writes.
- Validation: TypeScript; eight domain/journal tests cover delayed appearance, idempotency, insufficient balance, failed write recovery, concurrent choices, daily cap and midnight/clock rollback.
- Replit verification: typecheck and all eight tests pass. Actual 390×760 / 320×568 UI tested; balloon reward moves the preview guest from 30 to 90 pt, reload restores the resolved event without paying again. Small-screen result panel keeps all three characters visible. No production republish performed.
- Replit uses its existing `bowlingOwner` account guard; local checkout uses `privateCache.isCurrent()`. Preserve each environment’s established authentication implementation.
