# 3.0 world art

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
