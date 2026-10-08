import test from 'node:test';
import assert from 'node:assert/strict';
import {CLEANING_TOOLS,DUST_SPOTS,readHousekeeping,roomDirt,sweptSpots,prepareCleaning} from '../utils/housekeeping.ts';
import {hygieneValue,DAY_MS,BATH_SKIP} from '../utils/hygiene.ts';
import {prepareHappiness,HAPPY_REWARDS} from '../utils/happiness.ts';
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
test('repeat baths refresh cleanliness without farming happiness; hot springs give more happiness',async()=>{
  assert.ok(HAPPY_REWARDS.bath>HAPPY_REWARDS.homeBath&&HAPPY_REWARDS.visit>HAPPY_REWARDS.bath);
  const {store}=memory();const first=await store.transaction(values=>prepareHappiness(values,'homeBath','2026-10-08',feed,now));
  const again=await store.transaction(values=>prepareHappiness(values,'homeBath','2026-10-08',feed,now+3600000));
  assert.equal(first.gained,4);assert.equal(again.gained,0);assert.equal(again.feed.hygiene.lastBathAt,now+3600000);assert.equal(again.feed.points,300);
});
test('an interrupted purchase recovers the item and exact debit on retry',async()=>{
  const data=new Map([[key,JSON.stringify(feed)]]);let fail=true;
  const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key]);
  await assert.rejects(store.transaction(values=>prepareCleaning(values,{kind:'buy',tool:'cloth'},now,feed)),/disk/);
  const retry=await store.transaction(values=>prepareCleaning(values,{kind:'buy',tool:'cloth'},now,feed));assert.equal(retry.feed.points,270);assert.deepEqual(retry.feed.housekeeping.owned,['cloth']);assert.equal(retry.spent,0);
});
