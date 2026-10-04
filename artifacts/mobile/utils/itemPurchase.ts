import type { FeedState } from '../contexts/AppContext';
import type { ShopState } from '../contexts/ItemContext';
import type { StorageEntry } from './recoverableStorage';

export const SHOP_STORAGE_KEY = '@mentore/shop_state_v2';
export const FEED_STORAGE_KEY = '@mentore/feed_state_v1';
type Inventory = Pick<ShopState, 'inventory' | 'equipped' | 'placements'>;

/** Called inside the shared storage queue; ownership makes retries idempotent. */
export function prepareItemPurchase(values: Record<string, string | null>, itemId: string, cost: number, defaultFeed: FeedState) {
  if (!itemId || !Number.isFinite(cost) || cost < 0) throw new Error('このアイテムは購入できません');
  const feed: FeedState = values[FEED_STORAGE_KEY] ? JSON.parse(values[FEED_STORAGE_KEY]!) : defaultFeed;
  const local: Inventory = values[SHOP_STORAGE_KEY] ? JSON.parse(values[SHOP_STORAGE_KEY]!) : { inventory: [], equipped: {} as Inventory['equipped'], placements: {} };
  // Do not replace unreadable ownership or balances with empty defaults on a purchase.
  if (!feed || !Number.isFinite(feed.points) || feed.points < 0 || !local || !Array.isArray(local.inventory)
    || local.inventory.some(id => typeof id !== 'string')) throw new Error('保存済みの購入データを確認できません');
  if (local.inventory.includes(itemId)) return { entries: [] as StorageEntry[], result: { local, feed } };
  if (feed.points < cost) throw new Error('YOKIポイントが足りません');
  const nextFeed = { ...feed, points: feed.points - cost };
  const nextLocal = { ...local, inventory: [...local.inventory, itemId] };
  const entries: StorageEntry[] = [[FEED_STORAGE_KEY, JSON.stringify(nextFeed)], [SHOP_STORAGE_KEY, JSON.stringify(nextLocal)]];
  return { entries, result: { local: nextLocal, feed: nextFeed } };
}
