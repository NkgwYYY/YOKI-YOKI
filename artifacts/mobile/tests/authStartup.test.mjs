import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';

const code = ts.transpileModule(fs.readFileSync(new URL('../components/AuthStartupGate.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;

function fixture() {
  const slots = [], effects = [], timers = new Map(), reloads = [];
  let cursor = 0, nextTimer = 0, writes = 0;
  const sdk = { loaded: false, status: 'loading' };
  const hooks = { ...React,
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = value;
      return [slots[i], next => { writes++; slots[i] = next; }]; },
    useEffect: (fn, deps) => { const i = cursor++, prev = slots[i];
      if (!prev || deps.some((d, k) => d !== prev.deps[k])) effects.push(() => { prev?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const exports = {};
  new Function('require', 'exports', 'setTimeout', 'clearTimeout', code)(name => {
    if (name === 'react') return hooks;
    if (name === 'react-native') return { ActivityIndicator: 'Spinner', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: v => v } };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === '@clerk/expo') return { useClerk: () => sdk };
    if (name === 'expo') return { reloadAppAsync: () => new Promise((resolve, reject) => reloads.push({ resolve, reject })) };
    if (name.endsWith('/theme')) return { colors: {} };
    throw Error(name);
  }, exports, (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; }, id => timers.delete(id));
  const protectedContent = React.createElement('PrivateDataProvider');
  const gate = next => { Object.assign(sdk, next); return exports.AuthStartupGate({ children: protectedContent }); };
  const render = () => { cursor = 0; const element = gate(), tree = element.type(element.props); while (effects.length) effects.shift()(); return tree; };
  const fire = delay => { for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); } };
  const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  const cleanup = () => slots.forEach(s => s?.cleanup?.());
  return { gate, protectedContent, render, fire, flush, cleanup, reloads, timers, writes: () => writes };
}
function find(node, predicate) {
  if (!React.isValidElement(node)) return null;
  if (predicate(node)) return node;
  return React.Children.toArray(node.props.children).map(child => find(child, predicate)).find(Boolean);
}
const button = tree => find(tree, n => n.props.accessibilityLabel === 'もう一度接続する');
const alert = tree => find(tree, n => n.props.accessibilityRole === 'alert');

test('unresolved identity has a finite wait and never renders private providers or a guest fallback', () => {
  const f = fixture(); assert.notEqual(f.gate(), f.protectedContent);
  assert.equal(button(f.render()), undefined);
  f.fire(15000); assert.ok(button(f.render()));
  assert.notEqual(f.gate(), f.protectedContent); f.cleanup();
});
test('SDK error offers recovery immediately; ready/degraded can proceed only with loaded identity', () => {
  const f = fixture(); f.gate({ status: 'error' }); assert.ok(button(f.render()));
  for (const status of ['ready', 'degraded']) {
    assert.notEqual(f.gate({ status, loaded: false }), f.protectedContent);
    assert.equal(f.gate({ status, loaded: true }), f.protectedContent);
  }
  assert.notEqual(f.gate({ status: 'error', loaded: true }), f.protectedContent); f.cleanup();
});
test('rapid retry taps issue one reload and rejected reload remains operable', async () => {
  const f = fixture(); f.gate({ status: 'error' }); const retry = button(f.render()).props.onPress;
  retry(); retry(); await f.flush(); assert.equal(f.reloads.length, 1);
  assert.equal(button(f.render()).props.disabled, true);
  f.reloads[0].reject(Error('reload failed')); await f.flush();
  assert.ok(alert(f.render())); assert.equal(button(f.render()).props.disabled, false);
  button(f.render()).props.onPress(); await f.flush(); assert.equal(f.reloads.length, 2);
  f.reloads[1].resolve(); await f.flush(); assert.equal(alert(f.render()), undefined);
  assert.equal(button(f.render()).props.disabled, false); f.cleanup();
});
test('a hung reload times out; its late completion cannot clear a newer pending retry', async () => {
  const f = fixture(); f.gate({ status: 'error' }); button(f.render()).props.onPress(); await f.flush();
  f.fire(10000); assert.ok(alert(f.render())); assert.equal(button(f.render()).props.disabled, false);
  button(f.render()).props.onPress(); await f.flush();
  f.reloads[0].resolve(); await f.flush(); assert.equal(button(f.render()).props.disabled, true);
  f.reloads[1].reject(Error('second failure')); await f.flush(); assert.ok(alert(f.render())); f.cleanup();
});
for (const outcome of ['resolve', 'reject']) test(`resolved identity/unmount cancels timers and ignores late reload ${outcome}`, async () => {
  const f = fixture(); f.gate({ status: 'error' }); const retry = button(f.render()).props.onPress;
  retry(); await f.flush(); assert.equal(f.gate({ status: 'ready', loaded: true }), f.protectedContent);
  f.cleanup(); const writes = f.writes(); assert.equal(f.timers.size, 0);
  f.reloads[0][outcome](Error('late')); retry(); await f.flush();
  assert.equal(f.writes(), writes); assert.equal(f.reloads.length, 1);
});
