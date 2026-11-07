import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Run production component handlers/RAF/scoring with deterministic hook, clock
// and platform adapters. This does not simulate a native audio/input device.
const root = fileURLToPath(new URL('../', import.meta.url));
const codeCache = new Map();
function compiled(file) {
  if (!codeCache.has(file)) codeCache.set(file, ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText);
  return codeCache.get(file);
}
const theme = { colors: {}, border: {}, gameSurface: {}, judgePalette: {}, activityPalette: {}, lanePalette: ['a','b','c','d'] };
function moduleLoader(adapters = {}, runtime = {}) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const require = id => {
      if (id in adapters) return adapters[id];
      if (id.endsWith('.mp3')) return id;
      if (id === '@/constants/theme') return theme;
      let target = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(file), id);
      target = ['.ts', '.tsx', '/index.ts'].map(ext => target + ext).find(fs.existsSync);
      if (!target) throw Error(`Missing adapter for ${id}`);
      return load(target);
    };
    new Function('require', 'exports', ...Object.keys(runtime), compiled(file))(require, exports, ...Object.values(runtime));
    return exports;
  };
}
const data = moduleLoader();
const { SONGS } = data(path.join(root, 'utils/rhythm/songs.ts'));
const { getChart, getCopyPhrases } = data(path.join(root, 'utils/rhythm/charts/index.ts'));
const names = { tap: 'TapBeatGame', jump: 'RhythmJumpGame', swipe: 'RhythmSwipeGame', copy: 'RhythmCopyGame', relax: 'RelaxRhythmGame' };
const equalDeps = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...(node.props?.children ?? []).flat(Infinity).flatMap(nodes)];
}
async function fixture(mode, song, difficulty, chart = getChart(song.id, mode, difficulty)) {
  const slots = [], effects = [], frames = new Map(), timers = new Map();
  let cursor = 0, tree, time = 0, nextId = 1, audioEnd, result, results = 0, panCreations = 0;
  const hooks = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useCallback(fn, deps) { const i = cursor++; if (!equalDeps(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useMemo(fn, deps) { const i = cursor++; if (!equalDeps(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!equalDeps(slots[i]?.deps, deps)) {
      effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
    } },
  };
  const clock = { load: async () => {}, play: async () => true, stop: async () => {}, unload: async () => {},
    getTime: () => time, setOnFinish: fn => { audioEnd = fn; } };
  const adapters = {
    react: { ...hooks, default: hooks },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: x => x },
      PanResponder: { create: config => { panCreations++; return { panHandlers: config }; } } },
    'expo-haptics': { impactAsync: async () => {}, notificationAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} },
    '@/utils/rhythm/useSongClock': { useSongClock: () => clock },
    '@/utils/rhythm/geometry': { clamp: (v, min, max) => Math.min(Math.max(v, min), max), measuredOr: (v, fallback) => v > 0 ? v : fallback, useMeasuredSize: () => [{ width: 390, height: 640 }, () => {}] },
    './RhythmMascot': { RhythmMascot: 'Mascot' }, '@/components/Mascot': { Mascot: 'Mascot' },
    '@/components/ui/Icon': { Icon: 'Icon', iconSize: {} },
    '@/contexts/AppContext': { useApp: () => ({ progress: { level: 1 } }) },
    '@/utils/mascotUtils': { getMascotStage: () => 'egg' },
  };
  const load = moduleLoader(adapters, {
    requestAnimationFrame: fn => { const id = nextId++; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: fn => { const id = nextId++; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
  });
  const Component = load(path.join(root, 'components/rhythm', names[mode] + '.tsx'))[names[mode]];
  const onFinish = value => { result = value; results++; };
  const render = () => { cursor = 0; tree = Component({ song, chart, difficulty, onFinish, onQuit: () => {} });
    effects.splice(0).forEach(fn => fn()); };
  render(); await new Promise(resolve => setImmediate(resolve)); render();
  return {
    frame(at) { time = at; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(at * 1000)); render(); },
    input(at, note = {}) { time = at;
      if (mode === 'swipe') {
        const [dx, dy] = { left: [-30, 0], right: [30, 0], up: [0, -30], down: [0, 30] }[note.direction];
        nodes(tree).find(n => n.props.onPanResponderRelease).props.onPanResponderRelease({}, { dx, dy });
      } else nodes(tree).filter(n => n.props.onPressIn)[mode === 'tap' ? note.lane ?? 0 : 0].props.onPressIn();
      render();
    },
    finish() { audioEnd?.(); [...timers.values()].forEach(fn => fn()); timers.clear(); return result; },
    get results() { return results; },
    get panCreations() { return panCreations; },
    close() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

for (const song of SONGS) for (const mode of Object.keys(names)) for (const difficulty of ['easy', 'normal', 'hard']) {
  test(`${song.id}/${mode}/${difficulty}: actual input handlers score every expected note once`, async () => {
    const chart = getChart(song.id, mode, difficulty);
    const f = await fixture(mode, song, difficulty);
    try {
      for (const note of chart.notes) { f.input(note.time, note); f.frame(note.time); }
      const result = f.finish();
      assert.equal(result.perfect, chart.notes.length); assert.equal(result.miss, 0);
      assert.equal(result.score, chart.notes.length * 100); assert.equal(result.maxCombo, chart.notes.length);
      assert.equal(result.totalNotes, chart.notes.length); assert.equal(f.results, 1);
      if (mode === 'swipe') assert.equal(f.panCreations, 1, 'reuse gesture responder across frames');
    } finally { f.close(); }
  });
}

test('COPY accepts response-start input before the next frame; ignores presentation taps', async () => {
  const song = SONGS[0], difficulty = 'easy', ph = getCopyPhrases(song.id, difficulty)[0];
  const start = song.firstBeat + (ph.start + ph.len) * 4 * (60 / song.bpm);
  const f = await fixture('copy', song, difficulty);
  try {
    f.frame(start - 0.01); f.input(start - 0.005); f.input(start); f.input(start);
    const result = f.finish(); assert.equal(result.perfect, 1); assert.equal(result.score, 100);
  } finally { f.close(); }
});

for (const [offset, judgment] of [[0.1, 'perfect'], [0.19, 'great'], [0.3, 'good']]) {
  test(`JUMP boundary ${offset}s stays ${judgment} even if a frame runs first`, async () => {
    const f = await fixture('jump', SONGS[0], 'easy', { notes: [{ time: 1, lane: 0, type: 'tap' }] });
    try { f.frame(1 + offset); f.input(1 + offset); f.input(1 + offset);
      const result = f.finish(); assert.equal(result[judgment], 1); assert.equal(result.miss, 0);
    } finally { f.close(); }
  });
}

for (const [offset, judgment] of [[0.16, 'perfect'], [0.28, 'great'], [0.42, 'good']]) {
  test(`COPY boundary ${offset}s stays ${judgment} with frame-first expiration`, async () => {
    // A slower phrase keeps the next note outside this tap's judgment window.
    const song = SONGS[1], note = getChart(song.id, 'copy', 'easy').notes[0];
    const f = await fixture('copy', song, 'easy');
    try { f.frame(note.time + offset); f.input(note.time + offset); f.input(note.time + offset);
      const result = f.finish(); assert.equal(result[judgment], 1); assert.equal(result.miss, 0);
      assert.equal(result.perfect + result.great + result.good, 1);
    } finally { f.close(); }
  });
}

test('TAP wrong lane and empty taps do not consume a note; expired note misses once', async () => {
  const chart = { notes: [{ time: 1, lane: 2, type: 'tap' }, { time: 3, lane: 0, type: 'tap' }] };
  const f = await fixture('tap', SONGS[0], 'easy', chart);
  try {
    f.input(0, { lane: 2 }); f.input(1, { lane: 1 }); f.input(1, { lane: 2 }); f.input(1, { lane: 2 });
    f.frame(3.30001); f.input(3.30001, { lane: 0 }); f.frame(4);
    const result = f.finish(); assert.equal(result.perfect, 1); assert.equal(result.miss, 1); assert.equal(result.score, 100);
  } finally { f.close(); }
});

test('SWIPE wrong direction consumes only its closest note; repeated input cannot score it', async () => {
  const chart = { notes: [{ time: 1, lane: 0, type: 'tap', direction: 'left' }] };
  const f = await fixture('swipe', SONGS[0], 'easy', chart);
  try {
    f.input(0, { direction: 'left' }); f.input(1, { direction: 'right' }); f.input(1, { direction: 'left' });
    const result = f.finish(); assert.equal(result.miss, 1); assert.equal(result.score, 0);
  } finally { f.close(); }
});
