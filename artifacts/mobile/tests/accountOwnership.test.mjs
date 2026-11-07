import assert from 'node:assert/strict';
import test from 'node:test';
import { createRecoverableStorage } from '../utils/recoverableStorage.ts';
import { createAccountOwnership, encodeDataOwner, LOCAL_DATA_OWNER_KEY, accountCacheKey } from '../utils/accountOwnership.ts';

const keys = ['records', 'profile'];
function fixture({ owner = encodeDataOwner('account-a'), failAt = Infinity } = {}) {
  const data = new Map([['records', '[{"notes":"account-a"}]'], ['profile', '{"nickname":"A"}'], ['outbox-b', 'keep']]);
  if (owner !== null) data.set(LOCAL_DATA_OWNER_KEY, owner);
  let writes = 0;
  const raw = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { if (++writes === failAt) throw Error('disk full'); data.set(key, value); },
    removeItem: async key => { if (++writes === failAt) throw Error('disk full'); data.delete(key); },
  };
  const open = () => {
    const storage = createRecoverableStorage(raw, 'journal', [...keys, LOCAL_DATA_OWNER_KEY]);
    return { storage, ownership: createAccountOwnership(storage, keys) };
  };
  return { data, open };
}

test('logout keeps a detached account copy and opens a fresh guest without changing another outbox', async () => {
  const f = fixture(), { ownership } = f.open(); await ownership.prepare(null, () => true);
  assert.equal(await ownership.isGuest(), true); assert.equal(f.data.has('records'), false); assert.equal(f.data.has('profile'), false);
  const cache = JSON.parse(f.data.get(accountCacheKey('account-a')));
  assert.equal(cache.accountId, 'account-a'); assert.equal(JSON.parse(cache.data.records)[0].notes, 'account-a');
  assert.equal(f.data.get('outbox-b'), 'keep');
  await ownership.prepare(null, () => true);
  assert.deepEqual(JSON.parse(f.data.get(accountCacheKey('account-a'))), cache);
});
for (const failAt of [1, 2, 3, 4, 5, 6]) test(`logout interruption ${failAt}: retry keeps the original detached data`, async () => {
  const f = fixture({ failAt }); await assert.rejects(f.open().ownership.prepare(null, () => true));
  if (failAt <= 2) assert.ok(f.data.has('records'));
  const { ownership } = f.open(); await ownership.prepare(null, () => true);
  assert.equal(await ownership.isGuest(), true); assert.equal(f.data.has('records'), false);
  assert.equal(JSON.parse(JSON.parse(f.data.get(accountCacheKey('account-a'))).data.records)[0].notes, 'account-a');
  assert.equal(f.data.get('outbox-b'), 'keep'); assert.equal(f.data.has('journal'), false);
});
test('legacy data is retained and assigned only to its first resolved identity', async () => {
  for (const accountId of [null, 'account-a']) {
    const f = fixture({ owner: null }); const before = f.data.get('records');
    await f.open().ownership.prepare(accountId, () => true);
    assert.equal(f.data.get('records'), before);
    assert.equal(JSON.parse(f.data.get(LOCAL_DATA_OWNER_KEY)).accountId, accountId);
  }
});
test('signing in preserves genuine guest data for the existing merge policy', async () => {
  const f = fixture({ owner: encodeDataOwner(null) }); const { ownership } = f.open();
  await ownership.prepare('account-b', () => true);
  assert.equal(await ownership.isGuest(), true); assert.ok(f.data.has('records'));
});
test('a signed-in account switch does not reclassify the preceding cache as guest', async () => {
  const f = fixture(); const { ownership } = f.open(); await ownership.prepare('account-b', () => true);
  assert.equal(await ownership.isGuest(), false); assert.equal(JSON.parse(f.data.get(LOCAL_DATA_OWNER_KEY)).accountId, 'account-a');
});
test('corrupt ownership blocks migration and preserves the exact data', async () => {
  for (const owner of ['broken', '{}', '{"version":1,"accountId":false}', '{"version":1,"accountId":""}']) {
    const f = fixture({ owner }); const before = [...f.data];
    await assert.rejects(f.open().ownership.prepare(null, () => true)); assert.deepEqual([...f.data], before);
  }
});
test('stale identity cannot adopt or detach a cache', async () => {
  for (const owner of [null, encodeDataOwner('account-a')]) {
    const f = fixture({ owner }); const before = [...f.data];
    await assert.rejects(f.open().ownership.prepare(null, () => false)); assert.deepEqual([...f.data], before);
  }
});
