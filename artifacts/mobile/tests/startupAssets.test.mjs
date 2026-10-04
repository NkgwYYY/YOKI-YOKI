import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync(new URL('../utils/startupAssets.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const never = () => new Promise(() => {});
function fixture(native, expo) {
  const timers = new Map(), exports = {}; let id = 0;
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', code)(name => {
    if (name === 'react-native') return { Image: { prefetch: uri => native(uri) } };
    if (name === 'expo-image') return { Image: { prefetch: uri => expo(uri) } };
    if (name.startsWith('@/assets/')) return name;
    throw Error(name);
  }, exports, (fn, delay) => { timers.set(++id, { fn, delay }); return id; }, key => timers.delete(key));
  return { load: exports.preloadStartupImages, timers, timeout: () => { for (const t of [...timers.values()]) { assert.equal(t.delay, 15000); t.fn(); } } };
}
for (const nativeWins of [true, false]) test(`startup succeeds when ${nativeWins ? 'native' : 'expo'} cache succeeds and the other never settles`, async () => {
  const f = fixture(nativeWins ? () => true : never, nativeWins ? never : () => true);
  const first = f.load(); assert.equal(f.load(), first); await first;
  assert.equal(f.timers.size, 0); assert.equal(f.load(), first);
});
test('both cache failures reject and allow a fresh successful retry, including synchronous exceptions', async () => {
  let fail = true;
  const f = fixture(() => { if (fail) throw Error('native failed'); return true; }, () => false);
  await assert.rejects(f.load()); assert.equal(f.timers.size, 0);
  fail = false; await f.load(); assert.equal(f.timers.size, 0);
});
test('hung startup times out, permits retry, and late old failures cannot clear the new cache', async () => {
  let hanging = true; const rejects = [];
  const cache = () => hanging ? new Promise((_, reject) => rejects.push(reject)) : true;
  const f = fixture(cache, cache), old = f.load();
  await Promise.resolve(); f.timeout();
  await assert.rejects(old, /時間がかかっています/); assert.equal(f.timers.size, 0);
  hanging = false; const current = f.load(); await current;
  rejects.forEach(reject => reject(Error('late backend failure')));
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.equal(f.load(), current); assert.equal(f.timers.size, 0);
});
