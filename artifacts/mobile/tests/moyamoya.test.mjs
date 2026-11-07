import test from 'node:test';
import assert from 'node:assert/strict';
import {PATTERNS} from '../utils/moyamoyaContent.ts';
import {recordMoyamoya,battleChoices,prepareMoyamoya} from '../utils/moyamoya.ts';
import {prepareCollection} from '../utils/companionCollection.ts';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const R='@mentore/records_v2',F='@mentore/feed_state_v1',ROOM='@mentore/room_customization_v1',date='2026-11-04';
const feed={points:100,satietyAtFeed:70,lastFeedTime:'before',wardrobe:{owned:['panda'],equipped:'panda'}};
const record=(pattern='loop',day=date)=>({id:`r_${day}`,date:day,mood:3,sleep:7,notes:'existing diary',behaviors:['walk'],moyamoya:recordMoyamoya(undefined,{has:true,pattern,memo:'my concern'},'battle1')});
function fixture(pattern='loop',failAt=Infinity){let writes=0;const data=new Map([[R,JSON.stringify([record(pattern)])],[F,JSON.stringify(feed)]]);const storage={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(++writes===failAt)throw Error('disk full');data.set(k,v);},removeItem:async k=>{if(++writes===failAt)throw Error('disk full');data.delete(k);}};return {data,open:()=>createRecoverableStorage(storage,'journal',[R,F,ROOM])};}
const run=(store,operation,day=date)=>store.transaction(values=>prepareMoyamoya(values,operation,day,feed,'retry-id'));
const turn=(store,e,good=true)=>run(store,{kind:'turn',id:e.id,expectedTurn:e.turns.length,actionId:battleChoices(e).find(c=>c.good===good).id});
for(const pattern of PATTERNS)test(`${pattern.id}: two useful choices win; reward and existing care data survive reload`,async()=>{
 const f=fixture(pattern.id),store=f.open();let s=await run(store,{kind:'start',id:'battle1'});
 assert.equal(battleChoices(s.encounter).length,4);
 s=await turn(store,s.encounter);assert.equal(s.encounter.enemyHp,1);assert.equal(s.encounter.heroHp,2);assert.equal(s.awarded,0);
 s=await turn(f.open(),s.encounter);assert.equal(s.encounter.status,'won');assert.equal(s.awarded,10);assert.equal(s.feed.points,110);
 assert.equal(s.feed.satietyAtFeed,70);assert.deepEqual(s.feed.wardrobe,feed.wardrobe);assert.equal(s.records[0].notes,'existing diary');assert.equal(s.stampDays,1);
 const again=await run(f.open(),{kind:'turn',id:s.encounter.id,expectedTurn:1,actionId:s.encounter.turns[1].actionId});assert.equal(again.feed.points,110);assert.equal(again.turn,undefined);
});
test('two poor choices lose without taking points; retry resets HP and choices',async()=>{
 const f=fixture('self'),store=f.open();let s=await run(store,{kind:'start',id:'battle1'});s=await turn(store,s.encounter,false);s=await turn(store,s.encounter,false);
 assert.equal(s.encounter.status,'lost');assert.equal(s.encounter.heroHp,0);assert.equal(s.feed.points,100);
 s=await run(store,{kind:'retry',id:s.encounter.id});assert.equal(s.encounter.id,'retry-id');assert.equal(s.encounter.heroHp,2);assert.equal(s.encounter.enemyHp,2);assert.equal(s.encounter.turns.length,0);
});
test('deferred encounter stays quiet until explicit resume; HP and chosen turns survive restart',async()=>{
 const f=fixture();let s=await run(f.open(),{kind:'start',id:'battle1'});s=await turn(f.open(),s.encounter);
 const before=structuredClone(s.encounter);s=await run(f.open(),{kind:'decline',id:'battle1'});
 const ignored=await run(f.open(),{kind:'turn',id:'battle1',expectedTurn:1,actionId:'separate'});
 assert.equal(ignored.encounter.status,'declined');assert.deepEqual(ignored.encounter.turns,before.turns);assert.equal(ignored.feed.points,100);
 s=await run(f.open(),{kind:'start',id:'battle1'});
 assert.equal(s.encounter.status,'active');assert.equal(s.encounter.enemyHp,before.enemyHp);assert.deepEqual(s.encounter.turns,before.turns);assert.equal(s.encounter.scenarioId,before.scenarioId);
 s=await turn(f.open(),s.encounter);assert.equal(s.encounter.status,'won');assert.equal(s.feed.points,110);
 s=await run(f.open(),{kind:'start',id:'battle1'});assert.equal(s.encounter.status,'won');assert.equal(s.feed.points,110);
});
test('concurrent taps apply one turn and retain another wallet transaction',async()=>{
 const f=fixture(),store=f.open();const s=await run(store,{kind:'start',id:'battle1'});const op={kind:'turn',id:'battle1',expectedTurn:0,actionId:battleChoices(s.encounter).find(c=>c.good).id};
 await Promise.all([run(store,op),run(store,op),store.transaction(values=>{const x=JSON.parse(values[F]);x.points+=7;return {entries:[[F,JSON.stringify(x)]],result:null};})]);
 assert.equal(JSON.parse(f.data.get(R))[0].moyamoya.battle.turns.length,1);assert.equal(JSON.parse(f.data.get(F)).points,107);
});
for(const failAt of [1,2,3,4])test(`interrupted winning write ${failAt} recovers without losing or duplicating reward`,async()=>{
 const f=fixture(),store=f.open();let s=await run(store,{kind:'start',id:'battle1'});s=await turn(store,s.encounter);
 const data=new Map(f.data);let writes=0;const disk={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(++writes===failAt)throw Error('disk full');data.set(k,v);},removeItem:async k=>{if(++writes===failAt)throw Error('disk full');data.delete(k);}};
 const open=()=>createRecoverableStorage(disk,'journal',[R,F,ROOM]);
 await assert.rejects(turn(open(),s.encounter));await open().recover();await turn(open(),s.encounter);
 assert.equal(JSON.parse(data.get(F)).points,110);assert.equal(JSON.parse(data.get(R))[0].moyamoya.battle.status,'won');
});
test('new check-in keeps receipts, unfinished battle and daily cap when pattern changes',async()=>{
 const f=fixture(),store=f.open();let s=await run(store,{kind:'start',id:'battle1'});
 assert.equal(recordMoyamoya(s.records[0].moyamoya,{has:true,pattern:'loop',memo:'my concern'},'other').battle.id,'battle1');
 s=await turn(store,s.encounter);s=await turn(store,s.encounter);
 const next=recordMoyamoya(s.records[0].moyamoya,{has:true,pattern:'anger'},'new');assert.equal(next.rewardClaimed,true);assert.equal(next.participated,true);
 s.records[0].moyamoya=next;f.data.set(R,JSON.stringify(s.records));s=await run(store,{kind:'start',id:'new'});s=await turn(store,s.encounter);s=await turn(store,s.encounter);assert.equal(s.awarded,0);assert.equal(s.feed.points,110);
 const none=recordMoyamoya(s.records[0].moyamoya,{has:false},'unused');assert.equal(none.battle,undefined);assert.equal(none.rewardClaimed,true);
});
test('wrong date, invalid pattern and invalid choices do not change storage',async()=>{
 const f=fixture(),store=f.open();const s=await run(store,{kind:'start',id:'battle1'}),before=new Map(f.data);
 await assert.rejects(run(store,{kind:'turn',id:'battle1',expectedTurn:0,actionId:'made-up'}));
 await assert.rejects(run(store,{kind:'start',id:'battle1'},'2026-11-05'));assert.deepEqual(f.data,before);
 assert.throws(()=>recordMoyamoya(undefined,{has:true,pattern:'unknown'},'x'));assert.throws(()=>recordMoyamoya(undefined,{has:null},'x'));
});
test('five distinct participation days unlock the cushion once; existing room selection stays',()=>{
 const records=Array.from({length:5},(_,i)=>{const r=record('busy',`2026-11-0${i+1}`);r.moyamoya.participated=true;return r;});
 const room={furniture:'sofa',flower:'pink',ownedFurniture:['sofa'],ownedFlowers:['pink'],keepsakes:['flower'],displayedKeepsake:'flower'};
 const values={[R]:JSON.stringify(records),[ROOM]:JSON.stringify(room)};const s=prepareCollection(values);assert.ok(s.result.room.keepsakes.includes('moyamoya-cushion'));assert.equal(s.result.room.displayedKeepsake,'flower');assert.equal(s.result.room.furniture,'sofa');
 Object.assign(values,Object.fromEntries(s.entries));assert.equal(prepareCollection(values).entries.length,0);
 values[R]=JSON.stringify(Array(5).fill(records[0]));values[ROOM]=JSON.stringify(room);assert.ok(!prepareCollection(values).result.room.keepsakes.includes('moyamoya-cushion'));
});
