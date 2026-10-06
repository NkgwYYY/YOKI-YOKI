import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateCacheStore, privateCacheKey, PRIVATE_CACHE_KEYS as K, PRIVATE_CACHE_MIGRATION_KEY as M } from '../utils/privateCache.ts';
import { LOCAL_DATA_OWNER_KEY as OWNER, encodeDataOwner } from '../utils/accountOwnership.ts';
import { APP_STORAGE_KEYS } from '../utils/appStorageKeys.ts';
const current = () => true;
function fixture(initial = []) {
  const data = new Map(initial); let failAt = 0, mutations = 0;
  const before = () => { if (++mutations === failAt) throw Error('Interrupted disk operation'); };
  const raw = { getItem: async k => data.get(k) ?? null,
    setItem: async (k,v) => { before(); data.set(k,v); }, removeItem: async k => { before(); data.delete(k); } };
  return { data, raw, store: createPrivateCacheStore(raw, OWNER), failAt: n => { mutations = 0; failAt = n; } };
}
const legacy = [[K.CHAT, '[{"content":"original bytes"}]'], [K.INSIGHT,'legacy insight'], [K.HOME_COMMENT,'legacy comment']];
test('private content and migration metadata are excluded from cloud keys', () => {
  for (const key of [...Object.values(K), M, privateCacheKey('a'), privateCacheKey(null)]) assert.ok(!Object.values(APP_STORAGE_KEYS).includes(key));
  assert.notEqual(privateCacheKey('guest'), privateCacheKey(null));
  assert.notEqual(privateCacheKey('a/b'), privateCacheKey('a%2Fb'));
});
test('legacy bytes follow the recorded old owner before a different identity opens', async () => {
  const f = fixture([[OWNER, encodeDataOwner('a')], ...legacy]);
  const b = await f.store.open('b',current); assert.equal(await b.getItem(K.CHAT),null);
  const a = await f.store.open('a',current);
  for (const [key,value] of legacy) { assert.equal(await a.getItem(key),value); assert.equal(f.data.has(key),false); }
});
test('unmarked legacy data follows the first resolved identity; guest is preserved separately', async () => {
  const f = fixture(legacy); const guest = await f.store.open(null,current);
  const a = await f.store.open('a',current); assert.equal(await a.getItem(K.CHAT),null);
  assert.equal(await guest.getItem(K.CHAT),legacy[0][1]);
  await a.setItem(K.CHAT,'account a'); assert.equal(await guest.getItem(K.CHAT),legacy[0][1]);
});
for (let step=1;step<=6;step++) test(`legacy migration interrupted at mutation ${step} resumes under its original owner`, async () => {
  const f=fixture([[OWNER,encodeDataOwner('a')],...legacy]); f.failAt(step);
  await assert.rejects(f.store.open('a',current)); f.failAt(0);
  // A durable migration must not be reassigned if the app restarts signed out.
  if(step>1) f.data.set(OWNER,encodeDataOwner(null));
  const restarted=createPrivateCacheStore(f.raw,OWNER); const guest=await restarted.open(null,current);
  assert.equal(await guest.getItem(K.CHAT),null);
  const a=await restarted.open('a',current);
  for(const [key,value] of legacy) assert.equal(await a.getItem(key),value);
  assert.deepEqual(JSON.parse(f.data.get(M)),{version:1,complete:true});
});
test('stale reads, queued writes and clears cannot operate after an identity change', async () => {
  const f=fixture(); let active=true; const a=await f.store.open('a',()=>active);
  const pending=a.setItem(K.CHAT,'stale'); active=false;
  await assert.rejects(pending); await assert.rejects(a.getItem(K.CHAT)); await assert.rejects(a.removeItem(K.CHAT));
  assert.equal(f.data.has(privateCacheKey('a')),false);
});
test('late read is rejected even if identity changes while storage is pending', async () => {
  const f=fixture(); let release, active=true;
  const raw={...f.raw,getItem:async k=>{if(k===privateCacheKey('a')) await new Promise(r=>release=r);return f.raw.getItem(k);}};
  const store=createPrivateCacheStore(raw,OWNER),a=await store.open('a',()=>active);
  const pending=a.getItem(K.CHAT); while(!release)await new Promise(r=>setImmediate(r)); active=false;release();
  await assert.rejects(pending);
});
test('concurrent writes to distinct private fields do not lose either field', async () => {
  const f=fixture(),a=await f.store.open('a',current);
  await Promise.all([a.setItem(K.CHAT,'chat'),a.setItem(K.INSIGHT,'insight')]);
  assert.equal(await a.getItem(K.CHAT),'chat');assert.equal(await a.getItem(K.INSIGHT),'insight');
  await a.removeItem(K.CHAT);assert.equal(await a.getItem(K.INSIGHT),'insight');
});
test('deletion serializes after an already-started write and prevents queued/restart recreation', async () => {
  const f=fixture();let release,hold=true;
  const raw={...f.raw,setItem:async(k,v)=>{if(k===privateCacheKey('a')&&hold)await new Promise(r=>release=r);return f.raw.setItem(k,v);}};
  const store=createPrivateCacheStore(raw,OWNER),a=await store.open('a',current);
  const writing=a.setItem(K.CHAT,'in flight');while(!release)await new Promise(r=>setImmediate(r));
  const deleting=store.deleteAccount('a',current),late=a.setItem(K.INSIGHT,'late');hold=false;release();
  await writing;await deleting;await assert.rejects(late);assert.equal(a.isCurrent(),false);
  const restarted=await createPrivateCacheStore(raw,OWNER).open('a',current);
  await assert.rejects(restarted.getItem(K.CHAT));await assert.rejects(restarted.setItem(K.CHAT,'revive'));
  assert.deepEqual(JSON.parse(f.data.get(privateCacheKey('a'))),{version:1,accountId:'a',data:{},deleted:true});
});
test('deletion preserves the other account and guest; repetition is safe', async () => {
  const f=fixture([[OWNER,encodeDataOwner('a')],...legacy]);
  const b=await f.store.open('b',current),g=await f.store.open(null,current);
  await b.setItem(K.CHAT,'b');await g.setItem(K.CHAT,'guest');
  await f.store.deleteAccount('a',current);await f.store.deleteAccount('a',current);
  assert.equal(await b.getItem(K.CHAT),'b');assert.equal(await g.getItem(K.CHAT),'guest');
});
test('failed deletion blocks old leases and can be retried without content recovery', async () => {
  const f=fixture(),a=await f.store.open('a',current);await a.setItem(K.CHAT,'a');f.failAt(1);
  await assert.rejects(f.store.deleteAccount('a',current));await assert.rejects(a.setItem(K.CHAT,'late'));
  f.failAt(0);await f.store.deleteAccount('a',current);assert.equal(f.data.get(privateCacheKey('a')).includes('late'),false);
});
test('stale deletion never changes the next account or the prior cache', async () => {
  const f=fixture(),a=await f.store.open('a',current);await a.setItem(K.CHAT,'a');const before=new Map(f.data);
  await assert.rejects(f.store.deleteAccount('a',()=>false));assert.deepEqual(f.data,before);
});
for(const bad of ['broken','{"version":99}',JSON.stringify({version:1,accountId:'a',data:{unknown:'private'}})]) test('invalid migration fails closed without losing original bytes: '+bad,async()=>{
  const f=fixture([[M,bad],...legacy]);const before=new Map(f.data);await assert.rejects(f.store.open('a',current));assert.deepEqual(f.data,before);
});
test('conflicting destination and legacy history remain untouched for recovery',async()=>{
  const f=fixture([[OWNER,encodeDataOwner('a')],...legacy,[privateCacheKey('a'),JSON.stringify({version:1,accountId:'a',data:{[K.CHAT]:'different'}})]]);
  const before=new Map(f.data);await assert.rejects(f.store.open('b',current));assert.deepEqual(f.data,before);
});
