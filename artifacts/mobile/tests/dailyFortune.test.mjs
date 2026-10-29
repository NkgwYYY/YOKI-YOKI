import {sky} from './skyFixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDailyFortune,normalizeFortuneInput,prepareFortune,latestFortune} from './fortuneModule.mjs';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
const key='@mentore/feed_state_v1',today='2026-10-09',feed={points:37,lastFeedTime:'',satietyAtFeed:70,hygiene:{smokeDirt:4}},input={bloodType:'A',mbti:'INFP',sky:sky(today)};
test('profile inputs normalize but do not manufacture astronomical or luck data',()=>{
 assert.deepEqual(normalizeFortuneInput({bloodType:' ab型 ',mbti:'infp-t'}),{bloodType:'AB',mbti:'INFP'});
 assert.deepEqual(normalizeFortuneInput({}),{bloodType:'不明',mbti:'未設定'});
 assert.deepEqual(makeDailyFortune(today,input),makeDailyFortune(today,input));
 assert.deepEqual(makeDailyFortune(today,input),makeDailyFortune(today,{...input,bloodType:'B'}));
 assert.deepEqual(makeDailyFortune(today,input),makeDailyFortune(today,{...input,mbti:'ENFP'}));
});
test('one saved reading per day survives changed inputs and reload; next day unlocks and future readings do not masquerade as today',()=>{
 const first=prepareFortune({},input,today,feed),values=Object.fromEntries(first.entries);
 const duplicate=prepareFortune(values,{bloodType:'O',mbti:'ESTP',sky:sky(today)},today,feed);
 assert.equal(first.result.created,true);assert.equal(duplicate.result.created,false);assert.deepEqual(duplicate.entries,[]);assert.deepEqual(first.result.reading,duplicate.result.reading);
 assert.equal(duplicate.result.feed.points,37);assert.deepEqual(duplicate.result.feed.hygiene,feed.hygiene);
 assert.equal(prepareFortune(values,{sky:sky('2026-10-10')},'2026-10-10',feed).result.created,true);
 assert.equal(latestFortune(first.result.feed.fortune,'2026-10-08'),undefined,'future records are never presented as today');
 assert.equal(latestFortune(duplicate.result.feed.fortune,'2026-10-10'),undefined);
});
test('simultaneous draws and interrupted saves recover exactly one durable daily reading',async()=>{
 for(const failAt of [0,1,2,3]){
  const data=new Map([[key,JSON.stringify(feed)]]);let count=0;
  const fail=()=>{if(++count===failAt)throw Error('interrupted');};
  const storage={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{fail();data.set(k,v);},removeItem:async k=>{fail();data.delete(k);}};
  const open=()=>createRecoverableStorage(storage,'journal',[key]);
  const draw=(store,profile=input)=>store.transaction(v=>prepareFortune(v,profile,today,feed));
  if(failAt)await assert.rejects(draw(open()));
  const reloaded=open();await reloaded.recover();
  const [a,b]=await Promise.all([draw(reloaded),draw(reloaded,{bloodType:'B',mbti:'ENFJ',sky:sky(today)})]);
  assert.deepEqual(a.reading,b.reading);assert.equal(b.created,false);
  assert.equal(Object.keys(JSON.parse(data.get(key)).fortune.readings).length,1);
 }
});
test('invalid stored data is not overwritten and history stays bounded',()=>{
 assert.throws(()=>prepareFortune({[key]:JSON.stringify({...feed,fortune:{readings:{bad:{date:'bad'}}}})},input,today,feed));
 let values={};for(let d=1;d<=40;d++){const date=new Date(Date.UTC(2026,8,d)).toISOString().slice(0,10);values=Object.fromEntries(prepareFortune(values,{sky:sky(date)},date,feed).entries);}
 assert.equal(Object.keys(JSON.parse(values[key]).fortune.readings).length,32);
});

test('missing, invalid or wrong-day sky data cannot invent a reading; legacy today can upgrade once',()=>{
 for(const input of [{},{sky:sky('2026-10-08')},{sky:{...sky(today),illumination:101}},{sky:{...sky(today),sourceUrl:'https://example.com'}}])assert.throws(()=>makeDailyFortune(today,input));
 const old={...makeDailyFortune(today,{sky:sky(today)}),sky:undefined,title:'旧占い'};
 const original={...feed,fortune:{readings:{[today]:old}}};assert.equal(latestFortune(original.fortune,today),undefined);
 const next=prepareFortune({[key]:JSON.stringify(original)},input,today,feed);assert.equal(next.result.created,true);assert.equal(next.result.feed.points,feed.points);assert.ok(next.result.reading.sky);
});
