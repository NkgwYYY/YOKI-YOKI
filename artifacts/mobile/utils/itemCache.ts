import type { Item } from '../contexts/ItemContext';

/** Preserve owned artwork after retirement; fresh catalog entries remain authoritative. */
export function mergeOwnedCatalog(fresh: Item[], cached: Item[], ownedIds: string[]): Item[] {
  const current = fresh.filter(item => item.category !== 'food');
  const ids = new Set(current.map(item => item.id));
  const owned = new Set(ownedIds);
  return [...current, ...cached.filter(item => !ids.has(item.id) && owned.has(item.id) && item.category !== 'food')
    .map(item => ({ ...item, isActive: false }))];
}

/** Catalog metadata is a display cache, never a source of authority for purchases. */
export function readCatalogCache(raw: string | null): Item[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Array.isArray(value.items)) return [];
    return value.items.filter((item: Item) => item && typeof item.id === 'string' && typeof item.name === 'string'
      && ['accessory', 'background', 'voice'].includes(item.category) && typeof item.assetUrl === 'string'
      && Number.isFinite(item.cost) && item.cost >= 0 && typeof item.isActive === 'boolean'
      && Number.isFinite(item.posX) && Number.isFinite(item.posY) && Number.isFinite(item.scale));
  } catch { return []; }
}

export function readLocalInventory(raw: string | null) {
  const empty = { inventory: [] as string[], equipped: {}, placements: {} };
  if (!raw) return empty;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') return empty;
    return {
      inventory: Array.isArray(value.inventory) ? value.inventory.filter((id: unknown): id is string => typeof id === 'string') : [],
      equipped: value.equipped && typeof value.equipped === 'object' ? value.equipped : {},
      placements: value.placements && typeof value.placements === 'object' ? value.placements : {},
    };
  } catch { return empty; }
}
