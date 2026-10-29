import test from 'node:test';
import assert from 'node:assert/strict';
import {HAPPY_REWARDS,grantHappiness,readHappiness,prepareHappiness,prepareHappinessVisit} from './careModules.mjs';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const date='2026-10-08',key='@mentore/feed_state_v1';
const feed={points:72,lastFeedTime:'2026-10-08T08:00:00Z',satietyAtFeed:100};

const now=Date.parse(date+'T08:00:00Z'),HOUR=3600000,DAY=24*HOUR;
const saved=(value=75)=>({value,updatedOn:date,updatedAt:now,lastSeenAt:now,days:{[date]:['visit']}});

test('daily visits maintain happiness; two unattended days cause a large drop even after the return reward',()=>{
  assert.equal(grantHappiness(null,'visit',date,now).state.value,64);
  const daily=grantHappiness(saved(),'visit','2026-10-09',now+DAY);
  assert.equal(daily.state.value,75);
  assert.equal(readHappiness(saved(),'2026-10-10',now+2*DAY).value,3);
  const returned=grantHappiness(saved(),'visit','2026-10-10',now+2*DAY);
  assert.equal(returned.state.value,27);
  assert.equal(readHappiness(saved(),'2027-01-01',now+90*DAY).value,0);
});
test('clock time drives offline decay, including within one date and across midnight',()=>{
  assert.equal(readHappiness(saved(),date,now+6*HOUR).value,69);
  assert.equal(readHappiness(saved(),'2026-10-09',now+16*HOUR).value,59);
  assert.equal(readHappiness(saved(),'2026-10-09',now+25*HOUR).value,49);
});
test('reading or saving partial hours never erases elapsed time or applies absence twice',()=>{
  let state=saved(100);
  for(let minutes=15;minutes<=48*60;minutes+=15)state=JSON.parse(JSON.stringify(readHappiness(state,'2026-10-10',now+minutes*60000)));
  assert.equal(state.value,28);
  assert.deepEqual(readHappiness(state,'2026-10-10',now+2*DAY),state);
  assert.equal(readHappiness(saved(100),'2026-10-10',now+2*DAY).value,state.value);
});
test('old saves keep their current value and begin real-time decay when migrated',()=>{
  const old={value:82,updatedOn:'2026-09-01',days:{'2026-09-01':['visit']}};
  const migrated=readHappiness(old,date,now);
  assert.equal(migrated.value,82);assert.equal(migrated.lastSeenAt,now);
  assert.equal(readHappiness(migrated,date,now+HOUR).value,81);
  assert.deepEqual(migrated.days,old.days);
});
test('presence checkpoints keep active users out of the accelerated absence rate without farming visits',()=>{
  let current={...feed,happiness:saved(100)};
  assert.equal(prepareHappinessVisit({[key]:JSON.stringify(current)},date,feed,now+5*60000),null);
  for(let minute=15;minute<=23*60;minute+=15){
    const result=prepareHappinessVisit({[key]:JSON.stringify(current)},date,feed,now+minute*60000);
    assert.equal(result.result.newlyGranted,false);current=result.result.feed;
  }
  assert.equal(current.happiness.value,77);
  assert.equal(readHappiness(current.happiness,'2026-10-09',now+25*HOUR).value,75);
  assert.equal(current.points,feed.points);
});
test('a backwards clock cannot gain happiness, rewind the baseline or create another reward',()=>{
  const future=saved();
  assert.equal(grantHappiness(future,'meal',date,now-HOUR).newlyGranted,false);
  assert.equal(readHappiness(future,date,now-HOUR).updatedAt,now);
  assert.equal(readHappiness(future,date,now+HOUR).value,74);
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
  assert.equal(saved.happiness.value,64);assert.deepEqual(saved.happiness.days[date],['visit']);
  assert.equal(data.has('journal'),false);
});
test('interrupted happiness save recovers exactly once without overwriting balances',async()=>{
  const data=new Map([[key,JSON.stringify(feed)]]);let fail=true;
  const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key]);
  await assert.rejects(store.transaction(values=>prepareHappiness(values,'visit',date,feed)),/disk/);
  const retry=await store.transaction(values=>prepareHappiness(values,'visit',date,feed));
  assert.equal(retry.newlyGranted,false);assert.equal(retry.feed.happiness.value,64);assert.equal(retry.feed.points,72);
});

test('the old one-off smoke reward is no longer accepted',()=>{
 assert.throws(()=>prepareHappiness({[key]:JSON.stringify(feed)},'smoke',date,feed),/Invalid happiness action/);
});

test('retired smoking history is preserved without withdrawal penalties', () => {
  const now=Date.parse(date+'T08:00:00Z');
  const smoking={sessions:3,lastSmokedAt:now-8*3600000,cravingSteps:0,giftCigarettes:2,active:null,receipts:[]};
  const saved={value:80,updatedOn:date,days:{},smoking,smokingRetired:true};
  const restored=readHappiness(saved,date,now);
  assert.equal(restored.value,80);
  assert.deepEqual(restored.smoking,smoking,'saved history is not deleted');
  const rewarded=grantHappiness(restored,'meal',date,now).state;
  assert.equal(rewarded.smokingRetired,true);
  assert.deepEqual(rewarded.smoking,smoking);
  assert.equal(readHappiness(JSON.parse(JSON.stringify(rewarded)),date,now+3600000).value,82);
});
