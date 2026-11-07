import assert from 'node:assert/strict';
import test from 'node:test';
import { createRecoverableStorage } from '../utils/recoverableStorage.ts';
import { claimGardenReward } from '../utils/gardenReward.ts';

const keys = ['energy','plant','feed'];
const initial = {
  energy: {storedEnergy: 12.75, totalEnergy: 40, flags:{mood:true,diary:false}},
  plant: {ecoPoints:7,totalSold:9,sellCount:2,townBuilt:1},
  feed: {points:100,lastFeedTime:'2026-09-28T12:00:00Z',satietyAtFeed:65},
};
function fixture(failAt=Infinity) {
  const data = new Map(Object.entries(initial).map(([k,v])=>[k,JSON.stringify(v)]));
  let writes=0;
  const storage={
    getItem:async key=>data.get(key)??null,
    setItem:async(key,value)=>{if(++writes===failAt)throw Error('disk full');data.set(key,value);},
    removeItem:async key=>{if(++writes===failAt)throw Error('disk full');data.delete(key);},
  };
  return {data,storage,open:()=>createRecoverableStorage(storage,'journal',keys)};
}
const read = data=>Object.fromEntries(keys.map(k=>[k,JSON.parse(data.get(k))]));
const claim = store=>store.transaction(values=>{
  const before=Object.fromEntries(keys.map(k=>[k,JSON.parse(values[k])]));
  const next=claimGardenReward(before,1);
  return {entries:keys.map(k=>[k,JSON.stringify(next.state[k])]),result:next.result};
});
test('garden reward preserves fractional energy, food state and legacy town history',()=>{
  const {state,result}=claimGardenReward(initial,1);
  assert.equal(result.received,19); assert.equal(state.energy.storedEnergy,0.75);
  assert.equal(state.feed.points,119); assert.equal(state.feed.satietyAtFeed,65);
  assert.equal(state.plant.townBuilt,1); assert.equal(state.plant.totalSold,21);
  assert.equal(state.energy.totalEnergy,40); assert.equal(initial.feed.points,100);
  assert.equal(claimGardenReward(state,1).result.received,0);
});
for(const failAt of [1,2,3,4,5])test(`write interruption ${failAt}: restart/retry never loses or duplicates rewards`,async()=>{
  const f=fixture(failAt);
  await assert.rejects(claim(f.open()),/disk full/);
  if(failAt===1) assert.deepEqual(read(f.data),initial);
  const restarted=f.open();
  await restarted.recover();
  const retry=await claim(restarted);
  assert.equal(retry.received,failAt===1?19:0);
  assert.equal(read(f.data).feed.points,119);
  assert.equal(read(f.data).energy.storedEnergy,0.75);
  assert.equal(read(f.data).plant.ecoPoints,0);
  assert.equal(f.data.has('journal'),false);
  await restarted.recover();
  assert.equal(read(f.data).feed.points,119);
});
test('parallel claim and points credit use the latest persisted balance',async()=>{
  const f=fixture(),store=f.open();
  await Promise.all([claim(store),store.transaction(values=>{
    const feed=JSON.parse(values.feed);feed.points+=3;
    return{entries:[['feed',JSON.stringify(feed)]],result:null};
  })]);
  assert.equal(read(f.data).feed.points,122);
});
test('ordinary writes wait for recovery instead of overwriting a partial transaction',async()=>{
  const f=fixture(3),store=f.open();
  await assert.rejects(claim(store));
  await store.setItem('profile','untouched');
  assert.equal(read(f.data).feed.points,119);
  assert.equal(f.data.get('profile'),'untouched');
});
test('malformed journal stays intact and cannot write an unrelated key',async()=>{
  const f=fixture();
  const invalid=JSON.stringify({version:1,entries:[['profile','overwrite']]});
  f.data.set('journal',invalid);
  await assert.rejects(f.open().recover());
  assert.equal(f.data.get('journal'),invalid);
  assert.equal(f.data.has('profile'),false);
  assert.deepEqual(read(f.data),initial);
});
