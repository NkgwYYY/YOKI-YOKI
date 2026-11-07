import type { CompanionState, FeedState, RoomCustomization } from '../contexts/AppContext';
import type { StorageEntry } from './recoverableStorage';

export const ROOM_KEYS = { feed: '@mentore/feed_state_v1', room: '@mentore/room_customization_v1', companions: '@mentore/companions_v1' } as const;
export const ROOM_PRICES = { furniture: { sofa: 450, vanity: 650, bookshelf: 900 }, flower: { pink: 250, violet: 350, rainbow: 550 } } as const;
export const COMPANION_PRICE = 1000;
export type RoomOperation = { kind: 'companion' } | { kind: 'buy' | 'select'; category: 'furniture' | 'flower'; id: string; cost?: number };

/** Ownership is the receipt. Recovery and retries never subtract twice. */
export function prepareRoomOperation(values: Record<string, string | null>, operation: RoomOperation, defaultFeed: FeedState) {
  const parse = <T,>(key: string, fallback: T): T => values[key] == null ? fallback : JSON.parse(values[key]!);
  let feed = parse<FeedState>(ROOM_KEYS.feed, defaultFeed);
  let room = parse<RoomCustomization>(ROOM_KEYS.room, { furniture: 'none', flower: 'none', ownedFurniture: [], ownedFlowers: [] });
  let companions = parse<CompanionState>(ROOM_KEYS.companions, { extraEggs: 0 });
  if (!feed || !Number.isFinite(feed.points) || feed.points < 0 || !room
    || typeof room.furniture !== 'string' || typeof room.flower !== 'string'
    || !Array.isArray(room.ownedFurniture) || room.ownedFurniture.some(id => typeof id !== 'string')
    || !Array.isArray(room.ownedFlowers) || room.ownedFlowers.some(id => typeof id !== 'string')
    || !companions || !Number.isInteger(companions.extraEggs) || companions.extraEggs < 0) {
    throw new Error('保存済みの部屋・購入データを確認できません');
  }
  let newlyPurchased = false;
  const result = (success: boolean, reason?: 'invalid' | 'not_enough') => ({
    entries: [] as StorageEntry[], result: { success, reason, newlyPurchased, feed, room, companions },
  });
  let target: string;
  if (operation.kind === 'companion') {
    if (companions.extraEggs >= 1) return result(true);
    if (feed.points < COMPANION_PRICE) return result(false, 'not_enough');
    feed = { ...feed, points: feed.points - COMPANION_PRICE };
    companions = { ...companions, extraEggs: 1 };
    newlyPurchased = true; target = ROOM_KEYS.companions;
  } else {
    const prices: Record<string, number> = ROOM_PRICES[operation.category];
    const valid = Object.prototype.hasOwnProperty.call(prices, operation.id);
    if (!valid && !(operation.kind === 'select' && operation.id === 'none')) return result(false, 'invalid');
    const ownedKey = operation.category === 'furniture' ? 'ownedFurniture' : 'ownedFlowers';
    const owned = (room[ownedKey] as string[]).includes(operation.id);
    if (operation.kind === 'select') {
      if (!owned && operation.id !== 'none') return result(false, 'invalid');
    } else {
      if (operation.cost !== prices[operation.id]) return result(false, 'invalid');
      if (owned) return result(true);
      if (feed.points < prices[operation.id]) return result(false, 'not_enough');
      feed = { ...feed, points: feed.points - prices[operation.id] };
      room = { ...room, [ownedKey]: [...room[ownedKey], operation.id] };
      newlyPurchased = true;
    }
    room = { ...room, [operation.category]: operation.id };
    target = ROOM_KEYS.room;
  }
  const prepared = result(true);
  if (newlyPurchased) prepared.entries.push([ROOM_KEYS.feed, JSON.stringify(feed)]);
  prepared.entries.push([target, JSON.stringify(target === ROOM_KEYS.room ? room : companions)]);
  prepared.entries = prepared.entries.filter(([key, value]) => values[key] !== value);
  return prepared;
}
