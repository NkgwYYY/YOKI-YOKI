import assert from 'node:assert/strict';
import test from 'node:test';
import { createRecoverableStorage } from '../utils/recoverableStorage.ts';
import { prepareRhythmReward, RHYTHM_STATE_KEY as game } from '../utils/rhythmReward.ts';
const feed = '@mentore/feed_state_v1', today = '2026-09-29';
const initialFeed = { points: 100, lastFeedTime: null, satietyAtFeed: 65 };
function fixture(failAt = Infinity) {
  const data = new Map([[feed, JSON.stringify(initialFeed)]]); let writes = 0;
  const storage = { getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { if (++writes === failAt) throw Error('disk full'); data.set(key, value); },
    removeItem: async key => { if (++writes === failAt) throw Error('disk full'); data.delete(key); } };
  return { data, open: () => createRecoverableStorage(storage, 'journal', [game, feed]) };
}
const claim = (store, id = 'play-1') => store.transaction(values => prepareRhythmReward(values, id, 'noon', 3, today, initialFeed, 2));
for (const failAt of [1, 2, 3, 4]) test(`rhythm interruption ${failAt}: count and points recover together`, async () => {
  const f = fixture(failAt); await assert.rejects(claim(f.open()));
  const recovered = await claim(f.open());
  assert.equal(recovered.feed.points, 103); assert.equal(recovered.game.noon, 1);
  assert.equal((await claim(f.open())).earned, 3);
  assert.equal(JSON.parse(f.data.get(feed)).points, 103);
  assert.equal(f.data.has('journal'), false);
});
test('concurrent duplicate, second play and capped practice preserve the two-play limit', async () => {
  const f = fixture(), store = f.open();
  await Promise.all([claim(store), claim(store), claim(store, 'play-2')]);
  const practice = await claim(store, 'play-3');
  assert.equal(practice.earned, 0); assert.equal(practice.feed.points, 106); assert.equal(practice.game.noon, 2);
  assert.equal((await claim(store)).earned, 3);
});
test('legacy boolean counts and day rollover remain compatible', async () => {
  const f = fixture(); f.data.set(game, JSON.stringify({ date: today, noon: true, morning: false, night: false }));
  assert.equal((await claim(f.open())).game.noon, 2);
  const next = await f.open().transaction(values => prepareRhythmReward(values, 'next-day', 'noon', 1, '2026-09-30', initialFeed, 2));
  assert.equal(next.game.noon, 1); assert.equal(next.feed.points, 104);
  const retry = await f.open().transaction(values => prepareRhythmReward(values, 'play-1', 'noon', 3, '2026-09-30', initialFeed, 2));
  assert.equal(retry.earned, 3); assert.equal(retry.feed.points, 104); assert.equal(retry.game.noon, 1);
});
