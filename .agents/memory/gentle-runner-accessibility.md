---
name: Gentle runner accessibility
description: Design and verification rule for the STARLIGHT RUN mini-game.
---

STARLIGHT RUN is a self-affirming mini-game, not a precision platformer. The star path should softly assist a first-time player at obstacles and short gaps, while retaining tap and hold controls for players who want to steer their jump height.

**Why:** Immediate repeated failures undermine the app's purpose and can prevent players from reaching the positive end-of-stage message.

**How to apply:** When changing the course, keep the stage completable in roughly one to two minutes without precise timed inputs. Validate coordinate changes with a deterministic physics simulation, then run the full completion flow in a mobile browser.