import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require = createRequire(import.meta.url), ts = require('typescript');
const directory = mkdtempSync(join(tmpdir(), 'yoki-ad-expiry-'));
mkdirSync(join(directory, 'community'));
for (const name of ['dailyAdPlacements', 'community/dailyAds']) {
  const source = readFileSync(new URL(`../utils/${name}.ts`, import.meta.url), 'utf8');
  writeFileSync(join(directory, `${name}.js`), ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText);
}
const {createDailyAds} = require(join(directory, 'community/dailyAds.js'));
process.on('exit', () => rmSync(directory, {recursive: true, force: true}));
function fixture(t, overrides = {}) {
  let now = Date.parse('2026-10-18T00:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const reservations = [], presentations = [], credits = new Set();
  const deps = {
    sessionKey: randomUUID(), current: () => true,
    eligibility: () => ({ready: true, rewarded: true, banner: true, pass: false}),
    collect: async () => ({gained: 0, remaining: 3, day: '2026-10-18', confirmedIds: [...credits]}),
    pass: async () => false,
    reserve: async (receipt, mode) => {
      const reservation = {id: randomUUID(), playerId: randomUUID(), mode, state: 'reserved', expiresAt: new Date(now + 1800000).toISOString()};
      reservations.push({receipt, ...reservation}); return reservation;
    },
    present: async reservation => {presentations.push(reservation.id); return false;},
    credited: id => credits.has(id), uuid: randomUUID, pause: async () => {}, ...overrides,
  };
  return {service: createDailyAds(deps), deps, reservations, presentations, credits, advance: ms => {now += ms;}};
}

test('a reservation expiring between close and retry is replaced before native presentation', async t => {
  const f = fixture(t);
  assert.equal((await f.service.watchRewarded('home')).status, 'closed');
  f.advance(1800001); // No focus/periodic refresh between the two explicit presses.
  assert.equal((await f.service.watchRewarded('meal')).status, 'closed');
  assert.equal(f.reservations.length, 2);
  assert.notEqual(f.presentations[0], f.presentations[1]);
  assert.match(f.reservations[1].receipt, /^daily-meal-/);
});

test('a still-valid closed reservation is reused without reserving another allowance', async t => {
  const f = fixture(t);
  await f.service.watchRewarded('home'); f.advance(1000);
  await f.service.watchRewarded('meal');
  assert.equal(f.reservations.length, 1);
  assert.equal(f.presentations[0], f.presentations[1]);
});

test('an expired reservation that was actually credited is reported once without another video', async t => {
  const f = fixture(t);
  await f.service.watchRewarded('home');
  f.advance(1800001); f.credits.add(f.reservations[0].id);
  const result = await f.service.watchRewarded('meal');
  assert.equal(result.status, 'verified'); assert.equal(result.receiptId, f.reservations[0].id);
  assert.equal(f.reservations.length, 1); assert.equal(f.presentations.length, 1);
});
