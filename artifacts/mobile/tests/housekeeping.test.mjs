import test from 'node:test';
import assert from 'node:assert/strict';
import {CLEANING_TOOLS,DUST_SPOTS,readHousekeeping,roomDirt,sweptSpots,prepareCleaning,BODY_WASH_SPOTS,rubBody,isBodyWashComplete,bodyWashPercent,hasBathedToday,bathDateKey} from '../utils/housekeeping.ts';
import {hygieneValue,readHygiene,DAY_MS,BATH_SKIP} from '../utils/hygiene.ts';
import {prepareHappiness,HAPPY_REWARDS,prepareSmoking} from './careModules.mjs';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const now=Date.parse('2026-10-08T10:00:00Z'),key='@mentore/feed_state_v1';
const feed={points:300,lastFeedTime:'2026-10-08T08:00:00Z',satietyAtFeed:100,happiness:{value:75,updatedOn:'2026-10-08',days:{'2026-10-08':['visit']}}};
function memory(initial=feed){const data=new Map([[key,JSON.stringify(initial)]]);return {data,store:createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>data.set(k,v),removeItem:async k=>data.delete(k)},'journal',[key])};}
test('dust accumulates gradually in the room and reaches full dirt after three days',()=>{
  const house=readHousekeeping(null,now);
  assert.ok(roomDirt(house,now).every(v=>v===0));
  const one=roomDirt(house,now+DAY_MS),two=roomDirt(house,now+2*DAY_MS),three=roomDirt(house,now+3*DAY_MS);
  assert.ok(one.some(v=>v>0)&&one.some(v=>v===0));
  assert.ok(two.every((v,i)=>v>=one[i]));assert.ok(three.every(v=>v===1));
  assert.ok(roomDirt(house,now-DAY_MS).every(v=>v===0));
});
test('concurrent purchases debit once and keep other wallet state intact',async()=>{
  const {store,data}=memory();await Promise.all(Array.from({length:8},()=>store.transaction(values=>prepareCleaning(values,{kind:'buy',tool:'robot'},now,feed))));
  const saved=JSON.parse(data.get(key));assert.equal(saved.points,300-CLEANING_TOOLS.robot.cost);assert.deepEqual(saved.housekeeping.owned,['robot']);assert.deepEqual(saved.happiness,feed.happiness);assert.equal(saved.satietyAtFeed,100);
  await assert.rejects(store.transaction(values=>prepareCleaning(values,{kind:'buy',tool:'robot-invalid'},now,feed)),/Unknown/);
});
test('cleaning requires an owned tool, removes only rubbed spots and survives reload',async()=>{
  const {store,data}=memory();await store.transaction(values=>prepareCleaning(values,{kind:'buy',tool:'broom'},now,feed));
  await assert.rejects(store.transaction(values=>prepareCleaning(values,{kind:'clean',tool:'cloth',spots:[0]},now+3*DAY_MS,feed)),/先に/);
  const next=await store.transaction(values=>prepareCleaning(values,{kind:'clean',tool:'broom',spots:[0,0,1,-1,100]},now+3*DAY_MS,feed));
  assert.equal(next.removed,2);const house=JSON.parse(data.get(key)).housekeeping,dirt=roomDirt(house,now+3*DAY_MS);
  assert.equal(dirt[0],0);assert.equal(dirt[1],0);assert.equal(dirt[2],1);assert.equal(next.feed.points,280);
  assert.equal((await store.transaction(values=>prepareCleaning(values,{kind:'clean',tool:'broom',spots:[0]},now+3*DAY_MS,feed))).removed,0);
  const path=sweptSpots(DUST_SPOTS[0],DUST_SPOTS[2],'broom');assert.ok(path.includes(0)&&path.includes(1)&&path.includes(2));assert.ok(!path.includes(11));
});
test('bath skip grants seven days, prevents duplicate charge and does not bypass insufficient funds',async()=>{
  const {store,data}=memory();await Promise.all(Array.from({length:4},()=>store.transaction(values=>prepareCleaning(values,{kind:'bathSkip'},now,feed))));
  const saved=JSON.parse(data.get(key));assert.equal(saved.points,300-BATH_SKIP.cost);assert.equal(saved.hygiene.protectedUntil,now+7*DAY_MS);
  assert.equal(hygieneValue(saved.hygiene,0,now+7*DAY_MS),100);assert.ok(hygieneValue(saved.hygiene,0,now+11*DAY_MS)<100);
  const poor=memory({...feed,points:0});await assert.rejects(poor.store.transaction(values=>prepareCleaning(values,{kind:'bathSkip'},now,feed)),/足りません/);assert.equal(JSON.parse(poor.data.get(key)).points,0);
});
test('three days without a bath stays clean; dust and later missed baths gradually mark the shell',()=>{
  const hygiene={lastBathAt:now,protectedUntil:0};
  assert.equal(hygieneValue(hygiene,0,now+3*DAY_MS),100);
  assert.equal(hygieneValue(hygiene,0,now+4*DAY_MS),87);
  assert.equal(hygieneValue(hygiene,100,now+4*DAY_MS),67);
  assert.equal(hygieneValue(hygiene,0,now-DAY_MS),100);
});
test('soaking gives happiness but never washes the body; hot springs remain more relaxing',async()=>{
  assert.ok(HAPPY_REWARDS.bath>HAPPY_REWARDS.homeBath&&HAPPY_REWARDS.visit>HAPPY_REWARDS.bath);
  const dirty={...feed,hygiene:{lastBathAt:now-4*DAY_MS,protectedUntil:0,smokeDirt:6}};
  const {store}=memory(dirty);const first=await store.transaction(values=>prepareHappiness(values,'homeBath','2026-10-08',feed,now));
  const again=await store.transaction(values=>prepareHappiness(values,'homeBath','2026-10-08',feed,now+3600000));
  assert.equal(first.gained,4);assert.equal(again.gained,0);assert.equal(again.feed.hygiene.lastBathAt,dirty.hygiene.lastBathAt);assert.equal(again.feed.hygiene.smokeDirt,6);assert.equal(again.feed.points,300);
});
test('an interrupted purchase recovers the item and exact debit on retry',async()=>{
  const data=new Map([[key,JSON.stringify(feed)]]);let fail=true;
  const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key]);
  await assert.rejects(store.transaction(values=>prepareCleaning(values,{kind:'buy',tool:'cloth'},now,feed)),/disk/);
  const retry=await store.transaction(values=>prepareCleaning(values,{kind:'buy',tool:'cloth'},now,feed));assert.equal(retry.feed.points,270);assert.deepEqual(retry.feed.housekeeping.owned,['cloth']);assert.equal(retry.spent,0);
});

