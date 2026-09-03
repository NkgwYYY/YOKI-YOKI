---
name: YOKI YOKI home direction
description: Durable visual and interaction rules for the mobile app home screen.
---

Keep the home as one seamless scene: a light lavender upper background with pale-pink image grass at the character's feet. Do not place a translucent capsule or aura behind the character, or a flat-color panel behind the main actions. Furniture and flowers appear only after purchase. The main actions stay visible below the character within one screen.

Use one shared currency name, 「きらめきポイント」, for food, furniture, flowers, and additional companions.

Treat the pink ground as a dense, irregular fur or grass image texture. Never use generated triangular teeth, clip-path polygons, SVG paths, hand-drawn wave paths, masks, shadows, or border-radius shaping for the grass. The transparent PNG itself owns the soft, center-raised arch; CSS only displays the image.

**Why:** A separate “atelier” card and pre-filled decorative room made the character feel pasted into a UI module rather than living naturally in the app’s world. The pale-pink ground now anchors the character without restoring a room frame. Repeated sawtooth edges and synthetic filter shapes looked artificial; a real image texture matches the high-density pink-fur reference. Food-specific currency naming also stopped making sense once the wallet paid for decor and companions.

**How to apply:** When adding home features, preserve the unframed lavender-sky/pink-ground scene and fixed-height primary interaction area. Keep name and status information above the character and the four primary actions below it. Continue one transparent image-grass layer from the hill beneath the character through the action buttons; do not add a separate solid ground panel or CSS shaping layer. Put secondary controls in sheets or menus rather than extending the home vertically. New purchasable decor must remain absent until owned.