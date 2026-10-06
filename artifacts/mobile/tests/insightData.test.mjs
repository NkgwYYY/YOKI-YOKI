import assert from 'node:assert/strict';
import test from 'node:test';
import { readInsights } from '../utils/insightData.ts';
test('insights accept text and copy only presentation fields',()=>{
  const source=[{title:'小さな一歩',body:'記録を残しました。',extra:'ignored'}];
  assert.deepEqual(readInsights(source),[{title:source[0].title,body:source[0].body}]);
  assert.notEqual(readInsights(source)[0],source[0]);
});
test('malformed API or cache insight collections cannot reach rendering',()=>{
  for(const value of [null,undefined,{},'text',[],{length:1},[null],[{}],[{title:[],body:'ok'}],[{title:'ok',body:{}}],[{title:' ',body:'ok'}],[{title:'ok',body:''}],[{title:'ok',body:'ok'},null]])assert.equal(readInsights(value),null);
});

import { buildLocalInsights, requestInsights, InsightRequestError } from '../utils/insightData.ts';
test('guest reflection counts actual days without duplicating edits or interpreting mood',()=>{
 const records=[{date:'2026-10-01',win:'old'},{date:'2026-10-01',win:'',behaviors:['外に出た']},{date:'2026-10-02',win:'一歩',mood:1}];
 const copy=JSON.stringify(records),insights=buildLocalInsights(records,'2026-10-06');
 assert.deepEqual(insights.map(i=>i.title),['2日分の記録を残したね','1日分の「できた」があるよ','1日、行動を記録したね']);
 assert.equal(JSON.stringify(records),copy);assert.ok(!JSON.stringify(insights).includes('気分が良い'));
});
test('guest reflection excludes future/invalid dates and uses the latest 30 dated entries',()=>{
 assert.deepEqual(buildLocalInsights([{date:'2026-02-30'},{date:'2027-01-01'},{date:'bad'}],'2026-10-06'),[]);
 const records=Array.from({length:40},(_,i)=>({date:new Date(Date.UTC(2026,7,i+1)).toISOString().slice(0,10)}));
 assert.equal(buildLocalInsights(records,'2026-10-06')[0].title,'30日分の記録を残したね');
});
const run=(options={})=>requestInsights({url:'https://local.invalid/insight',payload:{records:['private']},getToken:async()=>'test-token',isCurrent:()=>true,
 signal:new AbortController().signal,...options});
const kind=k=>error=>error instanceof InsightRequestError&&error.kind===k;
test('missing session does not transmit private records',async()=>{
 let calls=0;await assert.rejects(run({getToken:async()=>null,fetcher:async()=>{calls++;}}),kind('auth'));assert.equal(calls,0);
});
for(const [status,error] of [[401,'auth'],[403,'auth'],[429,'limit'],[500,'network']])test('HTTP '+status+' is actionable rather than success',async()=>{
 await assert.rejects(run({fetcher:async()=>new Response('{}',{status})}),kind(error));
});
test('authenticated insight validates content and includes its captured token',async()=>{
 const insights=[{title:'一歩',body:'残した記録'}];
 assert.deepEqual(await run({fetcher:async(_url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer test-token');assert.deepEqual(JSON.parse(options.body),{records:['private']});return new Response(JSON.stringify({insights}));
 }}),insights);
 await assert.rejects(run({fetcher:async()=>new Response('{"insights":[{"title":{},"body":"x"}]}')}),kind('network'));
});
for(const stage of ['token','fetch','body'])test('deadline covers hung '+stage+' even if the dependency ignores abort',async()=>{
 const never=()=>new Promise(()=>{}),options={timeoutMs:5};
 if(stage==='token')options.getToken=never;
 else options.fetcher=stage==='fetch'?never:async()=>({ok:true,status:200,json:never});
 await assert.rejects(run(options),kind('timeout'));
});
test('identity changing during token acquisition prevents sending; cancelled body cannot render',async()=>{
 let current=true,calls=0;
 await assert.rejects(run({isCurrent:()=>current,getToken:async()=>{current=false;return 'old';},fetcher:async()=>{calls++;}}),kind('cancelled'));assert.equal(calls,0);
 const controller=new AbortController();
 await assert.rejects(run({signal:controller.signal,fetcher:async()=>({ok:true,status:200,json:async()=>{controller.abort();return {insights:[{title:'late',body:'late'}]};}})}),kind('cancelled'));
});
