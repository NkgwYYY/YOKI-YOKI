import test from 'node:test';
import assert from 'node:assert/strict';
import {eggGrade,prepareEggJob} from '../utils/eggJob.ts';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const key='@mentore/feed_state_v1',now=Date.parse('2026-10-08T11:00:00Z');
const feed={points:70,lastFeedTime:'today',satietyAtFeed:83,happiness:{value:78},housekeeping:{owned:['broom']},hygiene:{lastBathAt:now,protectedUntil:0}};
const setup=()=>{const data=new Map([[key,JSON.stringify(feed)]]);let fail=false;return {data,fail:()=>{fail=true;},store:createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key])};};
test('egg timing grades distinguish raw, good, perfect and overcooked',()=>{
  assert.deepEqual(eggGrade(5300,6000),{grade:'raw',earned:0});assert.deepEqual(eggGrade(5600,6000),{grade:'good',earned:12});assert.deepEqual(eggGrade(6000,6000),{grade:'perfect',earned:30});assert.deepEqual(eggGrade(6220,6000),{grade:'perfect',earned:30});assert.deepEqual(eggGrade(6700,6000),{grade:'hard',earned:0});
});
test('start persists one active pot; completed jobs pay once and preserve care data',async()=>{
  const {store,data}=setup();const first=await store.transaction(values=>prepareEggJob(values,{kind:'start',id:'a'},now,feed));
  const duplicate=await store.transaction(values=>prepareEggJob(values,{kind:'start',id:'b'},now+100,feed));assert.equal(duplicate.state.active.id,'a');
  const at=now+first.state.active.targetMs;
  const results=await Promise.all(Array.from({length:8},()=>store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'a',finishedAt:at},at+80,feed))));
  assert.equal(results.filter(r=>r.newlyGranted).length,1);const saved=JSON.parse(data.get(key));assert.equal(saved.points,100);assert.equal(saved.eggJob.active,null);assert.equal(saved.eggJob.receipts.length,1);assert.deepEqual(saved.hygiene,feed.hygiene);assert.deepEqual(saved.housekeeping,feed.housekeeping);assert.equal(saved.satietyAtFeed,83);
});
test('reload resumes cooking, overdue pot earns nothing, missing pot cannot create points',async()=>{
  const {store}=setup();await store.transaction(values=>prepareEggJob(values,{kind:'start',id:'a'},now,feed));
  const result=await store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'a'},now+20000,feed));assert.equal(result.receipt.grade,'hard');assert.equal(result.feed.points,70);
  await assert.rejects(store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'missing'},now+30000,feed)),/完了/);
});
test('interrupted finish recovers the original timing and salary',async()=>{
  const {store,data,fail}=setup();const start=await store.transaction(values=>prepareEggJob(values,{kind:'start',id:'a'},now,feed));const finishedAt=now+start.state.active.targetMs;
  fail();await assert.rejects(store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'a',finishedAt},finishedAt,feed)),/disk/);
  const result=await store.transaction(values=>prepareEggJob(values,{kind:'finish',id:'a',finishedAt},finishedAt+1500,feed));assert.equal(result.receipt.grade,'perfect');assert.equal(result.newlyGranted,false);assert.equal(JSON.parse(data.get(key)).points,100);
});
