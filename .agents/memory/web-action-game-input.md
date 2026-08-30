---
name: Web action-game input
description: Browser keyboard handling rules for reliable simultaneous movement and jumping in mobile-first action games.
---

For browser-playable action games, blur the focused start or retry button before play, capture keyboard events before button handlers, preserve jump as a queued action, and retain the takeoff direction throughout airborne movement.

**Why:** Space can reactivate the last focused button, short press/release events can occur between animation frames, and mobile multi-touch may release the direction control when the user reaches for jump. These all look like broken physics.

**How to apply:** Use held-state input for ground movement, queued edge-triggered input for jump, and a stored takeoff direction for air movement. Verify jump and run-then-release-then-jump separately in a fresh browser context.