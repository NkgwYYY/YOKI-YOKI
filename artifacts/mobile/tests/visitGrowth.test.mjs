import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceVisit,shiftDay,moodDays,mergeVisitGrowth,readVisitGrowth,nextVisitStage,civilDay} from '../utils/visitGrowth.ts';

const start='2026-10-21';
function chain(days,initial){let state=initial;for(let i=0;i<days;i++)state=advanceVisit(state,shiftDay(start,i));return state;}
test('opening on 3, 10 and 30 cumulative civil days unlocks the intended forms',()=>{
 assert.equal(chain(2).stage,'egg');assert.equal(chain(3).stage,'odango');
 assert.equal(chain(9).stage,'odango');assert.equal(chain(10).stage,'stage3');
 assert.equal(chain(29).stage,'stage3');assert.equal(chain(30).stage,'stage4');
 assert.equal(nextVisitStage(chain(30)),null);assert.equal(chain(30).totalVisits,30);
});
test('same-day reloads and backward clock changes never award or remove attendance',()=>{
 const s=chain(10);assert.equal(advanceVisit(s,s.lastDate),s);
 assert.equal(advanceVisit(s,'2026-01-01'),s);assert.equal(s.streak,10);
});
test('a long absence keeps the form and total while optional streak restarts',()=>{
 const s=chain(30),day=shiftDay(s.lastDate,70),returned=advanceVisit(s,day);
 assert.equal(returned.stage,'stage4');assert.equal(returned.highestStage,'stage4');
 assert.equal(returned.streak,1);assert.equal(returned.bestStreak,30);assert.equal(returned.totalVisits,31);
 assert.notEqual(returned.change,'returned');assert.equal(advanceVisit(returned,day),returned);
});
test('non-consecutive visits evolve and a legacy downgraded form is restored',()=>{
 let s;for(let i=0;i<10;i++)s=advanceVisit(s,shiftDay(start,i*3));
 assert.equal(s.stage,'stage3');assert.equal(s.totalVisits,10);
 const old={...s,version:1,historicalVisits:undefined,stage:'odango',highestStage:'stage4'};
 const migrated=advanceVisit(old,s.lastDate);
 assert.equal(migrated.stage,'stage4');assert.equal(migrated.totalVisits,10);assert.equal(migrated.version,2);
 assert.equal(advanceVisit(migrated,s.lastDate),migrated);
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
test('cloud merge unions separate dates, counts shared days once and never downgrades',()=>{
 const shared=chain(3),a=advanceVisit(shared,shiftDay(start,5)),b=advanceVisit(shared,shiftDay(start,6));
 const merged=mergeVisitGrowth(a,b);assert.equal(merged.totalVisits,5);assert.equal(merged.stage,'odango');
 assert.deepEqual(mergeVisitGrowth(merged,b),merged);assert.deepEqual(mergeVisitGrowth(b,a),merged);
 assert.equal(mergeVisitGrowth(undefined,a),a);
});
test('old truncated history is preserved and the new ledger survives more than a year',()=>{
 const legacy={...chain(30),version:1,totalVisits:430,bestStreak:40};
 const upgraded=advanceVisit(legacy,shiftDay(legacy.lastDate,2));
 assert.equal(upgraded.totalVisits,431);assert.equal(upgraded.historicalVisits,400);
 assert.equal(mergeVisitGrowth(upgraded,legacy).totalVisits,431);
 const all=chain(400);assert.equal(all.dates.length,400);assert.equal(readVisitGrowth(all),all);
});
test('different legacy truncation windows never double-count historical days when merged',()=>{
 const legacy=days=>{const all=chain(days);return {...all,version:1,historicalVisits:undefined,historicalThrough:undefined,dates:all.dates.slice(-366)};};
 const a=legacy(400),b=legacy(430),merged=mergeVisitGrowth(a,b);
 assert.equal(merged.totalVisits,430);assert.equal(merged.historicalVisits,64);
 assert.deepEqual(mergeVisitGrowth(b,a),merged);
 assert.deepEqual(mergeVisitGrowth(merged,a),merged);
 const next=advanceVisit(merged,shiftDay(b.lastDate,2));
 assert.equal(mergeVisitGrowth(a,next).totalVisits,431);
 assert.equal(readVisitGrowth({...a,totalVisits:3,bestStreak:3,streak:3}),null);
 assert.equal(readVisitGrowth({...merged,historicalThrough:merged.dates[0]}),null);
});
test('mood frame shows only real recent records, leaves missing dates blank, and uses latest revision',()=>{
 const days=moodDays([{date:'2026-10-20',mood:1},{date:'2026-10-20',mood:4},{date:'2026-10-16',mood:3},{date:'2026-10-19',mood:0},{date:'2026-11-01',mood:5}],start);
 assert.equal(days.length,7);assert.deepEqual(days.map(d=>d.mood),[null,3,null,null,null,4,null]);
 assert.equal(days.at(-1).date,start);assert.equal(moodDays([],start).every(d=>d.mood===null),true);
});
