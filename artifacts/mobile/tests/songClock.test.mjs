import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

// Exercise the real hook's async lifecycle with deterministic audio and hook adapters.
const code = ts.transpileModule(fs.readFileSync(new URL('../utils/rhythm/useSongClock.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fixture() {
  const pending = [], cleanups = [];
  const Audio = { setAudioModeAsync: async () => {}, Sound: { createAsync: async () => {
    const task = deferred(); pending.push(task); return task.promise;
  } } };
  const hooks = { useRef: current => ({ current }), useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => { cleanups.push(fn()); } };
  const exports = {};
  new Function('require', 'exports', code)(name => name === 'react' ? hooks : { Audio }, exports);
  return { clock: exports.useSongClock(), pending, cleanup: () => cleanups.forEach(fn => fn?.()) };
}
function sound() {
  return { unloaded: 0, played: 0, status: null,
    setOnPlaybackStatusUpdate(fn) { this.status = fn; },
    async unloadAsync() { this.unloaded++; },
    async playAsync() { this.played++; },
    async stopAsync() {},
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('closing during sound creation disposes the late sound and never plays it', async () => {
  const f = fixture(), snd = sound();
  const loading = f.clock.load(1); await flush();
  f.cleanup(); f.pending[0].resolve({ sound: snd }); await loading;
  assert.equal(snd.unloaded, 1); assert.equal(await f.clock.play(), false); assert.equal(snd.played, 0);
});
test('out-of-order loads retain only the newest selection and ignore old status', async () => {
  const f = fixture(), first = sound(), second = sound();
  const a = f.clock.load(1); await flush();
  const b = f.clock.load(2); await flush();
  f.pending[1].resolve({ sound: second }); await b;
  f.pending[0].resolve({ sound: first }); await a;
  assert.equal(first.unloaded, 1); assert.equal(await f.clock.play(), true); assert.equal(second.played, 1);
  let finishes = 0; f.clock.setOnFinish(() => finishes++);
  await f.clock.unload();
  second.status({ isLoaded: true, isPlaying: false, positionMillis: 9999, didJustFinish: true });
  assert.equal(finishes, 0); assert.equal(second.unloaded, 1);
});
test('late play completion after unload cannot restart the clock', async () => {
  const f = fixture(), snd = sound(), play = deferred();
  snd.playAsync = () => play.promise;
  const loading = f.clock.load(1); await flush(); f.pending[0].resolve({ sound: snd }); await loading;
  const playing = f.clock.play(); await f.clock.unload(); play.resolve();
  assert.equal(await playing, false); assert.equal(f.clock.getTime(), 0);
});
