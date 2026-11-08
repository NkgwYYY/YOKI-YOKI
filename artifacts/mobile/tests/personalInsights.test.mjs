import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPersonalInsights } from '../utils/personalInsights.ts';

const today = '2026-11-01';
const date = offset => new Date(Date.parse(`${today}T12:00:00Z`) - offset * 86400000).toISOString().slice(0, 10);
const record = (offset, mood, behaviors = [], extra = {}) => ({ date: date(offset), mood, behaviors, sleep: 0, sleepRecorded: false, ...extra });
const clearPattern = (n = 18) => Array.from({ length: n }, (_, i) => record(i, i % 2 ? 2 : 5, [i % 2 ? 'ゆっくり休んだ' : '外に出た']));

test('real distinct days produce an evidence-backed observation, with an explicit comparison', () => {
  const report = buildPersonalInsights(clearPattern(), today);
  assert.equal(report.status, 'ready');
  assert.equal(report.recordedDays, 18);
  assert.equal(report.insights.length, 1);
  const insight = report.insights[0];
  assert.equal(insight.id, 'personal:activity:外に出た');
  assert.deepEqual(insight.evidence, {
    selectedLabel: '外に出た日', selectedDays: 9, selectedGoodDays: 9,
    comparisonLabel: 'ほかの過ごし方を記録した日', comparisonDays: 9, comparisonGoodDays: 0,
    from: '2026-10-03', to: '2026-11-01',
  });
  assert.match(insight.body, /かもしれない/);
  assert.match(insight.evidenceText, /原因を示すものではありません/);
});

test('sparse records and missing comparison days never create a finding', () => {
  assert.equal(buildPersonalInsights(clearPattern(13), today).status, 'gathering');
  const onlyOneActivity = clearPattern().map(r => ({ ...r, behaviors: ['外に出た'] }));
  assert.equal(buildPersonalInsights(onlyOneActivity, today).insights.length, 0);
  const tooFewExposures = clearPattern().map((r, i) => ({ ...r, behaviors: [i < 3 ? '外に出た' : 'ゆっくり休んだ'] }));
  assert.equal(buildPersonalInsights(tooFewExposures, today).insights.length, 0);
});

test('mood-only and empty-tag days are unknown, never negative evidence', () => {
  const rows = clearPattern().map((r, i) => i % 2 ? { ...r, behaviors: [] } : r);
  const report = buildPersonalInsights(rows, today);
  assert.equal(report.recordedDays, 18);
  assert.equal(report.eligibleDays, 9);
  assert.equal(report.insights.length, 0);
  assert.equal(buildPersonalInsights(rows.map(r => ({ ...r, behaviors: undefined })), today).insights.length, 0);
});

test('equal mood rates, tiny differences and nonspecific positivity do not become personalized advice', () => {
  assert.equal(buildPersonalInsights(clearPattern().map(r => ({ ...r, mood: 5 })), today).insights.length, 0);
  const rows = Array.from({ length: 28 }, (_, i) => record(i, i % 7 ? 4 : 3, [i % 2 ? '外に出た' : '趣味を楽しんだ']));
  assert.equal(buildPersonalInsights(rows, today).insights.length, 0);
});

test('date deduplication follows the committed first record rather than selecting the happier one', () => {
  const first = clearPattern(10);
  const duplicates = first.map(r => ({ ...r, mood: 5 }));
  const report = buildPersonalInsights([...first, ...duplicates], today);
  assert.equal(report.recordedDays, 10);
  assert.equal(report.status, 'gathering');
  assert.equal(report.moodDays.find(r => r.date === first[1].date).mood, 2);
});

test('future, impossible, out-of-window dates and invalid moods cannot add evidence', () => {
  const invalid = [record(-1, 5, ['外に出た']), record(30, 5, ['外に出た']),
    { date: '2026-02-30', mood: 5, behaviors: ['外に出た'] },
    record(20, NaN), record(21, 6), record(22, 1.5), null];
  const report = buildPersonalInsights([...clearPattern(12), ...invalid], today);
  assert.equal(report.recordedDays, 12);
  assert.equal(report.insights.length, 0);
  assert.equal(buildPersonalInsights(clearPattern(), 'bad-date').recordedDays, 0);
});

test('co-occurring activities do not appear as several independent discoveries', () => {
  const rows = clearPattern().map((r, i) => i % 2 ? r : { ...r, behaviors: ['外に出た', '自然を感じた', '人と話した'] });
  const report = buildPersonalInsights(rows, today);
  assert.equal(report.insights.length, 1);
});

