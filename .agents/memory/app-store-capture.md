---
name: App Store screenshot capture
description: Reliable Expo Web capture flow for seeded app screens and corrected final assets
---
For Expo Web App Store screenshots, a temporary seed page in `artifacts/mobile/public/` can preload guest data before redirecting to the target route. If a newly named seed page returns a proxy error, reuse a known seed filename and restart the mobile workflow before capturing.

**Why:** Metro/Expo preview routing can cache or reject newly added static filenames even while the app route itself is healthy.

**How to apply:** Delete all capture-only seed pages after the screenshot is regenerated. After correcting mobile copy, run the Web export and sync both `static-build/web` and `artifacts/mobile/static-build/web` before publishing.