---
name: Runner world coordinates
description: Coordinate-system rule for keeping STARLIGHT RUN visuals aligned with collision geometry.
---

STARLIGHT RUN uses bottom-origin world coordinates. Every enemy, collectible, obstacle, and effect must be rendered with the same ground-relative transform as the player and platforms.

**Why:** Mixing screen-top and screen-bottom formulas made enemies appear overhead while colliding at ground level, and made collectibles appear away from their real pickup location.

**How to apply:** Convert world Y through the scene height and ground line consistently. When changing an entity, verify its visible bounds and physics bounds overlap at ground level and on elevated platforms.