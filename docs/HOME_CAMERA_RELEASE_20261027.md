# Home camera refinement — 2026-10-27

Both home camera controls are now labelled `視点を変える`. The home perspective switch uses a 760 ms eased pan and zoom with a blend between the existing room illustrations. It no longer opens the map-travel curtain. Returning to overview pulls the camera back.

The same resident stays mounted, with a stable layout box and a continuous foot anchor and scale. Enlarged Canvas residents receive the appropriate backing resolution without resizing their layout. The incoming background starts transparent on its first frame, avoiding an initial flash of the destination artwork. The HUD stays fixed.

The next illustration is decoded before movement begins. Failed loads keep the current view and allow retry. Repeated presses are locked during preparation/movement; inactive scenes, layout changes and unmounts invalidate stale completion callbacks. Reduced-motion users switch immediately. Map travel continues to use its existing transition.

Validation covers 320×568 and 820×1180 with reduced motion, 390×844 and 844×390 with normal motion. Frame sampling checks a single persistent resident, intermediate zoom sizes, no size jump, no blackout, and a forward-only background blend starting transparent. The browser regression also covers rapid repeat presses, failed-image retry, petting, one-charge feeding, rest, map travel, return and cleaning. Mobile TypeScript and the existing mobile unit tests pass (714 passed, 1 existing skip).