const fullyWashed=()=>BODY_WASH_SPOTS.map(()=>1);
test('only a completed body wash locks the bath until the next local calendar day',()=>{
 const late=new Date(2026,9,9,23,59,59).getTime(),midnight=new Date(2026,9,10,0,0,0).getTime();
 assert.equal(hasBathedToday(undefined,late),false);
 const initialized=prepareCleaning({}, {kind:'init'},late,feed).result.feed;
 assert.equal(hasBathedToday(initialized.hygiene,late),false);
 const skipped=prepareCleaning({}, {kind:'bathSkip'},late,feed).result.feed;
 assert.equal(hasBathedToday(skipped.hygiene,late),false);
 const saved=prepareCleaning({}, {kind:'bodyWash',id:'daily-wash',coverage:fullyWashed()},late,feed).result.feed;
 assert.equal(saved.hygiene.completedBathDate,bathDateKey(late));
 assert.equal(hasBathedToday(readHygiene(saved.hygiene,late),late),true);
 assert.equal(hasBathedToday(saved.hygiene,midnight),false);
 assert.equal(hasBathedToday(saved.hygiene,late-DAY_MS),true);
 const legacy={lastBathAt:late,protectedUntil:0,washReceipts:['old-wash']};
 assert.equal(hasBathedToday(legacy,late),true);assert.equal(hasBathedToday(legacy,midnight),false);
});
test('a new wash id cannot bypass today after getting dirty; tomorrow allows one fresh wash',async()=>{
 const dirty={...feed,hygiene:{lastBathAt:now-7*DAY_MS,protectedUntil:0,smokeDirt:10}};
 const {store,data}=memory(dirty);
 await Promise.all(['first','second'].map(id=>store.transaction(values=>prepareCleaning(values,{kind:'bodyWash',id,coverage:fullyWashed()},now,feed))));
 assert.equal(JSON.parse(data.get(key)).hygiene.washReceipts.length,1);
 await store.transaction(values=>prepareSmoking(values,{kind:'start',id:'after-bath'},bathDateKey(now),now+1,feed));
 await store.transaction(values=>prepareSmoking(values,{kind:'finish',id:'after-bath',elapsedMs:5000},bathDateKey(now),now+5001,feed));
 const repeat=await store.transaction(values=>prepareCleaning(values,{kind:'bodyWash',id:'third',coverage:fullyWashed()},now+10000,feed));
 assert.equal(repeat.changed,false);assert.equal(repeat.feed.hygiene.smokeDirt,1);assert.equal(hasBathedToday(repeat.feed.hygiene,now),true);
 const next=await store.transaction(values=>prepareCleaning(values,{kind:'bodyWash',id:'tomorrow',coverage:fullyWashed()},now+DAY_MS,feed));
 assert.equal(next.changed,true);assert.equal(next.feed.hygiene.smokeDirt,0);assert.equal(next.feed.hygiene.washReceipts.length,2);
});
test('touch without movement, off-body gestures and a single patch cannot wash the whole body',()=>{
 const empty=BODY_WASH_SPOTS.map(()=>0);
 assert.deepEqual(rubBody(empty,{x:.5,y:.5},{x:.5,y:.5}),empty);
 assert.deepEqual(rubBody(empty,{x:0,y:0},{x:1,y:0}),empty);
 assert.deepEqual(rubBody(empty,{x:NaN,y:.5},{x:.5,y:.5}),empty);
 let one=empty;
 for(let i=0;i<30;i++)one=rubBody(one,{x:.25,y:.28},{x:.45,y:.28});
 assert.ok(bodyWashPercent(one)>0&&bodyWashPercent(one)<100);
 assert.equal(isBodyWashComplete(one),false);
});
test('rubbing all parts completes washing and sampling frequency does not change progress',()=>{
 const apply=(steps)=>{
  let coverage=BODY_WASH_SPOTS.map(()=>0);
  for(let round=0;round<4;round++)for(const y of [.28,.49,.72])for(let i=0;i<steps;i++)coverage=rubBody(coverage,{x:.24+.52*i/steps,y},{x:.24+.52*(i+1)/steps,y});
  return coverage;
 };
 const coarse=apply(1),fine=apply(30);
 assert.equal(isBodyWashComplete(coarse),true);
 assert.equal(bodyWashPercent(coarse),100);
 assert.deepEqual(coarse,fine);
});
test('only complete rubbing can save cleanliness; repeat receipt never cleans later smoke',async()=>{
 const dirty={...feed,hygiene:{lastBathAt:now-7*DAY_MS,protectedUntil:now+DAY_MS,smokeDirt:9,smokeReceipts:['smoke-before']}};
 const {store,data}=memory(dirty);
 for(const coverage of [[],[1],BODY_WASH_SPOTS.map(()=>.99),BODY_WASH_SPOTS.map(()=>NaN)])await assert.rejects(store.transaction(values=>prepareCleaning(values,{kind:'bodyWash',id:'wash-a',coverage},now,feed)),/全体/);
 const before=JSON.parse(data.get(key));assert.equal(before.hygiene.smokeDirt,9);
 const washed=await store.transaction(values=>prepareCleaning(values,{kind:'bodyWash',id:'wash-a',coverage:fullyWashed()},now,feed));
 assert.equal(washed.feed.hygiene.smokeDirt,0);assert.equal(washed.feed.hygiene.lastBathAt,now);
 assert.equal(hygieneValue(washed.feed.hygiene,100,now),100);
 assert.equal(washed.feed.hygiene.protectedUntil,dirty.hygiene.protectedUntil);
 assert.equal(washed.feed.points,feed.points);assert.deepEqual(washed.feed.happiness,feed.happiness);
 await store.transaction(values=>prepareSmoking(values,{kind:'start',id:'smoke-after'},'2026-10-08',now+1,feed));
 await store.transaction(values=>prepareSmoking(values,{kind:'finish',id:'smoke-after',elapsedMs:15000},'2026-10-08',now+15001,feed));
 const retry=await store.transaction(values=>prepareCleaning(values,{kind:'bodyWash',id:'wash-a',coverage:fullyWashed()},now+15002,feed));
 assert.equal(retry.changed,false);assert.equal(retry.feed.hygiene.smokeDirt,3);
});
test('a failed wash save recovers its receipt exactly once on retry',async()=>{
 const dirty={...feed,hygiene:{lastBathAt:now-7*DAY_MS,protectedUntil:0,smokeDirt:9}};
 const data=new Map([[key,JSON.stringify(dirty)]]);let fail=true;
 const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key]);
 const operation={kind:'bodyWash',id:'wash-retry',coverage:fullyWashed()};
 await assert.rejects(store.transaction(values=>prepareCleaning(values,operation,now,feed)),/disk/);
 const retry=await store.transaction(values=>prepareCleaning(values,operation,now+1,feed));
 assert.equal(retry.changed,false);assert.equal(retry.feed.hygiene.lastBathAt,now);assert.deepEqual(retry.feed.hygiene.washReceipts,['wash-retry']);assert.equal(retry.feed.points,300);
});
