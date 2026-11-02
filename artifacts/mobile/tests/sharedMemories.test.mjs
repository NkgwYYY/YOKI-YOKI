import test from 'node:test';
import assert from 'node:assert/strict';
import {sharedMemories} from '../utils/sharedMemories.ts';
test('empty history never invents a diary, meal or attendance date',()=>{
 assert.deepEqual(sharedMemories(undefined,undefined,''),{firstDiary:null,latestDiary:null,diaryCount:0,visitDays:0,lastMeal:null});
 assert.equal(sharedMemories(undefined,undefined,'invalid').lastMeal,null);
});
test('only actually saved user pages count, ordered by their dates; opening a character letter does not count',()=>{
 const pages={'2026-11-02':{date:'2026-11-02',user:{mood:4,text:''}},'2026-10-31':{date:'2026-10-31',user:{mood:3,text:'hello'}},'2026-10-30':{date:'2026-10-30',letter:{body:'hi'}}};
 const m=sharedMemories({pages},undefined,'2026-11-02T03:00:00.000Z');
 assert.equal(m.diaryCount,2);assert.equal(m.firstDiary.date,'2026-10-31');assert.equal(m.latestDiary.date,'2026-11-02');assert.equal(m.lastMeal.toISOString(),'2026-11-02T03:00:00.000Z');
});
