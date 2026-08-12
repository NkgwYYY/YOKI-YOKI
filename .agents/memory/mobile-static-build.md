---
name: Mobile web bundle is served from artifacts/mobile/static-build
description: Where the Expo web export must land for production serving; two bundle locations must stay in sync.
---

Rule: after `pnpm run export:web` (which outputs to repo-root `static-build/web`), also refresh `artifacts/mobile/static-build/web` (e.g. `rm -rf artifacts/mobile/static-build/web && cp -r static-build/web artifacts/mobile/static-build/web`) and commit both.

**Why:** production serving uses `artifacts/mobile/server/serve.js`, whose STATIC_ROOT is `artifacts/mobile/static-build` — NOT the repo-root bundle. A code review caught a deploy that would have served the old UI because only the root bundle was refreshed. An earlier memory claiming `artifacts/mobile/static-build` doesn't exist was wrong.

**How to apply:** every time mobile code changes: tsc → export:web → sync `artifacts/mobile/static-build/web` → git commit.
