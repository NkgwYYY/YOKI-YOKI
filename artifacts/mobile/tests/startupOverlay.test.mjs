import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';

const code = ts.transpileModule(fs.readFileSync(new URL('../components/StartupLoadingOverlay.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
function fixture() {
  const slots = [], effects = [], timers = new Map(), animations = [], loads = [];
  let cursor = 0, nextTimer = 0, writes = 0;
  const hooks = { ...React,
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { writes++; slots[i] = value; }]; },
    useCallback: (fn, deps) => { const i = cursor++, prev = slots[i];
      if (!prev || deps.some((d, k) => d !== prev.deps[k])) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect: (fn, deps) => { const i = cursor++, prev = slots[i];
      if (!prev || deps.some((d, k) => d !== prev.deps[k])) effects.push(() => { prev?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const exports = {};
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', code)(name => {
    if (name === 'react') return hooks;
    if (name === 'react-native') return { ActivityIndicator: 'Spinner', Pressable: 'Pressable', Text: 'Text', Platform: { OS: 'ios' }, StyleSheet: { create: v => v },
      Animated: { View: 'AnimatedView', Value: class { setValue() {} stopAnimation() {} }, timing: () => ({ start: cb => animations.push(cb) }) } };
    if (name.endsWith('/theme')) return Object.fromEntries(['colors', 'homePalette', 'radius', 'space', 'typography'].map(k => [k, {}]));
    if (name.endsWith('/startupAssets')) return { preloadStartupImages: () => new Promise((resolve, reject) => loads.push({ resolve, reject })) };
    throw Error(name);
  }, exports, (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; }, id => timers.delete(id));
  const render = () => { cursor = 0; const tree = exports.StartupLoadingOverlay(); while (effects.length) effects.shift()(); return tree; };
  const fire = delay => { for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); } };
  const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
  const ready = async () => { loads.at(-1).resolve(); fire(2200); await flush(); };
  return { render, fire, ready, flush, loads, animations, timers, writes: () => writes, cleanup: () => slots.forEach(s => s?.cleanup?.()) };
}
for (const completion of ['success', 'interrupted', 'missing']) test(`startup releases touch input with ${completion} animation completion`, async () => {
  const f = fixture();
  assert.equal(f.render().props.pointerEvents, 'auto');
  await f.ready();
  const fading = f.render();
  assert.equal(fading.props.pointerEvents, 'none');
  assert.equal(fading.props.accessibilityElementsHidden, true);
  if (completion === 'missing') f.fire(500); else f.animations[0]({ finished: completion === 'success' });
  assert.equal(f.render(), null); assert.equal(f.timers.size, 0); f.cleanup();
});
test('image error remains retryable and successful retry dismisses the overlay', async () => {
  const f = fixture(); f.render(); f.loads[0].reject(Error('image failed')); await f.flush();
  const tree = f.render(); assert.equal(tree.props.pointerEvents, 'auto');
  function find(node) { if (!React.isValidElement(node)) return null; if (node.props.accessibilityLabel === '画像の読み込みを再試行') return node;
    return React.Children.toArray(node.props.children).map(find).find(Boolean); }
  find(tree).props.onPress(); await f.ready(); f.fire(500); assert.equal(f.render(), null); f.cleanup();
});
test('unmount clears fallback and ignores late animation callbacks', async () => {
  const f = fixture(); f.render(); await f.ready(); f.cleanup(); const before = f.writes();
  assert.equal(f.timers.size, 0); f.animations[0]({ finished: true }); assert.equal(f.writes(), before);
});
