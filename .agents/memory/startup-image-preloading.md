---
name: Startup image preloading
description: Cross-platform rules for caching YOKI YOKI's core images before the first screen is revealed.
---

Preload the home ground, current character-stage images, and plant scene before fading away the in-app startup overlay. Keep the resolved promise and use memory-plus-disk caching so tab changes reuse the warmed assets.

On React Native Web, bundled static image imports expose URI-bearing objects and `Image.resolveAssetSource` may not exist. Read an object source's `uri` directly; only use `resolveAssetSource` as an optional native fallback.

**Why:** Calling `Image.resolveAssetSource` unconditionally passed static checks but crashed the Web app at startup, replacing the loading screen with the global error fallback.

**How to apply:** Any new first-visit image-heavy screen should add only its essential hero/background assets to the startup list. Keep startup bounded, retry visibly on failure, and verify the development Web runtime—not only the static export.