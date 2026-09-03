---
name: Gentle runner accessibility
description: Design and verification rule for the STARLIGHT RUN mini-game.
---

STARLIGHT RUN is a self-affirming mini-game, not a precision platformer. The star path should softly assist a first-time player at obstacles and short gaps, while retaining tap and hold controls for players who want to steer their jump height.

Keep physics and collision simulation on every animation frame, but publish immutable React scene snapshots at no more than 30 fps. Input refs, physics refs, and rendering cadence must remain separate.

**Why:** Immediate repeated failures undermine the app's purpose and can prevent players from reaching the positive end-of-stage message. Deep-cloning the world and rerendering the full React scene on every browser frame causes visible frame drops without improving collision accuracy.

**How to apply:** When changing the course, keep the stage completable in roughly one to two minutes without precise timed inputs. Validate coordinate changes with a deterministic physics simulation, then run the full completion flow in a mobile browser. Do not reduce physics frequency to optimize rendering; throttle only React snapshots and other display-only updates.