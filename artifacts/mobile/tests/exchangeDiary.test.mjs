import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as energy from '../utils/lightEnergy.ts';
import * as game from '../utils/gameLogic.ts';
import * as happiness from './careModules.mjs';
import {preparePlazaEvent} from '../utils/plazaEvents.ts';
import {createRecoverableStorage} from '../utils/recoverableStorage.ts';
function load(path,deps){const out={};const code=ts.transpileModule(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','exports',code)(name=>{if(!Object.hasOwn(deps,name))throw Error(name);return deps[name];},out);return out;}
const daily=load('../utils/dailyRecordTransaction.ts',{'./gameLogic':game,'./lightEnergy':energy,'./happiness':happiness});
const {prepareDiary,makeDiaryLetter,diaryReply}=load('../utils/exchangeDiary.ts',{'./dailyRecordTransaction':daily});
const k=daily.RECORD_KEYS,today='2026-10-09',yesterday='2026-10-08',now=Date.parse('2026-10-09T10:00:00Z');
const defaults={progress:{experience:0,level:1,mentalMuscle:0,streak:0,totalDays:0,lastRecordDate:''},feed:{points:100,lastFeedTime:'',satietyAtFeed:65}};
const character={name:'よっきー',stage:'egg'};
function fixture(){
 const data=new Map([[k.feed,JSON.stringify(defaults.feed)]]);let failAt=Infinity,writes=0;
 const storage={getItem:async k=>data.get(k)??null,setItem:async(k,v)=>{if(++writes===failAt)throw Error('disk');data.set(k,v);},removeItem:async k=>{if(++writes===failAt)throw Error('disk');data.delete(k);}};
 const store=createRecoverableStorage(storage,'journal',Object.values(k));
 return {data,failAt:n=>{writes=0;failAt=n;},run:(op,day=today,who=character)=>store.transaction(values=>prepareDiary(values,op,day,yesterday,now,defaults,who,5))};
}
const open={kind:'open',date:today};
const send={kind:'send',date:today,id:'test-diary-1',revision:0,text:'帰り道で、きれいな夕焼けを見た。',mood:4};
test('reading creates a stable character page without mood records, points or daily streaks',async()=>{
 const f=fixture(),a=await f.run(open),b=await f.run(open,today,{name:'新しい名前',stage:'stage4'});
 assert.deepEqual(a.page,b.page);assert.equal(b.changed,false);assert.equal(b.feed.points,100);assert.equal(f.data.has(k.records),false);
 assert.equal(a.page.name,'よっきー');assert.equal(a.page.stage,'egg');
});
test('both sides, reply and daily mood reward are saved together and retries are idempotent',async()=>{
 const f=fixture();await f.run(open);const a=await f.run(send),b=await f.run(send);
 assert.equal(a.page.user.text,send.text);assert.equal(a.page.user.mood,4);assert.ok(a.page.reply);
 assert.equal(a.record.records[0].mood,4);assert.equal(a.feed.points,105);assert.equal(b.feed.points,105);assert.equal(b.changed,false);assert.equal(b.record.records[0].mood,4);
 assert.deepEqual(b.page.letter,a.page.letter);
});
test('existing notes, detailed fields and other feed systems survive a diary submission',async()=>{
 const f=fixture();const old={id:'old',date:today,mood:3,sleep:7,sleepRecorded:true,behaviors:['散歩'],notes:'前からある大切な記録',exercise:2,meal:3,social:1,win:'ひと休み',activities:{walk:1}};
 f.data.set(k.records,JSON.stringify([old]));f.data.set(k.feed,JSON.stringify({...defaults.feed,fortune:{readings:{}},plazaEvents:{day:today,seen:[],serial:1,nextAt:now}}));
 await f.run(open);const a=await f.run(send);assert.deepEqual(a.record.records[0],{...old,mood:4});assert.equal(a.feed.points,100);assert.deepEqual(a.feed.fortune,{readings:{}});assert.equal(a.feed.plazaEvents.serial,1);
});
for(const n of [1,2,3,4,5,6,7])test(`interrupted diary write ${n} restores both pages and awards once`,async()=>{
 const f=fixture();await f.run(open);f.failAt(n);await assert.rejects(f.run(send),/disk/);const r=await f.run(send);
 assert.equal(r.feed.points,105);assert.equal(r.page.user.text,send.text);assert.equal(r.record.records.length,1);assert.equal(r.record.progress.totalDays,1);assert.equal(f.data.has('journal'),false);
});
test('mood-only and low mood entries receive the same ordinary daily reward',async()=>{
 for(const mood of [1,5]){const f=fixture();await f.run(open);const r=await f.run({...send,text:'',mood});assert.equal(r.feed.points,105);assert.equal(r.page.user.text,'');assert.ok(r.page.reply.includes('気分、受け取った'));}
 assert.ok(!diaryReply(1,today,'つらい').includes('うれしい気持ち'));
});
test('editing and concurrent requests cannot duplicate rewards or silently replace a newer diary',async()=>{
 const f=fixture();await f.run(open);const [a,b]=await Promise.all([f.run(send),f.run(send)]);assert.equal(a.feed.points,105);assert.equal(b.feed.points,105);
 const c=await f.run({...send,id:'edit-1',revision:1,text:'追記した日記',mood:2});assert.equal(c.page.revision,2);assert.equal(c.feed.points,105);assert.equal(c.record.records[0].mood,2);
 await assert.rejects(f.run({...send,id:'stale',text:'古い画面から'}),/更新/);assert.equal(JSON.parse(f.data.get(k.feed)).exchangeDiary.pages[today].user.text,'追記した日記');
});
test('new dates preserve all old pages; a draft left open across midnight can still be sent',async()=>{
 const f=fixture();const a=await f.run(open);const late=await f.run(send,'2026-10-10');assert.equal(late.page.date,today);assert.equal(late.feed.points,100);assert.equal(late.record,null);
 const b=await f.run({kind:'open',date:'2026-10-10'},'2026-10-10');assert.equal(Object.keys(b.feed.exchangeDiary.pages).length,2);assert.notDeepEqual(a.page.letter,b.page.letter);assert.equal(b.feed.exchangeDiary.pages[today].user.text,send.text);
});
test('bad dates, oversized text and unknown mood leave all stored data unchanged',async()=>{
 const f=fixture();await f.run(open);const before=new Map(f.data);
 for(const op of [{...send,mood:0},{...send,text:'a'.repeat(1601)},{kind:'open',date:'2026-02-30'},{kind:'open',date:'2027-01-01'}])await assert.rejects(f.run(op));
 assert.deepEqual(f.data,before);
});
test('an actual resolved plaza encounter can become the character diary; merely meeting is not treated as helping',()=>{
 const plaza={day:today,seen:['balloon'],serial:1,nextAt:0,current:{id:'p',kind:'balloon'}};
 assert.notEqual(makeDiaryLetter(today,{...defaults.feed,plazaEvents:plaza}).source,'plaza-balloon');
 assert.equal(makeDiaryLetter(today,{...defaults.feed,plazaEvents:{...plaza,current:{...plaza.current,outcome:{choice:'accept',points:60,at:now}}}}).source,'plaza-balloon');
});

test('a completed plaza event remains available to the diary after leaving the dialogue',()=>{
 const seed={...defaults.feed,plazaEvents:{day:today,seen:['balloon'],serial:1,nextAt:0,current:{id:'p',kind:'balloon'}}};
 const a=preparePlazaEvent({[k.feed]:JSON.stringify(seed)},{kind:'resolve',id:'p',choice:'accept'},today,now,defaults.feed,0).result;
 const b=preparePlazaEvent({[k.feed]:JSON.stringify(a.feed)},{kind:'leave',id:'p'},today,now,defaults.feed,0).result;
 assert.equal(b.state.current,undefined);assert.equal(makeDiaryLetter(today,b.feed).source,'plaza-balloon');
 assert.notEqual(makeDiaryLetter('2026-10-10',b.feed).source,'plaza-balloon');
});
