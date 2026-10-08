import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareRoomOperation, ROOM_KEYS as k } from '../utils/roomPurchase.ts';
import { createRecoverableStorage } from '../utils/recoverableStorage.ts';
const feed={points:3000,lastFeedTime:null,satietyAtFeed:65};
const room={furniture:'none',flower:'none',ownedFurniture:[],ownedFlowers:[]};
const operations=[{kind:'buy',category:'furniture',id:'sofa',cost:450},{kind:'buy',category:'flower',id:'pink',cost:250},{kind:'companion'}];
function fixture(failAt=Infinity){
  const data=new Map([[k.feed,JSON.stringify(feed)],[k.room,JSON.stringify(room)],[k.companions,'{"extraEggs":0}']]);let writes=0;
  const storage={getItem:async key=>data.get(key)??null,
    setItem:async(key,value)=>{if(++writes===failAt)throw Error('disk full');data.set(key,value);},
    removeItem:async key=>{if(++writes===failAt)throw Error('disk full');data.delete(key);}};
  return {data,open:()=>createRecoverableStorage(storage,'journal',Object.values(k))};
}
const apply=(store,op)=>store.transaction(values=>prepareRoomOperation(values,op,feed));
for(const op of operations)for(const failAt of [1,2,3,4])test(`${op.id??'companion'} write ${failAt}: retry after restart charges once`,async()=>{
  const f=fixture(failAt);await assert.rejects(apply(f.open(),op));
  const saved=await apply(f.open(),op);assert.equal(saved.success,true);
  assert.equal(saved.feed.points,3000-(op.cost??1000));
  if(op.kind==='companion')assert.equal(saved.companions.extraEggs,1);
  else assert.deepEqual(saved.room[op.category==='flower'?'ownedFlowers':'ownedFurniture'],[op.id]);
  const retry=await apply(f.open(),op);assert.equal(retry.feed.points,saved.feed.points);assert.equal(retry.newlyPurchased,false);
  assert.equal(f.data.has('journal'),false);
});
test('concurrent duplicate and distinct purchases preserve every receipt and latest wallet',async()=>{
  const f=fixture(),store=f.open();await Promise.all([...operations,operations[0]].map(op=>apply(store,op)));
  assert.equal(JSON.parse(f.data.get(k.feed)).points,1300);
  const saved=JSON.parse(f.data.get(k.room));assert.deepEqual(saved.ownedFurniture,['sofa']);assert.deepEqual(saved.ownedFlowers,['pink']);
  assert.equal(JSON.parse(f.data.get(k.companions)).extraEggs,1);
});
test('selection after interrupted purchase recovers ownership before applying selection',async()=>{
  const f=fixture(3);await assert.rejects(apply(f.open(),operations[0]));
  const saved=await apply(f.open(),{kind:'select',category:'furniture',id:'none'});
  assert.equal(saved.room.furniture,'none');assert.deepEqual(saved.room.ownedFurniture,['sofa']);assert.equal(saved.feed.points,2550);
});
test('invalid prices, wrong category, insufficient funds and unowned selection never write',async()=>{
  const f=fixture(),store=f.open();f.data.set(k.feed,JSON.stringify({...feed,points:1}));const before=new Map(f.data);
  for(const op of [...operations,{kind:'buy',category:'flower',id:'sofa',cost:450},
    {kind:'select',category:'flower',id:'pink'},...[0,-1,NaN,Infinity].map(cost=>({...operations[0],cost}))]){
    assert.equal((await apply(store,op)).success,false);assert.deepEqual(f.data,before);
  }
});
test('malformed purchase snapshots are retained for recovery rather than overwritten',async()=>{
  for(const [key,value]of [[k.feed,'{"points":null}'],[k.room,'{}'],[k.companions,'{"extraEggs":-1}'],[k.room,'false']]){
    const f=fixture();f.data.set(key,value);const before=new Map(f.data);
    await assert.rejects(apply(f.open(),operations[0]));assert.deepEqual(f.data,before);
  }
});
