import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Execute the production native adapter with a deterministic SDK/event fixture.
// No network, live creatives, native hardware, or real rewards are used here.
const source = readFileSync(new URL('../utils/community/commerce.native.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
}}).outputText;
const tick = async () => {for (let n = 0; n < 40; n++) await Promise.resolve();};
function fixture() {
  const timers = new Map(), ads = [], events = [];
  let serial = 0, next = {}, live = true;
  const app = {currentState: 'active'};
  const sdk = {__esModule: true, default: () => ({
    setRequestConfiguration: async () => {}, initialize: async () => {},
  }), AdsConsent: {gatherConsent: async () => ({canRequestAds: true})},
  MaxAdContentRating: {G: 'G'}, TestIds: {REWARDED: 'fixture-test-unit'},
  RewardedAdEventType: {LOADED: 'loaded', EARNED_REWARD: 'earned'},
  AdEventType: {CLOSED: 'closed', ERROR: 'error', PAID: 'paid'},
  RewardedAd: {createForAdRequest(unit, options) {
    const behavior = next; next = {};
    const active = new Map(), saved = new Map();
    const ad = {unit, options, active, saved, showCount: 0, loadCount: 0, removed: 0,
      addAdEventListener(name, cb) {
        if (behavior.registrationError === name) throw Error('registration fixture failure');
        active.set(name, cb); saved.set(name, cb);
        return () => {active.delete(name); if (behavior.cleanupError) throw Error('cleanup fixture failure');};
      },
      removeAllListeners() {this.removed++; active.clear();},
      load() {this.loadCount++; if (behavior.loadError) throw Error('load fixture failure');},
      show() {this.showCount++; if (behavior.showError) throw Error('show fixture failure'); if (behavior.showReject) return Promise.reject(Error('show fixture rejection')); return Promise.resolve();},
      emit(name, value) {active.get(name)?.(value);},
      emitQueued(name, value) {saved.get(name)?.(value);},
    };
    ads.push(ad); return ad;
  }}};
  const exports = {};
  new Function('require', 'exports', '__DEV__', 'process', 'setTimeout', 'clearTimeout', code)(name => {
    if (name === 'react-native') return {AppState: app, Platform: {OS: 'ios'}};
    if (name === 'expo-constants') return {__esModule: true, default: {appOwnership: 'standalone', expoConfig: {extra: {
      yokiRewardedIosUnit: 'fixture-unit', yokiAdsConfigured: {ios: true},
    }}}};
    if (name === 'react-native-google-mobile-ads') return sdk;
    throw Error(`Unexpected fixture dependency: ${name}`);
  }, exports, false, {env: {}}, (cb, delay) => {timers.set(++serial, {cb, delay}); return serial;}, id => timers.delete(id));
  const start = (event = (name, duration) => events.push({name, duration}), paid) => {
    const state = {status: 'pending'};
    void exports.showRewardedAd({playerId: 'fixture-player', id: 'fixture-claim'}, event, paid, () => live)
      .then(value => Object.assign(state, {status: 'resolved', value}), error => Object.assign(state, {status: 'rejected', error}));
    return state;
  };
  return {ads, events, timers, app, start, behavior: value => {next = value;}, changeAccount: () => {live = false;},
    timeout: () => {for (const entry of [...timers.values()]) entry.cb();}};
}
function clean(f, ad) {assert.equal(ad.active.size, 0); assert.equal(f.timers.size, 0); assert.equal(ad.removed, 1);}

