# YOKI YOKI landing redesign — 2026-10-10

## Scope

Landing home only, based on main f99bf9ff3d2a9887ec88afc1321209402a2a6278. The mobile app, API, database, active 3.0 branch, article content, support page, and privacy page are unchanged.

- Replace the dark starfield/glass treatment with warm paper, lavender, sage, generous typography, and the original characters.
- Add a native checkbox day/night scene and native details greeting. These are explicitly described as landing-page mini experiences, not app screenshots or saved game actions.
- Add character introductions, native FAQ, preserved support/privacy/article destinations, and mobile CTA.
- Preserve the app URL and app_cta_clicked analytics contract. No new dependencies, input collection, saved state, or API calls.
- Preserve all four character PNGs byte-for-byte, including their original faces, fur, and proportions.
- Scope styles to yk classes. Update page metadata and base-aware favicon/hero preload. Existing social image, ownership verification, and analytics configuration are retained.

## Validation actually performed

The revised Home component was transpiled with TypeScript and rendered with React/ReactDOM 19.1.0 in Chromium. The runtime was sourced from the existing application export solely for offline QA; it is not a new dependency or shipped asset. Original PNGs were embedded only in the standalone preview.

36 checks passed: component render, image decoding, no horizontal overflow and unchanged image proportions at 320/390/768/1024/1440px, hero CTA visibility, keyboard day/night and greeting controls, keyboard FAQ controls, valid destination strings, CTA analytics at four locations, reduced-motion styling, no JavaScript page errors, and four original asset hashes. Desktop/mobile/day/night screenshots were inspected.

This is isolated component/browser QA, not a complete workspace typecheck, Vite production build, live URL availability check, or Replit deployment. System fallback Japanese fonts were used in offline screenshots; the existing production web-font setup is unchanged.

## Before release

Review only the three landing implementation files and this note. Do not reset the active Replit app to this older main branch or merge unrelated 2.0/3.0 work. Bring these landing-only changes into the current working tree after checking for local edits.

Run in the existing configured workspace:

```sh
pnpm --filter @workspace/landing run typecheck
PORT=18150 BASE_PATH=/landing/ pnpm --filter @workspace/landing run build
```

Then verify /landing/, all linked article/support/privacy pages, actual app navigation, production fonts, and mobile Safari in Replit preview before publishing. main merge and deployment have not been performed.
