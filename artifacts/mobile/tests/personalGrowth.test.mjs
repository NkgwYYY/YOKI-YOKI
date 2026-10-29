import test from 'node:test';
import assert from 'node:assert/strict';
import {personalGrowth,shiftDay,dailyLetterKey} from '../utils/personalGrowth.ts';
const r=(date,mood=3,extra={})=>({id:date,date,mood,sleep:0,sleepRecorded:false,behaviors:[],notes:'',...extra});
test('growth counts actual unique records, not logins or future/corrupt data',()=>{
 const value=personalGrowth([r('2026-10-27'),r('2026-10-27',5),r('2026-10-28'),r('2026-10-25',0),r('2026-10-20',2)],'2026-10-27');
 assert.equal(value.leaves.length,2);assert.equal(value.currentCount,1);assert.equal(value.previousCount,1);assert.equal(value.week[6].record.mood,5);assert.equal(value.week[5].record,undefined);
});
test('missing days and lower moods keep all historical leaves',()=>{
 const records=[r('2026-10-10',5),r('2026-10-27',1)];
 assert.equal(personalGrowth(records,'2026-10-27').leaves.length,2);
 const later=personalGrowth(records,'2026-11-09');assert.equal(later.leaves.length,2);assert.equal(later.currentCount,0);assert.equal(later.week.filter(d=>d.record).length,0);
});
test('week crosses month, year and leap day without filling the gaps',()=>{
 assert.equal(shiftDay('2026-01-01',-1),'2025-12-31');assert.equal(shiftDay('2024-03-01',-1),'2024-02-29');
 const d=personalGrowth([r('2025-12-31')],'2026-01-02');assert.equal(d.week.length,7);assert.equal(d.currentCount,1);assert.equal(d.week[4].date,'2025-12-31');
});
test('empty review makes no claim of improvement and letter receipts isolate date and account',()=>{
 assert.match(personalGrowth([],'2026-10-27').review,/まだ記録はありません/);
 assert.notEqual(dailyLetterKey('a','2026-10-27'),dailyLetterKey('b','2026-10-27'));
 assert.notEqual(dailyLetterKey('a','2026-10-27'),dailyLetterKey('a','2026-10-28'));
 assert.notEqual(dailyLetterKey('a/b','2026-10-27'),dailyLetterKey('a%2Fb','2026-10-27'));
});
