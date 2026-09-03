---
name: YOKI YOKI home direction
description: Durable visual and interaction rules for the mobile app home screen.
---

Keep the home as one seamless scene: a light lavender upper background with pale-pink image grass at the character's feet. The grass is an independent, non-interactive background layer covering the lower 48% of the viewport edge-to-edge through the bottom navigation boundary. The character and four main actions share a foreground layer but must use normal vertical flow: character first, a generous gap, then the action row, then the bottom navigation. They must never overlap. Do not place a translucent capsule or aura behind the character, or a flat-color panel behind the main actions. Furniture and flowers appear only after purchase. The main actions stay visible below the character within one screen.

Use one shared currency name, 「きらめきポイント」, for food, furniture, flowers, and additional companions.

Treat the pink ground as a dense, irregular fur or grass image texture. Never use generated triangular teeth, clip-path polygons, SVG paths, hand-drawn wave paths, masks, shadows, or border-radius shaping for the grass. The transparent PNG itself owns the soft, center-raised arch; CSS only displays the image.

On React Native Web, do not rely on `height: auto` for the grass image inside an absolutely positioned container. Give the container an explicit viewport-relative height and stretch the image to occupy the full container from the bottom center; this is layout sizing, not shape processing.

**Why:** A separate “atelier” card and pre-filled decorative room made the character feel pasted into a UI module rather than living naturally in the app’s world. The pale-pink ground now anchors the character without restoring a room frame. Repeated sawtooth edges and synthetic filter shapes looked artificial; a real image texture matches the high-density pink-fur reference. An auto-height URI image collapsed to zero inside the absolute grass layer and made the grass disappear. Food-specific currency naming also stopped making sense once the wallet paid for decor and companions.

**How to apply:** When adding home features, preserve the unframed lavender-sky/pink-ground scene and fixed-height primary interaction area. Keep name and status information above the character. Keep the grass background absolutely anchored to the screen bottom, but keep the character and action row in a foreground vertical stack with real layout spacing—never absolute-position the action row over the character. Continue one transparent image-grass layer beneath the character and actions; do not add a separate solid ground panel or CSS shaping layer. Trim empty alpha padding in the asset when it creates visible screen-edge gaps. Keep a measurable container height and image height on web so the layer cannot collapse. Put secondary controls in sheets or menus rather than extending the home vertically. New purchasable decor must remain absent until owned.