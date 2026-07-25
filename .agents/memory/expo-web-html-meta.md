---
name: Expo web head tags (OGP/GA)
description: Why head tags must be injected post-export instead of via app/+html.tsx
---
The mobile app uses Expo's default "single" web output, which **ignores `app/+html.tsx`** — anything put there (OGP meta, GA scripts) never reaches the exported `static-build/web/index.html`.

**Why:** `+html.tsx` only applies when `web.output` is `"static"`; discovered when OGP tags added there silently didn't appear in the export.

**How to apply:** after `expo export`, run `node artifacts/mobile/scripts/inject-meta.js` (or use the `export:web` package script, which chains both). Note: the GA4 snippet in `+html.tsx` is likewise dead in web builds until moved into the inject script.

Also: LINE caches link previews server-side and can't be force-purged; changing the shared URL (e.g. adding `?v=2`) shows the fresh preview immediately.
