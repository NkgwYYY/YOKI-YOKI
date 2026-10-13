import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const url=source=>'data:text/javascript;base64,'+Buffer.from(source+'\n//# sourceURL=village-story-test-module.mjs').toString('base64');
const source=path=>stripTypeScriptTypes(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const definitions=url(source('../data/villageStories.ts'));
const {VILLAGE_STORIES}=await import(definitions);
const {prepareVillageStory,storyStatus,storyFinished,storyUnlocked,readVillageStories}=await import(url(source('../utils/villageStories.ts').replace("'../data/villageStories'",JSON.stringify(definitions))));
const key='@mentore/feed_state_v1',bowl='@yoki/bowling_v1',fallback={points:137,lastFeedTime:'saved',satietyAtFeed:65,exchangeDiary:{pages:{saved:true}}};
const date=n=>`2026-10-${String(n).padStart(2,'0')}`;
const operation=(id,episode,choice=0)=>({id,episode,choice,place:VILLAGE_STORIES.find(s=>s.id===id).episodes[episode].place});
function fixture(feed=fallback){
 const data=new Map([[key,JSON.stringify(feed)]]);let fail=false;
 const store=createRecoverableStorage({getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(k===key&&fail){fail=false;throw Error('disk');}data.set(k,v);},removeItem:async k=>data.delete(k)},'journal',[key,bowl]);
 return {data,fail:()=>{fail=true;},run:(op,n=1)=>store.transaction(v=>prepareVillageStory(v,op,date(n),fallback))};
}
test('original and grandmother arcs have six episodes; harvest introduces the wholesale encounter',()=>{
 const s=readVillageStories(undefined);assert.equal(VILLAGE_STORIES.length,7);
 for(const st of VILLAGE_STORIES){assert.equal(st.episodes.length,st.id==='supply'?1:6);for(const ep of st.episodes){assert.ok(['market','ramen','bowling','fortune','homewares','workshop'].includes(ep.place));assert.equal(ep.choices.length,2);assert.equal(ep.replies.length,2);}}
 assert.deepEqual(VILLAGE_STORIES.filter(st=>storyUnlocked(s,st.id)).map(st=>st.id),['newcomer','ramen','grandma']);
});
test('two separate arcs can advance today; double taps and same-day next chapters cannot skip',async()=>{
 const f=fixture(),a=await f.run(operation('newcomer',0,1));
 assert.equal(a.receipt.choice,1);assert.equal((await f.run(operation('newcomer',0,0))).receipt.choice,1);
 await assert.rejects(f.run(operation('newcomer',1)),/今日/);
 assert.equal((await f.run(operation('ramen',0))).changed,true);
 const saved=JSON.parse(f.data.get(key));assert.equal(saved.points,137);assert.deepEqual(saved.exchangeDiary,fallback.exchangeDiary);
});
test('missing days never expires a chapter; replay after restart preserves choice',async()=>{
 const f=fixture();await f.run(operation('newcomer',0));
 const reopened=fixture(JSON.parse(f.data.get(key)));const r=await reopened.run(operation('newcomer',1,1),12);
 assert.equal(r.state.arcs.newcomer.episodes.length,2);assert.equal(r.receipt.choice,1);
 await assert.rejects(reopened.run(operation('ramen',0),11),/日付/);
});
test('invalid choices, skipping, wrong locations and locked arcs cannot commit',async()=>{
 const f=fixture(),before=f.data.get(key);
 for(const op of [{...operation('newcomer',0),choice:2},{...operation('newcomer',0),place:'home'},operation('newcomer',2),operation('festival',0)])await assert.rejects(f.run(op));
 assert.equal(f.data.get(key),before);
});
test('interrupted journal writes and concurrent clicks recover exactly one chapter',async()=>{
 const f=fixture(),op=operation('newcomer',0,1);f.fail();await assert.rejects(f.run(op),/disk/);
 const results=await Promise.all([f.run(op),f.run({...op,choice:0})]);
 for(const r of results){assert.equal(r.state.arcs.newcomer.episodes.length,1);assert.equal(r.receipt.choice,1);assert.equal(r.changed,false);}
 assert.equal(f.data.has('journal'),false);
});
test('all thirty chapters complete, unlock the next arcs, and retain real bowling receipts',async()=>{
 const f=fixture();let last;
 for(let i=0;i<6;i++)for(const id of ['newcomer','ramen'])last=await f.run(operation(id,i,i%2),i+1);
 assert.ok(storyUnlocked(last.state,'bowling'));assert.ok(storyUnlocked(last.state,'cat'));assert.equal(storyUnlocked(last.state,'festival'),false);
 for(let i=0;i<6;i++)for(const id of ['bowling','cat']){
  const day=i+7,op=operation(id,i);
  if(VILLAGE_STORIES.find(s=>s.id===id).episodes[i].bowl){
   await assert.rejects(f.run(op,day),/本番/);
   f.data.set(bowl,JSON.stringify({plays:{a:{date:date(day-1),pins:10}}}));await assert.rejects(f.run(op,day),/本番/);
   f.data.set(bowl,JSON.stringify({plays:{a:{date:date(day),pins:0},b:{date:date(day),pins:3}}}));
  }
  last=await f.run(op,day);
 }
 assert.ok(storyUnlocked(last.state,'festival'));
 for(let i=0;i<6;i++)last=await f.run(operation('festival',i,1),i+13);
 for(const st of VILLAGE_STORIES.filter(st=>!['grandma','supply'].includes(st.id)))assert.ok(storyFinished(last.state,st.id));
 assert.equal(last.state.arcs.bowling.episodes[1].bowlingPins,3);assert.equal(last.state.arcs.festival.episodes[2].choice,1);
 assert.equal(last.feed.points,137);assert.equal(Object.values(last.state.arcs).flatMap(a=>a.episodes).length,30);
 assert.equal(storyStatus(last.state,'festival',date(25)).finished,true);
});
test('zero pins is a valid tournament entry, without a practice or success requirement',async()=>{
 const f=fixture({ ...fallback,villageStories:{version:1,arcs:{ramen:{episodes:Array.from({length:6},(_,i)=>({date:date(i+1),choice:0}))},bowling:{episodes:[{date:date(7),choice:0}]}}}});
 f.data.set(bowl,JSON.stringify({plays:{a:{date:date(8),pins:0}}}));const r=await f.run(operation('bowling',1),8);assert.equal(r.receipt.bowlingPins,0);
});
test('malformed or duplicate-day saved data is reported instead of reset',()=>{
 for(const raw of [{version:9,arcs:{}},{version:1,arcs:{unknown:{episodes:[]}}},{version:1,arcs:{newcomer:{episodes:[{date:'2026-02-30',choice:0}]}}},{version:1,arcs:{newcomer:{episodes:[{date:date(1),choice:0},{date:date(1),choice:1}]}}}])assert.throws(()=>readVillageStories(raw));
});
