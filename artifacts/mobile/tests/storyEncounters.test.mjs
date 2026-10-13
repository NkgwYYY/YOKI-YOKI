import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const source=path=>stripTypeScriptTypes(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const definitions=url(source('../data/villageStories.ts'));
const progress=url(source('../utils/villageStories.ts').replace("'../data/villageStories'",JSON.stringify(definitions)));
const {storyEncounters,canHearStory,rememberedStories}=await import(url(source('../utils/storyEncounters.ts').replace("'../data/villageStories'",JSON.stringify(definitions)).replace("'./villageStories'",JSON.stringify(progress))));
const {VILLAGE_STORIES}=await import(definitions);
const empty={version:1,arcs:{}};
const arc=n=>({episodes:Array.from({length:n},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,choice:0}))});

test('first encounter occurs in the plaza, ramen starts with its own shopkeeper, home stays calm',()=>{
 assert.deepEqual(storyEncounters(empty,'2026-10-10','home'),[]);
 const [plaza]=storyEncounters(empty,'2026-10-10','market');
 assert.equal(plaza.id,'newcomer');assert.equal(plaza.merchant,undefined);
 assert.equal(canHearStory(plaza,{x:.52,y:.61},false,new Set()),true);
 assert.equal(storyEncounters(empty,'2026-10-10','ramen')[0].merchant,'ramen');
});
test('distant, busy, already heard and merchant conversations never interrupt walking automatically',()=>{
 const [encounter]=storyEncounters(empty,'2026-10-10','market');
 assert.equal(canHearStory(encounter,{x:.76,y:.8},false,new Set()),false);
 assert.equal(canHearStory(encounter,encounter.point,true,new Set()),false);
 assert.equal(canHearStory(encounter,encounter.point,false,new Set([encounter.key])),false);
 const [merchant]=storyEncounters(empty,'2026-10-10','ramen');assert.equal(canHearStory(merchant,merchant.point,false,new Set()),false);
});
test('saved progression moves the person to the next place only on a later day',()=>{
 const state={version:1,arcs:{newcomer:arc(1)}};
 assert.deepEqual(storyEncounters(state,'2026-10-01','homewares'),[]);
 assert.equal(storyEncounters(state,'2026-10-10','market').some(e=>e.id==='newcomer'),false);
 assert.equal(storyEncounters(state,'2026-10-10','homewares')[0].index,1);
 assert.deepEqual(storyEncounters(state,'2026-09-30','market'),[]);
});
test('every chapter can be encountered at a visible person in its actual location',()=>{
 for(const story of VILLAGE_STORIES)for(let index=0;index<story.episodes.length;index++){
  const state={version:1,arcs:Object.fromEntries(story.requires.map(id=>[id,arc(6)]))};state.arcs[story.id]=arc(index);
  const encounter=storyEncounters(state,'2026-10-20',story.episodes[index].place,true).find(e=>e.id===story.id);
  assert.ok(encounter);assert.equal(encounter.index,index);assert.ok(encounter.hint);
  assert.ok(encounter.merchant||['egg','odango','stage3'].includes(encounter.stage));
 }
});
test('album contains only experienced stories, with no future arcs or empty progress',()=>{
 assert.deepEqual(rememberedStories(empty),[]);
 assert.deepEqual(rememberedStories({version:1,arcs:{ramen:arc(1),newcomer:arc(0)}}).map(s=>s.id),['ramen']);
});
test('an ongoing local story has priority, completed stories no longer start',()=>{
 const state={version:1,arcs:{newcomer:arc(2)}};
 assert.equal(storyEncounters(state,'2026-10-10','ramen')[0].id,'newcomer');
 assert.equal(storyEncounters({version:1,arcs:{newcomer:arc(6)}},'2026-10-10','market').some(e=>e.id==='newcomer'),false);
});
