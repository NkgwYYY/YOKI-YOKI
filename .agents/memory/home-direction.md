---
name: YOKI YOKI home direction
description: Durable visual and interaction rules for the mobile app home screen.
---

Keep the home as one seamless scene: a light lavender upper background with a soft pale-pink grass gradient at the character's feet. Do not reintroduce a framed room, room title, item-description labels, patterned sky, or a vertically stacked dashboard. Furniture and flowers appear only after purchase. The main actions stay visible below the character within one screen.

Use one shared currency name, 「きらめきポイント」, for food, furniture, flowers, and additional companions.

Treat the pink ground as a dense, irregular fur or grass image texture. Never use generated triangular teeth, clip-path polygons, SVG filters, CSS filters, or hand-drawn wave paths for the grass. Use the shared public grass image as a horizontally repeated background.

**Why:** A separate “atelier” card and pre-filled decorative room made the character feel pasted into a UI module rather than living naturally in the app’s world. The pale-pink ground now anchors the character without restoring a room frame. Repeated sawtooth edges and synthetic filter shapes looked artificial; a real image texture matches the high-density pink-fur reference. Food-specific currency naming also stopped making sense once the wallet paid for decor and companions.

**How to apply:** When adding home features, preserve the unframed lavender-sky/pink-ground scene and fixed-height primary interaction area. Keep name and status information above the character and the four primary actions below it. Any ground change must reuse the public image tile with horizontal repetition rather than adding procedural grass rendering. Put secondary controls in sheets or menus rather than extending the home vertically. New purchasable decor must remain absent until owned.