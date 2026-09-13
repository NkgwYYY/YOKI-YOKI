---
name: Native startup route gating
description: Prevent native launch crashes caused by transient mounting of frame-driven home UI
---

Keep the Expo Router root navigator mounted from its first render, but gate the tabs layout until authentication and persisted app state resolve. A fresh visitor must reach onboarding without briefly mounting the home screen.

**Why:** A fresh native launch previously mounted the default home route before an effect redirected to onboarding. That transient mount started frame-driven character/video work and experimental native tabs; repeated review-device crashes shared a Hermes/CADisplayLink signature.

**How to apply:** Put eligibility/loading guards inside the tabs layout rather than replacing the root navigator with null or a redirect. Use the stable tabs implementation for App Store releases until the experimental native implementation is proven safe on current iOS devices.