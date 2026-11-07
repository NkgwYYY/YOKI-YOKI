import test from 'node:test';
import assert from 'node:assert/strict';
import {homeBattleEntry} from '../utils/homeBattleEntry.ts';
import {recordMoyamoya} from '../utils/moyamoya.ts';
const date='2026-11-08';
const record=()=>({date,moyamoya:recordMoyamoya(undefined,{has:true,pattern:'anger'},'current')});
test('home entry is limited to an unfinished battle for the concern recorded today',()=>{
 assert.equal(homeBattleEntry(undefined,date),null);
 assert.equal(homeBattleEntry({date,moyamoya:{has:false}},date),null);
 assert.equal(homeBattleEntry(record(),'2026-11-09'),null);
 for(const status of ['won','lost']){const r=record();r.moyamoya.battle.status=status;assert.equal(homeBattleEntry(r,date),null);}
 const r=record();r.moyamoya.pattern='self';assert.equal(homeBattleEntry(r,date),null);
});
test('new and deferred battles offer a button; saved progress is described as a continuation',()=>{
 const r=record();assert.deepEqual(homeBattleEntry(r,date),{id:'current',label:'モヤモヤバトル'});
 r.moyamoya.battle.status='declined';assert.equal(homeBattleEntry(r,date).label,'モヤモヤバトル');
 r.moyamoya.battle.status='active';assert.equal(homeBattleEntry(r,date).label,'モヤモヤバトル｜つづきから');
 r.moyamoya.battle.status='declined';r.moyamoya.battle.turns=[{actionId:'x'}];assert.match(homeBattleEntry(r,date).label,/つづきから/);
});
