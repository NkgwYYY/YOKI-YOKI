---
name: Web action-game input
description: Browser keyboard handling rules for reliable simultaneous movement and jumping in mobile-first action games.
---

For browser-playable action games, blur the focused start or retry button before play, capture keyboard events before button handlers, and preserve jump as a one-shot queued action until the physics loop consumes it.

**Why:** Space can reactivate the last focused button instead of jumping, and short press/release events can occur entirely between animation frames. Both failures look like broken physics even when touch controls work.

**How to apply:** Use held-state input for continuous movement, queued edge-triggered input for jump, and verify stationary jump separately from simultaneous movement plus jump in a fresh browser context.