import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHomeCommentCacheSource,
  getHomeCommentTimeOfDay,
} from '../utils/homeCommentTiming.ts';

test('端末の現地時刻を4つの時間帯へ分類する', () => {
  const cases = [
    [4, 'night'],
    [5, 'morning'],
    [10, 'morning'],
    [11, 'daytime'],
    [15, 'daytime'],
    [16, 'evening'],
    [19, 'evening'],
    [20, 'night'],
  ];
  for (const [hour, expected] of cases) {
    assert.equal(getHomeCommentTimeOfDay(new Date(2026, 8, 6, hour)), expected);
  }
});

test('朝のキャッシュを夜には再利用しない', () => {
  const common = {
    date: '2026-09-06',
    mascotName: 'こころん',
    frequency: 'daily',
    includeRecentChat: true,
    context: '',
    recentChat: '',
  };
  const morning = buildHomeCommentCacheSource({ ...common, timeOfDay: 'morning' });
  const night = buildHomeCommentCacheSource({ ...common, timeOfDay: 'night' });
  assert.notEqual(morning, night);
});

test('同じ時間帯では毎日設定の一言を安定して再利用する', () => {
  const base = {
    date: '2026-09-06',
    mascotName: 'こころん',
    frequency: 'daily',
    includeRecentChat: true,
    timeOfDay: 'morning',
  };
  const beforeRecord = buildHomeCommentCacheSource({
    ...base,
    context: '',
    recentChat: '',
  });
  const afterRecord = buildHomeCommentCacheSource({
    ...base,
    context: '今日の気分: 良い',
    recentChat: 'ユーザー: おはよう',
  });
  assert.equal(beforeRecord, afterRecord);
});