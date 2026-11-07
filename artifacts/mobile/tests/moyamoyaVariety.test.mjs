import test from 'node:test';
import assert from 'node:assert/strict';
import {PATTERNS} from '../utils/moyamoyaContent.ts';
import {BATTLE_SCENARIOS,scenariosFor} from '../utils/moyamoyaScenarios.ts';
import {MENTAL_HEALTH_SOURCES} from '../utils/moyamoyaSources.ts';
import {recordMoyamoya,battleChoices,battleScene,battleScenario,battleSourceIds,prepareMoyamoya} from '../utils/moyamoya.ts';
const R='@mentore/records_v2',F='@mentore/feed_state_v1',date='2026-11-07',feed={points:31,satietyAtFeed:70,lastFeedTime:''};
function valuesFor(battle){return {[R]:JSON.stringify([{id:'r',date,moyamoya:{has:true,pattern:battle.pattern,battle}}]),[F]:JSON.stringify(feed)};}
const current=values=>JSON.parse(values[R])[0].moyamoya.battle;
function apply(values,op){const x=prepareMoyamoya(values,op,date,feed,'retry-next');return {...values,...Object.fromEntries(x.entries)};}

test('all 24 learning scenarios expose real source links and distinct questions/options',()=>{
 assert.equal(BATTLE_SCENARIOS.length,24);assert.equal(new Set(BATTLE_SCENARIOS.map(s=>s.id)).size,24);
 for(const pattern of PATTERNS){const scenarios=scenariosFor(pattern.id);assert.equal(scenarios.length,4);assert.equal(new Set(scenarios.map(s=>s.scenes[0])).size,4);}
 for(const s of BATTLE_SCENARIOS){
  assert.equal(s.choices.length,4);assert.equal(new Set(s.choices.map(c=>c.id)).size,4);assert.equal(new Set(s.choices.map(c=>c.title)).size,4);
  assert.ok(s.sourceIds.length>0);for(const id of s.sourceIds){assert.ok(MENTAL_HEALTH_SOURCES[id]);assert.match(MENTAL_HEALTH_SOURCES[id].url,/^https:\/\//);}
 }
});
for(const scenario of BATTLE_SCENARIOS)test(`${scenario.id}: every available choice path finishes, retains wallet and resumes its scene`,()=>{
 const initial={id:'saved-battle',pattern:scenario.pattern,scenarioId:scenario.id,scenarioIndex:0,status:'active',heroHp:2,enemyHp:2,turns:[],awarded:0};
 let wins=0,losses=0;
 function walk(values){
  const e=current(values),reloaded=JSON.parse(JSON.stringify(e));
  assert.equal(battleScenario(reloaded).id,scenario.id);assert.equal(battleScene(reloaded),battleScene(e));assert.deepEqual(battleChoices(reloaded),battleChoices(e));
  assert.deepEqual(battleSourceIds(e),scenario.sourceIds);
  if(e.status!=='active'){
   assert.ok(['won','lost'].includes(e.status));assert.ok(e.turns.length<=3);
   assert.equal(JSON.parse(values[F]).points,feed.points+(e.status==='won'?10:0));
   if(e.status==='won')wins++;else losses++;
   return;
  }
  const available=battleChoices(e);assert.ok(available.length>=2);
  for(const choice of available){assert.ok(!e.turns.some(t=>t.actionId===choice.id));walk(apply(values,{kind:'turn',id:e.id,expectedTurn:e.turns.length,actionId:choice.id}));}
 }
 walk(valuesFor(initial));assert.ok(wins>0);assert.ok(losses>0);
});

test('each category rotates across dates before repeating and does not rotate an unfinished save',()=>{
 for(const {id:pattern} of PATTERNS){
  const history=[],seen=[];
  for(let i=0;i<8;i++){
   const m=recordMoyamoya(undefined,{has:true,pattern,memo:''},`day-${i}`,history);seen.push(m.battle.scenarioId);
   const resumed=recordMoyamoya(JSON.parse(JSON.stringify(m)),{has:true,pattern,memo:''},'ignored-new-id',history);
   assert.deepEqual(resumed.battle,m.battle);assert.deepEqual(battleChoices(resumed.battle),battleChoices(m.battle));
   history.push(m);
  }
  assert.equal(new Set(seen.slice(0,4)).size,4);assert.deepEqual(seen.slice(4),seen.slice(0,4));
 }
});
test('same-day category edits and no-moyamoya edits keep per-category rotation receipts',()=>{
 let previous=recordMoyamoya(undefined,{has:true,pattern:'anger'},'a');
 const first=previous.battle.scenarioId;
 previous=recordMoyamoya(previous,{has:false},'none');
 previous=recordMoyamoya(previous,{has:true,pattern:'future'},'f');
 previous=recordMoyamoya(previous,{has:true,pattern:'anger'},'a2');
 assert.notEqual(previous.battle.scenarioId,first);assert.equal(previous.battle.scenarioIndex,1);
});
test('retry advances the saved scene, rejects its previous choices, and preserves daily reward cap',()=>{
 let m=recordMoyamoya(undefined,{has:true,pattern:'anger'},'a');m.rewardClaimed=true;
 let values={[R]:JSON.stringify([{id:'r',date,moyamoya:m}]),[F]:JSON.stringify(feed)};
 values=apply(values,{kind:'start',id:'a'});const initialId=current(values).scenarioId;
 for(let i=0;i<2;i++){const e=current(values);values=apply(values,{kind:'turn',id:e.id,expectedTurn:i,actionId:battleChoices(e).find(c=>!c.good).id});}
 const oldChoice=battleChoices({...m.battle,turns:[]})[0].id;
 values=apply(values,{kind:'retry',id:'a'});const retry=current(values);
 assert.notEqual(retry.scenarioId,initialId);assert.equal(retry.scenarioIndex,1);assert.equal(retry.heroHp,2);
 assert.throws(()=>apply(values,{kind:'turn',id:retry.id,expectedTurn:0,actionId:oldChoice}));
 for(let i=0;i<2;i++){const e=current(values);values=apply(values,{kind:'turn',id:e.id,expectedTurn:i,actionId:battleChoices(e).find(c=>c.good).id});}
 assert.equal(current(values).status,'won');assert.equal(current(values).awarded,0);assert.equal(JSON.parse(values[F]).points,feed.points);
});
test('legacy in-progress saves keep old action IDs and finish; retry switches to sourced scenarios',()=>{
 const old={id:'old',pattern:'loop',status:'active',heroHp:2,enemyHp:1,turns:[{actionId:'separate',title:'saved title',feedback:'saved feedback',good:true}],awarded:0};
 assert.equal(battleScenario(old),undefined);assert.ok(battleChoices(old).some(c=>c.id==='prepare'));assert.ok(!battleChoices(old).some(c=>c.id==='separate'));
 let values=valuesFor(old);values=apply(values,{kind:'turn',id:'old',expectedTurn:1,actionId:'prepare'});
 assert.equal(current(values).status,'won');assert.equal(current(values).turns[0].feedback,'saved feedback');assert.equal(JSON.parse(values[F]).points,41);
 const lost={...old,status:'lost',heroHp:0};values=apply(valuesFor(lost),{kind:'retry',id:'old'});
 assert.ok(battleScenario(current(values)));assert.equal(current(values).scenarioIndex,0);
});
