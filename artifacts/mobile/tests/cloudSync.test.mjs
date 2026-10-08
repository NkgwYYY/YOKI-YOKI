import assert from 'node:assert/strict';
import test from 'node:test';
import { createCloudSyncTransport, createCloudSyncSession, AccountDeletedError } from '../utils/cloudSync.ts';
import { createRecoverableStorage } from '../utils/recoverableStorage.ts';
import { APP_STORAGE_KEYS as KEYS } from '../utils/appStorageKeys.ts';

const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const signal = () => new AbortController().signal;
function transport(fetcher, extra = {}) {
  return createCloudSyncTransport({ url: 'https://sync.invalid/api/sync', getToken: async () => 'test-token', fetcher, timeoutMs: 40, ...extra });
}

for (const [label, body, status] of [
  ['HTTP failure', { data: {} }, 500], ['array data', { data: [] }, 200],
  ['null data', { data: null }, 200], ['missing data', {}, 200], ['array envelope', [], 200],
]) test(`pull rejects ${label} before applying anything`, async () => {
  await assert.rejects(transport(async () => response(body, status)).pull(signal()));
});

for (const [label, body, status] of [
  ['HTTP failure', { ok: true }, 500], ['negative acknowledgement', { ok: false }, 200],
  ['missing acknowledgement', {}, 200], ['string acknowledgement', { ok: 'true' }, 200],
]) test(`push rejects ${label}`, async () => {
  await assert.rejects(transport(async () => response(body, status)).push({ saved: 1 }, signal()));
});

test('empty valid cloud is accepted; requests use the session token and current snapshot', async () => {
  const calls = [];
  const api = transport(async (url, init) => { calls.push({ url, ...init }); return response(init.method === 'GET' ? { data: {} } : { ok: true }); });
  assert.deepEqual(await api.pull(signal()), {});
  await api.push({ records: [1] }, signal());
  assert.equal(calls[1].headers.Authorization, 'Bearer test-token');
  assert.deepEqual(JSON.parse(calls[1].body), { data: { records: [1] } });
});

for (const stage of ['token', 'request', 'body']) test(`deadline bounds a hung ${stage}`, async () => {
  const never = new Promise(() => {});
  let requestSignal;
  const api = transport(async (_url, init) => {
    requestSignal = init.signal;
    return stage === 'request' ? never : { ok: true, json: () => never };
  }, stage === 'token' ? { getToken: () => never } : {});
  await assert.rejects(api.pull(signal()), /timed out/);
  if (requestSignal) assert.equal(requestSignal.aborted, true);
});

test('a late token after deadline cannot start a request', async () => {
  const token = deferred(); let calls = 0;
  const api = transport(async () => { calls++; return response({ data: {} }); }, { getToken: () => token.promise });
  await assert.rejects(api.pull(signal()), /timed out/);
  token.resolve('late'); await Promise.resolve(); await Promise.resolve();
  assert.equal(calls, 0);
});

test('cancellation interrupts body reads without waiting for the deadline', async () => {
  const abort = new AbortController();
  const api = transport(async () => ({ ok: true, json: () => new Promise(() => {}) }), { timeoutMs: 10_000 });
  const result = api.pull(abort.signal); abort.abort();
  await assert.rejects(result, /cancelled/);
});

function session(overrides = {}) {
  const states = [], uploads = [];
  let local = { record: 'before' }, pulls = 0, applied = 0, backedUp = 0;
  const sync = createCloudSyncSession({
    pull: async () => { pulls++; return { record: 'cloud' }; },
    apply: async data => { applied++; local = data; return { backup: false }; },
    read: async () => ({ ...local }),
    push: async data => { uploads.push(data); },
    isCurrent: () => true,
    onState: state => states.push(state),
    onGuestBackup: () => backedUp++,
    ...overrides,
  });
  return { sync, states, uploads, edit: value => { local = value; }, local: () => local,
    pulls: () => pulls, applied: () => applied, backedUp: () => backedUp };
}

for (const failMerged of [false, true]) test(`pending account data merges a new guest and acknowledges its upload (failure=${failMerged})`, async () => {
  let local = { account: 'pending' }, pending = { data: local, receipt: 'original' }, fail = failMerged;
  const uploads = [];
  const stage = async () => { pending = { data: { ...local }, receipt: JSON.stringify(local) }; };
  const f = session({
    apply: async data => { local = { ...data, guest: 'new record' }; await stage(); return { backup: true }; },
    read: async () => local,
    push: async data => { uploads.push({ ...data }); if (fail && data.guest) throw Error('offline'); },
    pending: { stage, read: async () => pending, acknowledge: async receipt => { if (pending?.receipt === receipt) pending = null; } },
  });
  assert.equal(await f.sync.initialize(), !failMerged);
  assert.deepEqual(uploads, [{ account: 'pending' }, { account: 'pending', guest: 'new record' }]);
  assert.equal(f.pulls(), 0);
  if (failMerged) {
    assert.equal(f.backedUp(), 0); assert.equal(pending.data.guest, 'new record');
    assert.equal(f.states.at(-1).error, 'push'); fail = false; assert.equal(await f.sync.retry(), true);
  }
  assert.equal(pending, null); assert.equal(f.backedUp(), 1);
});

test('failed pull stays gated and blocks uploads; retry applies the cloud once', async () => {
  let fail = true;
  const f = session({ pull: async () => { if (fail) throw Error('offline'); return { record: 'cloud' }; } });
  assert.equal(await f.sync.initialize(), false);
  assert.deepEqual(f.states.at(-1), { ready: false, phase: 'idle', error: 'pull' });
  assert.equal(await f.sync.push(), false);
  assert.equal(f.applied(), 0); assert.deepEqual(f.local(), { record: 'before' });
  fail = false; assert.equal(await f.sync.retry(), true); assert.equal(f.applied(), 1);
});

