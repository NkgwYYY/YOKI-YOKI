import assert from 'node:assert/strict';
import test from 'node:test';
import { withinTimingWindow, noteHasExpired } from '../utils/rhythm/judgment.ts';

test('inclusive timing boundaries survive seconds-to-milliseconds conversion', () => {
  // 1.1 - 1 evaluates slightly above 100ms in binary floating point.
  for (const time of [1, 17.3, 93.7, 179.9]) for (const window of [100, 190, 300, 180, 450]) {
    for (const direction of [-1, 1]) {
      const boundary = time + direction * window / 1000;
      assert.equal(withinTimingWindow((boundary - time) * 1000, window), true);
      const outside = time + direction * (window + 0.01) / 1000;
      assert.equal(withinTimingWindow((outside - time) * 1000, window), false);
    }
    assert.equal(noteHasExpired(time, time + window / 1000, window), false);
    assert.equal(noteHasExpired(time, time + (window + 0.01) / 1000, window), true);
    assert.equal(noteHasExpired(time, time - 1, window), false);
  }
});

test('invalid clock deltas cannot earn a timing judgment', () => {
  for (const delta of [NaN, Infinity, -Infinity]) assert.equal(withinTimingWindow(delta, 300), false);
});
