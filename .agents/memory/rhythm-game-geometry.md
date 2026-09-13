---
name: Rhythm game geometry
description: Keep rhythm-game visuals and input judgments aligned across device sizes
---

Rhythm games must derive notes, judgment lines, and touch or swipe surfaces from the same measured local play-area dimensions. Do not calculate gameplay geometry from a module-level window-size snapshot.

**Why:** The games run inside a safe-area-constrained modal whose usable size differs from the full device window. Independent fixed coordinate systems made the visible lanes, notes, and actual input regions diverge on physical iOS devices.

**How to apply:** Measure each active game root and play surface, clamp compact layouts to the available height, and keep the quit control inside that budget. Recalculate geometry when layout changes; never feed an element's explicit height back from measuring that same height.