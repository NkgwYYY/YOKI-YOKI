import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { createAuthenticatedServer } from './fixtures/authenticatedServer.mjs';
test('real app verifies signed identities and keeps protected operations scoped over HTTP',async t=>{
 const api=await createAuthenticatedServer();
 try{
  await t.test('public health starts; guest insight and protected account routes reject before AI/DB writes',async()=>{
   assert.equal((await api.request('/healthz')).status,200);
   for(const [path,method,body] of [['/insight','POST',{records:[],progress:{level:1}}],['/sync','GET'],['/sync','PUT',{data:{test:1}}],['/account','DELETE']]){
    const response=await api.request(path,method,undefined,body);assert.equal(response.status,401,path+': '+await response.text());
   }
   assert.equal(api.aiCalls.length,0);assert.equal((await api.pg.query('SELECT * FROM user_data')).rows.length,0);
  });
  await t.test('valid RSA session tokens access the real route; unsigned, expired, future and wrong-key tokens do not',async()=>{
   const a=api.token('user_a');assert.equal((await api.request('/sync','GET',a)).status,200);
   const wrong=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey,now=Math.floor(Date.now()/1000);
   const tokens=['invalid',api.token('user_a',{exp:now-60}),api.token('user_a',{nbf:now+120}),api.token('user_a',{},wrong)];
   for(const token of tokens)assert.equal((await api.request('/sync','GET',token)).status,401);
  });
  await t.test('the verified subject owns records; spoofed body IDs do not cross accounts',async()=>{
   assert.equal((await api.request('/sync','PUT',api.token('user_a'),{userId:'user_b',data:{'@mentore/records_v2':[{notes:'only a'}]}})).status,200);
   assert.deepEqual((await (await api.request('/sync','GET',api.token('user_b'))).json()).data,{});
   assert.deepEqual((await (await api.request('/sync','GET',api.token('user_a'))).json()).data['@mentore/records_v2'],[{notes:'only a'}]);
  });
  await t.test('signed insight reaches AI only after auth and preserves its per-user limit',async()=>{
   const data={records:[{date:'2026-10-06',mood:3,sleep:0,sleepRecorded:false,behaviors:[]}]};
   for(let i=0;i<10;i++)assert.equal((await api.request('/insight','POST',api.token('user_insight'),data)).status,200);
   assert.equal((await api.request('/insight','POST',api.token('user_insight'),data)).status,429);
   assert.equal(api.aiCalls.length,10);
  });
  await t.test('malformed AI fields never become stringified object text in the real response',async()=>{
   const original=api.ai.reply;
   try{
    for(const insights of [{length:1},[null],[{title:{bad:true},body:'text'}],[{title:' ',body:'text'}],[]]){
     api.ai.reply=JSON.stringify({insights});
     const res=await api.request('/insight','POST',api.token('user_malformed'),{records:[{date:'2026-10-06',mood:3,behaviors:[]}]});
     assert.equal(res.status,502,JSON.stringify(insights)+': '+await res.text());
    }
   }finally{api.ai.reply=original;}
  });
  await t.test('account deletion remains subject-scoped and rejects a still-valid old token afterward',async()=>{
   const a=api.token('user_a');assert.equal((await api.request('/account','DELETE',a,{userId:'user_b'})).status,200);
   assert.equal((await api.request('/sync','PUT',a,{data:{'@mentore/records_v2':['late']}})).status,410);
   assert.equal((await api.request('/sync','GET',api.token('user_b'))).status,200);
   assert.equal((await api.request('/account','DELETE',a)).status,200);
  });
  assert.deepEqual(api.outbound,[],'no external identity/AI calls');
 }finally{await api.close();}
});
