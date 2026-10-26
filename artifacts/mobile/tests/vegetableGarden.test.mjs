import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const source=p=>stripTypeScriptTypes(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const {prepareGarden,readGarden,plotStatus,gardenUnlocked,wholesaleUnlocked,CROPS}=await import(url(source('../utils/vegetableGarden.ts')));
const definitions=url(source('../data/villageStories.ts'));
const progress=url(source('../utils/villageStories.ts').replace("'../data/villageStories'",JSON.stringify(definitions)));
const {prepareVillageStory}=await import(progress);
const {storyEncounters}=await import(url(source('../utils/storyEncounters.ts').replace("'../data/villageStories'",JSON.stringify(definitions)).replace("'./villageStories'",JSON.stringify(progress))));
const {canVisitMap}=await import(url(source('../utils/worldMaps.ts')));
const key='@mentore/feed_state_v1',day=n=>`2026-10-${String(n).padStart(2,'0')}`;
const grandma={episodes:Array.from({length:6},(_,i)=>({date:day(i+1),choice:0}))};
const baseline={points:100,satietyAtFeed:60,lastFeedTime:'saved',exchangeDiary:{preserve:true},villageStories:{version:1,arcs:{grandma}}};
function fixture(feed=baseline){
 const data=new Map([[key,JSON.stringify(feed)]]);let fail=false;
 const storage=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key,'@yoki/bowling_v1']);
 const current=()=>JSON.parse(data.get(key)),revision=()=>current().vegetableGarden?.revision??0;
 const run=(op,n=10)=>storage.transaction(v=>prepareGarden(v,{revision:revision(),...op},day(n),baseline));
 return {data,current,revision,run,fail:()=>{fail=true;},story:(op,n)=>storage.transaction(v=>prepareVillageStory(v,op,day(n),baseline))};
}
test('six natural meetings unlock the hidden house, garden, and starter seeds together',async()=>{
 const f=fixture({...baseline,villageStories:undefined});
 assert.equal(gardenUnlocked(f.current()),false);assert.equal(canVisitMap('grandma',{version:1,unlocked:[]}),false);
 await assert.rejects(f.run({kind:'buy',crop:'tomato'}),/招待/);
 const places=['market','ramen','homewares','market','market','market'];
 for(let i=0;i<6;i++){
  await f.story({id:'grandma',episode:i,choice:0,place:places[i]},i+1);
  assert.equal(gardenUnlocked(f.current()),i===5);
 }
 assert.equal(canVisitMap('grandma',{version:1,unlocked:[]},gardenUnlocked(f.current())),true);
 assert.deepEqual(readGarden(f.current().vegetableGarden).seeds,{turnip:2,carrot:1,tomato:0});
 assert.equal(f.current().points,100);
});
test('every crop requires seven watered days and cannot mature before a full week',async()=>{
 for(const crop of Object.keys(CROPS)){
  const f=fixture();await f.run({kind:'buy',crop},7);await f.run({kind:'plant',plot:0,crop},7);
  for(let dayNumber=8;dayNumber<=13;dayNumber++){
   assert.equal(plotStatus(f.current().vegetableGarden.plots[0],day(dayNumber)).mature,false);
   await assert.rejects(f.run({kind:'harvest',plot:0},dayNumber),/待とう/);
   await f.run({kind:'water',plot:0},dayNumber);
   await assert.rejects(f.run({kind:'water',plot:0},dayNumber),/もうあげた/);
  }
  const ready=f.current().vegetableGarden.plots[0];assert.equal(plotStatus(ready,day(14)).growth,7);
  assert.equal(plotStatus(ready,day(14)).mature,true);
  await f.run({kind:'harvest',plot:0},14);
  assert.equal(f.current().vegetableGarden.produce[crop],3);assert.equal(f.current().vegetableGarden.harvests,1);
  assert.equal(f.current().vegetableGarden.plots[0],null);
  assert.deepEqual(f.current().exchangeDiary,{preserve:true});
 }
});
test('missing watering days delays growth without withering or losing a planted seed',async()=>{
 const f=fixture();await f.run({kind:'plant',crop:'turnip',plot:0},7);
 const reopened=fixture(f.current());
 assert.equal(plotStatus(reopened.current().vegetableGarden.plots[0],day(25)).growth,1);
 await assert.rejects(reopened.run({kind:'harvest',plot:0},25),/待とう/);
 await reopened.run({kind:'water',plot:0},25);
 assert.equal(reopened.current().vegetableGarden.plots[0].crop,'turnip');
 assert.equal(reopened.current().vegetableGarden.seeds.turnip,1);
});
test('replayed purchases, harvests and simultaneous clicks never duplicate stock or points',async()=>{
 const f=fixture();await Promise.all([f.run({kind:'buy',crop:'tomato',revision:0}),f.run({kind:'buy',crop:'tomato',revision:0})]);
 assert.equal(f.current().points,75);assert.equal(f.current().vegetableGarden.seeds.tomato,1);
 const matured={...readGarden(undefined),revision:2,lastDay:day(13),plots:[{crop:'turnip',planted:day(7),watered:[7,8,9,10,11,12,13].map(day)},null,null,null]};
 const h=fixture({...baseline,vegetableGarden:matured});await Promise.all([h.run({kind:'harvest',plot:0,revision:2},14),h.run({kind:'harvest',plot:0,revision:2},14)]);
 assert.equal(h.current().vegetableGarden.produce.turnip,3);
});
test('an interrupted seed purchase recovers with the same revision and only one debit',async()=>{
 const f=fixture();f.fail();await assert.rejects(f.run({kind:'buy',crop:'tomato',revision:0}),/disk/);
 await f.run({kind:'buy',crop:'tomato',revision:0});
 assert.equal(f.current().points,75);assert.equal(f.current().vegetableGarden.seeds.tomato,1);assert.equal(f.data.has('journal'),false);
});
test('harvest introduces the ramen conversation; wholesale pays slightly more only after the agreement',async()=>{
 const f=fixture(),state=f.current().villageStories;
 assert.equal(storyEncounters(state,day(10),'ramen').some(e=>e.id==='supply'),false);
 const op={id:'supply',episode:0,choice:1,place:'ramen'};
 await assert.rejects(f.story(op,10),/収穫/);
 const grown={...readGarden(undefined),harvests:1,produce:{turnip:3,carrot:0,tomato:0}};
 const h=fixture({...baseline,vegetableGarden:grown});
 assert.equal(storyEncounters(state,day(10),'ramen',true).some(e=>e.id==='supply'),true);
 await assert.rejects(h.run({kind:'sell',crop:'turnip',venue:'ramen'}),/仕入れ/);
 await h.run({kind:'sell',crop:'turnip',venue:'homewares'});assert.equal(h.current().points,105);
 await h.story(op,10);assert.equal(wholesaleUnlocked(h.current()),true);
 await h.run({kind:'sell',crop:'turnip',venue:'ramen'});assert.equal(h.current().points,112);
 assert.equal(h.current().vegetableGarden.produce.turnip,1);
 for(const c of Object.values(CROPS)){assert.ok(c.wholesale>c.sell);assert.ok(c.sell*c.yield-c.price<=3);}
});
test('empty inventory, low balance, occupied plots, clock reversal and corrupt saves fail without changes',async()=>{
 const f=fixture({...baseline,points:0});const before=f.data.get(key);
 for(const op of [{kind:'buy',crop:'carrot'},{kind:'plant',crop:'tomato',plot:0},{kind:'sell',crop:'carrot',venue:'homewares'},{kind:'plant',crop:'turnip',plot:9}])await assert.rejects(f.run(op));
 assert.equal(f.data.get(key),before);
 await f.run({kind:'plant',crop:'turnip',plot:0},10);
 await assert.rejects(f.run({kind:'plant',crop:'turnip',plot:0},10),/もう野菜/);
 await assert.rejects(f.run({kind:'water',plot:0},9),/日付/);
 assert.throws(()=>readGarden({...readGarden(undefined),seeds:{turnip:-1,carrot:0,tomato:0}}));
 assert.throws(()=>readGarden({...readGarden(undefined),lastDay:day(10),plots:[{crop:'turnip',planted:day(10),watered:[day(10),day(10)]},null,null,null]}));
});
