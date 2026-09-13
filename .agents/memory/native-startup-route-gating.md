---
name: Native startup route gating
description: Prevent native launch crashes caused by transient mounting of frame-driven home UI
---

Keep the Expo Router root navigator mounted from its first render, but gate the tabs layout until authentication and persisted app state resolve. A fresh visitor must reach onboarding without briefly mounting the home screen. On native App Store startup, loading fallbacks and persistent home chrome must not start Reanimated frame worklets; use source-image-only fallbacks or core React Native animation until the interactive stage is ready.

**Why:** A fresh native launch previously mounted the default home route before an effect redirected to onboarding. That transient mount started frame-driven character/video work and experimental native tabs. A later physical-device crash occurred after home appeared, with Hermes throwing inside Worklets AnimationFrameBatchinator; a supposedly static loading fallback still mounted character worklets, and persistent home UI also ran an infinite worklet.

**How to apply:** Put eligibility/loading guards inside the tabs layout rather than replacing the root navigator with null or a redirect. Use the stable tabs implementation for App Store releases until the experimental native implementation is proven safe on current iOS devices. Treat “static” as a separate component that never mounts Reanimated hooks, not merely a prop that disables one visual layer.

Hidden modal contents count as mounted startup UI even when their native modal or bottom sheet reports `visible={false}`. Conditionally mount any modal tree containing frame worklets only when it is actually opened, and provide a worklet-free iOS path for flows reachable from home.

The Worklets abort is not limited to startup: opening a tab that starts Reanimated frame callbacks can trigger the same Hermes/AnimationFrameBatchinator crash. Until the dependency/runtime combination is proven safe on physical release devices, App Store iOS paths should use plain views, static source images, or core React Native Animated.