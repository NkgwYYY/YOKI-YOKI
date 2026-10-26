import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as bank from '../utils/villageBank.ts';
import {prepareCollection,earnedKeepsakes} from '../utils/companionCollection.ts';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
import {isMapAvailable,initialReleasedMap,canVisitMap} from '../utils/worldMaps.ts';
const exports={};new Function('require','exports',ts.transpileModule(fs.readFileSync(new URL('../utils/cozyMigration.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(()=>bank,exports);
const {retireBank}=exports;
const ROOM='@mentore/room_customization_v1',FEED='@mentore/feed_state_v1',PROGRESS='@mentore/progress_v2';
const base={points:150,lastFeedTime:'',satietyAtFeed:70};
test('retiring banking returns current principal once, without new interest or risk',()=>{
 const opened=bank.prepareBank({}, {kind:'sync'},'2026-01-01',base,11).result.feed;
 const deposited=bank.prepareBank({[FEED]:JSON.stringify(opened)}, {kind:'deposit',amount:100,id:'one',revision:opened.bank.revision},'2026-01-01',base,11).result.feed;
 const next=retireBank(deposited);assert.equal(next.points,150);assert.equal(next.bank.balance,0);assert.equal(next.bankRetirement.returned,100);
 assert.deepEqual(next.bank.history,deposited.bank.history);assert.equal(retireBank(next),next);assert.equal(retireBank(base),base);
 assert.throws(()=>retireBank({...deposited,bank:{...deposited.bank,balance:-1}}));
});
test('bank map is inaccessible including saved deep links on every platform',()=>{
 for(const platform of ['web','ios','android']){
  assert.equal(isMapAvailable('bank',platform),false);assert.equal(canVisitMap('bank',999,true,platform),false);
  assert.equal(initialReleasedMap('bank',platform),'home');
 }
});
test('progress, games, garden and complete stories earn distinct permanent keepsakes',()=>{
 const feed={vegetableGarden:{harvests:1},villageStories:{arcs:{ramen:{episodes:Array(6).fill({})},newcomer:{episodes:Array(6).fill({})}}}};
 assert.deepEqual(earnedKeepsakes({visits:{totalVisits:100}},feed,{plays:{x:{pins:10}}}),['cushion','flower','lamp','quilt','musicbox','trophy','planter','bowl','photo']);
 assert.deepEqual(earnedKeepsakes({visits:{totalVisits:6}},{},{plays:{x:{pins:9}}}),[]);
 assert.deepEqual(earnedKeepsakes({}, {},{plays:{x:{pins:2,missionComplete:true}}}),['trophy']);
});
test('collection selection persists without spending points or replacing existing furniture',()=>{
 const values={[PROGRESS]:JSON.stringify({visits:{totalVisits:14}}),[FEED]:JSON.stringify(base),[ROOM]:JSON.stringify({furniture:'sofa',flower:'pink',ownedFurniture:['sofa'],ownedFlowers:['pink']})};
 const earned=prepareCollection(values);for(const [k,v] of earned.entries)values[k]=v;
 const selected=prepareCollection(values,'flower');for(const [k,v] of selected.entries)values[k]=v;
 assert.equal(selected.result.room.furniture,'sofa');assert.equal(selected.result.room.displayedKeepsake,'flower');
 assert.equal(JSON.parse(values[FEED]).points,150);assert.equal(prepareCollection(values).entries.length,0);
 values[PROGRESS]=JSON.stringify({visits:{totalVisits:1}});
 assert.ok(prepareCollection(values).result.room.keepsakes.includes('flower'),'ownership remains when history snapshot is older');
 assert.throws(()=>prepareCollection(values,'trophy'));
});
test('failed collection writes recover and concurrent selections keep one durable room record',async()=>{
 const data=new Map([[PROGRESS,JSON.stringify({visits:{totalVisits:30}})]]);let fail=true;
 const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===ROOM&&fail){fail=false;throw Error('disk full');}data.set(k,v);},removeItem:async k=>data.delete(k)},'collection-journal',[ROOM,PROGRESS,FEED]);
 await assert.rejects(()=>store.transaction(v=>prepareCollection(v,'flower')));
 await store.transaction(v=>prepareCollection(v,'flower'));
 await Promise.all([store.transaction(v=>prepareCollection(v,'lamp')),store.transaction(v=>prepareCollection(v,'none'))]);
 const room=JSON.parse(data.get(ROOM));assert.deepEqual(room.keepsakes,['cushion','flower','lamp']);assert.equal(room.displayedKeepsake,'none');
});
