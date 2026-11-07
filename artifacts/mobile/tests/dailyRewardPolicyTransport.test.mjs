import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Execute the production HTTP adapter against an isolated backend with the same
// compatibility rule: legacy status responses intentionally omit new 10pt claims.
// No network, real device registration, live ads or real balance is used here.
const code = ts.transpileModule(readFileSync(new URL('../utils/community/api.ts',import.meta.url),'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
}).outputText;
function fixture() {
  const values=new Map(), calls=[], reservations=new Map();
  const old={id:'00000000-0000-4000-8000-000000000001',receipt_id:'daily-home-old',amount:30};
  const earned=new Map([[old.id,old]]), acknowledged=[];
  const storage={getItem:async k=>values.get(k)??null,setItem:async(k,v)=>values.set(k,v),removeItem:async k=>values.delete(k)};
  const fetch=async(url,options)=>{
    const u=new URL(url), body=options.body?JSON.parse(options.body):undefined;
    calls.push({path:u.pathname,query:u.searchParams.toString(),body});
    let result;
    if(u.pathname.endsWith('/config')) result={enabled:true,ads:true,bonusPoints:u.searchParams.get('rewardPolicy')==='daily10'?10:30,rewardPolicy:u.searchParams.get('rewardPolicy')??'legacy',dailyLimit:3,passSales:false};
    else if(u.pathname.endsWith('/device'))result={id:'synthetic-player'};
    else if(u.pathname.endsWith('/bonus/reserve')) {
      if(!reservations.has(body.receipt))reservations.set(body.receipt,{id:'00000000-0000-4000-8000-000000000002',playerId:'synthetic-player',mode:body.mode,state:'reserved',amount:body.mode==='ad'&&body.rewardPolicy==='daily10'?10:30});
      result=reservations.get(body.receipt);
    } else if(u.pathname.endsWith('/bonus')) {
      const policy=u.searchParams.get('rewardPolicy');
      result={remaining:1,day:'2026-11-07',claims:[...earned.values()].filter(c=>policy==='daily10'||c.amount===30),pending:[...reservations.values()].filter(r=>!earned.has(r.id)).map(r=>({id:r.id,receipt_id:'daily-home-new',amount:r.amount,expires_at:'2026-11-08T00:00:00Z'}))};
    } else if(u.pathname.endsWith('/ack')) {const id=u.pathname.split('/').at(-2);acknowledged.push(id);earned.delete(id);result={ok:true};}
    else throw Error('Unexpected synthetic request');
    return {ok:true,json:async()=>result};
  };
  const api={};
  new Function('require','exports','fetch',code)(name=>{
    if(name==='@react-native-async-storage/async-storage')return {__esModule:true,default:storage};
    if(name==='expo-secure-store')return {getItemAsync:storage.getItem,setItemAsync:storage.setItem,deleteItemAsync:storage.removeItem};
    if(name==='expo-crypto')return {CryptoDigestAlgorithm:{SHA256:'SHA256'},digestStringAsync:async()=> 'synthetic-account-digest',getRandomBytesAsync:async()=>new Uint8Array(32).fill(5)};
    if(name==='react-native')return {Platform:{OS:'ios'}};
    if(name==='@/contexts/AuthContext')return {API_BASE:'https://isolated.invalid/api'};
    throw Error(`Unexpected synthetic dependency: ${name}`);
  },api,fetch);
  return {api,calls,earned,acknowledged};
}

test('config, reservation and claim recovery negotiate daily10; old claims and ID acknowledgements remain compatible',async()=>{
  const f=fixture(), client=f.api.createCommunityClient('synthetic-user');
  const config=await f.api.communityConfig();assert.equal(config.bonusPoints,10);assert.equal(config.rewardPolicy,'daily10');
  const reservation=await f.api.reserveCommunityBonus(client,'daily-home-new','ad');assert.equal(reservation.amount,10);
  const pending=await f.api.communityBonusStatus(client);assert.equal(pending.pending[0].amount,10);
  f.earned.set(reservation.id,{id:reservation.id,receipt_id:'daily-home-new',amount:reservation.amount});
  const status=await f.api.communityBonusStatus(client);
  assert.deepEqual(status.claims.map(c=>c.amount),[30,10]);
  // The deliberately legacy request demonstrates that omitting the policy loses
  // the new claim, making this a regression check rather than a URL-only check.
  assert.deepEqual((await client.call('/bonus')).claims.map(c=>c.amount),[30]);
  for(const claim of status.claims)await client.call(`/bonus/${claim.id}/ack`,'POST');
  assert.equal((await f.api.communityBonusStatus(client)).claims.length,0);
  assert.deepEqual(f.acknowledged,status.claims.map(c=>c.id));
  assert.equal(f.calls.find(c=>c.path.endsWith('/bonus/reserve')).body.rewardPolicy,'daily10');
});

test('daily10 requests keep pass rewards at their existing 30pt contract',async()=>{
  const f=fixture(),client=f.api.createCommunityClient('synthetic-pass-user');
  const reservation=await f.api.reserveCommunityBonus(client,'egg-synthetic','pass');
  assert.equal(reservation.amount,30);assert.equal(reservation.mode,'pass');
});
