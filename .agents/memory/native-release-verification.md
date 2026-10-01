---
name: Native release verification
description: Evidence needed before claiming that an App Review iPad touch failure is resolved.
---

Treat Expo Web touch emulation and component-contract tests as supplemental evidence, not proof of native iOS input behavior. Do not claim an App Review issue is resolved or a supported device was tested based only on browser viewport emulation.

**Why:** App Review reported unresponsive core home actions on a supported iPad release after earlier checks established only source/build correctness and browser startup. Native hit testing, animation-driven responders, and modal layers differ from the browser.

**How to apply:** For native touch failures, validate the release build on supported iPad and iPhone devices, including fresh install, update over the prior build, portrait/landscape, and restart. If physical-device access is unavailable, state the limitation explicitly and keep reviewer replies factual until release-device verification is complete.