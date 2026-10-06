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
function fixture({ body = { ok: true }, status = 200, failLogout = false, failIdentity = false, failStorage = false, token = 'test-token', fetcher, missingUser = false, sdk: initialSdk = {}, tokenProvider, allKeys } = {}) {
  const events = [];
  let sdk = { isLoaded: true, isSignedIn: true, userId: 'account-a', sessionId: 'session-a', profileId: missingUser ? null : 'account-a', ...initialSdk };
  const data = new Map([
    ['@mentore/records_v2', '[{"notes":"synthetic"}]'],
    [JOURNAL, JSON.stringify({ version: 1, entries: [['@mentore/records_v2', '[]']] })],
    [cloudOutboxKey('account-a'), 'own pending snapshot'],
    [cloudOutboxKey('account-b'), 'other pending snapshot'], ['unrelated-key', 'keep'],
  ]);
  const raw = {
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => data.set(key, value),
    getAllKeys: async () => allKeys ? allKeys(data) : [...data.keys()],
    removeItem: async key => { if (failStorage) throw Error('disk unavailable'); events.push('remove:' + key); data.delete(key); },
    multiRemove: async keys => { if (failStorage) throw Error('disk unavailable'); for (const key of keys) { events.push('remove:' + key); data.delete(key); } },
  };
  const balanceStorage = createRecoverableStorage(raw, JOURNAL, [...Object.values(APP_STORAGE_KEYS), LOCAL_DATA_OWNER_KEY]);
  const exports = {};
  const refs = []; let cursor = 0;
  const hooks = { ...React, useEffect: () => {}, useCallback: fn => fn, useRef: initial => refs[cursor++] ||= { current: initial } };
  new Function('require', 'exports', 'fetch', code)(name => {
    if (name === 'react') return hooks;
    if (name === '@clerk/expo') return {
      useSession: () => ({session: sdk.sessionId ? {id: sdk.resourceId ?? sdk.sessionId, user:{id:sdk.resourceUserId ?? sdk.userId}, getToken:async()=>tokenProvider ? tokenProvider(sdk) : token} : null}),
      useAuth: () => ({ ...sdk, getToken: async () => tokenProvider ? tokenProvider(sdk) : token,
        signOut: async options => { events.push('logout'); events.push(options); if (failLogout) throw Error('offline'); } }),
      useUser: () => ({ user: !sdk.profileId ? null : { id: sdk.profileId, delete: async () => { events.push('identity'); if (failIdentity) throw Error('identity failed'); } } }),
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
  const render = (next = {}) => { sdk = { ...sdk, ...next }; cursor = 0; return exports.AuthProvider({ children: null }).props.value; };
  return { operations: render(), render, data, events, balanceStorage };
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


const deferred = () => { let resolve; const promise = new Promise(r => {resolve=r;}); return {promise,resolve}; };
for (const sdk of [
  {userId:'account-b',sessionId:'session-b',profileId:'account-a'},
  {userId:'account-a',sessionId:null},
  {isLoaded:false},
  {isSignedIn:undefined},
]) test('unresolved or mismatched SDK identity stays gated and cannot issue tokens/deletion', async () => {
  const f=fixture({sdk});
  assert.equal(f.operations.isLoading,true);assert.equal(f.operations.user,null);
  assert.equal(await f.operations.getToken(),null);
  await assert.rejects(f.operations.deleteAccount());assert.deepEqual(f.events,[]);
});
test('signed-out state never exposes a stale useUser object or token', async () => {
  const f=fixture({sdk:{isSignedIn:false,userId:null,sessionId:null}});
  assert.equal(f.operations.user,null);assert.equal(f.operations.isLoading,false);
  assert.equal(await f.operations.getToken(),null);
});
for (const next of [
  {userId:'account-b',sessionId:'session-b',profileId:'account-b'},
  {sessionId:'another-session-a'},
  {isLoaded:false},
]) test('token acquired across an identity/session transition is discarded', async () => {
  const token=deferred();const f=fixture({tokenProvider:()=>token.promise});
  const pending=f.operations.getToken();f.render(next);token.resolve('must-not-be-used');
  assert.equal(await pending,null);
  assert.equal(await f.operations.getToken(),null);
});
test('returning to the same session does not revalidate an earlier token request', async () => {
  const token=deferred();const f=fixture({tokenProvider:()=>token.promise});
  const pending=f.operations.getToken();f.render({isLoaded:false});f.render({isLoaded:true});token.resolve('old-token');
  assert.equal(await pending,null);
});
test('logout targets the initiating session explicitly', async () => {
  const f=fixture();await f.operations.logout();assert.deepEqual(f.events,['logout',{sessionId:'session-a'}]);
});
test('a stale delete/logout callback cannot act on the new signed-in account', async () => {
  const f=fixture();f.render({userId:'account-b',sessionId:'session-b',profileId:'account-b'});
  await assert.rejects(f.operations.deleteAccount());await assert.rejects(f.operations.logout());assert.deepEqual(f.events,[]);
});
for(const stage of ['token','response','keys']) test(`deletion interrupted at ${stage} cannot clear the new account cache`, async () => {
  const entered=deferred(),release=deferred();
  const f=fixture({tokenProvider:async()=>{if(stage==='token'){entered.resolve();await release.promise;}return 'test-token';},
    fetcher:async()=>{if(stage==='response'){entered.resolve();await release.promise;}return response({ok:true});},
    allKeys:async data=>{if(stage==='keys'){entered.resolve();await release.promise;}return [...data.keys()];}});
  const pending=f.operations.deleteAccount();await entered.promise;
  f.render({userId:'account-b',sessionId:'session-b',profileId:'account-b'});
  f.data.set('@mentore/records_v2','new account record');release.resolve();
  await assert.rejects(pending);assert.equal(f.data.get('@mentore/records_v2'),'new account record');
  assert.equal(f.events.includes('identity'),false);
  if(stage==='token')assert.equal(f.events.includes('api'),false);
});

for(const sdk of [{resourceId:'other-session'},{resourceUserId:'account-b'}]) test('session resource must agree with both auth identity and session ID', async () => {
  const f=fixture({sdk});assert.equal(f.operations.isLoading,true);assert.equal(f.operations.user,null);
  assert.equal(await f.operations.getToken(),null);await assert.rejects(f.operations.deleteAccount());assert.deepEqual(f.events,[]);
});
test('a new account cannot share the preceding account deletion promise', async () => {
  const entered=deferred(),release=deferred();let calls=0;
  const f=fixture({fetcher:async()=>{if(++calls===1){entered.resolve();await release.promise;}return response({ok:true});}});
  const a=f.operations.deleteAccount();await entered.promise;
  const b=f.render({userId:'account-b',sessionId:'session-b',profileId:'account-b'});
  await assert.rejects(b.deleteAccount(),/前のアカウント/);assert.equal(calls,1);
  release.resolve();await assert.rejects(a);await b.deleteAccount();assert.equal(calls,2);
});
