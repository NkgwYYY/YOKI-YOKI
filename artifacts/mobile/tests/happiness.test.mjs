import test from 'node:test';
import assert from 'node:assert/strict';
import {HAPPY_REWARDS,grantHappiness,readHappiness,prepareHappiness} from './careModules.mjs';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const date='2026-10-08',key='@mentore/feed_state_v1';
const feed={points:72,lastFeedTime:'2026-10-08T08:00:00Z',satietyAtFeed:100};

test('a visit is the largest contribution and absence never makes happiness collapse',()=>{
  for(const [action,reward] of Object.entries(HAPPY_REWARDS))if(action!=='visit')assert.ok(reward<HAPPY_REWARDS.visit);
  const first=grantHappiness(null,'visit',date);
  assert.equal(first.state.value,75);
  assert.equal(readHappiness(first.state,'2027-01-01').value,40);
  assert.equal(grantHappiness(first.state,'visit','2027-01-01').state.value,75);
});
test('reloads, repeated records and repeat activities cannot farm same-day happiness',()=>{
  for(const action of Object.keys(HAPPY_REWARDS)){
    const first=grantHappiness(null,action,date);
    const again=grantHappiness(JSON.parse(JSON.stringify(first.state)),action,date);
    assert.equal(again.newlyGranted,false);assert.equal(again.gained,0);
    assert.equal(again.state.value,first.state.value);
    const next=grantHappiness(again.state,action,'2026-10-09');
    assert.equal(next.newlyGranted,true);
  }
});
test('values cap at 100 and going backwards in time cannot award another visit',()=>{
  let state=grantHappiness(null,'visit',date).state;
  for(const action of Object.keys(HAPPY_REWARDS))state=grantHappiness(state,action,date).state;
  assert.equal(state.value,100);
  assert.equal(grantHappiness(state,'visit','2026-10-07').newlyGranted,false);
});
test('a visit preserves the full wallet and satiety; retries are atomic with other rewards',async()=>{
  const data=new Map([[key,JSON.stringify(feed)]]);
  const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>data.set(k,v),removeItem:async k=>data.delete(k)},'journal',[key]);
  await Promise.all(Array.from({length:8},()=>store.transaction(values=>prepareHappiness(values,'visit',date,feed))));
  const saved=JSON.parse(data.get(key));
  assert.equal(saved.points,72);assert.equal(saved.lastFeedTime,feed.lastFeedTime);assert.equal(saved.satietyAtFeed,100);
  assert.equal(saved.happiness.value,75);assert.deepEqual(saved.happiness.days[date],['visit']);
  assert.equal(data.has('journal'),false);
});
test('interrupted happiness save recovers exactly once without overwriting balances',async()=>{
  const data=new Map([[key,JSON.stringify(feed)]]);let fail=true;
  const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key]);
  await assert.rejects(store.transaction(values=>prepareHappiness(values,'visit',date,feed)),/disk/);
  const retry=await store.transaction(values=>prepareHappiness(values,'visit',date,feed));
  assert.equal(retry.newlyGranted,false);assert.equal(retry.feed.happiness.value,75);assert.equal(retry.feed.points,72);
});

test('the old one-off smoke reward is no longer accepted',()=>{
 assert.throws(()=>prepareHappiness({[key]:JSON.stringify(feed)},'smoke',date,feed),/Invalid happiness action/);
});
