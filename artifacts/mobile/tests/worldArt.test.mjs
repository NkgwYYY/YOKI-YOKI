import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync(new URL('../utils/worldArt.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function fixture(prefetch) {
  const exports = {}, timers = new Set();
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', code)(name => {
    if (name === 'react-native') return { Image: { prefetch }, Platform: {OS:'web'} };
    if (name === 'expo-asset') return { Asset: { fromModule: uri => ({ uri }) } };
    if (name.startsWith('@/assets/')) return name;
    throw Error(name);
  }, exports, callback => { timers.add(callback); return callback; }, timer => timers.delete(timer));
  return { prepare: exports.prepareWorldArt, atlas: exports.prepareVillageAtlas, timers };
}
for (const success of [true, undefined]) test(`scene accepts ${success === true ? 'native boolean' : 'web void'} success and caches the decoded image`, async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return success; });
  const first = f.prepare('market');
  assert.equal(f.prepare('market'), first);
  await first;
  await f.prepare('market');
  assert.equal(calls, 1);
  assert.equal(f.timers.size, 0);
});
test('explicit image failure releases the cache for another travel attempt', async () => {
  let ok = false;
  const f = fixture(async () => ok);
  await assert.rejects(f.prepare('market'), /unavailable/);
  ok = true;
  await f.prepare('market');
  assert.equal(f.timers.size, 0);
});

test('image timeout releases the cache; a late decode cannot poison the retry', async () => {
  let complete;
  let calls = 0;
  const f = fixture(() => ++calls === 1 ? new Promise(resolve => { complete = resolve; }) : Promise.resolve(true));
  const first = f.prepare('bowling');
  await Promise.resolve();
  const rejected = assert.rejects(first, /timed out/);
  for (const callback of [...f.timers]) callback();
  await rejected;
  await f.prepare('bowling');
  complete(true);
  await Promise.resolve();
  await f.prepare('bowling');
  assert.equal(calls, 2);
  assert.equal(f.timers.size, 0);
});

test('synchronous prefetch errors also clear the timer and allow retry', async () => {
  let fail = true;
  const f = fixture(() => { if (fail) throw new Error('offline'); return Promise.resolve(true); });
  await assert.rejects(f.prepare('bowling'), /offline/);
  assert.equal(f.timers.size, 0);
  fail = false;
  await f.prepare('bowling');
});

test('a shop is ready only after both its backdrop and its merchant decode', async () => {
  const pending = new Map();
  const f = fixture(uri => new Promise(resolve => pending.set(uri, resolve)));
  let ready = false;
  const scene = f.prepare('homewares').then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(pending.size, 2);
  const complete = [...pending.values()];
  complete[0](true);
  for(let i=0;i<12;i++)await Promise.resolve();
  assert.equal(ready, false);
  complete[1](true);
  await scene;
  assert.equal(ready, true);
  assert.equal(f.timers.size, 0);
});
test('atlas warmup and repeated openings share one decoded image', async () => {
  const calls=[];
  const f=fixture(async uri=>{calls.push(uri);});
  const first=f.atlas();
  assert.equal(f.atlas(),first);
  await first;
  await f.atlas();
  assert.equal(calls.length,1);
  assert.match(calls[0],/village-atlas.webp$/);
});
test('a failed merchant can be retried without downloading the backdrop again', async()=>{
  const calls=[];let fail=true;
  const f=fixture(async uri=>{calls.push(uri);if(uri.includes('keeper')&&fail)throw Error('offline');});
  await assert.rejects(f.prepare('homewares'),/offline/);
  fail=false;
  await f.prepare('homewares');
  assert.equal(calls.filter(uri=>uri.includes('village-homewares')).length,1);
  assert.equal(calls.filter(uri=>uri.includes('keeper')).length,2);
  assert.equal(f.timers.size,0);
});
