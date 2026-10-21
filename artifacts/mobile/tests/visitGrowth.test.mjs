import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceVisit,shiftDay,moodDays,mergeVisitGrowth,readVisitGrowth,nextVisitStage,civilDay} from '../utils/visitGrowth.ts';

const start='2026-10-21';
function chain(days,initial){let state=initial;for(let i=0;i<days;i++)state=advanceVisit(state,shiftDay(start,i));return state;}
test('opening on 3, 10 and 30 consecutive civil days unlocks the intended forms',()=>{
 assert.equal(chain(2).stage,'egg');assert.equal(chain(3).stage,'odango');
 assert.equal(chain(9).stage,'odango');assert.equal(chain(10).stage,'stage3');
 assert.equal(chain(29).stage,'stage3');assert.equal(chain(30).stage,'stage4');
 assert.equal(nextVisitStage(chain(30)),null);assert.equal(chain(30).totalVisits,30);
});
test('same-day reloads and backward clock changes never award or remove attendance',()=>{
 const s=chain(10);assert.equal(advanceVisit(s,s.lastDate),s);
 assert.equal(advanceVisit(s,'2026-01-01'),s);assert.equal(s.streak,10);
});
test('a long absence regresses exactly once, preserves memory and restarts the streak',()=>{
 const s=chain(30),day=shiftDay(s.lastDate,70),returned=advanceVisit(s,day);
 assert.equal(returned.stage,'stage3');assert.equal(returned.highestStage,'stage4');
 assert.equal(returned.streak,1);assert.equal(returned.bestStreak,30);assert.equal(returned.totalVisits,31);
 assert.equal(returned.change,'returned');assert.equal(advanceVisit(returned,day),returned);
 let next=returned;for(let i=1;i<30;i++)next=advanceVisit(next,shiftDay(day,i));
 assert.equal(next.stage,'stage4');assert.equal(next.streak,30);
});
test('a one-day gap drops only one form; consecutive days do not keep downgrading',()=>{
 const s=chain(10),back=advanceVisit(s,shiftDay(s.lastDate,2));
 assert.equal(back.stage,'odango');assert.equal(advanceVisit(back,shiftDay(back.lastDate,1)).stage,'odango');
 const egg=advanceVisit(chain(2),shiftDay(start,4));assert.equal(egg.stage,'egg');
});
test('first migration preserves existing forms without inventing visit history',()=>{
 for(const [level,stage] of [[1,'egg'],[3,'odango'],[6,'stage3'],[15,'stage4']]){
  const s=advanceVisit(undefined,start,level);assert.equal(s.stage,stage);
  assert.equal(s.streak,1);assert.equal(s.totalVisits,1);assert.deepEqual(s.dates,[start]);
 }
});
test('calendar arithmetic crosses month, year, leap day and DST without UTC-local gaps',()=>{
 assert.equal(shiftDay('2026-12-31',1),'2027-01-01');assert.equal(shiftDay('2028-02-28',1),'2028-02-29');
 assert.equal(shiftDay('2026-03-08',1),'2026-03-09');assert.equal(shiftDay('2026-11-01',1),'2026-11-02');
 assert.ok(Number.isNaN(civilDay('2026-02-30')));assert.throws(()=>advanceVisit(null,'2026-02-30'));
});
test('corrupt saved state is rejected instead of erased',()=>{
 assert.equal(readVisitGrowth({streak:99}),null);assert.throws(()=>advanceVisit({streak:99},start));
 assert.throws(()=>advanceVisit({...chain(3),stage:'missing'},start));
});
test('cloud merge does not resurrect the old advanced form after a recorded return',()=>{
 const old=chain(30),recent=advanceVisit(old,shiftDay(old.lastDate,3));
 assert.equal(mergeVisitGrowth(old,recent),recent);assert.equal(mergeVisitGrowth(recent,old),recent);
 assert.equal(mergeVisitGrowth(undefined,recent),recent);
});
test('mood frame shows only real recent records, leaves missing dates blank, and uses latest revision',()=>{
 const days=moodDays([{date:'2026-10-20',mood:1},{date:'2026-10-20',mood:4},{date:'2026-10-16',mood:3},{date:'2026-10-19',mood:0},{date:'2026-11-01',mood:5}],start);
 assert.equal(days.length,7);assert.deepEqual(days.map(d=>d.mood),[null,3,null,null,null,4,null]);
 assert.equal(days.at(-1).date,start);assert.equal(moodDays([],start).every(d=>d.mood===null),true);
});
