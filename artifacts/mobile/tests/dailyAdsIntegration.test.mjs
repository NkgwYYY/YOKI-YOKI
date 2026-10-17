import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require = createRequire(import.meta.url), ts = require('typescript');
const directory = mkdtempSync(join(tmpdir(), 'yoki-connected-ads-'));
mkdirSync(join(directory, 'community'));
for (const name of ['dailyAdPlacements', 'community/dailyAds', 'community/collectBonus']) {
  const source = readFileSync(new URL(`../utils/${name}.ts`, import.meta.url), 'utf8');
  writeFileSync(join(directory, `${name}.js`), ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText);
}
const {createDailyAds} = require(join(directory, 'community/dailyAds.js'));
const {createBonusCollector} = require(join(directory, 'community/collectBonus.js'));
process.on('exit', () => rmSync(directory, {recursive: true, force: true}));
const deferred = () => {let resolve; const promise = new Promise(res => {resolve = res;}); return {promise, resolve};};
function fixture(overrides = {}) {
  let current = true, used = 0, shown = 0, calls = 0;
  const credits = new Set(), reservations = new Map();
  const deps = {
    sessionKey: randomUUID(), current: () => current,
    eligibility: () => ({ready: true, rewarded: true, banner: true, pass: false}),
    collect: async () => {calls++; return {gained: 0, remaining: 3-used, day: '2026-10-17', confirmedIds: [...credits]};},
    pass: async () => false,
    reserve: async (receipt, mode) => {
      if (!reservations.has(receipt)) {if(used===3)throw Error('quota'); used++; reservations.set(receipt, {id:randomUUID(),playerId:randomUUID(),mode,state:mode==='pass'?'earned':'reserved'});}
      const r=reservations.get(receipt); if(mode==='pass') credits.add(r.id); return r;
    },
    present: async r => {shown++; credits.add(r.id); return true;},
    credited: id => credits.has(id), uuid: randomUUID, pause: async () => {}, ...overrides,
  };
  const service=createDailyAds(deps);
  return {service, deps, credits, reservations, switchAccount:()=>{current=false;}, shown:()=>shown, calls:()=>calls};
}

test('HOME, meal and egg-job consume one server quota; the fourth cannot show an ad',async()=>{
  const f=fixture(); await f.service.refresh();
  assert.equal(f.service.getSnapshot().remaining,3);
  for(const place of ['home','meal'])assert.equal((await f.service.watchRewarded(place)).status,'verified');
  assert.equal((await f.service.watchEgg('egg-1792030000000-order1')).status,'verified');
  assert.equal(f.service.getSnapshot().remaining,0);
  assert.equal((await f.service.watchRewarded('street')).status,'unavailable');
  assert.equal(f.shown(),3);
});

test('egg and daily controllers cannot present simultaneously, even after provider remount',async()=>{
  const entered=deferred(), release=deferred();
  const a=fixture({present:async()=>{entered.resolve();return release.promise;}}), b=fixture();
  const request=a.service.watchEgg('egg-1792030000000-order1');await entered.promise;
  assert.equal((await b.service.watchRewarded('meal')).status,'busy');
  release.resolve(false);assert.equal((await request).status,'closed');
  assert.equal((await b.service.watchRewarded('meal')).status,'verified');
});

test('changing accounts during reservation never opens the previous account ad',async()=>{
  const entered=deferred(), release=deferred();
  const f=fixture({reserve:async()=>{entered.resolve();return release.promise;}});
  const request=f.service.watchRewarded('home');await entered.promise;f.switchAccount();
  release.resolve({id:randomUUID(),playerId:randomUUID(),mode:'ad',state:'reserved'});
  assert.equal((await request).status,'session-changed');assert.equal(f.shown(),0);assert.equal(f.service.getSnapshot().ready,false);
});

test('changing accounts during playback never collects through the next account',async()=>{
  const entered=deferred(), release=deferred();
  const f=fixture({present:async()=>{entered.resolve();return release.promise;}});
  const request=f.service.watchRewarded('home');await entered.promise;const calls=f.calls();f.switchAccount();release.resolve(true);
  assert.equal((await request).status,'session-changed');assert.equal(f.calls(),calls);
});

test('an unrelated collected reward cannot verify the current ad; retry polls without replay',async()=>{
  let shown=0;
  const f=fixture({present:async()=>{shown++;return true;}, collect:async()=>({gained:30,remaining:2,day:'2026-10-17',confirmedIds:['another-claim']})});
  assert.equal((await f.service.watchRewarded('meal')).status,'pending');
  assert.equal((await f.service.watchRewarded('home')).status,'pending');
  assert.equal(shown,1);assert.equal(f.service.getSnapshot().phase,'verifying');
  const reservation=[...f.reservations.values()][0];f.credits.add(reservation.id);await f.service.refresh();
  assert.equal(f.service.getSnapshot().phase,'idle');
});

