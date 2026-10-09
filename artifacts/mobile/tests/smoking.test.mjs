import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSmoking,readHappiness,grantHappiness,prepareHappiness} from './careModules.mjs';
import {smokingStatus,CRAVING_INTERVAL_MS,QUIT_DURATION_MS,SMOKE_LIMIT_MS} from '../utils/smokingState.ts';
import {hygieneValue} from '../utils/hygiene.ts';
import {prepareCleaning,BODY_WASH_SPOTS} from '../utils/housekeeping.ts';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const now=Date.parse('2026-10-09T00:00:00Z'),date='2026-10-09',key='@mentore/feed_state_v1';
const day=t=>new Date(t).toISOString().slice(0,10);
const feed={points:72,lastFeedTime:'unchanged',satietyAtFeed:83,happiness:{value:70,updatedOn:date,days:{}},hygiene:{lastBathAt:now,protectedUntil:0,smokeDirt:0}};
const apply=(f,op,t)=>prepareSmoking({[key]:JSON.stringify(f)},op,day(t),t,feed).result;
const puff=(f,id,t,ms=5000)=>apply(apply(f,{kind:'start',id},t).feed,{kind:'finish',id,elapsedMs:ms},t+ms).feed;
const dependent=()=>puff(puff(puff(feed,'a',now),'b',now+10000),'c',now+20000);
function memory(initial){const data=new Map([[key,JSON.stringify(initial)]]);let fail=false;const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key]);return {data,store,fail:()=>{fail=true;}};}

