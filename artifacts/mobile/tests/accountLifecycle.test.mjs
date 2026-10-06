// Exercise the actual AuthProvider operations with synthetic Clerk/storage/fetch.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { notifyAccountDeletion, subscribeAccountDeletion } from '../utils/accountDeletion.ts';
import { cloudOutboxKey } from '../utils/cloudOutbox.ts';
import { createCloudSyncTransport } from '../utils/cloudSync.ts';
import { createRecoverableStorage } from '../utils/recoverableStorage.ts';
import { APP_STORAGE_KEYS } from '../utils/appStorageKeys.ts';
import { accountCacheKey, LOCAL_DATA_OWNER_KEY } from '../utils/accountOwnership.ts';

const code = ts.transpileModule(fs.readFileSync(new URL('../contexts/AuthContext.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const JOURNAL = '@yoki/balance_journal_v1';
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
function fixture({ body = { ok: true }, status = 200, failLogout = false, failIdentity = false, failStorage = false, token = 'test-token', fetcher, missingUser = false } = {}) {
  const events = [];
  const data = new Map([
    ['@mentore/records_v2', '[{"notes":"synthetic"}]'],
    [JOURNAL, JSON.stringify({ version: 1, entries: [['@mentore/records_v2', '[]']] })],
    [cloudOutboxKey('account-a'), 'own pending snapshot'],
    [cloudOutboxKey('account-b'), 'other pending snapshot'], ['unrelated-key', 'keep'],
  ]);
  const raw = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => data.set(key, value),
    getAllKeys: async () => [...data.keys()],
    removeItem: async key => { if (failStorage) throw Error('disk unavailable'); events.push('remove:' + key); data.delete(key); },
    multiRemove: async keys => { if (failStorage) throw Error('disk unavailable'); for (const key of keys) { events.push('remove:' + key); data.delete(key); } },
  };
  const balanceStorage = createRecoverableStorage(raw, JOURNAL, [...Object.values(APP_STORAGE_KEYS), LOCAL_DATA_OWNER_KEY]);
  const exports = {};
  const hooks = { ...React, useCallback: fn => fn, useRef: initial => ({ current: initial }) };
  new Function('require', 'exports', 'fetch', code)(name => {
    if (name === 'react') return hooks;
    if (name === '@clerk/expo') return {
      useAuth: () => ({ isLoaded: true, isSignedIn: true, getToken: async () => token,
        signOut: async () => { events.push('logout'); if (failLogout) throw Error('offline'); } }),
      useUser: () => ({ user: missingUser ? null : { id: 'account-a', delete: async () => { events.push('identity'); if (failIdentity) throw Error('identity failed'); } } }),
    };
    if (name === '@react-native-async-storage/async-storage') return raw;
    if (name.endsWith('/accountDeletion')) return { notifyAccountDeletion };
    if (name.endsWith('/cloudOutbox')) return { cloudOutboxKey };
    if (name.endsWith('/accountOwnership')) return { accountCacheKey };
    if (name.endsWith('/balanceStorage')) return { balanceStorage, BALANCE_JOURNAL_KEY: JOURNAL };
    if (name.endsWith('/cloudSync')) return { createCloudSyncTransport: options => createCloudSyncTransport({ ...options, fetcher: async (...args) => {
      events.push('api'); return fetcher ? fetcher(...args) : response(body, status);
    }, timeoutMs: 25 }) };
    throw Error(name);
  }, exports, async () => { events.push('api'); return response(body, status); });
  return { operations: exports.AuthProvider({ children: null }).props.value, data, events, balanceStorage };
}

test('logout failure remains visible to the caller instead of looking successful', async () => {
  const f = fixture({ failLogout: true }); await assert.rejects(f.operations.logout());
  assert.ok(f.data.has('@mentore/records_v2'));
});
test('signed-in identity loading is not exposed as a resolved guest', () => {
  assert.equal(fixture({ missingUser: true }).operations.isLoading, true);
});
for (const body of [{ ok: false }, {}, { ok: 'true' }, []]) test('deletion requires an explicit server acknowledgement before deleting identity or local data', async () => {
  const f = fixture({ body }); await assert.rejects(f.operations.deleteAccount());
  assert.deepEqual(f.events, ['api']); assert.ok(f.data.has(JOURNAL));
});
test('failed server request retains identity and all local data', async () => {
  const f = fixture({ status: 500 }); await assert.rejects(f.operations.deleteAccount());
  assert.deepEqual(f.events, ['api']); assert.equal(f.data.size, 5);
});
test('missing token never starts deletion', async () => {
  const f = fixture({ token: null }); await assert.rejects(f.operations.deleteAccount()); assert.deepEqual(f.events, []);
});
test('successful deletion clears the recoverable journal and only this account outbox', async () => {
  const f = fixture(); await f.operations.deleteAccount();
  assert.equal(f.data.has(JOURNAL), false);
  await f.balanceStorage.recover(); assert.equal(f.data.has('@mentore/records_v2'), false);
  assert.equal(f.data.has(cloudOutboxKey('account-a')), false);
  assert.equal(f.data.get(cloudOutboxKey('account-b')), 'other pending snapshot');
  assert.equal(f.data.get('unrelated-key'), 'keep');
});
test('local cleanup failure keeps the identity available for retry', async () => {
  const f = fixture({ failStorage: true }); await assert.rejects(f.operations.deleteAccount());
  assert.equal(f.events.includes('identity'), false);
});
test('duplicate delete calls share the pending operation', async () => {
  const f = fixture(); await Promise.all([f.operations.deleteAccount(), f.operations.deleteAccount()]);
  assert.equal(f.events.filter(event => event === 'identity').length, 1);
  assert.equal(f.events.filter(event => event === 'api').length, 1);
});
test('a hung deletion response times out without deleting identity or local data', async () => {
  const f = fixture({ fetcher: async () => ({ ok: true, json: () => new Promise(() => {}) }) });
  await assert.rejects(f.operations.deleteAccount());
  assert.deepEqual(f.events, ['api']); assert.equal(f.data.size, 5);
});
test('identity-service failure is surfaced after local cleanup without touching other accounts', async () => {
  const f = fixture({ failIdentity: true }); await assert.rejects(f.operations.deleteAccount());
  assert.equal(f.data.has('@mentore/records_v2'), false); assert.equal(f.data.has(JOURNAL), false);
  assert.equal(f.data.get(cloudOutboxKey('account-b')), 'other pending snapshot');
});
test('deletion removes only the deleted account detached cache and the active owner marker', async () => {
  const f = fixture();
  f.data.set(accountCacheKey('account-a'), 'own cache');
  f.data.set(accountCacheKey('account-b'), 'other cache');
  f.data.set(LOCAL_DATA_OWNER_KEY, '{"version":1,"accountId":"account-a"}');
  await f.operations.deleteAccount();
  assert.equal(f.data.has(accountCacheKey('account-a')), false);
  assert.equal(f.data.has(LOCAL_DATA_OWNER_KEY), false);
  assert.equal(f.data.get(accountCacheKey('account-b')), 'other cache');
});


for (const failedAt of ['server','storage','identity',null]) test(`deletion pauses providers before the request and reports server deletion accurately (${failedAt})`, async () => {
  const received = [];
  const stop = subscribeAccountDeletion(event => received.push(event));
  const f = fixture({ status:failedAt === 'server' ? 500 : 200, failStorage:failedAt === 'storage', failIdentity:failedAt === 'identity',
    fetcher: async () => {
      assert.deepEqual(received, [{accountId:'account-a',phase:'start'}]);
      return response({ok:true}, failedAt === 'server' ? 500 : 200);
    } });
  try {
    if (failedAt) await assert.rejects(f.operations.deleteAccount()); else await f.operations.deleteAccount();
    assert.deepEqual(received.at(-1), {accountId:'account-a',phase:'finish',serverDeleted:failedAt !== 'server'});
  } finally { stop(); }
});
