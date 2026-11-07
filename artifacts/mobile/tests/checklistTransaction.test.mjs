import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import * as energy from '../utils/lightEnergy.ts';
import * as game from '../utils/gameLogic.ts';
import { createRecoverableStorage } from '../utils/recoverableStorage.ts';
const code=ts.transpileModule(fs.readFileSync(new URL('../utils/checklistTransaction.ts',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
const exports={};
new Function('require','exports',code)(name=>{if(name==='./gameLogic')return game;if(name==='./lightEnergy')return energy;throw Error(name);},exports);
const {prepareChecklist,CHECK_KEYS:k}=exports;
const today='2026-09-30',now=new Date('2026-09-30T04:00:00Z');
const item={id:'b1',text:'ひと休み',category:'basics',isDefault:true};
const defaults={items:[item],progress:{experience:0,level:1,mentalMuscle:0,streak:0,totalDays:0,lastRecordDate:''},feed:{points:100,lastFeedTime:'',satietyAtFeed:65}};
const rewards={item:2,fullDay:10};
function fixture(failAt=Infinity){
  let writes=0;const data=new Map([[k.energy,JSON.stringify({...energy.createLightEnergyState(today),lastGeneratedAt:now.toISOString()})],[k.feed,JSON.stringify(defaults.feed)]]);
  const storage={getItem:async key=>data.get(key)??null,
    setItem:async(key,value)=>{if(++writes===failAt)throw Error('disk full');data.set(key,value);},
    removeItem:async key=>{if(++writes===failAt)throw Error('disk full');data.delete(key);}};
  return {data,open:()=>createRecoverableStorage(storage,'journal',Object.values(k))};
}
const apply=(store,operation={kind:'check',id:'b1',checked:true},date=today)=>store.transaction(values=>prepareChecklist(values,operation,date,defaults,rewards,now));
for(const failAt of [1,2,3,4,5,6,7,8])test(`check reward write ${failAt}: interruption/restart/target retry grants once`,async()=>{
  const f=fixture(failAt);await assert.rejects(apply(f.open()));
  const store=f.open();await store.recover();const result=await apply(store);
  assert.equal(result.checked.items[0].checked,true);assert.equal(result.progress.experience,30);
  assert.equal(result.feed.points,112);assert.equal(result.energy.totalEnergy,10);
  assert.deepEqual(result.badges.map(b=>b.id),['checkMaster']);
  const retry=await apply(store);assert.equal(retry.gainedEnergy,0);assert.equal(retry.feed.points,112);
  assert.equal(f.data.has('journal'),false);
});
for(const kind of ['add','remove','reset'])for(const failAt of [1,2,3,4])test(`${kind} list interruption ${failAt} recovers both definitions and check state`,async()=>{
  const f=fixture(failAt);
  f.data.set(k.items,JSON.stringify([{...item,id:'custom-old',isDefault:false}]));
  f.data.set(k.checked,JSON.stringify({date:today,items:[{id:'custom-old',checked:true,xpEarned:true}],bonusEarned:true}));
  const operation=kind==='add'?{kind,item:{...item,id:'custom-new',isDefault:false}}:kind==='remove'?{kind,id:'custom-old'}:{kind};
  await assert.rejects(apply(f.open(),operation));
  const store=f.open();const result=await apply(store,operation);
  assert.deepEqual(result.checked.items.map(i=>i.id),result.items.map(i=>i.id));
  assert.equal(result.items.length,kind==='add'?2:kind==='remove'?0:1);
  assert.ok(result.checked.earnedItemIds.includes('custom-old'));
  assert.equal(result.checked.bonusEarned,true);
  assert.equal(result.feed.points,100);assert.equal(f.data.has('journal'),false);
});
test('uncheck, remove/re-add and reset retain daily reward receipts; next day earns again',async()=>{
  const f=fixture(),store=f.open();await apply(store);
  await apply(store,{kind:'check',id:'b1',checked:false});await apply(store);
  await apply(store,{kind:'remove',id:'b1'});await apply(store,{kind:'add',item});await apply(store);
  await apply(store,{kind:'reset'});const resetCheck=await apply(store);
  assert.equal(resetCheck.feed.points,112);assert.equal(resetCheck.progress.experience,30);assert.equal(resetCheck.energy.totalEnergy,10);
  const next=await apply(store,undefined,'2026-10-01');assert.equal(next.feed.points,124);assert.equal(next.progress.experience,60);
});
test('parallel different checks retain both credits and one full-day bonus',async()=>{
  const f=fixture(),store=f.open();
  f.data.set(k.items,JSON.stringify([item,{...item,id:'b2'}]));
  await Promise.all([apply(store),apply(store,{kind:'check',id:'b2',checked:true})]);
  assert.equal(JSON.parse(f.data.get(k.feed)).points,114);
  assert.equal(JSON.parse(f.data.get(k.progress)).experience,40);
  assert.equal(JSON.parse(f.data.get(k.checked)).items.filter(i=>i.checked).length,2);
});
test('malformed definitions and receipts are not overwritten',async()=>{
  for(const [key,value]of [[k.items,'{}'],[k.checked,'{"date":"2026-09-30","items":[],"earnedItemIds":false}']]){
    const f=fixture();f.data.set(key,value);const before=new Map(f.data);
    await assert.rejects(apply(f.open()));assert.deepEqual(f.data,before);
  }
});
test('daily record and checklist transactions retain both XP and wallet rewards',async()=>{
  const dailyCode=ts.transpileModule(fs.readFileSync(new URL('../utils/dailyRecordTransaction.ts',import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const daily={};new Function('require','exports',dailyCode)(name=>name==='./gameLogic'?game:energy,daily);
  const f=fixture(),store=f.open();
  await Promise.all([apply(store),store.transaction(values=>daily.prepareDailyRecord(values,
    {today,yesterday:'2026-09-29',mood:4,sleep:0,behaviors:[],notes:'',extras:{sleepRecorded:false}},defaults,5,now))]);
  assert.equal(JSON.parse(f.data.get(k.progress)).experience,45);
  assert.equal(JSON.parse(f.data.get(k.feed)).points,117);
  assert.equal(JSON.parse(f.data.get(k.energy)).totalEnergy,15);
  assert.deepEqual(new Set(JSON.parse(f.data.get(k.badges)).map(b=>b.id)),new Set(['firstStep','checkMaster']));
});

test('invalid daily receipt metadata blocks edits without discarding earned rewards',async()=>{
  const receipt={date:today,bonusEarned:true,items:[{id:'b1',checked:true,xpEarned:true}]};
  for(const invalid of [
    {...receipt,date:null}, {...receipt,date:'yesterday'}, {...receipt,bonusEarned:'false'},
    {...receipt,items:[{id:'b1',checked:true,xpEarned:'false'}]},
    {...receipt,items:[...receipt.items,...receipt.items]},
  ]) for(const operation of [{kind:'check',id:'b1',checked:true},{kind:'reset'},{kind:'remove',id:'b1'}]) {
    const f=fixture();f.data.set(k.checked,JSON.stringify(invalid));const before=new Map(f.data);
    await assert.rejects(apply(f.open(),operation));assert.deepEqual(f.data,before);
  }
});
