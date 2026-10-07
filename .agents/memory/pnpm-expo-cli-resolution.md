---
name: pnpm Expo CLI resolution
description: Why Expo build subprocesses need the pnpm binary environment in this workspace
---

Keep Expo subprocesses in pnpm's binary-shim environment rather than launching the resolved CLI with plain Node.

**Why:** pnpm's private-hoisted dependencies are not visible through ordinary project-level Node resolution. The Expo shim supplies NODE_PATH; bypassing it can make an installed Babel preset invisible. A restored dependency tree can also have missing generated hoist links even when a normal frozen install reports "already up to date."

**How to apply:** Preserve the binary environment when adapting upstream build scripts. Distinguish missing generated dependency links from absent packages before changing dependencies or removing Expo plugins.
