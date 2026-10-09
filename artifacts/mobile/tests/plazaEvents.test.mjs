import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePlazaEvent,PLAZA_KINDS} from '../utils/plazaEvents.ts';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const key='@mentore/feed_state_v1',today='2026-10-09',now=1791514800000;
const feed={points:100,lastFeedTime:'today',satietyAtFeed:70,happiness:{value:80},eggJob:{marker:'keep'}};
function setup(initial=feed){
 const data=new Map([[key,JSON.stringify(initial)]]);let fail=false;
 const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key]);
 return {data,fail:()=>{fail=true;},run:(op,at=now,day=today,roll=0)=>store.transaction(values=>preparePlazaEvent(values,op,day,at,feed,roll))};
}
async function first(s){await s.run({kind:'visit'});return s.run({kind:'visit'},now+6500);}
function seeded(kind,points=100){return {...feed,points,plazaEvents:{day:today,seen:[kind],serial:1,nextAt:0,current:{id:'test-1',kind}}};}
test('first encounter arrives after a short delay; re-entry preserves identity and kind',async()=>{
 const s=setup(),scheduled=await s.run({kind:'visit'});assert.equal(scheduled.state.current,undefined);
 assert.equal((await s.run({kind:'visit'},now+6499)).state.current,undefined);
 const arrived=await s.run({kind:'visit'},now+6500);assert.equal(arrived.state.current.kind,'balloon');
 assert.deepEqual((await s.run({kind:'visit'},now+99000,today,.99)).state.current,arrived.state.current);
});
test('balloon reward commits once and preserves all unrelated care and job data',async()=>{
 const s=setup(),event=(await first(s)).state.current;
 const a=await s.run({kind:'resolve',id:event.id,choice:'accept'}),b=await s.run({kind:'resolve',id:event.id,choice:'accept'});
 assert.equal(a.feed.points,160);assert.equal(b.feed.points,160);assert.equal(b.changed,false);
 assert.deepEqual(a.feed.happiness,feed.happiness);assert.deepEqual(a.feed.eggJob,feed.eggJob);
});
test('scammer only takes the agreed deposit; decline costs nothing',async()=>{
 for(const choice of ['accept','decline']){const s=setup(seeded('scammer'));const r=await s.run({kind:'resolve',id:'test-1',choice});assert.equal(r.feed.points,choice==='accept'?70:100);}
});
test('not enough points never creates a debt or resolves the encounter',async()=>{
 const s=setup(seeded('scammer',29));await assert.rejects(s.run({kind:'resolve',id:'test-1',choice:'accept'}),/30pt/);
 const r=await s.run({kind:'visit'});assert.equal(r.feed.points,29);assert.equal(r.state.current.outcome,undefined);
 assert.equal((await s.run({kind:'resolve',id:'test-1',choice:'decline'})).feed.points,29);
});
test('journal recovery after a failed write never doubles a payout or debit',async()=>{
 for(const kind of ['balloon','scammer']){const s=setup(seeded(kind));s.fail();const op={kind:'resolve',id:'test-1',choice:'accept'};await assert.rejects(s.run(op),/disk/);const r=await s.run(op);assert.equal(r.feed.points,kind==='balloon'?160:70);assert.equal(r.changed,false);}
});
test('concurrent choices can only settle one outcome',async()=>{
 const s=setup(seeded('scammer'));const results=await Promise.all([s.run({kind:'resolve',id:'test-1',choice:'accept'}),s.run({kind:'resolve',id:'test-1',choice:'decline'})]);
 assert.equal(results[0].feed.points,70);assert.equal(results[1].feed.points,70);assert.equal(results[1].state.current.outcome.choice,'accept');
});
test('four distinct daily encounters, persisted cooldown and no repeat farming',async()=>{
 const s=setup();let r=await first(s),at=now+6500;const kinds=[];
 for(let i=0;i<4;i++){
  const e=r.state.current;kinds.push(e.kind);
  r=await s.run({kind:'resolve',id:e.id,choice:'accept'},at,today,.5);
  const nextAt=r.state.nextAt;assert.equal(nextAt,at+420000);
  await s.run({kind:'leave',id:e.id},at);
  await assert.rejects(s.run({kind:'resolve',id:e.id,choice:'accept'},at),/終わって/);
  assert.equal((await s.run({kind:'visit'},nextAt-1)).state.current,undefined);
  at=nextAt;r=await s.run({kind:'visit'},at);
 }
 assert.deepEqual(new Set(kinds),new Set(PLAZA_KINDS));assert.equal(r.state.current,undefined);assert.equal(r.feed.points,175);
 assert.equal((await s.run({kind:'visit'},at+999999)).state.current,undefined);
 const tomorrow=await s.run({kind:'visit'},at+86400000,'2026-10-10');assert.equal(tomorrow.state.seen.length,1);
});
test('unfinished outcomes survive midnight; moving the date backward does not reset the cap',async()=>{
 const s=setup(seeded('balloon'));const r=await s.run({kind:'visit'},now+86400000,'2026-10-10');assert.equal(r.state.current.id,'test-1');
 const limited=setup({...feed,plazaEvents:{day:'2026-10-10',seen:[...PLAZA_KINDS],serial:4,nextAt:0}});
 assert.equal((await limited.run({kind:'visit'},now,today)).state.current,undefined);
});
