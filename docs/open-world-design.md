# Care, map and original Mofumofu — 2026-10-27

Home feeding now begins where the resident is standing. There is no pet bowl,
fixed feeding hotspot or walk to a feeding station. The existing feed transaction
still owns the charge and nutrition update; the 6.8-second sequence is presentation
only. The overview hand is 1.6 times its previous size, with the contact point
unchanged. The restaurant's ramen dish remains part of its separate meal.

The visible map destinations are laid out after platform and story filtering.
Each row recentres when a destination is absent. The atlas keeps its aspect ratio;
short landscape screens put the selection and travel action beside the map.
Retired locations, earned access, stories and saves are unchanged.

Removed the preset room/terrace/path walking commands, the second view toggle
inside the view sheet, the home job shortcut, and the redundant return-home action
when already home. Ground taps, the movement pad, camera controls and map travel
remain available.

## Mofumofu reference

The existing `assets/images/characters/odango.png` is the identity reference.
The existing faceless `assets/images/characters/bone/odango/body.webp` supplies the
long white coat in the web volume. Front and side projections blend in model space,
so the texture turns with the character. Fine surface fibres continue the silhouette.
The rear remains an inferred white coat; no official rear reference was available.
The ordinary and relaxed mouths keep downturned corners, small glossy eyes retain
a little sclera, and the face sits lower than the previous smiling cotton model.
The bundled texture needs no third-party image service. A procedural/SVG fallback
remains available if image or Canvas loading is unavailable.

## Background assets and generation

Built-in image generation/editing was used, not the fallback API/CLI.
The original backgrounds were inspected before editing. Outputs were inspected
and encoded as WebP at quality 85, with dimensions and artwork framing preserved.

- `artifacts/mobile/assets/images/world/home-day-open.webp`
- `artifacts/mobile/assets/images/world/home-night-open.webp`

Day prompt:

> Precise object removal edit for an existing game background. Remove ONLY the small purple-and-cream pet food bowl on the grass near x=77%, y=59% of this day scene. Fill the exact bowl area and its shadow with seamless matching grass and tiny ground flowers consistent with the surrounding area. Do not add a replacement object or feeding station. Preserve the entire rest of the image exactly: same 1024x1536 portrait dimensions, camera framing, furniture, purple rug, bed, wooden platform, notebook, paths, flowers, stream, trees, sky and daylight. Keep every landmark at its original location because game hit areas depend on it. No other changes, no text, no characters.

Night prompt:

> Use case: precise-object-edit. Edit target: this existing night game background. Remove ONLY the small purple-and-cream pet food bowl on the grass near x=77%, y=59% of the scene. Fill the exact bowl area and its shadow with seamless matching grass and tiny ground flowers consistent with the surrounding area. Do not add any replacement object or feeding station. Preserve the entire rest of the image exactly: same 1024x1536 portrait dimensions, camera framing, furniture, purple rug, bed, wooden platform, notebook, paths, flowers, stream, trees, sky, moonlight and warm lantern light. Keep every landmark at its original location because game hit areas depend on it. No other changes, no text, no characters.

## Validation

- TypeScript, the unit suite, and `git diff --check`.
- `careHands.browser.cjs`: actual feed/charge, fingertip contact, stationary meal,
  larger overview hand, washing strokes, release, keyboard and tab cleanup.
- `openWorld.browser.cjs`: visible map targets, bounds, non-overlap, locked story
  guide, travel/home and simplified controls at 390×844, 1363×936, 844×390 and 320×568;
  actual original-coat rendering in front, quarter, side and rear views.

Browser publication only. No App Store upload or review change.
