import test from 'node:test';
import assert from 'node:assert/strict';
import {eggGrade,eggRules,readEggJob,prepareEggJob,EGG_DIFFICULTIES,EGG_RECIPES,EGG_JOB_READY_MS,EGG_JOB_LIMIT_MS} from '../utils/eggJob.ts';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const key='@mentore/feed_state_v1',now=Date.parse('2026-10-09T03:07:00Z');
const feed={points:70,lastFeedTime:'today',satietyAtFeed:83,happiness:{value:78},housekeeping:{owned:['broom']},hygiene:{lastBathAt:now,protectedUntil:0}};
const setup=(initial=feed)=>{const data=new Map([[key,JSON.stringify(initial)]]);let fail=false;return {data,fail:()=>{fail=true;},store:createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key])};};
const endAt=pot=>pot.startedAt+pot.targetMs;
const salary=pot=>eggRules(pot.difficulty).perfectPay;

test('legacy pots retain their original grading and pay',()=>{
  assert.deepEqual(eggGrade(5300,6000),{grade:'raw',earned:0});assert.deepEqual(eggGrade(5600,6000),{grade:'good',earned:12});assert.deepEqual(eggGrade(6000,6000),{grade:'perfect',earned:30});assert.deepEqual(eggGrade(6220,6000),{grade:'perfect',earned:30});assert.deepEqual(eggGrade(6700,6000),{grade:'hard',earned:0});
});
test('harder tiers move faster, narrow the timing window and pay more at both success grades',()=>{
  let previous={limitMs:EGG_JOB_LIMIT_MS,perfectMs:220,goodMs:650,perfectPay:0,goodPay:0};
  for(const d of EGG_DIFFICULTIES){
    assert.ok(d.limitMs<previous.limitMs);assert.ok(d.perfectMs<previous.perfectMs);assert.ok(d.goodMs<previous.goodMs);
    assert.ok(d.perfectPay>previous.perfectPay);assert.ok(d.goodPay>previous.goodPay);
    for(const sign of [-1,1]){
      const target=d.limitMs*.65;
      assert.deepEqual(eggGrade(target+sign*d.perfectMs,target,d.id),{grade:'perfect',earned:d.perfectPay});
      assert.deepEqual(eggGrade(target+sign*(d.perfectMs+1),target,d.id),{grade:'good',earned:d.goodPay});
      assert.deepEqual(eggGrade(target+sign*d.goodMs,target,d.id),{grade:'good',earned:d.goodPay});
      assert.deepEqual(eggGrade(target+sign*(d.goodMs+1),target,d.id),{grade:sign<0?'raw':'hard',earned:0});
    }
    previous=d;
  }
});
test('random order IDs produce all tiers; replaying a start never rerolls its difficulty or clock',async()=>{
  const seen=new Set();
  for(let i=0;i<60;i++){
    const {store}=setup();const op={kind:'start',id:`order-${i}`};
    const first=await store.transaction(values=>prepareEggJob(values,op,now,feed));
    const duplicate=await store.transaction(values=>prepareEggJob(values,{kind:'start',id:'different-id',recipe:'firm'},now+1000,feed));
    seen.add(first.state.active.difficulty);assert.deepEqual(duplicate.state.active,first.state.active);
    assert.equal(first.state.active.startedAt,now+EGG_JOB_READY_MS);
    const retry=prepareEggJob({[key]:JSON.stringify(feed)},op,now,feed).result;
    assert.deepEqual(retry.state.active,first.state.active);
  }
  assert.deepEqual([...seen].sort(),EGG_DIFFICULTIES.map(d=>d.id).sort());
});
test('completed jobs pay once and preserve care data',async()=>{
  const {store,data}=setup();const first=await store.transaction(values=>prepareEggJob(values,{kind:'start',id:'a'},now,feed));
  const pot=first.state.active,at=endAt(pot);
  const results=await Promise.all(Array.from({length:8},()=>store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'a',finishedAt:at},at+80,feed))));
  assert.equal(results.filter(r=>r.newlyGranted).length,1);const saved=JSON.parse(data.get(key));assert.equal(saved.points,70+salary(pot));assert.equal(saved.eggJob.active,null);assert.equal(saved.eggJob.receipts.length,1);assert.deepEqual(saved.hygiene,feed.hygiene);assert.deepEqual(saved.housekeeping,feed.housekeeping);assert.equal(saved.satietyAtFeed,83);
});
test('the countdown cannot finish a pot; reloading an overdue pot cannot rewind its timer',async()=>{
  const {store,data}=setup();const first=await store.transaction(values=>prepareEggJob(values,{kind:'start',id:'a'},now,feed));
  await assert.rejects(store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'a',finishedAt:now+100},now+100,feed)),/まだ調理/);
  assert.deepEqual(readEggJob(JSON.parse(data.get(key)).eggJob).active,first.state.active);
  const result=await store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'a'},now+20000,feed));assert.equal(result.receipt.grade,'hard');assert.equal(result.feed.points,70);
  await assert.rejects(store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'missing'},now+30000,feed)),/完了/);
});
test('interrupted finish recovers the original timing, difficulty and salary',async()=>{
  const {store,data,fail}=setup();const start=await store.transaction(values=>prepareEggJob(values,{kind:'start',id:'a'},now,feed));const pot=start.state.active,finishedAt=endAt(pot);
  fail();await assert.rejects(store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'a',finishedAt},finishedAt,feed)),/disk/);
  const result=await store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'a',finishedAt},finishedAt+1500,feed));assert.equal(result.receipt.grade,'perfect');assert.equal(result.receipt.difficulty,pot.difficulty);assert.equal(result.newlyGranted,false);assert.equal(JSON.parse(data.get(key)).points,70+salary(pot));
});
test('an interrupted start recovers its original countdown and does not reroll',async()=>{
  const {store,data,fail}=setup();const op={kind:'start',id:'start-recovery',recipe:'soft'};
  const expected=prepareEggJob({[key]:JSON.stringify(feed)},op,now,feed).result.state.active;
  fail();await assert.rejects(store.transaction(values=>prepareEggJob(values,op,now,feed)),/disk/);
  const result=await store.transaction(values=>prepareEggJob(values,op,now+1000,feed));
  assert.deepEqual(result.state.active,expected);assert.deepEqual(JSON.parse(data.get(key)).eggJob.active,expected);
});
test('all recipes keep their identity and scaled target after reload at every difficulty',async()=>{
  for(const recipe of EGG_RECIPES){
    const seen=new Set();
    for(let i=0;i<30&&seen.size<3;i++){
      const {store,data}=setup(),id=`${recipe.id}-${i}`;
      const start=await store.transaction(values=>prepareEggJob(values,{kind:'start',id,recipe:recipe.id},now,feed));
      const pot=readEggJob(JSON.parse(data.get(key)).eggJob).active,rules=eggRules(pot.difficulty);
      assert.deepEqual(pot,start.state.active);assert.equal(pot.recipe,recipe.id);seen.add(pot.difficulty);
      assert.ok(Math.abs(pot.targetMs*EGG_JOB_LIMIT_MS/rules.limitMs-recipe.targetMs)<=122);
      assert.ok(pot.targetMs-rules.goodMs>0&&pot.targetMs+rules.goodMs<rules.limitMs);
      const at=endAt(pot),done=await store.transaction(values=>prepareEggJob(values,{kind:'finish',id,finishedAt:at},at,feed));
      assert.equal(done.receipt.grade,'perfect');assert.equal(done.receipt.recipe,recipe.id);assert.equal(done.receipt.difficulty,pot.difficulty);assert.equal(done.receipt.targetMs,pot.targetMs);assert.equal(done.feed.points,70+rules.perfectPay);
    }
    assert.equal(seen.size,3);
  }
});
test('a pot saved by the old version remains playable without adopting a faster tier',async()=>{
  const pot={id:'legacy',startedAt:now,targetMs:6500},initial={...feed,eggJob:{active:pot,receipts:[]}};
  const {store}=setup(initial);assert.deepEqual(readEggJob(initial.eggJob).active,pot);
  const repeated=await store.transaction(values=>prepareEggJob(values,{kind:'start',id:'new'},now+100,feed));assert.deepEqual(repeated.state.active,pot);
  const done=await store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'legacy',finishedAt:now+6500},now+6500,feed));
  assert.equal(done.receipt.earned,30);assert.equal(done.receipt.difficulty,undefined);assert.equal(done.feed.points,100);
});
