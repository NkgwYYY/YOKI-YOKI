import assert from 'node:assert/strict';
import test from 'node:test';
import { createCloudOutbox, cloudOutboxKey } from '../utils/cloudOutbox.ts';
import { createCloudSyncSession } from '../utils/cloudSync.ts';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fixture() {
  const map = new Map(); let fail = false;
  const storage = { getItem: async key => map.get(key) ?? null, removeItem: async key => map.delete(key),
    setItem: async (key, value) => { if (fail) throw Error('disk full'); map.set(key, value); } };
  return { map, storage, outbox: createCloudOutbox(storage), fail: value => { fail = value; } };
}

test('pending snapshots survive storage-wrapper restart and remain account-scoped', async () => {
  const f = fixture();
  await f.outbox.stage('account/a', async () => ({ records: ['a'] }));
  await f.outbox.stage('account-b', async () => ({ records: ['b'] }));
  const restarted = createCloudOutbox(f.storage);
  assert.deepEqual((await restarted.read('account/a')).data, { records: ['a'] });
  assert.deepEqual((await restarted.read('account-b')).data, { records: ['b'] });
  assert.equal(await restarted.read('unknown'), null);
  assert.ok(f.map.has('@yoki/cloud_outbox_v1/account%2Fa'));
});

test('acknowledging an earlier upload cannot erase a newer edit or another account', async () => {
  const f = fixture();
  await f.outbox.stage('a', async () => ({ record: 1 }));
  const earlier = await f.outbox.read('a');
  await f.outbox.stage('a', async () => ({ record: 2 }));
  await f.outbox.stage('b', async () => ({ record: 3 }));
  await f.outbox.acknowledge('a', earlier.receipt);
  assert.deepEqual((await f.outbox.read('a')).data, { record: 2 });
  const latest = await f.outbox.read('a'); await f.outbox.acknowledge('a', latest.receipt);
  assert.equal(await f.outbox.read('a'), null); assert.ok(await f.outbox.read('b'));
});

test('a failed outbox write retains the previous durable snapshot', async () => {
  const f = fixture(); await f.outbox.stage('a', async () => ({ record: 1 }));
  f.fail(true); await assert.rejects(f.outbox.stage('a', async () => ({ record: 2 })));
  assert.deepEqual((await f.outbox.read('a')).data, { record: 1 });
});

for (const raw of ['broken json', JSON.stringify({ version: 1, accountId: 'other', data: {} }), JSON.stringify({ version: 1, accountId: 'a', data: [] })]) {
  test('unreadable or mismatched pending data is retained and never treated as empty', async () => {
    const f = fixture(); f.map.set(cloudOutboxKey('a'), raw);
    await assert.rejects(f.outbox.read('a')); assert.equal(f.map.get(cloudOutboxKey('a')), raw);
  });
}

function syncFixture(f, overrides = {}) {
  let local = { record: 'local' }; const states = [], uploads = [], applied = [];
  let pulls = 0;
  const sync = createCloudSyncSession({
    pull: async () => { pulls++; return { record: 'cloud' }; },
    apply: async (data, _current, source) => { applied.push({ data, source }); local = data; return { backup: false }; },
    read: async () => ({ ...local }), push: async data => { uploads.push(data); },
    isCurrent: () => true, onState: state => states.push(state),
    pending: {
      stage: () => f.outbox.stage('a', async () => ({ ...local })),
      read: () => f.outbox.read('a'), acknowledge: receipt => f.outbox.acknowledge('a', receipt),
    }, ...overrides,
  });
  return { sync, states, uploads, applied, edit: data => { local = data; }, pulls: () => pulls };
}

test('restart restores and acknowledges pending data before any cloud pull', async () => {
  const f = fixture(); await f.outbox.stage('a', async () => ({ record: 'unsent' }));
  const s = syncFixture(f);
  assert.equal(await s.sync.initialize(), true);
  assert.equal(s.pulls(), 0); assert.deepEqual(s.uploads, [{ record: 'unsent' }]);
  assert.deepEqual(s.applied, [{ data: { record: 'unsent' }, source: 'outbox' }]);
  assert.equal(await f.outbox.read('a'), null); assert.equal(s.states.at(-1).ready, true);
});

test('offline restart stays gated, retains pending data and retries without a pull', async () => {
  const f = fixture(); await f.outbox.stage('a', async () => ({ record: 'unsent' }));
  let fail = true;
  const s = syncFixture(f, { push: async () => { if (fail) throw Error('offline'); } });
  assert.equal(await s.sync.initialize(), false); assert.equal(s.states.at(-1).ready, false);
  assert.equal(s.applied.length, 0); assert.ok(await f.outbox.read('a'));
  fail = false; assert.equal(await s.sync.retry(), true);
  assert.equal(s.pulls(), 0); assert.equal(await f.outbox.read('a'), null);
});

test('failed local restoration does not clear a server-acknowledged pending snapshot', async () => {
  const f = fixture(); await f.outbox.stage('a', async () => ({ record: 'unsent' }));
  const s = syncFixture(f, { apply: async () => { throw Error('disk full'); } });
  assert.equal(await s.sync.initialize(), false); assert.ok(await f.outbox.read('a'));
  assert.equal(s.states.at(-1).ready, false);
});

test('new edits become durable while an earlier network upload is still waiting', async () => {
  const f = fixture(), first = deferred(), started = deferred();
  const s = syncFixture(f, { push: async () => { started.resolve(); await first.promise; } });
  await s.sync.initialize(); s.edit({ record: 1 }); const a = s.sync.push(); await started.promise;
  s.edit({ record: 2 }); const b = s.sync.push();
  assert.deepEqual((await f.outbox.read('a')).data, { record: 2 });
  s.sync.dispose(); first.resolve(); await Promise.all([a, b]);
  const restart = syncFixture(f); await restart.sync.initialize();
  assert.deepEqual(restart.uploads, [{ record: 2 }]); assert.equal(restart.pulls(), 0);
});

test('failed durable staging reports an upload error without sending an older snapshot', async () => {
  const f = fixture(); const s = syncFixture(f); await s.sync.initialize();
  s.edit({ record: 'new' }); f.fail(true);
  assert.equal(await s.sync.push(), false); assert.equal(s.uploads.length, 0);
  assert.deepEqual(s.states.at(-1), { ready: true, phase: 'idle', error: 'push' });
});
