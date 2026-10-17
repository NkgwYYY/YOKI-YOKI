import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const directory = mkdtempSync(join(tmpdir(), 'yoki-ad-store-'));
for (const name of ['dailyAdPlacements', 'dailyAdStore']) {
  const source = readFileSync(new URL(`../utils/${name}.ts`, import.meta.url), 'utf8');
  const result = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}, reportDiagnostics: true});
  assert.equal(result.diagnostics?.length ?? 0, 0);
  writeFileSync(join(directory, `${name}.js`), result.outputText);
}
const {createDailyAdStore} = require(join(directory, 'dailyAdStore.js'));
const {DISCONNECTED_DAILY_ADS, readDailyAdSnapshot, dailyAdPresentation, canWatchDailyAd,
  createDailyRewardGate} = require(join(directory, 'dailyAdPlacements.js'));
process.on('exit', () => rmSync(directory, {recursive: true, force: true}));
const state = overrides => ({sessionKey: 'A', revision: 'period-1', ready: true,
  remaining: 3, rewardedAvailable: true, bannerAvailable: true,
  removePassiveAds: false, phase: 'idle', ...overrides});
const environment = {screenActive: true, foreground: true, obscured: false,
  interacting: false, keyboardOpen: false, width: 390, height: 844};
const source = (getSnapshot = () => state()) => ({getSnapshot, subscribe: () => () => {}});
const deferred = () => {let resolve; const promise = new Promise(res => {resolve = res;}); return {promise, resolve};};

for (const [label, raw] of [
  ['null', null], ['undefined', undefined], ['number', 3], ['empty', {}],
  ['unknown phase', state({phase: 'complete'})], ['numeric ready', state({ready: 1})],
  ['string quota', state({remaining: '3'})], ['missing quota', state({remaining: undefined})],
  ['invalid cap', state({remaining: 4})], ['empty identity', state({sessionKey: ''})],
  ['whitespace identity', state({sessionKey: '  '})], ['whitespace period', state({revision: '  '})],
  ['missing entitlement', state({removePassiveAds: undefined})],
  ['truthy banner availability', state({bannerAvailable: 'yes'})],
  ['truthy rewarded availability', state({rewardedAvailable: 'yes'})],
  ['throwing getter', {get sessionKey() {throw Error('SDK getter');}}],
]) {
  test(`malformed store state ${label} hides ads rather than breaking the scene`, async () => {
    assert.strictEqual(readDailyAdSnapshot(raw), DISCONNECTED_DAILY_ADS);
    const store = createDailyAdStore(source(() => raw));
    assert.strictEqual(store.getSnapshot(), DISCONNECTED_DAILY_ADS);
    assert.equal(dailyAdPresentation('home', raw, environment).banner, false);
    assert.equal(canWatchDailyAd(raw), false);
    const gate = createDailyRewardGate();
    assert.equal((await gate.watch({getSnapshot: () => raw,
      watchRewarded: () => {throw Error('must not open');}}, 'home')).status, 'unavailable');
  });
}

test('same logical snapshots are cached even when the adapter creates a new object each time', () => {
  const store = createDailyAdStore(source());
  const first = store.getSnapshot();
  for (let i = 0; i < 200; i++) assert.strictEqual(store.getSnapshot(), first);
  assert.equal(Object.isFrozen(first), true);
});

test('mutable source cannot mutate a previously published snapshot', () => {
  const mutable = state(); const store = createDailyAdStore(source(() => mutable));
  const before = store.getSnapshot(); mutable.remaining = 2;
  const after = store.getSnapshot();
  assert.notStrictEqual(before, after); assert.equal(before.remaining, 3); assert.equal(after.remaining, 2);
  assert.strictEqual(after, store.getSnapshot());
});

test('copy only the placement fields; unrelated sensitive properties are never propagated', () => {
  const snapshot = readDailyAdSnapshot({...state(), notes: 'private diary', bloodType: 'A'});
  assert.equal(Object.hasOwn(snapshot, 'notes'), false);
  assert.equal(Object.hasOwn(snapshot, 'bloodType'), false);
});

test('read failures hide only ads and a subsequent valid snapshot recovers', () => {
  let failing = false;
  const store = createDailyAdStore(source(() => {if (failing) throw Error('SDK read'); return state();}));
  assert.equal(store.getSnapshot().ready, true); failing = true;
  assert.strictEqual(store.getSnapshot(), DISCONNECTED_DAILY_ADS); failing = false;
  assert.equal(store.getSnapshot().ready, true);
});

test('all placements share one upstream subscription and the final cleanup disconnects once', () => {
  let subscriptions = 0, cleanups = 0, notify, a = 0, b = 0;
  const store = createDailyAdStore({getSnapshot: () => state(), subscribe: listener => {
    subscriptions++; notify = listener; return () => {cleanups++;};
  }});
  const offA = store.subscribe(() => a++), offB = store.subscribe(() => b++);
  assert.equal(subscriptions, 1); notify(); assert.equal(a, 1); assert.equal(b, 1);
  offA(); offA(); notify(); assert.equal(a, 1); assert.equal(b, 2); assert.equal(cleanups, 0);
  offB(); offB(); assert.equal(cleanups, 1); notify(); assert.equal(b, 2);
});

