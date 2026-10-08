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
