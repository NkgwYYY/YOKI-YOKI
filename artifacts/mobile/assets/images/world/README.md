# 3.0 world art

## Current art direction — 2026-10-08 fanciful village

The user requested a softer, anime-like fanciful world in the spirit of cozy life-sim and handcrafted storybook games. Nine original backgrounds were generated with the built-in image-generation tool, using the new home-day scene as the common style reference and the previous scenes as layout references. Rounded toy/clay silhouettes, pastel lilac/mint/butter-yellow/coral, puffy trees, simple oversized flowers and diffuse light replace realistic microtextures. No people, animals, UI or baked-in villagers. The four permitted inhabitants are the existing egg, mofumofu (`odango` internal ID), happa and colorful happa characters; those render separately.

Files below are in `artifacts/mobile/assets/images/world/`. Each is 1024×1536. JPEG quality 88 is encoding-only optimization of the generated original, with no visual repainting or compositing. Original PNGs are retained with the generation output. The user explicitly requested replacement of the old realistic artwork.

| File | Final prompt specification / preserved interaction layout |
| --- | --- |
| `home-day.jpg` | Toy-like cutaway cottage, lavender bed right, bookcase upper middle, window left, journal table left, rug center, bowl right, river left and clear garden path. Puffy hills and clouds; preserve furniture interaction coordinates. |
| `home-night.jpg` | Exact new daylight scene at cozy night: indigo/lilac sky, simple stars and crescent, warm windows and lanterns; same objects and layout. |
| `forest-clearing.jpg` | Puffy woodland, toy bench left, lantern tree hollow right, stream at left edge, open central curving footpath. |
| `village-market.jpg` | Chunky market stalls flanking an empty plaza, toy bridge and stream behind, fruit/jars at left, ramen-bowl sign and lilac noren at right. No text or inhabitants. |
| `village-onsen.jpg` | Rounded marshmallow stones, smooth turquoise pool in upper-middle at existing bather position, waterfall left, lilac-curtain bathhouse right, dry courtyard below. |
| `village-neighbors.jpg` | Three round cottages with oversized lilac roofs, flower mailboxes, toy bridge/fence and an open grassy village plaza. Four runtime residents. |
| `village-lake.jpg` | Toy boardwalk, lilac ticket hut upper left, pastel lake and hills, empty terrace for the separately animated wheel, wide dry foreground. |
| `light-garden.jpg` | Blue-hour fantasy garden, stars, pastel hills, toy greenhouse right, glowing chunky flowers and star lanterns; empty central terrace reserved for the runtime character, cord and energy tank. |
| `village-ramen.jpg` | New cutaway ramen house: lilac noren, bowl ornament, rounded kitchen counter, ceramic bowls/stockpot, two side tables, peach checker floor and open center. The mofumofu chef renders separately. |

Do not replace these original character forms with arbitrary animals or humans. The image generation prompts used original scenery, not copied game characters/logos. Earlier art records below describe superseded versions.

Original generated cottage illustrations, created for YOKI YOKI 3.0. Day and night share the same scene geometry (1024×1536). JPEG encoding is for loading size; no mascot is drawn into these backgrounds. Original character sprites and owned items are rendered separately. Coordinates live in `utils/worldGeometry.ts`. Do not use the scene clock or animation callbacks to award persisted currency.

## Care-first expansion — 2026-10-07

Created with the built-in image generation tool, using `home-day.jpg` as the style reference. All three are 1024 × 1536; JPEG quality 90 is encoding-only optimization, with no painted/composited modifications. The originals remain in the generation output; the actual bundled files are here.

| File | Purpose | Prompt / art direction |
| --- | --- | --- |
| `forest-clearing.jpg` | Level 3 map | Quiet woodland clearing, elevated 35° miniature diorama, soft cedars, misty lavender mountains, bench left and hollow lantern tree right; open moss/earth path in the central lower scene. Warm painterly 3D materials, original HOME palette; no characters, UI or text. |
| `lake-shore.jpg` | Level 6 map | Peaceful mountain lakeshore at golden hour, lavender mountain reflections, jetty high right; empty dry sandy/mossy clearing in the lower 65%, reeds/rocks/flowers on edges. Match HOME materials/light, no character, UI or text. |
| `light-garden.jpg` | Light garden presentation | Blue-hour stone-and-moss terrace, distant lavender mountains and softly lit greenhouse, natural luminous flowers and brass lanterns at edges; empty center reserved for separately rendered character, glass reservoir and cord. Cozy painterly 3D materials, no baked character/tank/text/UI. |

Map bounds are derived from the actual dry/clear parts of these images (`utils/worldMaps.ts`). The outdoor scenes are dusk-tinted at night, not independent night paintings. Map unlocks only read the existing level; travel creates no rewards. The garden's liquid always reads stored energy, not decorative state.