test('storage or hydration failure never authorizes onboarding', async () => {
  const f = session({ apply: async () => { throw Error('storage unavailable'); } });
  assert.equal(await f.sync.initialize(), false);
  assert.equal(f.states.at(-1).ready, false); assert.equal(f.states.at(-1).error, 'pull');
});

test('failed upload retry sends latest local edits and never downloads over them', async () => {
  const sent = []; let fail = true;
  const f = session({ push: async data => { sent.push(data); if (fail) throw Error('500'); } });
  await f.sync.initialize(); f.edit({ record: 'first local edit' });
  assert.equal(await f.sync.push(), false);
  assert.deepEqual(f.states.at(-1), { ready: true, phase: 'idle', error: 'push' });
  f.edit({ record: 'latest local edit' }); fail = false;
  assert.equal(await f.sync.retry(), true);
  assert.deepEqual(sent, [{ record: 'first local edit' }, { record: 'latest local edit' }]);
  assert.equal(f.pulls(), 1); assert.equal(f.applied(), 1);
});

test('queued uploads take their snapshot after the preceding upload completes', async () => {
  const first = deferred(), started = deferred(), sent = [];
  const f = session({ push: async data => { sent.push(data); if (sent.length === 1) { started.resolve(); await first.promise; } } });
  await f.sync.initialize(); f.edit({ record: 1 }); const a = f.sync.push(); await started.promise;
  f.edit({ record: 2 }); const b = f.sync.push(); f.edit({ record: 3 });
  first.resolve(); await Promise.all([a, b]);
  assert.deepEqual(sent, [{ record: 1 }, { record: 3 }]);
});

test('guest backup event waits for an acknowledged upload, including retry', async () => {
  let fail = true;
  const f = session({ apply: async () => ({ backup: true }), push: async () => { if (fail) throw Error('failed'); } });
  assert.equal(await f.sync.initialize(), false); assert.equal(f.backedUp(), 0);
  fail = false; await f.sync.retry(); await f.sync.push();
  assert.equal(f.backedUp(), 1);
});

for (const change of ['dispose', 'identity']) test(`late pull after ${change} cannot apply data or publish state`, async () => {
  const delayed = deferred(), started = deferred(); let current = true;
  const f = session({ pull: async () => { started.resolve(); return delayed.promise; }, isCurrent: () => current });
  const result = f.sync.initialize(); await started.promise;
  if (change === 'dispose') f.sync.dispose(); else current = false;
  const count = f.states.length; delayed.resolve({ record: 'stale account' }); await result;
  assert.equal(f.applied(), 0); assert.equal(f.states.length, count);
});

test('duplicate initial retries share one request', async () => {
  const delayed = deferred(); let pulls = 0;
  const f = session({ pull: () => { pulls++; return delayed.promise; } });
  const a = f.sync.initialize(), b = f.sync.retry(); delayed.resolve({}); await Promise.all([a, b]);
  assert.equal(pulls, 1); assert.equal(f.applied(), 1);
});

test('cloud hydration journal recovers the whole snapshot after an interrupted write', async () => {
  const map = new Map([[KEYS.PROFILE, 'old profile'], [KEYS.RECORDS, 'old records']]);
  let fail = true;
  const storage = { getItem: async key => map.get(key) ?? null, removeItem: async key => map.delete(key),
    setItem: async (key, value) => { if (fail && key === KEYS.RECORDS) throw Error('disk full'); map.set(key, value); } };
  const journal = '@yoki/test-journal';
  const data = createRecoverableStorage(storage, journal, Object.values(KEYS));
  await assert.rejects(data.transaction(() => ({ entries: [[KEYS.PROFILE, 'new profile'], [KEYS.RECORDS, 'new records']], result: undefined })));
  assert.ok(map.has(journal));
  fail = false;
  const restarted = createRecoverableStorage(storage, journal, Object.values(KEYS));
  assert.equal(await restarted.getItem(KEYS.RECORDS), 'new records');
  assert.equal(await restarted.getItem(KEYS.PROFILE), 'new profile'); assert.equal(map.has(journal), false);
});


for (const method of ['pull', 'push']) test(`confirmed deleted account terminates ${method} and cannot retry synchronization`, async () => {
  const api = transport(async () => response({ code: 'ACCOUNT_DELETED' }, 410));
  const f = session({ [method]: method === 'pull' ? api.pull : api.push });
  await f.sync.initialize();
  if (method === 'push') await f.sync.push();
  assert.deepEqual(f.states.at(-1), { ready: false, phase: 'idle', error: 'deleted' });
  const states = f.states.length;
  assert.equal(await f.sync.retry(), false); assert.equal(await f.sync.push(), false);
  assert.equal(f.states.length, states);
});
test('only a recognized 410 response is terminal; unknown 410 and matching 500 remain retryable', async () => {
  for (const [body, status] of [[{code:'OTHER'},410], [{code:'ACCOUNT_DELETED'},500]]) {
    await assert.rejects(transport(async () => response(body, status)).pull(signal()), error => !(error instanceof AccountDeletedError));
  }
});
test('hung 410 error bodies remain bounded by the transport deadline', async () => {
  await assert.rejects(transport(async () => ({ ok:false, status:410, json:()=>new Promise(()=>{}) })).pull(signal()), /timed out/);
});