test('each full five seconds adds happiness and dirt; only the first tick counts a session',()=>{
 let f=apply(feed,{kind:'start',id:'duration'},now).feed;
 f=apply(f,{kind:'progress',id:'duration',elapsedMs:4999},now+4999).feed;
 assert.equal(f.happiness.value,70);assert.equal(f.happiness.smoking.sessions,0);
 f=apply(f,{kind:'progress',id:'duration',elapsedMs:5000},now+5000).feed;
 assert.equal(f.happiness.value,71);assert.equal(f.hygiene.smokeDirt,1);assert.equal(f.happiness.smoking.sessions,1);
 f=apply(f,{kind:'finish',id:'duration',elapsedMs:16999},now+16999).feed;
 assert.equal(f.happiness.value,73);assert.equal(f.hygiene.smokeDirt,3);assert.equal(f.happiness.smoking.sessions,1);
 assert.equal(f.happiness.smoking.lastSmokedAt,now+16999);assert.equal(hygieneValue(f.hygiene,0,now+16999),97);
 assert.equal(f.points,feed.points);assert.equal(f.satietyAtFeed,feed.satietyAtFeed);assert.equal(f.lastFeedTime,feed.lastFeedTime);
});
test('leaving before five seconds does not count, and the third separate session creates dependence',()=>{
 let f=puff(feed,'short',now,4999);assert.equal(f.happiness.smoking.sessions,0);
 for(let i=1;i<=3;i++){f=puff(f,'count-'+i,now+i*10000);assert.equal(smokingStatus(f.happiness.smoking,now+i*10000+5000).dependent,i===3);}
 assert.equal(f.happiness.smoking.sessions,3);
});
test('time and rewards cap at sixty seconds; full happiness never prevents dirt or habit formation',()=>{
 let f={...feed,happiness:{...feed.happiness,value:100},hygiene:{...feed.hygiene,smokeDirt:80}};
 f=puff(f,'cap',now,180000);
 assert.equal(f.happiness.value,100);assert.equal(f.hygiene.smokeDirt,85);assert.equal(f.happiness.smoking.sessions,1);
 assert.equal(f.happiness.smoking.receipts[0].elapsedMs,SMOKE_LIMIT_MS);
 assert.equal(hygieneValue(f.hygiene,100,now+180000),15);
});
test('four-hour craving boundaries deduct once and cannot be replayed or reversed by the clock',()=>{
 const f=dependent(),last=f.happiness.smoking.lastSmokedAt;
 assert.equal(readHappiness(f.happiness,day(last),last+CRAVING_INTERVAL_MS-1).value,73);
 const at=readHappiness(f.happiness,day(last),last+CRAVING_INTERVAL_MS);
 assert.equal(at.value,70);assert.equal(smokingStatus(at.smoking,last+CRAVING_INTERVAL_MS).craving,true);
 assert.equal(readHappiness(at,day(last),last+CRAVING_INTERVAL_MS).value,70);
 assert.equal(readHappiness(at,day(last),last).value,70);
 assert.equal(readHappiness(at,day(last),last+CRAVING_INTERVAL_MS*2).value,67);
 assert.equal(smokingStatus(puff(feed,'one',now).happiness.smoking,now+CRAVING_INTERVAL_MS*2).craving,false);
});
test('five full days cures dependence offline, resets the count and stops withdrawal',()=>{
 const f=dependent(),last=f.happiness.smoking.lastSmokedAt,end=last+QUIT_DURATION_MS;
 assert.equal(smokingStatus(f.happiness.smoking,end-1).dependent,true);
 const h=readHappiness(f.happiness,day(end),end),status=smokingStatus(h.smoking,end);
 assert.equal(status.dependent,false);assert.equal(status.craving,false);assert.equal(status.recovered,true);assert.equal(h.smoking.sessions,0);assert.equal(h.value,40);
 const later=readHappiness({...h,value:85},day(end),end+CRAVING_INTERVAL_MS*2);assert.equal(later.value,85);
 const next=puff({...f,happiness:h},'after-quit',end+1);assert.equal(next.happiness.smoking.sessions,1);assert.equal(smokingStatus(next.happiness.smoking,end+5001).dependent,false);
});
test('smoking again restarts the five-day clock and calms craving; other happiness helps without resetting abstinence',()=>{
 const f=dependent(),last=f.happiness.smoking.lastSmokedAt,t=last+CRAVING_INTERVAL_MS;
 for(const action of ['meal','record','homeBath','bath','ramen','visit']){
  const reward=grantHappiness(f.happiness,action,day(t),t);
  assert.ok(reward.gained>0);assert.equal(reward.state.smoking.lastSmokedAt,last);assert.equal(smokingStatus(reward.state.smoking,t).craving,true);
 }
 const next=puff(f,'relapse',t);assert.equal(next.happiness.smoking.lastSmokedAt,t+5000);
 assert.equal(smokingStatus(next.happiness.smoking,t+5000).craving,false);
 assert.equal(smokingStatus(next.happiness.smoking,last+QUIT_DURATION_MS).dependent,true);
 assert.equal(smokingStatus(next.happiness.smoking,t+5000+QUIT_DURATION_MS).dependent,false);
});
test('washing removes dirt without curing dependence or moving the quit clock',()=>{
 const f=dependent(),t=now+30000;
 const result=prepareCleaning({[key]:JSON.stringify(f)},{kind:'bodyWash',id:'wash',coverage:BODY_WASH_SPOTS.map(()=>1)},t,feed).result;
 assert.equal(result.feed.hygiene.smokeDirt,0);assert.deepEqual(result.feed.happiness.smoking,f.happiness.smoking);
});
test('reopening an abandoned session uses only confirmed time, not hours spent away',()=>{
 let f=apply(feed,{kind:'start',id:'abandoned'},now).feed;
 f=apply(f,{kind:'progress',id:'abandoned',elapsedMs:10000},now+10000).feed;
 const result=apply(f,{kind:'recover'},now+CRAVING_INTERVAL_MS);
 assert.equal(result.receipt.elapsedMs,10000);assert.equal(result.feed.happiness.value,72);assert.equal(result.feed.hygiene.smokeDirt,2);assert.equal(result.feed.happiness.smoking.lastSmokedAt,now+10000);
 assert.equal(apply(result.feed,{kind:'recover'},now+CRAVING_INTERVAL_MS).changed,false);
});
test('duplicate and out-of-order checkpoints and concurrent finishes never add rewards twice',async()=>{
 const {data,store}=memory(feed);
 const tx=(op,t)=>store.transaction(values=>prepareSmoking(values,op,day(t),t,feed));
 await tx({kind:'start',id:'once'},now);
 await tx({kind:'progress',id:'once',elapsedMs:10000},now+10000);
 await tx({kind:'progress',id:'once',elapsedMs:5000},now+10000);
 await Promise.all(Array.from({length:8},()=>tx({kind:'finish',id:'once',elapsedMs:15000},now+15000)));
 const f=JSON.parse(data.get(key));assert.equal(f.happiness.value,73);assert.equal(f.hygiene.smokeDirt,3);assert.equal(f.happiness.smoking.sessions,1);assert.equal(f.happiness.smoking.receipts.length,1);
 assert.equal(apply(f,{kind:'start',id:'once'},now+15000).state.active,null);
 assert.throws(()=>apply(f,{kind:'finish',id:'missing',elapsedMs:5000},now+20000),/終了/);
});
test('an interrupted checkpoint is recovered before retry; later care is preserved',async()=>{
 const {data,store,fail}=memory(feed),tx=(op,t)=>store.transaction(values=>prepareSmoking(values,op,day(t),t,feed));
 await tx({kind:'start',id:'recover'},now);fail();
 await assert.rejects(tx({kind:'progress',id:'recover',elapsedMs:5000},now+5000),/disk/);
 await tx({kind:'progress',id:'recover',elapsedMs:5000},now+5000);
 await store.transaction(values=>prepareHappiness(values,'record',date,feed,now+6000));
 await tx({kind:'finish',id:'recover',elapsedMs:10000},now+10000);
 const f=JSON.parse(data.get(key));assert.equal(f.happiness.value,84);assert.equal(f.hygiene.smokeDirt,2);assert.equal(f.happiness.smoking.sessions,1);assert.equal(f.points,72);assert.equal(data.has('journal'),false);
});
test('bad elapsed times, overlapping sessions and clock rollback cannot credit smoking',()=>{
 const f=apply(feed,{kind:'start',id:'valid'},now).feed;
 for(const elapsedMs of [-1,NaN,Infinity,10001])assert.throws(()=>apply(f,{kind:'progress',id:'valid',elapsedMs},now+10000),/時間/);
 assert.throws(()=>apply(f,{kind:'start',id:'other'},now),/前の一服/);
 const done=puff(feed,'clock',now);assert.throws(()=>apply(done,{kind:'start',id:'backward'},now),/時刻/);
});
test('old smoking dirt is preserved without inventing dated sessions or dependence',()=>{
 const old={...feed,hygiene:{...feed.hygiene,smokeDirt:9,smokeReceipts:['old-a','old-b','old-c']}};
 const migrated=apply(old,{kind:'recover'},now).feed;
 assert.equal(migrated.hygiene.smokeDirt,9);assert.equal(migrated.happiness.smoking.sessions,0);assert.equal(migrated.happiness.value,70);
});
test('a delayed finish retry keeps the actual last puff time instead of restarting abstinence',()=>{
 const f=apply(feed,{kind:'start',id:'delayed'},now).feed;
 const result=apply(f,{kind:'finish',id:'delayed',elapsedMs:10000,at:now+10000},now+3600000);
 assert.equal(result.feed.happiness.smoking.lastSmokedAt,now+10000);
 assert.equal(result.receipt.gained,2);assert.equal(result.receipt.dirt,2);
 assert.throws(()=>apply(f,{kind:'finish',id:'delayed',elapsedMs:5000,at:now+20000},now+10000),/時間/);
});
