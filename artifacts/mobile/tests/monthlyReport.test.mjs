import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyReport } from '../utils/monthlyReport.ts';

test('monthly summary counts each calendar date once, using its last saved value', () => {
  const report = buildMonthlyReport([
    { date: '2026-09-01', mood: 1 }, { date: '2026-09-01', mood: 1 },
    { date: '2026-09-01', mood: 4 }, { date: '2026-09-02', mood: 4 },
    { date: '2026-08-31', mood: 1 }, { date: '2026-09-04', mood: 2 },
  ], '2026-09');
  assert.equal(report.recordedDays, 3);
  assert.equal(report.mostMood, 4);
  assert.equal(report.longestStreak, 2);
  assert.equal(report.recordsByDay[1].mood, 4);
});

test('empty and leap months remain valid report cards', () => {
  const report = buildMonthlyReport([], '2024-02');
  assert.equal(report.daysInMonth, 29);
  assert.equal(report.recordedDays, 0);
  assert.equal(report.mostMood, null);
  assert.equal(report.longestStreak, 0);
});