test('native earned event waits for close; verified server credit remains outside the SDK adapter', async () => {
  const f = fixture(), result = f.start(); await tick(); const ad = f.ads[0];
  assert.deepEqual(ad.options, {requestNonPersonalizedAdsOnly: true,
    serverSideVerificationOptions: {userId: 'fixture-player', customData: 'fixture-claim'}});
  ad.emit('loaded'); ad.emit('earned'); await tick(); assert.equal(result.status, 'pending');
  ad.emit('closed'); await tick(); assert.equal(result.status, 'resolved'); assert.equal(result.value, true); clean(f, ad);
});
test('native close without earning returns false and releases a subsequent request', async () => {
  const f = fixture(), result = f.start(); await tick(); const ad = f.ads[0];
  ad.emit('loaded'); ad.emit('closed'); await tick(); assert.equal(result.value, false); clean(f, ad);
  const retry = f.start(); await tick(); const second = f.ads[1]; assert.ok(second);
  second.emit('loaded'); second.emit('closed'); await tick(); assert.equal(retry.value, false); clean(f, second);
});
for (const [name, behavior] of [['load', {loadError: true}], ['listener registration', {registrationError: 'earned'}]]) {
  test(`synchronous ${name} failure cleans every listener and prevents a late ad from opening`, async () => {
    const f = fixture(); f.behavior(behavior); const result = f.start(); await tick(); const ad = f.ads[0];
    assert.equal(result.status, 'rejected'); clean(f, ad);
    ad.emitQueued('loaded'); assert.equal(ad.showCount, 0);
    const retry = f.start(); await tick(); const second = f.ads[1]; assert.ok(second);
    second.emit('loaded'); second.emit('closed'); await tick(); assert.equal(retry.status, 'resolved'); clean(f, second);
  });
}
test('synchronous show failure is contained, cleaned up, and unlocks the adapter', async () => {
  const f = fixture(); f.behavior({showError: true}); const result = f.start(); await tick(); const ad = f.ads[0];
  assert.doesNotThrow(() => ad.emit('loaded')); await tick(); assert.equal(result.status, 'rejected'); clean(f, ad);
  const retry = f.start(); await tick(); assert.ok(f.ads[1]); f.ads[1].emit('closed'); await tick(); assert.equal(retry.value, false);
});
test('duplicate loaded callbacks show a native creative at most once', async () => {
  const f = fixture(), result = f.start(); await tick(); const ad = f.ads[0];
  ad.emit('loaded'); ad.emit('loaded'); assert.equal(ad.showCount, 1);
  ad.emit('closed'); await tick(); assert.equal(result.value, false); clean(f, ad);
});
test('throwing telemetry cannot block load, close, or error settlement', async () => {
  const f = fixture(), metric = () => {throw Error('metrics offline');}, result = f.start(metric); await tick(); const ad = f.ads[0];
  assert.equal(ad.loadCount, 1); assert.doesNotThrow(() => ad.emit('loaded'));
  assert.doesNotThrow(() => ad.emit('closed')); await tick(); assert.equal(result.value, false); clean(f, ad);
  const retry = f.start(metric); await tick(); assert.doesNotThrow(() => f.ads[1].emit('error'));
  await tick(); assert.equal(retry.status, 'rejected'); clean(f, f.ads[1]);
});
test('throwing revenue observers cannot crash playback or prevent close', async () => {
  const f = fixture(), result = f.start(undefined, () => {throw Error('revenue observer offline');}); await tick(); const ad = f.ads[0];
  ad.emit('loaded'); assert.doesNotThrow(() => ad.emit('paid', {value: 0.001, currency: 'JPY'}));
  ad.emit('earned'); ad.emit('closed'); await tick(); assert.equal(result.value, true); clean(f, ad);
});
for (const scenario of ['background', 'account change']) {
  test(`${scenario} during loading cancels rather than presenting a stale native ad`, async () => {
    const f = fixture(), result = f.start(); await tick(); const ad = f.ads[0];
    if (scenario === 'background') f.app.currentState = 'background'; else f.changeAccount();
    ad.emit('loaded'); await tick(); assert.equal(result.status, 'rejected'); assert.equal(ad.showCount, 0); clean(f, ad);
  });
}
test('load timeout removes listeners and queued callbacks cannot reopen the creative', async () => {
  const f = fixture(), result = f.start(); await tick(); const ad = f.ads[0];
  f.timeout(); await tick(); assert.equal(result.status, 'rejected'); clean(f, ad);
  ad.emitQueued('loaded'); assert.equal(ad.showCount, 0);
});
test('cleanup errors do not strand the result or replay a closed creative', async () => {
  const f = fixture(); f.behavior({cleanupError: true}); const result = f.start(); await tick(); const ad = f.ads[0];
  ad.emit('loaded'); ad.emit('closed'); await tick(); assert.equal(result.value, false); clean(f, ad);
  ad.emitQueued('loaded'); assert.equal(ad.showCount, 1);
});
test('an earned callback before show or after close cannot fabricate completion', async () => {
  const f = fixture(), result = f.start(); await tick(); const ad = f.ads[0];
  ad.emit('earned'); ad.emit('loaded'); ad.emit('closed'); await tick(); assert.equal(result.value, false);
  ad.emitQueued('earned'); await tick(); assert.equal(result.value, false); clean(f, ad);
});
test('concurrent native requests remain locked through playback until close', async () => {
  const f = fixture(), first = f.start(), duplicate = f.start(); await tick();
  assert.equal(duplicate.status, 'rejected'); assert.equal(f.ads.length, 1);
  f.ads[0].emit('loaded'); const during = f.start(); await tick(); assert.equal(during.status, 'rejected');
  f.ads[0].emit('closed'); await tick(); assert.equal(first.value, false); clean(f, f.ads[0]);
});

