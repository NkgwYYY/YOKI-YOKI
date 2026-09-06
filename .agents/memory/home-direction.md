---
name: YOKI YOKI home direction
description: Durable visual and interaction rules for the mobile app home screen.
---

Keep the home as one seamless scene: a light lavender upper background with pale-pink image grass at the character's feet. The grass must fill the lower area edge-to-edge and meet the bottom navigation without side or bottom gaps, but stay low enough that its central crest does not cover the character. The character always renders above the grass and sits lightly on that central crest. Overlay the four main actions on the hill rather than placing them below it. Do not place a translucent capsule or aura behind the character, or a flat-color panel behind the main actions. Furniture and flowers appear only after purchase. The main actions stay visible below the character within one screen.

The home speech bubble is an editing surface: tapping it reveals its adjustment state, and dragging it moves it immediately. It must not navigate to chat; chat remains available through the dedicated home action.

Use one shared currency name, 「きらめきポイント」, for food, furniture, flowers, and additional companions.

Treat the pink ground as a dense, irregular fur or grass image texture. Never use generated triangular teeth, clip-path polygons, SVG paths, hand-drawn wave paths, masks, shadows, or border-radius shaping for the grass. The transparent PNG itself owns the soft, center-raised arch; CSS only displays the image.

On React Native Web, do not rely on `height: auto` for the grass image inside an absolutely positioned container. Give the container an explicit responsive height and let the image occupy it with `contain`; this is layout sizing, not shape processing.

**Why:** A separate “atelier” card and pre-filled decorative room made the character feel pasted into a UI module rather than living naturally in the app’s world. The pale-pink ground now anchors the character without restoring a room frame. Repeated sawtooth edges and synthetic filter shapes looked artificial; a real image texture matches the high-density pink-fur reference. An auto-height URI image collapsed to zero inside the absolute grass layer and made the grass disappear. Food-specific currency naming also stopped making sense once the wallet paid for decor and companions. Opening chat from the bubble prevented users from treating it as a directly movable object.

**How to apply:** When adding home features, preserve the unframed lavender-sky/pink-ground scene and fixed-height primary interaction area. Keep name and status information above the character and overlay the four primary actions on the grass hill above the bottom navigation. Continue one transparent image-grass layer from the hill beneath the character through the action buttons; do not add a separate solid ground panel or CSS shaping layer. Trim empty alpha padding in the asset when it creates visible screen-edge gaps. Keep a measurable container height and image height on web so the layer cannot collapse. Put secondary controls in sheets or menus rather than extending the home vertically. New purchasable decor must remain absent until owned. Keep bubble gestures dedicated to selecting, moving, and resizing; route chat through its labeled action.