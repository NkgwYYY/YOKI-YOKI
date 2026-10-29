import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorldAccess,worldAccessFor,retainWorldAccess,mergeWorldAccess,STORY_DESTINATIONS} from '../utils/worldProgress.ts';
import {canVisitMap,isMapAvailable,initialReleasedMap} from '../utils/worldMaps.ts';
import {VILLAGE_STORIES} from '../data/villageStories.ts';
import {advanceVisit,shiftDay} from '../utils/visitGrowth.ts';

const arc=n=>({episodes:Array.from({length:n},(_,i)=>({date:shiftDay('2026-09-01',i),choice:0}))});
const stories=(newcomer=0,cat=0)=>({version:1,arcs:{newcomer:arc(newcomer),cat:arc(cat)}});
const fresh={level:1,experience:0,mentalMuscle:0,streak:0,totalDays:0,lastRecordDate:''};

test('migration preserves exactly the places each legacy player could enter',()=>{
  for(const [level,unlocked] of [[1,[]],[2,[]],[3,['forest','onsen']],[4,['forest','onsen','village']],[5,['forest','onsen','village']],[6,['forest','onsen','village','lake']],[15,['forest','onsen','village','lake']]]){
    const original={...fresh,level,experience:900},saved=retainWorldAccess(original);
    assert.deepEqual(saved.worldAccess,{version:1,unlocked});
    assert.equal(saved.level,level);assert.equal(saved.experience,900);
    assert.equal(retainWorldAccess(saved),saved,'a reload does not repeat migration');
    assert.equal(original.worldAccess,undefined,'input is immutable');
  }
});
test('after migration neither a level increase nor a level decrease changes access',()=>{
  const newPlayer=retainWorldAccess(fresh),oldPlayer=retainWorldAccess({...fresh,level:6});
  assert.deepEqual(worldAccessFor({...newPlayer,level:99}).unlocked,[]);
  assert.deepEqual(worldAccessFor({...oldPlayer,level:1}).unlocked,['forest','onsen','village','lake']);
});
test('story access retains legacy identifiers while the active routes open onsen and lake',()=>{
  const current=retainWorldAccess(fresh);
  for(const [state,unlocked] of [[stories(),[]],[stories(1),['forest','onsen']],[stories(5),['forest','onsen']],[stories(6,5),['forest','onsen','village']],[stories(6,6),['forest','onsen','village','lake']]]){
    const next=retainWorldAccess(current,state);
    assert.deepEqual(next.worldAccess.unlocked,unlocked);
    for(const place of STORY_DESTINATIONS)assert.equal(canVisitMap(place.id,next.worldAccess),isMapAvailable(place.id,'web')&&unlocked.includes(place.id));
    assert.deepEqual(worldAccessFor(JSON.parse(JSON.stringify(next))).unlocked,unlocked,'unlocks persist even before cloud story history arrives');
  }
});
test('an absent or older story snapshot never closes an earned destination',()=>{
  const saved=retainWorldAccess(fresh,stories(6,6));
  assert.equal(retainWorldAccess(saved,stories(1)),saved);
  assert.equal(retainWorldAccess(saved),saved);
});
test('merging guest and cloud saves unions permanent access and legacy/story achievements',()=>{
  const cloud=retainWorldAccess(fresh,stories(1)),local={...fresh,level:4};
  const merged=mergeWorldAccess(cloud,local,undefined,stories(6,6));
  assert.deepEqual(merged.unlocked,['forest','onsen','village','lake']);
  assert.deepEqual(mergeWorldAccess(local,cloud,stories(6,6)),merged);
  assert.deepEqual(mergeWorldAccess({...fresh,worldAccess:merged},cloud),merged);
});
test('invalid saved access is rejected before migration or cloud writes can erase it',()=>{
  for(const raw of [{version:2,unlocked:[]},{version:1,unlocked:['missing']},{version:1},'bad']){
    const progress={...fresh,worldAccess:raw},before=JSON.stringify(progress);
    assert.equal(readWorldAccess(raw),null);
    assert.throws(()=>retainWorldAccess(progress));
    assert.throws(()=>mergeWorldAccess(progress,fresh));
    assert.throws(()=>mergeWorldAccess(fresh,progress));
    assert.equal(JSON.stringify(progress),before);
  }
  assert.deepEqual(readWorldAccess({version:1,unlocked:['lake','forest','lake']}),{version:1,unlocked:['forest','lake']});
});
test('story unlocks cannot bypass retired bank, native tobacco or grandmother invitation',()=>{
  const access=retainWorldAccess(fresh,stories(6,6)).worldAccess;
  assert.equal(canVisitMap('bank',access,true),false);
  assert.equal(canVisitMap('tobacco',access,true,'ios'),false);
  assert.equal(canVisitMap('tobacco',access,false,'web'),true);
  assert.equal(canVisitMap('grandma',access),false);
  assert.equal(canVisitMap('grandma',access,true),true);
});
test('required story chapters are reachable without the destination they unlock',()=>{
  for(const destination of STORY_DESTINATIONS){
    const visited=new Set();
    const check=id=>{
      if(visited.has(id))return;visited.add(id);
      const story=VILLAGE_STORIES.find(s=>s.id===id);
      story.requires.forEach(check);
      for(const episode of story.episodes)assert.equal(canVisitMap(episode.place,{version:1,unlocked:[]}),true,`${id}: ${episode.place} is reachable`);
    };
    check(destination.story);
  }
});
test('cumulative attendance evolves the mascot while level and map access stay fixed',()=>{
  let progress=retainWorldAccess(fresh);
  for(let i=0;i<30;i++)progress={...progress,visits:advanceVisit(progress.visits,shiftDay('2026-09-01',i*2),progress.level)};
  assert.equal(progress.level,1);assert.equal(progress.experience,0);
  assert.equal(progress.visits.stage,'stage4');assert.equal(progress.visits.streak,1);
  assert.deepEqual(progress.worldAccess.unlocked,[]);
});

test('retired maps cannot be entered through saved routes, but earned records survive',()=>{
 const saved=retainWorldAccess({level:15,experience:980});
 for(const id of ['forest','village','bank'])for(const platform of ['web','ios','android']){
  assert.equal(isMapAvailable(id,platform),false);
  assert.equal(canVisitMap(id,saved.worldAccess,true,platform),false);
  assert.equal(initialReleasedMap(id,platform),'home');
 }
 assert.ok(saved.worldAccess.unlocked.includes('forest'));
 assert.ok(saved.worldAccess.unlocked.includes('village'));
 assert.ok(canVisitMap('onsen',saved.worldAccess));
 assert.ok(canVisitMap('lake',saved.worldAccess));
});