test('searching more activity comparisons raises the evidence bar for a marginal finding', () => {
  const rows = Array.from({ length: 20 }, (_, i) => {
    const selected = i % 2 === 0, groupIndex = Math.floor(i / 2);
    return record(i, groupIndex < (selected ? 8 : 3) ? 5 : 2, [selected ? '外に出た' : 'その他']);
  });
  assert.equal(buildPersonalInsights(rows, today).insights.length, 1);
  const moreComparisons = rows.map((r, i) => i % 2 ? r : { ...r, behaviors: ['外に出た', '自然を感じた'] });
  assert.equal(buildPersonalInsights(moreComparisons, today).insights.length, 0);
});

test('a before/after period change alone is not attributed to an activity', () => {
  const rows = Array.from({ length: 20 }, (_, i) => record(i, i < 10 ? 5 : 2, [i < 10 ? '外に出た' : 'ゆっくり休んだ']));
  assert.equal(buildPersonalInsights(rows, today).insights.length, 0);
});

test('sleep observations use explicitly recorded hours independently of behavior tags', () => {
  const rows = Array.from({ length: 18 }, (_, i) => record(i, i % 2 ? 2 : 5, [], { sleep: i % 2 ? 6 : 8, sleepRecorded: true }));
  const report = buildPersonalInsights(rows, today);
  assert.equal(report.insights.length, 1);
  assert.equal(report.insights[0].id, 'personal:sleep:8');
  assert.equal(report.insights[0].evidence.selectedDays, 9);
  assert.match(report.insights[0].suggestion, /目標にしなくて大丈夫/);
  assert.equal(buildPersonalInsights(rows.map(r => ({ ...r, sleepRecorded: false })), today).insights.length, 0);
});

test('unknown or imported tags cannot become action recommendations', () => {
  const rows = clearPattern().map((r, i) => ({ ...r, behaviors: [i % 2 ? '任意のタグB' : '任意のタグA'] }));
  assert.equal(buildPersonalInsights(rows, today).insights.length, 0);
});

test('observations refresh with edits and expired evidence is not cached as current', () => {
  const rows = clearPattern();
  assert.equal(buildPersonalInsights(rows, today).status, 'ready');
  assert.equal(buildPersonalInsights(rows.map(r => ({ ...r, mood: 3 })), today).insights.length, 0);
  assert.equal(buildPersonalInsights(rows, '2027-01-01').recordedDays, 0);
});

test('building observations does not mutate the source journal or inspect notes', () => {
  const rows = clearPattern().map(r => Object.freeze({ ...r, behaviors: Object.freeze(r.behaviors), notes: 'private entry never used' }));
  const before = JSON.stringify(rows);
  const report = buildPersonalInsights(Object.freeze(rows), today);
  assert.equal(JSON.stringify(rows), before);
  assert.equal(JSON.stringify(report).includes('private entry'), false);
});

test('explicit none answers can be compared, but skipped activities cannot',()=>{
 const rows=clearPattern().map((r,i)=>({...r,behaviors:i%2?[]:['外に出た'],behaviorsRecorded:true}));
 assert.equal(buildPersonalInsights(rows,today).insights[0].id,'personal:activity:外に出た');
 assert.equal(buildPersonalInsights(rows.map((r,i)=>i%2?{...r,behaviorsRecorded:false}:r),today).insights.length,0);
});
test('work/rest observations use only explicitly answered day types',()=>{
 const rows=clearPattern().map((r,i)=>({...r,behaviors:[],dayType:i%2?'work':'rest'}));
 const report=buildPersonalInsights(rows,today);
 assert.equal(report.insights.length,1);assert.equal(report.insights[0].id,'personal:day:rest');
 assert.equal(report.insights[0].evidence.selectedDays,9);
 assert.equal(buildPersonalInsights(rows.map((r,i)=>i%2?{...r,dayType:undefined}:r),today).insights.length,0);
});

test('optional food and relationship choices participate in observations, while skipped days remain unknown',()=>{
 for(const label of ['ご飯をたくさん食べた','恋人と会った','友人と会った']){
  const rows=Array.from({length:20},(_,i)=>record(i,i%2?2:5,i%2?[]:[label],{behaviorsRecorded:true}));
  const report=buildPersonalInsights(rows,today);
  assert.ok(report.insights.some(insight=>insight.id==='personal:activity:'+label));
  const skipped=rows.map((r,i)=>i%2?{...r,behaviorsRecorded:false}:r);
  assert.equal(buildPersonalInsights(skipped,today).insights.length,0);
 }
});