for (const failing of ['ad_loaded', 'ad_closed', 'ad_error']) {
  test(`a metric exception specifically during ${failing} never escapes an SDK callback`, async () => {
    const f = fixture(), result = f.start(name => {if (name === failing) throw Error('metrics fixture failure');});
    await tick(); const ad = f.ads[0];
    assert.doesNotThrow(() => ad.emit('loaded'));
    assert.doesNotThrow(() => ad.emit(failing === 'ad_error' ? 'error' : 'closed'));
    await tick(); assert.equal(result.status, failing === 'ad_error' ? 'rejected' : 'resolved'); clean(f, ad);
  });
}
test('rejected metric and revenue promises are handled without unhandled rejections', async () => {
  const f = fixture(), result = f.start(() => Promise.reject(Error('async metric fixture')),
    () => Promise.reject(Error('async revenue fixture')));
  await tick(); const ad = f.ads[0];
  ad.emit('loaded'); ad.emit('paid', {value: 0.001, currency: 'JPY'}); ad.emit('closed');
  await tick(); await new Promise(setImmediate);
  assert.equal(result.value, false); clean(f, ad);
});
test('asynchronous show rejection also cleans listeners and releases the adapter', async () => {
  const f = fixture(); f.behavior({showReject: true}); const result = f.start(); await tick(); const ad = f.ads[0];
  ad.emit('loaded'); await tick(); assert.equal(result.status, 'rejected'); clean(f, ad);
  f.start(); await tick(); assert.ok(f.ads[1]); f.ads[1].emit('closed'); await tick();
});
test('queued paid and reward callbacks after settlement neither report revenue nor alter completion', async () => {
  let paid = 0;
  const f = fixture(), result = f.start(undefined, () => {paid++;}); await tick(); const ad = f.ads[0];
  ad.emit('loaded'); ad.emit('closed'); await tick();
  ad.emitQueued('paid', {value: 0.001, currency: 'JPY'}); ad.emitQueued('earned'); ad.emitQueued('closed');
  await tick(); assert.equal(paid, 0); assert.equal(result.value, false);
  assert.equal(f.events.filter(e => e.name === 'ad_closed').length, 1); clean(f, ad);
});

for (const earned of [false, true]) {
  test(`lost native close callback settles playback and unlocks retries (earned=${earned})`, async () => {
    const f = fixture(), result = f.start(); await tick(); const ad = f.ads[0];
    ad.emit('loaded'); if (earned) ad.emit('earned');
    assert.deepEqual([...f.timers.values()].map(t => t.delay), [180_000]);
    f.timeout(); await tick();
    assert.equal(result.status, earned ? 'resolved' : 'rejected');
    if (earned) assert.equal(result.value, true); // Server verification still owns credit.
    clean(f, ad);
    ad.emitQueued('loaded'); ad.emitQueued('earned'); ad.emitQueued('closed');
    assert.equal(ad.showCount, 1);
    const retry = f.start(); await tick(); assert.ok(f.ads[1]);
    f.ads[1].emit('closed'); await tick(); assert.equal(retry.value, false);
  });
}
