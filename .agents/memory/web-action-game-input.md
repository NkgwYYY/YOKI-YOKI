---
name: Web action-game input
description: Browser keyboard handling rules for reliable simultaneous movement and jumping in mobile-first action games.
---

For browser-playable action games, blur the focused start or retry button before play, capture keyboard events before button handlers, and preserve jump as a queued action while allowing held directional input to combine with it.

**Why:** Space can reactivate the last focused button, short press/release events can occur between animation frames, and mobile multi-touch must keep direction and jump as independent held states. These all look like broken physics.

**How to apply:** Use independent held-state inputs for left/right/jump, queue jump edges until the physics loop consumes them, and verify jump-only plus held-right-and-jump in a fresh browser context.