import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import * as energy from '../utils/lightEnergy.ts';
import * as game from '../utils/gameLogic.ts';
import { createRecoverableStorage } from '../utils/recoverableStorage.ts';

// Load the production helper with its real pure energy/level dependencies.
const code=ts.transpileModule(fs.readFileSync(new URL('../utils/dailyRecordTransaction.ts',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
const exports={};
new Function('require','exports',code)(name=>{
  if(name==='./gameLogic')return game;
  if(name==='./lightEnergy')return energy;
  throw Error('Unexpected dependency: '+name);
},exports);
const {prepareDailyRecord,RECORD_KEYS:k}=exports;
const today='2026-09-30',now=new Date('2026-09-30T03:00:00Z');
const defaults={progress:{experience:0,level:1,mentalMuscle:0,streak:0,totalDays:0,lastRecordDate:''},feed:{points:100,lastFeedTime:'',satietyAtFeed:65}};
const input={today,yesterday:'2026-09-29',mood:4,sleep:0,behaviors:['読書した'],notes:'今日のメモ',extras:{sleepRecorded:false,activities:{rest:1},win:'ひと休み'}};
function fixture(failAt=Infinity){
  let writes=0;
  const data=new Map([[k.energy,JSON.stringify({...energy.createLightEnergyState(today),lastGeneratedAt:now.toISOString()})],[k.feed,JSON.stringify(defaults.feed)]]);
  const storage={getItem:async key=>data.get(key)??null,
    setItem:async(key,value)=>{if(++writes===failAt)throw Error('disk full');data.set(key,value);},
    removeItem:async key=>{if(++writes===failAt)throw Error('disk full');data.delete(key);}};
  return {data,open:()=>createRecoverableStorage(storage,'journal',Object.values(k))};
}
const save=(store,patch={})=>store.transaction(values=>prepareDailyRecord(values,{...input,...patch},defaults,5,now));
for(const failAt of [1,2,3,4,5,6,7])test(`daily record interrupted write ${failAt} recovers the record and each reward exactly once`,async()=>{
  const f=fixture(failAt),before=new Map(f.data);
  await assert.rejects(save(f.open()));
  if(failAt===1)assert.deepEqual(f.data,before);
  const store=f.open();await store.recover();
  const result=await save(store);
  assert.equal(result.records.length,1);assert.equal(result.records[0].sleepRecorded,false);
  assert.deepEqual(result.records[0].activities,{rest:1});
  assert.equal(result.progress.experience,15);assert.equal(result.progress.totalDays,1);
  assert.equal(result.progress.streak,1);assert.equal(result.feed.points,105);
  assert.equal(result.energy.totalEnergy,8);assert.equal(result.energy.flags.mood,true);assert.equal(result.energy.flags.diary,true);
  assert.deepEqual(result.badges.map(b=>b.id),['firstStep']);
  const retry=await save(store);
  assert.equal(retry.gainedEnergy,0);assert.equal(retry.newestBadge,null);
  assert.equal(retry.feed.points,105);assert.equal(retry.progress.experience,15);
  assert.equal(f.data.has('journal'),false);
});
test('concurrent submissions and a wallet change retain one day reward plus the independent credit',async()=>{
  const f=fixture(),store=f.open();
  await Promise.all([save(store),save(store,{mood:5}),store.transaction(values=>{
    const feed=JSON.parse(values[k.feed]);feed.points+=9;
    return {entries:[[k.feed,JSON.stringify(feed)]],result:null};
  })]);
  assert.equal(JSON.parse(f.data.get(k.feed)).points,114);
  assert.equal(JSON.parse(f.data.get(k.progress)).totalDays,1);
  assert.equal(JSON.parse(f.data.get(k.records))[0].mood,5);
});
test('later diary edit awards only diary energy, preserves history and legacy entered sleep',async()=>{
  const f=fixture(),store=f.open();
  const first=await save(store,{notes:'',extras:undefined,sleep:7});
  assert.equal(first.energy.totalEnergy,5);assert.equal(first.records[0].sleepRecorded,true);
  const edited=await save(store);
  assert.equal(edited.energy.totalEnergy,8);assert.equal(edited.feed.points,105);
  const next=await save(store,{today:'2026-10-01',yesterday:today});
  assert.equal(next.records.length,2);assert.deepEqual(next.records[0],JSON.parse(JSON.stringify(edited.records[0])));
  assert.equal(next.progress.streak,2);assert.equal(next.feed.points,110);
});
test('corrupt stored data cannot silently reset history or wallet',async()=>{
  for(const [key,value]of [[k.records,'{}'],[k.progress,'null'],[k.feed,'{"points":-2}'],[k.badges,'{}']]){
    const f=fixture();f.data.set(key,value);const before=new Map(f.data);
    await assert.rejects(save(f.open()));assert.deepEqual(f.data,before);
  }
});
test('new day retains earned badges and applies the existing level/streak thresholds',async()=>{
  const f=fixture();
  f.data.set(k.progress,JSON.stringify({...defaults.progress,experience:199,streak:6,totalDays:6,lastRecordDate:input.yesterday}));
  f.data.set(k.badges,JSON.stringify([{id:'firstStep',unlockedAt:'2026-09-01T00:00:00Z'}]));
  f.data.set(k.checked,JSON.stringify({date:input.yesterday,items:[{checked:true}]}));
  const result=await save(f.open());
  assert.equal(result.progress.experience,214);assert.equal(result.progress.level,2);assert.ok(Math.abs(result.progress.mentalMuscle-7)<1e-9);
  assert.equal(result.progress.streak,7);assert.equal(result.progress.totalDays,7);
  assert.equal(result.badges[0].unlockedAt,'2026-09-01T00:00:00Z');
  assert.deepEqual(result.badges.map(b=>b.id),['firstStep','streak3','streak7']);
});
