# Village audio and bowling — 2026-10-10

- Removed the diner destination, merchant, visitors, map marker, portals and artwork preload. Home meals and the ramen shop remain available. Unknown/retired map IDs now fail the visit check safely.
- A single root music player follows all screens, including memories, bath, the egg workshop, shops and conversations. Unset preferences default to on; a saved off preference is respected. Browser autoplay failures retry on user interaction. Music pauses while the app is in the background.
- Bowling displays a large success/failure result after the pin animation, together with pins and the persisted reward. Success follows the daily mission. Partial misses still receive the existing per-pin reward.
- The fifth daily throw returns to the staff lobby 3.6 seconds after the result appears. The timer pauses in the background and never interrupts saving or rolling. Speaking to staff after all five plays shows a come-back-tomorrow message without opening the game.

## Verification

- TypeScript and 51 focused tests pass locally and in Replit (bowling, villageLife, villageVisitors, worldArt, worldExpansion).
- Live mobile preview: diner absent from map; one music element continues across memories and bath; off setting persists across tabs; staff refuses a sixth play.
- The real bowling renderer was exercised in a temporary, memory-only review screen. Verified large success and failure displays, reward text, and automatic closure after the fifth throw. No saved points or daily receipts were changed. Review fixtures are removed from the delivered app.
- Replit's existing authentication changes were preserved using a checked patch. Preview updated; no production republish. Native-device audio behavior was not tested on physical hardware.
