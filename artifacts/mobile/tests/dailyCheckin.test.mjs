import {sky} from './skyFixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as growth from '../utils/personalGrowth.ts';
const checkinModule={};
new Function('require','exports',ts.transpileModule(fs.readFileSync(new URL('../utils/dailyCheckin.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>{assert.equal(name,'./personalGrowth');return growth;},checkinModule);
const {dailyCheckin}=checkinModule;
import {sceneForVisit,visitReturnKey} from '../utils/scenicVisits.ts';
import {makeDailyFortune,presentFortune} from './fortuneModule.mjs';
const today='2026-10-27',r=(date,mood=3,extra={})=>({id:date,date,mood,sleep:0,sleepRecorded:false,behaviors:[],notes:'',...extra});
test('check-in leaves missing data empty and asks for the first real mood',()=>{
 const d=dailyCheckin([],today);assert.equal(d.current,undefined);assert.equal(d.average,null);assert.equal(d.sleepAverage,null);assert.equal(d.delta,null);assert.equal(d.currentCount,0);assert.equal(d.action.kind,'mood');
 assert.equal(d.week.length,7);assert.equal(d.week.filter(x=>x.record).length,0);
});
test('sleep average uses only actual valid sleep records, without invented mood-only sleep',()=>{
 const d=dailyCheckin([r(today,4,{sleep:5,sleepRecorded:true}),r('2026-10-26',3,{sleep:7,sleepRecorded:true}),r('2026-10-25',3,{sleep:9}),r('2026-10-24',3,{sleep:30,sleepRecorded:true}),r('2026-10-23',3,{sleep:NaN,sleepRecorded:true})],today);
 assert.equal(d.sleepAverage,6);assert.equal(d.sleepCount,2);assert.equal(d.currentCount,5);assert.equal(d.action.kind,'diary');
 const zero=dailyCheckin([r(today,3,{sleep:0,sleepRecorded:true}),r('2026-10-26',3)],today);assert.equal(zero.sleepAverage,0);assert.equal(zero.sleepCount,1);
});
test('week comparisons deduplicate days, exclude corrupt/future records and require two entries on each side',()=>{
 const records=[r(today,4),r(today,5),r('2026-10-21',3),r('2026-10-20',1),r('2026-10-14',3),r('2026-10-28',1),r('2026-02-30',5),r('2026-10-23',8)];
 const d=dailyCheckin(records,today);assert.equal(d.currentCount,2);assert.equal(d.leaves.length,4);assert.equal(d.average,4);assert.equal(d.delta,2);assert.equal(d.week[1].record,undefined);
 assert.equal(dailyCheckin(records.filter(r=>r.date!=='2026-10-14'),today).delta,null);
});
test('suggestions follow the recorded state and never infer it from a login',()=>{
 assert.equal(dailyCheckin([r(today,1)],today).action.kind,'rest');
 assert.equal(dailyCheckin([r(today,4,{sleep:5,sleepRecorded:true})],today).action.kind,'sleep');
 assert.equal(dailyCheckin([r('2026-10-26',1)],today).action.kind,'mood');
});
test('occasional visits are stable per owner/day, with all three scenes and many home days',()=>{
 const scenes=new Set();let home=0;
 for(let day=1;day<=31;day++){const date=`2026-10-${String(day).padStart(2,'0')}`,scene=sceneForVisit('guest',date,false);assert.equal(scene,sceneForVisit('guest',date,false));scenes.add(scene);if(!scene)home++;assert.equal(sceneForVisit('guest',date,true),scene?'night':null);}
 assert.deepEqual(scenes,new Set([null,'sea','meadow']));assert.ok(home>=12&&home<=25);
 assert.notEqual(visitReturnKey('a/b',today),visitReturnKey('a%2Fb',today));assert.notEqual(visitReturnKey('guest',today),visitReturnKey('guest','2026-10-28'));
});
test('legacy fortune copy changes only presentation and keeps the saved result intact',()=>{
 const old={...makeDailyFortune(today,{sky:sky(today)}),title:'小さな一歩が光る日',advice:'old',color:'月あかりの金色'},snapshot=JSON.stringify(old),shown=presentFortune(old);
 assert.notEqual(shown.title,old.title);assert.equal(shown.color,'ゴールド');assert.equal(JSON.stringify(old),snapshot);assert.equal(shown.date,old.date);assert.equal(shown.id,old.id);
 assert.deepEqual(presentFortune(makeDailyFortune(today,{sky:sky(today)})),makeDailyFortune(today,{sky:sky(today)}));
});
