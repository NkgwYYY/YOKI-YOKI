import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('require', 'exports', code)(id => {
    if (id.endsWith('.mp3')) return id;
    if (id === '@/constants/theme') return { activityPalette: {} };
    let target = path.resolve(path.dirname(file), id);
    target = fs.existsSync(target + '.ts') ? target + '.ts' : path.join(target, 'index.ts');
    return load(target);
  }, exports);
  return exports;
}
const root = fileURLToPath(new URL('../utils/rhythm/', import.meta.url));
const { SONGS } = load(path.join(root, 'songs.ts'));
const { getChart } = load(path.join(root, 'charts/index.ts'));
for (const song of SONGS) for (const mode of ['tap', 'jump', 'swipe', 'copy', 'relax']) for (const difficulty of ['easy', 'normal', 'hard']) {
  test(`${song.id}/${mode}/${difficulty}: playable ordered chart`, () => {
    const chart = getChart(song.id, mode, difficulty);
    assert.ok(chart?.notes.length);
    let previous = -Infinity;
    for (const note of chart.notes) {
      assert.ok(Number.isFinite(note.time) && note.time >= 0 && note.time < song.duration, `unplayable note at ${note.time}`);
      assert.ok(note.time >= previous);
      if (mode === 'jump') assert.ok(note.time - previous >= 0.35);
      assert.ok(Number.isInteger(note.lane) && note.lane >= 0 && note.lane < 4);
      if (mode === 'swipe') assert.ok(['left', 'right', 'up', 'down'].includes(note.direction));
      previous = note.time;
    }
  });
}
