---
name: RN-web movable overlays
description: Reliable drag and resize behavior for React Native Web overlays.
---

Keep draggable overlays laid out at a stable origin, then translate them into position. Do not combine a percentage `left` value with an intrinsic-width element, because the browser constrains its layout width before applying the transform and can collapse it near the right edge.

**Why:** A speech bubble moved toward the right edge became a narrow vertical column even though its transform visually moved it back inside the viewport.

**How to apply:** Measure the container and overlay, keep layout anchored at the container origin, and calculate translation from the available travel distance.

Place resize handles outside the parent drag responder and save the latest resize value from both normal release and responder termination.

**Why:** On React Native Web, a nested resize handle can visibly resize during movement but lose its release event to the parent responder, leaving the new size unsaved.

**How to apply:** Give drag and resize separate sibling responder regions, retain the latest live value in a ref, reject unwanted termination where appropriate, and persist on either completion path.