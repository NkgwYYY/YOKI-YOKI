import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as firstSteps from '../utils/firstSteps.ts';
const module={};
new Function('require','exports',ts.transpileModule(fs.readFileSync(new URL('../utils/homeAssist.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
  assert.equal(name,'./firstSteps');return firstSteps;
},module);
const {nextHomeAssist}=module,date='2026-10-28';
const input={date,record:{date,mood:1},satiety:70};
const diary=(page,day=date)=>({pages:{[day]:{date:day,...page}}});
test('only a missing or invalid mood gets a recording invitation',()=>{
  for(const record of [undefined,{date:'2026-10-27',mood:5},{date,mood:0}])assert.equal(nextHomeAssist({...input,record}).kind,'mood');
  for(const mood of [1,2,3,4,5])assert.equal(nextHomeAssist({...input,record:{date,mood}}).kind,'diary');
});
test('the diary guidance changes after reading and disappears after sending',()=>{
  assert.match(nextHomeAssist(input).text,/届いてる/);
  assert.match(nextHomeAssist({...input,diary:diary({letterReadAt:1})}).text,/返事を書こう/);
  assert.equal(nextHomeAssist({...input,diary:diary({letterReadAt:1,user:{text:''}})}),null);
  assert.doesNotMatch(nextHomeAssist({...input,diary:diary({user:{text:'送信済み'}})}).text,/書こう/);
});
test('old pages never count as today or create a missed-day backlog',()=>{
  const result=nextHomeAssist({...input,diary:diary({letterReadAt:1,user:{}},'2026-10-20')});
  assert.match(result.text,/届いてる/);assert.doesNotMatch(result.text,/8日|未達|未完了/);
});
test('food is based on actual satiety and is not nagged again after a meal',()=>{
  const finished=diary({letterReadAt:1,user:{}});
  for(const satiety of [0,24,25,59])assert.equal(nextHomeAssist({...input,satiety,diary:finished}).kind,'feed');
  for(const satiety of [60,100,NaN])assert.equal(nextHomeAssist({...input,satiety,diary:finished}),null);
  assert.equal(nextHomeAssist({...input,satiety:20,diary:finished,fedThisVisit:true}),null);
  assert.equal(nextHomeAssist({...input,satiety:20}).kind,'feed');
  assert.equal(nextHomeAssist({...input,satiety:20,record:undefined}).kind,'mood');
});
