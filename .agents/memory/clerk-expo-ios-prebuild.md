---
name: Clerk Expo iOS prebuild
description: Why Clerk 4 iOS builds can fail in CocoaPods and what must be present before retrying Expo Launch.
---

For `@clerk/expo` 4.x native iOS builds, keep the package's Expo Config Plugin enabled. Verify a clean iOS prebuild writes `ios.deploymentTarget` as `17.0` before CocoaPods runs. If Apple login is offered, retain the plugin's default Apple Sign-In support so the entitlement is generated.

**Why:** Expo Launch can autolink the Clerk pod yet fail while adding `ClerkKit` / `ClerkKitUI` with `package_product_dependencies` on a nil target when the required native prebuild configuration was not applied.

**How to apply:** After Clerk or Expo dependency changes, run Expo compatibility checks and a temporary clean iOS prebuild. Confirm the deployment target and Apple Sign-In entitlement, then retry through Replit's Publish pane rather than EAS CLI.