test('identical callbacks are independent registrations', () => {
  let notify, calls = 0;
  const store = createDailyAdStore({getSnapshot: () => state(), subscribe: listener => {notify = listener; return () => {};}});
  const callback = () => calls++;
  const first = store.subscribe(callback), second = store.subscribe(callback);
  notify(); assert.equal(calls, 2); first(); notify(); assert.equal(calls, 3); second();
});

test('stale callbacks from a closed subscription cannot reach a remounted screen', () => {
  const callbacks = []; let calls = 0;
  const store = createDailyAdStore({getSnapshot: () => state(), subscribe: listener => {callbacks.push(listener); return () => {};}});
  const old = store.subscribe(() => calls++); old();
  const current = store.subscribe(() => calls++);
  callbacks[0](); assert.equal(calls, 0); callbacks[1](); assert.equal(calls, 1); current();
});

test('subscription failure is contained, hidden, and may retry only on a later subscription lifecycle', () => {
  let failing = true, notices = 0;
  const store = createDailyAdStore({getSnapshot: () => state(), subscribe: () => {
    if (failing) throw Error('SDK subscription'); return () => {};
  }});
  const first = store.subscribe(() => notices++);
  assert.equal(notices, 1); assert.strictEqual(store.getSnapshot(), DISCONNECTED_DAILY_ADS);
  first(); failing = false;
  const second = store.subscribe(() => notices++);
  assert.equal(store.getSnapshot().ready, true); second();
});

test('invalid cleanup function fails closed and late service emissions are ignored', () => {
  let emit, calls = 0;
  const store = createDailyAdStore({getSnapshot: () => state(), subscribe: listener => {emit = listener; return null;}});
  const off = store.subscribe(() => calls++);
  assert.strictEqual(store.getSnapshot(), DISCONNECTED_DAILY_ADS); assert.equal(calls, 1);
  emit(); assert.equal(calls, 1); assert.doesNotThrow(off);
});

test('cleanup exceptions cannot break navigation; repeated cleanup is inert', () => {
  let stops = 0;
  const store = createDailyAdStore({getSnapshot: () => state(), subscribe: () => () => {stops++; throw Error('SDK cleanup');}});
  const off = store.subscribe(() => {});
  assert.doesNotThrow(off); assert.doesNotThrow(off); assert.equal(stops, 1);
});

test('removing a subscriber inside another callback does not deliver to the removed subscriber', () => {
  let emit, secondCalls = 0, offSecond;
  const store = createDailyAdStore({getSnapshot: () => state(), subscribe: listener => {emit = listener; return () => {};}});
  const offFirst = store.subscribe(() => offSecond());
  offSecond = store.subscribe(() => secondCalls++);
  emit(); assert.equal(secondCalls, 0); offFirst();
});

test('server rendering always has an inert stable snapshot and never accesses the service', () => {
  let reads = 0;
  const store = createDailyAdStore(source(() => {reads++; return state();}));
  assert.strictEqual(store.getServerSnapshot(), DISCONNECTED_DAILY_ADS);
  assert.strictEqual(store.getServerSnapshot(), store.getServerSnapshot()); assert.equal(reads, 0);
});

test('without a binding subscriptions and reads remain inert', () => {
  const store = createDailyAdStore(null);
  const off = store.subscribe(() => {throw Error('must not notify');});
  assert.strictEqual(store.getSnapshot(), DISCONNECTED_DAILY_ADS); assert.doesNotThrow(off);
});

test('a mutable in-flight identity cannot attribute a late reward to the new session', async () => {
  const mutable = state(), wait = deferred(), gate = createDailyRewardGate();
  const result = gate.watch({getSnapshot: () => mutable, watchRewarded: () => wait.promise}, 'meal');
  mutable.sessionKey = 'B'; wait.resolve({status: 'verified', receiptId: 'ssv-A', points: 30});
  assert.equal((await result).status, 'session-changed'); assert.equal(gate.isBusy(), false);
});

test('JSX source places the SDK-rendering child inside the ad-only boundary (not a native rendering test)', () => {
  const ui = readFileSync(new URL('../components/ads/DailyAdPlacements.tsx', import.meta.url), 'utf8');
  assert.match(ui, /<AdBannerBoundary[^>]*>\s*<AdBannerContent/);
  assert.match(ui, /static getDerivedStateFromError\(\)/);
  assert.match(ui, /this\.state\.failed \? null : this\.props\.children/);
  assert.match(ui, /useSyncExternalStore\(store\.subscribe, store\.getSnapshot, store\.getServerSnapshot\)/);
  assert.match(ui, /const busy = localBusy \|\| snapshot\.phase !== 'idle'/);
});