## Connected village life — 2026-10-08

Four original 1024×1536 backgrounds generated with the built-in image tool using `home-day.jpg` solely as the material/light/style reference. Saved as JPEG quality 90 (encoding only). Prompts requested warm elevated 35-degree woodland dioramas, lavender fabrics, honey timber, mossy stone, broad unobstructed foreground ground; no characters/UI/text.

- `village-market.jpg`: upper left/right market stalls, berries, ceramics, scarves and lamps; open foreground plaza.
- `village-onsen.jpg`: upper-middle mineral pool, rock rim, waterfall and lavender-curtain bathhouse; dry foreground courtyard. The runtime bather/waterline is anchored to this actual pool.
- `village-neighbors.jpg`: three timber cottages around a grassy plaza, clear central paths. NPC residents render separately.
- `village-lake.jpg`: distant lake and an empty timber promenade; no baked wheel. The brass/wood SVG wheel and upright moving gondolas render separately.

This is layered illustrated scenery with a volumetric egg and interactive objects, not a fully navigable 3D terrain renderer. Bounds, connected paths and level requirements are in `worldMaps.ts` / `villageLife.ts`. No map or activity awards currency or modifies care records.
# Bowling lodge revision — 2026-10-08

`village-bowling.jpg` is generated with the built-in ImageGen tool using `home-day.jpg` as the edit reference, then encoded as JPEG quality 90 without resizing. The original generated PNG is retained in the current work session. This replaces the rejected flat vector bowling room; use the same WorldHome frame/camera and WorldResident sprite as home. Interactive pins are separate from the background.

Final prompt: Edit the exact home environment into a small whimsical bowling lodge in the same world. Preserve the original camera elevation, isometric/cutaway dollhouse composition, portrait 2:3 framing, building scale, rounded tactile 3D rendering, warm light, pastel greens/lilacs, sky, distant lake/hills, flowers, shrubs, garden path, stream and waterfall. Replace only bedroom furniture/carpet with a single narrow polished wooden lane, lavender benches at the edges, lanterns, flowers/vines and a discreet pin-shaped back-wall sign. Do not zoom or move the camera. No text, UI, scoreboard, characters, balls or actual pins on the lane. Keep the whole scene/garden visible and approach unobstructed; no flat vectors or giant straight-on alley.

Coordinates measured from the generated image: approach `(0.505, 0.49)`; head pin `(0.552, 0.358)`; successive pin rows move `(0.007, -0.012)` toward the back with `0.026` column spacing. These versioned `garden` coordinates drive drawing, physical contact and the persisted score together. Earlier receipts retain their original trajectory and daily-use record.

## Longer bowling lane — 2026-10-08

- Asset: `village-bowling-long.jpg`. Built-in ImageGen edit of the approved `village-bowling.jpg`; JPEG quality 90, unchanged resolution. The previous asset is preserved.
- Prompt: Lengthen only the single wooden lane toward the foreground, roughly two to three times the rolling distance, from the existing back wall to a new foul line near (0.46, 0.64), with a clear approach near (0.45, 0.69). Preserve the approved camera, cutaway lodge, benches, garden, stream, warm light and tactile pastel 3D style. Extend the lane/deck through the central garden path, with low lavender gutters. Remove the old intermediate foul line/arrows; retain one new foreground line. No characters, loose pins, balls, UI or text.
- Measured final coordinates: initial feet (0.455, 0.715), foul line about y=0.665, head pin (0.552, 0.358). Initial ball-to-pin distance is about 2.7 times the short lane. Only feet behind the line (y=0.685–0.75, x=0.34–0.64) can start a rewarded throw. Saved throws use `garden-long`; earlier `garden` results retain their original rules.

### 2026-10-08: こかげのタバコ屋

- Asset: `village-tobacco.jpg` (1024×1536, JPEG quality 90). Built-in image_gen; generated source is retained separately. New asset, existing art preserved.
- Prompt: Create a portrait 1024×1536 small Japanese tobacco kiosk and a separate outdoor smoking terrace, matching `village-market.jpg` as style/camera reference: elevated three-quarter camera, cozy rounded 3D miniature toy diorama, warm wood, pastel purple awning, clay textures, flowers, river and hills. Kiosk in upper half with exact sign「たばこ」and plain unbranded boxes. Separate covered bench and standing ashtray on right around 55% down. Broad empty golden-earth foreground around 60% down for the live character, paths to left/right/down. No painted characters, UI, logos or excessive smoke. Fictional game environment.


## Home bath and egg-job kitchen (2026-10-08)

