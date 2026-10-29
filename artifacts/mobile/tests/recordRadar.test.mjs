import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as growth from '../utils/personalGrowth.ts';
const output={};new Function('require','exports',ts.transpileModule(fs.readFileSync(new URL('../utils/recordRadar.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(()=>growth,output);
const {recordRadar}=output,today='2026-10-27',row=(date,rest={})=>({id:date,date,mood:3,sleep:0,sleepRecorded:false,...rest});
test('radar separates the two weeks and leaves unrecorded or invalid parameters empty',()=>{
 const chart=recordRadar([row(today),row('2026-10-20',{mood:5,sleep:8,sleepRecorded:true,meal:3,exercise:2,social:1}),row('2026-10-28',{mood:1}),row('2026-10-26',{social:4,meal:0})],today);
 assert.equal(chart.current[0].value,3);assert.equal(chart.current[1].value,null);assert.equal(chart.current[2].value,null);assert.equal(chart.current[4].value,null);assert.equal(chart.previous[0].value,5);assert.equal(chart.previous[1].value,8);
});
test('explicit zero sleep is real data, long sleep keeps the real value, and duplicates count once',()=>{
 const rows=[row(today,{sleep:0,sleepRecorded:true}),row('2026-10-26',{sleep:18,sleepRecorded:true}),row('2026-10-26',{sleep:18,sleepRecorded:true})];const c=recordRadar(rows,today).current;
 assert.equal(c[1].value,9);assert.equal(c[1].count,2);assert.equal(c[1].fraction,.75);
 const large=recordRadar([row(today,{sleep:18,sleepRecorded:true})],today).current[1];assert.equal(large.value,18);assert.equal(large.fraction,1);
});
