/** Character Lab's 512-unit accessory calibration, reused by the native room. */
const OFFSETS: Record<string, Record<string, number>> = {
  'starter-moon-ribbon': { egg: -112, odango: -171, happa: -156, colorful_happa: -156 },
  'catalog-wear-crown': { egg: -243, odango: -283, happa: -301, colorful_happa: -301 },
  'catalog-wear-cat-ears': { egg: -166, odango: -225, happa: -200, colorful_happa: -200 },
  'catalog-wear-round-glasses': { egg: 38, odango: -13, happa: 22, colorful_happa: 22 },
  'catalog-wear-headphones': { egg: -80, odango: -130, happa: -100, colorful_happa: -100 },
};
export function roomWearableFrame(id: string, character: string, characterSize: number, placement: { x: number; y: number; scale: number }) {
  const base = character === 'egg' ? 430 : character === 'odango' ? 512 : 470;
  const fit = id === 'catalog-wear-headphones' ? 0.82 : id === 'catalog-wear-crown' ? 0.88 : id === 'catalog-wear-round-glasses' ? 0.72 : id === 'catalog-wear-cat-ears' ? 0.78 : 1;
  const size = base * fit * Math.max(0.55, Math.min(1.45, placement.scale));
  const ratio = characterSize / 512;
  return {
    left: ((id === 'starter-moon-ribbon' ? 80 : 0) + (512 - size) / 2 + placement.x) * ratio,
    top: ((OFFSETS[id]?.[character] ?? -100) + (512 - size) / 2 + placement.y) * ratio,
    width: size * ratio,
    height: size * ratio,
  };
}
