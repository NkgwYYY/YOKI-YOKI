---
name: Native release bundle domain
description: Domain and build-safety rules for Expo bundles submitted to mobile app stores
---

Native release manifests must point their launch asset URLs at the verified public production domain. Never let an App Store build fall back to a temporary development domain.

**Why:** Development URLs are workspace-scoped and not a stable launch source for external review devices. A release that references one can fail at launch even when local previews work.

**How to apply:** Obtain the live URL from deployment metadata, pass its host through a dedicated non-secret build variable, verify the generated iOS manifest uses that host, and reject builds missing required authentication configuration.