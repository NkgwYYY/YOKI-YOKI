import type {WorldMapId} from './worldMaps';

const ROWS: readonly (readonly WorldMapId[])[] = [
  ['onsen', 'lake'],
  ['homewares', 'market', 'ramen'],
  ['fortune', 'workshop', 'bowling'],
  ['home', 'tobacco', 'grandma'],
];
const WIDE_ROWS: readonly (readonly WorldMapId[])[] = [
  ['onsen', 'homewares', 'market', 'lake'],
  ['fortune', 'workshop', 'ramen'],
  ['home', 'tobacco', 'bowling', 'grandma'],
];

/** Centre each remaining group after platform and story availability filtering. */
export function villageAtlasLayout(visible: readonly WorldMapId[], wide = false) {
  const allowed = new Set(visible);
  const rows = (wide ? WIDE_ROWS : ROWS).map(row => row.filter(id => allowed.has(id))).filter(row => row.length);
  const points: Partial<Record<WorldMapId, {x: number; y: number}>> = {};
  rows.forEach((row, rowIndex) => row.forEach((id, index) => {
    points[id] = {x: .5 + (index - (row.length - 1) / 2) * (row.length > 3 ? .25 : .30), y: (rowIndex + .5) / rows.length};
  }));
  return points;
}
