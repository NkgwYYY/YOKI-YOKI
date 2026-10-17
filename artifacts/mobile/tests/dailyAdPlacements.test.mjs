import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const directory = mkdtempSync(join(tmpdir(), 'yoki-ad-placement-'));
const source = readFileSync(new URL('../utils/dailyAdPlacements.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}, reportDiagnostics: true});
assert.equal(output.diagnostics?.length ?? 0, 0);
writeFileSync(join(directory, 'placements.cjs'), output.outputText);
const {DAILY_AD_POINTS, DAILY_AD_LIMIT, BANNER_RAIL_HEIGHT, DISCONNECTED_DAILY_ADS,
  sharedAdRemaining, canWatchDailyAd, dailyAdPresentation, createDailyRewardGate,
  dailyAdResultMessage, isDailyAdPlacement} = require(join(directory, 'placements.cjs'));
process.on('exit', () => rmSync(directory, {recursive: true, force: true}));

const state = overrides => ({sessionKey: 'session-A', revision: '2026-10-16', ready: true,
  remaining: 3, rewardedAvailable: true, bannerAvailable: true,
  removePassiveAds: false, phase: 'idle', ...overrides});
const environment = overrides => ({screenActive: true, foreground: true, obscured: false,
  interacting: false, keyboardOpen: false, width: 390, height: 844, ...overrides});
const model = (placement = 'home', snapshot = state(), env = environment()) => dailyAdPresentation(placement, snapshot, env);
const deferred = () => {let resolve, reject; const promise = new Promise((res, rej) => {resolve = res; reject = rej;}); return {promise, resolve, reject};};
const verified = {status: 'verified', receiptId: 'ssv-receipt-1', points: 30};

test('policy retains 30pt and one shared three-view daily allowance', () => {
  assert.equal(DAILY_AD_POINTS, 30); assert.equal(DAILY_AD_LIMIT, 3);
  for (const placement of ['home', 'street', 'meal', 'egg-job']) {
    assert.equal(model(placement, state({remaining: 1})).remaining, 1);
    assert.match(model(placement).rewardDetail, /全画面で共通/);
  }
});

test('no provider: no placeholders, rewards, banner or reserved blank space', () => {
  const result = model('home', DISCONNECTED_DAILY_ADS);
  assert.equal(result.banner, false); assert.equal(result.reward, false);
  assert.equal(result.canWatch, false); assert.equal(result.railHeight, 0);
});

for (const count of [null, undefined, -1, 4, 1.5, NaN, Infinity, '3']) {
  test(`invalid or unknown shared allowance fails closed: ${String(count)}`, () => {
    assert.equal(sharedAdRemaining(state({remaining: count})), null);
    assert.equal(canWatchDailyAd(state({remaining: count})), false);
    assert.equal(model('meal', state({remaining: count})).reward, false);
  });
}
for (const count of [0, 1, 2, 3]) {
  test(`valid allowance ${count} uses exactly the shared value`, () => {
    assert.equal(sharedAdRemaining(state({remaining: count})), count);
    assert.equal(canWatchDailyAd(state({remaining: count})), count > 0);
  });
}
for (const override of [{ready: false}, {sessionKey: ''}, {revision: ''}]) {
  test(`unloaded/invalid identity or quota epoch: ${JSON.stringify(override)}`, () => {
    assert.equal(sharedAdRemaining(state(override)), null);
    assert.equal(canWatchDailyAd(state(override)), false);
  });
}

test('at the cap no new ad; ordinary feed is not made conditional on the reward', () => {
  const result = model('meal', state({remaining: 0}));
  assert.equal(result.reward, true); assert.equal(result.canWatch, false);
  assert.match(result.rewardLabel, /受け取り済み/);
  assert.equal(result.banner, false);
});

for (const placement of ['home', 'street']) {
  test(`${placement} has the reserved passive banner and optional reward action`, () => {
    assert.equal(model(placement).banner, true);
    assert.equal(model(placement).railHeight, BANNER_RAIL_HEIGHT);
    assert.equal(model(placement).canWatch, true);
  });
}
for (const placement of ['meal', 'egg-job']) {
  test(`${placement} does not put a passive banner next to food/game controls`, () => {
    assert.equal(model(placement).banner, false);
    assert.equal(model(placement).railHeight, 0);
    assert.equal(model(placement).canWatch, true);
  });
}
for (const placement of ['diary', 'chat', 'fortune', undefined]) {
  test(`non-allowlisted screen ${placement} never shows an ad`, () => {
    assert.equal(isDailyAdPlacement(placement), false);
    assert.equal(model(placement ?? null).banner, false);
    assert.equal(model(placement ?? null).reward, false);
  });
}
for (const [field, value] of [['screenActive', false], ['foreground', false], ['obscured', true], ['interacting', true], ['keyboardOpen', true]]) {
  test(`hide during ${field}=${value}`, () => {
    const result = model('home', state(), environment({[field]: value}));
    assert.equal(result.banner, false); assert.equal(result.reward, false);
    assert.equal(result.railHeight, 0);
  });
}
for (const size of [{width: 320, height: 568}, {width: 351, height: 844}, {width: 390, height: 639},
  {width: 844, height: 390}, {width: NaN, height: 844}, {width: 390, height: Infinity}]) {
  test(`no unsafe banner geometry: ${JSON.stringify(size)}`, () => {
    assert.equal(model('home', state(), environment(size)).banner, false);
  });
}

test('minimum reserved banner geometry has padding and keeps native creative intact', () => {
  assert.equal(model('home', state(), environment({width: 352, height: 640})).banner, true);
  assert.ok(BANNER_RAIL_HEIGHT >= 50 + 12 + 20);
});

test('ad-free entitlement hides passive ads but not optional reward offers', () => {
  const result = model('home', state({removePassiveAds: true}));
  assert.equal(result.banner, false); assert.equal(result.canWatch, true);
});

test('no-fill hides the banner without inventing a fake revenue impression', () => {
  const result = model('home', state({bannerAvailable: false, rewardedAvailable: false}));
  assert.equal(result.banner, false); assert.equal(result.reward, false);
});
for (const phase of ['loading', 'playing', 'verifying']) {
  test(`${phase} blocks passive ads and another video request`, () => {
    assert.equal(model('home', state({phase})).banner, false);
    assert.equal(model('home', state({phase})).canWatch, false);
  });
}

test('one gate rejects same-button and cross-screen rapid presses', async () => {
  const gate = createDailyRewardGate(); const wait = deferred(); let calls = 0;
  const binding = {getSnapshot: () => state(), watchRewarded: () => {calls++; return wait.promise;}};
  const first = gate.watch(binding, 'home');
  assert.equal(gate.isBusy(), true);
  assert.deepEqual(await gate.watch(binding, 'home'), {status: 'busy'});
  assert.deepEqual(await gate.watch(binding, 'meal'), {status: 'busy'});
  wait.resolve(verified);
  assert.deepEqual(await first, verified); assert.equal(calls, 1); assert.equal(gate.isBusy(), false);
});

test('new provider/binding cannot bypass an ad still playing', async () => {
  const gate = createDailyRewardGate(); const wait = deferred(); let otherCalls = 0;
  const first = gate.watch({getSnapshot: () => state(), watchRewarded: () => wait.promise}, 'home');
  const other = {getSnapshot: () => state({sessionKey: 'session-B'}), watchRewarded: async () => {otherCalls++; return verified;}};
  assert.deepEqual(await gate.watch(other, 'meal'), {status: 'busy'});
  wait.resolve({status: 'closed'}); await first; assert.equal(otherCalls, 0);
});

test('all placements consume the provider quota, never create separate local caps', async () => {
  const gate = createDailyRewardGate(); let remaining = 3; let calls = 0;
  const binding = {getSnapshot: () => state({remaining}), watchRewarded: async () => {
    calls++; remaining--; return {...verified, receiptId: `ssv-${calls}`};
  }};
  for (const placement of ['home', 'street', 'meal']) assert.equal((await gate.watch(binding, placement)).status, 'verified');
  assert.equal((await gate.watch(binding, 'egg-job')).status, 'unavailable');
  assert.equal(calls, 3); assert.equal(remaining, 0);
});

test('SSV pending is not success and the UI never changes shared quota/points', async () => {
  const snapshot = Object.freeze(state()); const gate = createDailyRewardGate();
  const binding = {getSnapshot: () => snapshot, watchRewarded: async () => ({status: 'pending'})};
  assert.deepEqual(await gate.watch(binding, 'meal'), {status: 'pending'});
  assert.equal(snapshot.remaining, 3);
  assert.doesNotMatch(dailyAdResultMessage({status: 'pending'}), /受け取りました/);
  assert.match(dailyAdResultMessage({status: 'pending'}), /もう一度広告を見る必要はありません/);
});

for (const result of [null, {status: 'earned'}, {...verified, receiptId: ''}, {...verified, receiptId: '  '},
  {...verified, receiptId: 'x'.repeat(513)}, {...verified, points: 60}, {...verified, points: '30'}]) {
  test(`reject a malformed or SDK-only reward result: ${JSON.stringify(result)?.slice(0, 90)}`, async () => {
    const gate = createDailyRewardGate();
    const actual = await gate.watch({getSnapshot: () => state(), watchRewarded: async () => result}, 'meal');
    assert.equal(actual.status, 'error'); assert.equal(gate.isBusy(), false);
  });
}

test('a late result from a different session never announces a reward', async () => {
  const gate = createDailyRewardGate(); const wait = deferred(); let sessionKey = 'session-A';
  const promise = gate.watch({getSnapshot: () => state({sessionKey}), watchRewarded: () => wait.promise}, 'home');
  sessionKey = 'session-B'; wait.resolve(verified);
  const result = await promise;
  assert.equal(result.status, 'session-changed'); assert.equal(dailyAdResultMessage(result), '');
});

test('SDK rejection releases the gate and does not fabricate an earned reward', async () => {
  const gate = createDailyRewardGate(); let calls = 0;
  const binding = {getSnapshot: () => state(), watchRewarded: async () => {calls++; throw Error('SDK error');}};
  assert.equal((await gate.watch(binding, 'home')).status, 'error');
  assert.equal((await gate.watch(binding, 'meal')).status, 'error');
  assert.equal(gate.isBusy(), false); assert.equal(calls, 2);
});

test('a slow service returns pending without opening a concurrent second video', async () => {
  const gate = createDailyRewardGate(5); const wait = deferred(); let calls = 0;
  const binding = {getSnapshot: () => state(), watchRewarded: () => {calls++; return wait.promise;}};
  assert.deepEqual(await gate.watch(binding, 'home'), {status: 'pending'});
  assert.equal(gate.isBusy(), true);
  assert.deepEqual(await gate.watch(binding, 'meal'), {status: 'busy'});
  assert.equal(calls, 1);
  wait.resolve(verified); await new Promise(resolve => setImmediate(resolve));
  assert.equal(gate.isBusy(), false);
});

test('closed video is distinct from verified reward', async () => {
  const gate = createDailyRewardGate();
  const result = await gate.watch({getSnapshot: () => state(), watchRewarded: async () => ({status: 'closed'})}, 'meal');
  assert.equal(result.status, 'closed'); assert.doesNotMatch(dailyAdResultMessage(result), /受け取りました/);
});

test('the existing service receives placement for aggregate attribution, not diary/mood data', async () => {
  const gate = createDailyRewardGate(); let argumentsReceived;
  await gate.watch({getSnapshot: () => state(), watchRewarded: async (...args) => {argumentsReceived = args; return verified;}}, 'meal');
  assert.deepEqual(argumentsReceived, ['meal']);
});

test('UI transpiles; missing binding is inert, no native SDK import or wallet storage write', () => {
  const ui = readFileSync(new URL('../components/ads/DailyAdPlacements.tsx', import.meta.url), 'utf8');
  const result = ts.transpileModule(ui, {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}, reportDiagnostics: true});
  assert.equal(result.diagnostics?.length ?? 0, 0);
  assert.doesNotMatch(ui + source, /AsyncStorage|setItem\(|fetch\(|syncFeedPoints|spendFeedPoints|from ['"]react-native-google-mobile-ads/);
  assert.match(ui, /if \(!binding \|\| !height/);
  assert.match(ui, /minHeight: 48/);
  assert.match(ui, /accessibilityState=\{\{disabled, busy\}\}/);
  assert.doesNotMatch(ui, /position: ['"]absolute/);
});


test('snapshot failures do not leave the gate locked or reject the UI promise', async () => {
  const gate = createDailyRewardGate();
  const broken = {getSnapshot: () => {throw Error('store unavailable');}, watchRewarded: async () => verified};
  assert.equal((await gate.watch(broken, 'home')).status, 'error');
  assert.equal(gate.isBusy(), false);
});

test('late snapshot failure after a completed provider request is contained', async () => {
  const gate = createDailyRewardGate(); let broken = false;
  const binding = {getSnapshot: () => {if (broken) throw Error('store unavailable'); return state();},
    watchRewarded: async () => {broken = true; return verified;}};
  assert.equal((await gate.watch(binding, 'home')).status, 'error');
  assert.equal(gate.isBusy(), false);
});

test('late rejection after a deadline is handled and eventually releases the SDK gate', async () => {
  const gate = createDailyRewardGate(5); const wait = deferred();
  const result = await gate.watch({getSnapshot: () => state(), watchRewarded: () => wait.promise}, 'home');
  assert.equal(result.status, 'pending'); assert.equal(gate.isBusy(), true);
  wait.reject(Error('late close error')); await new Promise(resolve => setImmediate(resolve));
  assert.equal(gate.isBusy(), false);
});
