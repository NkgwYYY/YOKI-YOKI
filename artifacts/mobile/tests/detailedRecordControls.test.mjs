import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';

const code = ts.transpileModule(fs.readFileSync(new URL('../components/record/MoodRecordSheet.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
function fixture() {
  const slots = [], effects = [], calls = [];
  let cursor = 0, resolve, reject;
  const pending = new Promise((a, b) => { resolve = a; reject = b; });
  const hooks = { ...React,
    useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect: (fn, deps) => { const i = cursor++, prev = slots[i];
      if (!prev || deps.some((d, k) => d !== prev.deps[k])) effects.push(() => { prev?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
  };
  const holdLightFlow = () => {};
  const exports = {};
  new Function('require', 'exports', code)(name => {
    if (name === 'react') return hooks;
    if (name === 'react-native') return { Text: 'Text', TextInput: 'TextInput', View: 'View', StyleSheet: { create: v => v } };
    if (name.endsWith('/theme')) return Object.fromEntries(['border', 'colors', 'control', 'moodPalette', 'radius', 'space', 'typography'].map(k => [k, {}]));
    if (name.endsWith('/analytics')) return { Analytics: { moodRecorded() {} } };
    if (name.endsWith('/dateUtils')) return { getTodayDate: () => '2026-10-04', formatDateJP: () => '今日' };
    if (name.endsWith('/AppContext')) return { useApp: () => ({ holdLightFlow,
      getTodayRecord: () => ({ mood: 3, sleep: 12, sleepRecorded: true, notes: '元のメモ' }),
      saveRecord: (...args) => { calls.push(args); return pending; },
    }) };
    const component = name.split('/').at(-1);
    if (['BottomSheet', 'Button', 'Icon', 'PressScale'].includes(component)) return { [component]: component };
    throw Error(name);
  }, exports);
  function flatten(node) {
    if (!React.isValidElement(node)) return [];
    if (typeof node.type === 'function') return flatten(node.type(node.props));
    return [node, ...React.Children.toArray(node.props.children).flatMap(flatten)];
  }
  function render() {
    cursor = 0;
    const tree = exports.MoodRecordSheet({ visible: true, onClose() {} });
    while (effects.length) effects.shift()();
    return flatten(tree);
  }
  const named = label => render().find(n => n.props.accessibilityLabel === label);
  const save = () => render().find(n => n.props.testID === 'detailed-record-save').props.onPress();
  return { render, named, save, calls, resolve, reject, cleanup: () => slots.forEach(s => s?.cleanup?.()) };
}
for (const fail of [false, true]) test(`detailed record locks the submitted draft and ${fail ? 'unlocks on failure' : 'stays locked during success feedback'}`, async () => {
  const f = fixture();
  try {
    f.render();
    assert.equal(f.named('睡眠時間を増やす').props.disabled, true);
    f.named('今日のメモ').props.onChangeText('保存するメモ');
    const saving = f.save();
    await f.save();
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0][3], '保存するメモ');
    const assertLocked = locked => {
      for (const label of ['気分：良い', '睡眠時間を記録する', '睡眠時間を減らす', '運動：軽め', '食事：ふつう', '人間関係：ふつう', '読書した'])
        assert.equal(f.named(label).props.disabled, locked, label);
      for (const label of ['今日のメモ', '今日の小さな成功']) assert.equal(f.named(label).props.editable, !locked, label);
      assert.equal(f.named('今日のメモ').props.value, '保存するメモ');
    };
    assertLocked(true);
    if (fail) f.reject(Error('storage unavailable')); else f.resolve();
    await saving;
    assertLocked(!fail);
    if (fail) assert.ok(f.render().some(n => n.props.accessibilityRole === 'alert'));
  } finally { f.cleanup(); }
});