test('closing an ad never fabricates a reward and retries reuse the reservation',async()=>{
  const f=fixture({present:async()=>false});
  assert.equal((await f.service.watchRewarded('home')).status,'closed');
  assert.equal((await f.service.watchRewarded('meal')).status,'closed');
  assert.equal(f.reservations.size,1);assert.equal(f.credits.size,0);assert.equal(f.service.getSnapshot().remaining,2);
});

test('SDK errors release the shared presentation lock',async()=>{
  const f=fixture({present:async()=>{throw Error('SDK');}});
  assert.equal((await f.service.watchRewarded('meal')).status,'error');
  assert.equal((await fixture().service.watchRewarded('home')).status,'verified');
});

test('a pass skips only the egg bonus ad, daily rewards still request an ad',async()=>{
  const f=fixture({eligibility:()=>({ready:true,rewarded:true,banner:true,pass:true}),pass:async()=>true});
  await f.service.refresh();assert.equal(f.service.getSnapshot().removePassiveAds,true);
  assert.equal((await f.service.watchEgg('egg-1792030000000-order1')).status,'verified');assert.equal(f.shown(),0);
  assert.equal((await f.service.watchRewarded('home')).status,'verified');assert.equal(f.shown(),1);
});

for (const remaining of [-1,4,undefined,NaN,'3']) test(`invalid quota ${remaining} fails closed`,async()=>{
  const f=fixture({collect:async()=>({remaining,day:'2026-10-17',confirmedIds:[],gained:0})});
  await f.service.refresh();assert.equal(f.service.getSnapshot().ready,false);assert.equal(f.service.getSnapshot().remaining,null);
  assert.equal((await f.service.watchRewarded('home')).status,'error');assert.equal(f.shown(),0);
});

test('server date rollover and banner no-fill update all placements without a local reset',async()=>{
  let day='2026-10-17',remaining=0;
  const f=fixture({collect:async()=>({remaining,day,confirmedIds:[],gained:0})});
  await f.service.refresh();assert.equal(f.service.getSnapshot().remaining,0);
  day='2026-10-18';remaining=3;await f.service.refresh();assert.equal(f.service.getSnapshot().remaining,3);assert.equal(f.service.getSnapshot().revision,day);
  f.service.bannerError();await f.service.refresh();assert.equal(f.service.getSnapshot().bannerAvailable,false);
});

test('collector rejects a stale account even when no claims are present',async()=>{
  const response=deferred();let current=true,grants=0,acks=0;
  const collect=createBonusCollector({current:()=>current,ready:()=>true,status:()=>response.promise,grant:async()=>{grants++;return 30;},acknowledge:async()=>{acks++;}});
  const request=collect();current=false;response.resolve({claims:[],remaining:3,day:'2026-10-17'});
  await assert.rejects(request);assert.equal(grants,0);assert.equal(acks,0);
});

test('collector deduplicates within a session and a new session uses its own promise',async()=>{
  const response=deferred();let statusCalls=0,grants=0,acks=0;
  const deps={current:()=>true,ready:()=>true,status:()=>{statusCalls++;return response.promise;},grant:async()=>{grants++;return 30;},acknowledge:async()=>{acks++;}};
  const collect=createBonusCollector(deps), a=collect(), b=collect();assert.strictEqual(a,b);
  const newSession=createBonusCollector({...deps,status:async()=>({claims:[],remaining:1,day:'2026-10-17'})});
  assert.equal((await newSession()).remaining,1);
  response.resolve({claims:[{id:randomUUID(),amount:30}],remaining:2,day:'2026-10-17'});
  assert.equal((await a).confirmedIds.length,1);assert.equal(statusCalls,1);assert.equal(grants,1);assert.equal(acks,1);
});

test('storage failure leaves the server claim unacknowledged for recovery',async()=>{
  let acks=0;
  const collect=createBonusCollector({current:()=>true,ready:()=>true,status:async()=>({claims:[{id:randomUUID(),amount:30}],remaining:2,day:'2026-10-17'}),grant:async()=>{throw Error('disk');},acknowledge:async()=>{acks++;}});
  await assert.rejects(collect());assert.equal(acks,0);
});

test('account change during storage cannot acknowledge the previous account reward',async()=>{
  let current=true,acks=0;
  const collect=createBonusCollector({current:()=>current,ready:()=>true,status:async()=>({claims:[{id:randomUUID(),amount:30}],remaining:2,day:'2026-10-17'}),grant:async()=>{current=false;return 30;},acknowledge:async()=>{acks++;}});
  await assert.rejects(collect());assert.equal(acks,0);
});

test('a closed reservation past server expiry is discarded before another ad is requested',async()=>{
  let reserves=0;
  const f=fixture({present:async()=>false,reserve:async()=>{reserves++;return {id:randomUUID(),playerId:randomUUID(),mode:'ad',state:'reserved',expiresAt:'2026-01-01T00:00:00Z'};}});
  assert.equal((await f.service.watchRewarded('home')).status,'closed');
  assert.equal((await f.service.watchRewarded('meal')).status,'closed');
  assert.equal(reserves,2);
});