- `home-bath.jpg`: original built-in ImageGen scene; source `exec-1ca57134-3190-4964-93ee-2e209023324b.png`, 1024×1536, JPEG quality 90. Prompt: tactile 3D toy diorama Japanese domestic bathroom, ivory bathtub, honey wood, lavender/mint details, folded towels, shower, window into a green garden; elevated portrait camera and open foreground, no characters/UI/text. A home bathroom distinct from the outdoor onsen.
- `egg-kitchen.jpg`: original built-in ImageGen scene; source `exec-bf8bbfc7-4a0c-42aa-b00f-e875bf380965.png`, 1024×1536, JPEG quality 90. Prompt: peaceful forest cottage boiled-egg shop, warm rounded 3D miniature kitchen, egg baskets, timer, honeywood workbench with clear middle area for interactive saucepan; no characters, pan, text or UI.
- The interactive tub bather, dirt, tools, vacuum and egg-job pot are rendered by app components rather than baked into these environments. Existing approved backgrounds were retained.


## Fancy village refresh — 2026-10-09

Built-in image generation / style transfer. `home-day.jpg` is the authoritative style reference. The initially photorealistic drafts were rejected and are not referenced by the app. Final art uses rounded clay/felt storybook miniatures, lavender, honey yellow, mint and peach, diffuse light, no text or UI. All PNG sprites preserve alpha. Background JPEGs only re-encode the generated pixels for delivery.

- `home-bath-v2`: generated source `exec-2a27b14e-dbea-4274-805d-fdda4b916dd7.png`.
- `village-tobacco-v2`: generated source `exec-2e9937e1-726e-44ac-8576-22a5170015fd.png`.
- `village-homewares`: generated source `exec-8745bc5b-d32e-4acd-924c-a328d5b50414.png`.
- `village-diner`: generated source `exec-7fda35a9-1e51-4730-901f-c5518c3e74fb.png`.
- `village-square`: generated source `exec-acd0c108-5a82-435d-8073-d9ad0f34c3ef.png`.
- `egg-workshop-v2`: generated source `exec-1ffaed54-e94a-4922-aafe-8d55617ec8ac.png`.
- `village-atlas`: generated source `exec-fec370e3-5951-426d-9a6d-3d2c829378cf.png`.
- `village-workshop`: generated source `exec-01dab66a-82b0-479b-aca3-62a9272815a7.png`.
- `copper-pot`: generated source `exec-acb4cb08-690f-4569-ab65-dfc17a6f3534.png`.
- `homewares-keeper`: generated source `exec-2cc93847-dcb2-428a-a4dc-836510e57e42.png`.
- `ramen-master`: generated source `exec-e8651981-3ed6-4c53-8603-6398d971c143.png`.
- `tobacco-keeper`: generated source `exec-3265f0f8-8a2b-42e2-b30e-465db8b24207.png`.
- `diner-chef`: generated source `exec-00102da0-3292-40ce-9073-00d0f6c3c213.png`.

Prompt set: preserve interaction coordinates and edit the room/character into the existing fancy YOKI YOKI style; no photoreal texture, grain, realistic human eyes, dark cinematic lighting or copyrighted game characters. Bath: clear oval water center (.51,.331), open floor; tobacco: teal/plum retro kiosk and right-hand outdoor bench; homewares: linens/brushes/brooms and center counter; diner: rice kitchen and clear floor; square: open plaza and small upper fountain; atlas: toy landscape with forest/onsen upper-left and lake upper-right; kitchen: open tabletop and empty stove; workshop: separate egg-emblem cottage; sprites: ramen master with headband/coat, rice chef with hat/apron, fluffy storekeeper with cleaning tools, cigarette-motif plum-vest keeper, peach/lavender egg pot. No generated letters or buttons.

## Web transfer variants — 2026-10-09

The .webp siblings of the 14 world backgrounds/atlas and four merchant portraits are delivery encodings of the existing approved artwork, with the same dimensions and composition. Generated with Pillow WebP method 6: background quality 88, portrait quality 90 and full alpha quality. JPEG/PNG source files remain the native assets. WorldArt selects the WebP variant only on Web. Merchant portraits are prepared with their destination background; the atlas and one likely exit are warmed sequentially after the current scene settles.

## Dark tobacco alley — 2026-10-09

Built-in imagegen edit, source exec-cf4da3b5-7e37-4993-9e5f-fa82218fc6bb.png, referenced village-tobacco-v2.jpg. Saved as village-tobacco-dark.jpg and WebP. Prompt: preserve the exact shop-left / bench-right / open stone ground layout and rounded clay/felt art; change the atmosphere to a slightly shady after-hours alley with deep plum/indigo shadows, weathered dark wood, burgundy curtains, amber lantern pools, muted violet window light and moonlight; fewer bright flowers, darker climbing leaves. No characters, text, UI, brands or logos. The original daytime version is retained.
