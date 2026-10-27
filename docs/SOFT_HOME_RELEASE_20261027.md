# Soft residents and home eye-level view — 2026-10-27

The home scene now offers `きみと同じ目線へ` / `お部屋を見わたす`. It uses a separate eye-level interior, with day/night and portrait/landscape compositions. This changes the illustrated perspective rather than enlarging the overhead scene. Feeding, resting, petting and holding reuse the existing resident and meal-completion owner; changing views does not create another reward or replay a meal. Cleaning returns to the overview. Outdoor destinations keep their existing camera.

The evolved residents retain their round bodies, blush, black eyes and sprouts. Their coat now has overlapping soft tufts beneath shorter groomed fibres, with a diffuse cream/pastel palette and softer contour. Expressions have a small relaxed smile; happy residents blink too. Canvas body, coat and features remain attached in model coordinates. Native SVG gets matching softer contour, palette, expression and curved leaves. Reduced motion and inactive/offscreen suspension remain supported.

## Fewer destinations

- Retire the empty forest transit scene and duplicate neighboring village.
- Home and the plaza now connect directly to the hot spring.
- Preserve all four neighbors and their conversations in `湯あがりのおしゃべり` at the hot spring.
- Preserve historical destination unlock identifiers in saved/cloud progress; retired maps cannot be entered from the atlas, a walking gate or an old URL.
- Story invitations only name active destinations. Existing visit/evolution progress, keepsakes and earned points are unchanged.

## Verification

- Mobile TypeScript: passed.
- Mobile unit tests: 714 passed, 0 failed, 1 existing skip.
- Real exported web app: 320×568, 390×844, 820×1180, 844×390; overview/eye-level switching, pet interaction, rest, feeding (one 5-point charge), navigation, retired-map absence, neighbor dialogue, home return and cleaning. Normal and reduced motion covered.
- Shared-days/story browser regression: all three portrait widths, first conversation, immediate/persistent access, existing forms/records/rewards, and lake story ending passed.
- Public advertising tests: 4 passed.
- Web and iOS JavaScript exports passed locally. Native signed builds/device testing are separate.

## Browser advertisements

On 2026-10-27, the signed-in AdSense site detail still displayed `準備中 / 審査待ち`; request time is 2026-10-20 01:11 JST. The public introduction has the configured real publisher `ca-pub-7462386033661667` and slot `1013828566`. A rendered ad container reported `unfilled`. Production `/ads.txt` returns the exact authorized publisher line.

The advertising installation is public. Google has not yet approved actual serving. No ad was clicked, no review was restarted, and no fake impression/reward was produced. Existing public-introduction/article placements stay isolated from private diary/chat/app screens. App Store submission is outside this release.

## Art provenance

Created with the built-in imagegen tool, using the existing `assets/images/world/home-day.jpg` as identity/style reference. Encoded as JPEG for native and WebP for browser without compositional editing.

Final assets under `artifacts/mobile/assets/images/world/`:

- `home-eye-day.jpg` and `.webp`
- `home-eye-night.jpg` and `.webp`
- `home-eye-wide-day.jpg` and `.webp`
- `home-eye-wide-night.jpg` and `.webp`

Prompt set: a low, horizontal pet-eye camera inside the same cream-and-honey-oak room; arched window on the left, bookshelf at back, lavender bed and daisy pillow on the right, unobstructed lavender wool rug for the animated resident, soft matte organic materials, diffuse warm daylight; no characters, text or UI. The night edit preserves camera/layout and changes daylight to deep blue window light and warm existing lanterns. Wide variants extend the same room horizontally, with furniture in the upper 55%, rug in the lower 45%, and empty character space at x30%, y72%.

## Publication verification

Published successfully on 2026-10-27 at https://yoki-yoki.replit.app/. Replit deployment `b7cba70d-e06f-42d8-9eca-5afefd65978b` built web, iOS and Android exports. The release branch cherry-picked source commit `cacab836b9792d37cc95868349a6f71c51436831` as `558e3ea`; all 26 changed files matched the source commit before publishing.

Replit TypeScript passed and its test run finished with 720 passed, 0 failed and 1 existing skip. The public app was reloaded after publication: the eye-level home room and return-to-overview control rendered correctly, and the atlas no longer listed the retired forest, neighboring village or bank. The public screenshot was captured from the new release. Existing public ad installation remains subject to Google's pending site review.
