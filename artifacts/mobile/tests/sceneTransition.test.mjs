import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync(new URL('../utils/sceneTransition.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const never = () => new Promise(() => {});
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function fixture(overrides = {}) {
  let clock = 0, id = 0;
  const timers = new Map(), exports = {}, events = [];
  new Function('exports', 'setTimeout', 'clearTimeout', code)(exports,
    (callback, ms) => { timers.set(++id, { at: clock + ms, callback }); return id; },
    timer => timers.delete(timer));
  const controller = new AbortController();
  const steps = {
    prepare: async () => { events.push('prepare'); },
    paint: async () => { events.push('paint'); },
    close: async () => { events.push('close'); },
    cover: () => { events.push('covered'); },
    commit: () => { events.push('commit'); },
    open: async () => { events.push('open'); },
    onError: () => { events.push('error'); },
    ...overrides,
  };
  let done = false;
  const run = () => exports.performSceneTransition(steps, controller.signal).finally(() => { done = true; });
  const tick = async ms => {
    const until = clock + ms;
    await flush();
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      clock = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
      await flush();
    }
    clock = until;
    await flush();
  };
  return { events, timers, controller, run, tick, get done() { return done; } };
}

test('a ready destination commits once, only after full cover, then opens', async () => {
  const f = fixture();
  await f.run();
  assert.deepEqual(f.events, ['prepare', 'paint', 'close', 'covered', 'commit', 'paint', 'open']);
  assert.equal(f.timers.size, 0);
});

test('lost frame and animation callbacks cannot keep the scene locked', async () => {
  const f = fixture({ paint: never, close: never, open: never });
  const run = f.run();
  await f.tick(619);
  assert.ok(!f.events.includes('commit'));
  await f.tick(1);
  assert.deepEqual(f.events, ['prepare', 'covered', 'commit']);
  await f.tick(720);
  assert.equal(f.done, true);
  await run;
  assert.equal(f.timers.size, 0);
});

test('image loading timeout keeps the current place and opens the curtain', async () => {
  const f = fixture({ prepare: never });
  const run = f.run();
  await f.tick(5999);
  assert.equal(f.done, false);
  await f.tick(1);
  await run;
  assert.deepEqual(f.events, ['paint', 'close', 'covered', 'error', 'open']);
  assert.equal(f.timers.size, 0);
});

for (const prepare of [() => { throw new Error('offline'); }, async () => { throw new Error('decode'); }]) {
  test('preparation failure never commits and still reopens', async () => {
    const f = fixture({ prepare });
    await f.run();
    assert.ok(!f.events.includes('commit'));
    assert.deepEqual(f.events.slice(-2), ['error', 'open']);
    assert.equal(f.timers.size, 0);
  });
}

test('cancelling a slow trip prevents its late image from changing a newer scene', async () => {
  let finishImage;
  const f = fixture({ prepare: () => new Promise(resolve => { finishImage = resolve; }) });
  const old = f.run();
  await f.tick(1200);
  f.controller.abort();
  await old;
  assert.equal(f.timers.size, 0);
  const next = fixture();
  await next.run();
  finishImage();
  await flush();
  assert.ok(!f.events.includes('commit'));
  assert.ok(!f.events.includes('error'));
  assert.equal(next.events.filter(event => event === 'commit').length, 1);
});

test('unmount during a missing frame releases every pending wait', async () => {
  const f = fixture({ paint: never, prepare: never });
  const run = f.run();
  f.controller.abort();
  await run;
  assert.deepEqual(f.events, []);
  assert.equal(f.timers.size, 0);
});

test('a failed commit still opens and releases the transition', async () => {
  const f = fixture({ commit: () => { throw new Error('route unavailable'); } });
  await f.run();
  assert.deepEqual(f.events.slice(-2), ['error', 'open']);
  assert.equal(f.timers.size, 0);
});
