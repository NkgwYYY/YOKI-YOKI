import assert from 'node:assert/strict';
import test from 'node:test';
import { createRecoverableStorage } from '../utils/recoverableStorage.ts';
import { prepareItemPurchase, SHOP_STORAGE_KEY as shop, FEED_STORAGE_KEY as feed } from '../utils/itemPurchase.ts';

const originalFeed = { points: 100, lastFeedTime: null, satietyAtFeed: 65 };
const originalShop = { inventory: ['legacy-item'], equipped: { wear: 'legacy-item' }, placements: { 'legacy-item': { x: 12, y: 3, scale: 1 } } };
function fixture(failAt = Infinity) {
  const data = new Map([[feed, JSON.stringify(originalFeed)], [shop, JSON.stringify(originalShop)]]);
  let writes = 0;
  const storage = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { if (++writes === failAt) throw Error('disk full'); data.set(key, value); },
    removeItem: async key => { if (++writes === failAt) throw Error('disk full'); data.delete(key); },
  };
  return { data, open: () => createRecoverableStorage(storage, 'journal', [feed, shop]) };
}
const buy = (store, id = 'ribbon', cost = 50) => store.transaction(values => prepareItemPurchase(values, id, cost, originalFeed));
for (const failAt of [1, 2, 3, 4]) test(`purchase interruption ${failAt}: restart and retry debit exactly once`, async () => {
  const f = fixture(failAt);
  await assert.rejects(buy(f.open()), /disk full/);
  const saved = await buy(f.open());
  assert.equal(saved.feed.points, 50);
  assert.deepEqual(saved.local, { ...originalShop, inventory: ['legacy-item', 'ribbon'] });
  assert.deepEqual(await buy(f.open()), saved);
  assert.equal(f.data.has('journal'), false);
});
test('concurrent purchases recheck ownership and persisted balance', async () => {
  const f = fixture(), store = f.open();
  await Promise.all([buy(store), buy(store), buy(store, 'hat', 40)]);
  assert.equal(JSON.parse(f.data.get(feed)).points, 10);
  assert.deepEqual(JSON.parse(f.data.get(shop)).inventory, ['legacy-item', 'ribbon', 'hat']);
  await assert.rejects(buy(store, 'expensive', 20), /足りません/);
});
test('free items work and malformed data or prices never erase ownership', async () => {
  const f = fixture(), store = f.open();
  await buy(store, 'gift', 0);
  assert.equal(JSON.parse(f.data.get(feed)).points, 100);
  for (const cost of [-1, NaN, Infinity]) await assert.rejects(buy(store, 'bad', cost));
  f.data.set(shop, '{broken');
  await assert.rejects(buy(store));
  assert.equal(f.data.get(shop), '{broken');
  assert.equal(JSON.parse(f.data.get(feed)).points, 100);
});
