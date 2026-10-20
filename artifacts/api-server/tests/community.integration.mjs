// Runs exclusively in a fresh, randomly named PostgreSQL schema and deletes only that schema.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID, generateKeyPairSync, sign } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const requireServer=createRequire(new URL('../package.json',import.meta.url)),requireDb=createRequire(new URL('../../../lib/db/package.json',import.meta.url));
const { Pool }=requireDb('pg'),express=requireServer('express'),{build}=requireServer('esbuild');
if(!process.env.DATABASE_URL)throw Error('Set DATABASE_URL for the isolated PostgreSQL integration suite');
const schema=`yoki_test_${randomBytes(8).toString('hex')}`,admin=new Pool({connectionString:process.env.DATABASE_URL}),pool=new Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`,max:8});
const temp=await mkdtemp(path.join(tmpdir(),'yoki-community-test-'));
let server;
const originalFetch=globalThis.fetch;
try {
 await admin.query(`CREATE SCHEMA ${schema}`);
 await pool.query(await readFile(new URL('../migrations/20261015_community.sql',import.meta.url),'utf8'));
 globalThis.__yokiTestPool=pool;
 const outfile=path.join(temp,'router.cjs');
 await build({entryPoints:[fileURLToPath(new URL('../src/routes/community.ts',import.meta.url))],outfile,bundle:true,platform:'node',format:'cjs',logLevel:'silent',plugins:[{name:'isolated-database',setup(b){b.onResolve({filter:/^@workspace\/db$/},()=>({path:'isolated-db',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const pool = globalThis.__yokiTestPool;',loader:'js'}));}}]});
 process.env.COMMUNITY_ENABLED='true';process.env.YOKI_REWARDED_ADS_ENABLED='true';process.env.ADMOB_REWARDED_UNIT_IDS='ca-app-pub-1234567890123456/1234567890';
 process.env.REVENUECAT_SECRET_KEY='test-only-not-a-secret';process.env.REVENUECAT_ENTITLEMENT='bonus';
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const subscribers=new Map();
 globalThis.fetch=async (url,options)=>{
  if(String(url)==='https://www.gstatic.com/admob/reward/verifier-keys.json')return new Response(JSON.stringify({keys:[{keyId:123,pem:publicKey.export({type:'spki',format:'pem'})}]}),{status:200});
  if(String(url).startsWith('https://api.revenuecat.com/v1/subscribers/'))return new Response(JSON.stringify(subscribers.get(String(url).split('/').pop()) ?? {subscriber:{}}),{status:200});
  return originalFetch(url,options);
 };
 const app=express();app.use(express.json());app.use('/api',requireServer(outfile).default);app.use((error,req,res,next)=>res.status(500).json({error:'server failure'}));
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base=`http://127.0.0.1:${server.address().port}/api/community`;
 const call=async(token,route,method='GET',body)=>{const response=await originalFetch(base+route,{method,headers:{...(token?{'X-Yoki-Device':token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json().catch(()=>null)};};
 const create=async()=>{const token=randomBytes(32).toString('hex'),result=await call(token,'/device','POST');assert.equal(result.status,201);return {token,id:result.body.id};};
 const a=await create(),b=await create(),c=await create();
 await test('device identity is secret, registration retries are idempotent, and requests need credentials',async()=>{
  assert.equal((await call(null,'/me')).status,401);
  assert.equal((await call(randomBytes(32).toString('hex'),'/me')).status,401);
  assert.equal((await call(a.token,'/device','POST')).body.id,a.id);
  const me=(await call(a.token,'/me')).body;assert.equal(me.visits_enabled,false);assert.equal('token_hash' in me,false);
 });
 await test('invite-only access, safe snapshots, asynchronous greetings, privacy and blocking',async()=>{
  const home={stage:'stage3',furniture:'sofa',flower:'pink',robot:true,diary:'DO NOT SHARE',mood:1};
  await call(b.token,'/home','PUT',{enabled:true,home});
  const me=(await call(b.token,'/me')).body;
  assert.equal((await call(a.token,`/homes/${b.id}`)).status,404);
  assert.equal((await call(a.token,'/friends','POST',{code:me.invite_code})).status,200);
  assert.equal((await call(c.token,`/homes/${b.id}`)).status,404);
  assert.equal(JSON.stringify((await call(a.token,`/homes/${b.id}`)).body).includes('DO NOT SHARE'),false);
  for(let i=0;i<3;i++)assert.equal((await call(a.token,`/homes/${b.id}/visits`,'POST',{greeting:1})).status,200);
  assert.equal((await call(b.token,'/me')).body.visits.length,1);
  assert.equal((await call(a.token,`/homes/${b.id}/visits`,'POST',{greeting:'free text'})).status,400);
  await call(b.token,'/home','PUT',{enabled:false,home});assert.equal((await call(a.token,`/homes/${b.id}`)).status,404);
  assert.equal((await call(a.token,'/me')).body.friends[0].home.furniture,'none');
  await call(b.token,'/home','PATCH',{home});assert.equal((await call(b.token,'/me')).body.visits_enabled,false);
  await call(b.token,'/home','PUT',{enabled:true,home});
  await call(b.token,`/friends/${a.id}/block`,'POST');assert.equal((await call(a.token,`/homes/${b.id}`)).status,404);
  assert.equal((await call(a.token,'/friends','POST',{code:me.invite_code})).status,404);
  assert.equal((await call(b.token,'/me')).body.visits.length,0);
 });
 let claim;
 await test('AdMob setup checks work with ads off, verify signatures, and never grant rewards',async()=>{
  process.env.YOKI_REWARDED_ADS_ENABLED='false';
  const signed=(extra={})=>{const content=new URLSearchParams({ad_unit:'1234567890',reward_item:'YOKIポイント',custom_data:'connection-check',user_id:'yoki-admob-setup',timestamp:String(Date.now()),transaction_id:'setup-check',...extra}).toString();return content+'&signature='+sign('sha256',Buffer.from(decodeURIComponent(content)),privateKey).toString('base64url')+'&key_id=123';};
  try {
   const before=(await pool.query('SELECT count(*)::int AS n FROM yoki_bonus_claims')).rows[0].n;
   assert.equal((await originalFetch(base+'/admob/ssv?'+signed())).status,200);
   assert.equal((await originalFetch(base+'/admob/ssv?'+signed().replace('connection-check','tampered'))).status,400);
   // Console probes do not establish reward eligibility, even for unrelated units/old fixtures.
   assert.equal((await originalFetch(base+'/admob/ssv?'+signed({ad_unit:'different-console-unit'}))).status,200);
   assert.equal((await originalFetch(base+'/admob/ssv?'+signed({timestamp:'1'}))).status,200);
   assert.equal((await originalFetch(base+'/admob/ssv?user_id=yoki-admob-setup&custom_data=connection-check')).status,400);
   assert.equal((await originalFetch(base+'/admob/ssv?'+signed({user_id:a.id,custom_data:randomUUID()}))).status,503);
   assert.equal((await call(null,'/config')).body.ads,false);
   assert.equal((await pool.query('SELECT count(*)::int AS n FROM yoki_bonus_claims')).rows[0].n,before);
  } finally { process.env.YOKI_REWARDED_ADS_ENABLED='true'; }
 });
 await test('parallel bonus requests cannot exceed three per day and replay returns the same reservation',async()=>{
  const replies=await Promise.all(Array.from({length:8},(_,i)=>call(a.token,'/bonus/reserve','POST',{receipt:`egg-1792030000000-order${i}`,mode:'ad'})));
  assert.equal(replies.filter(r=>r.status===200).length,3);assert.equal(replies.filter(r=>r.status===409).length,5);
  const row=(await pool.query('SELECT * FROM yoki_bonus_claims WHERE player_id=$1 ORDER BY created_at LIMIT 1',[a.id])).rows[0];
  claim={...row};
  const replay=await call(a.token,'/bonus/reserve','POST',{receipt:row.receipt_id,mode:'ad'});assert.equal(replay.body.id,row.id);
  assert.equal((await call(b.token,'/bonus/reserve','POST',{receipt:'egg-1792030000000-pass1',mode:'pass'})).status,403);
 });
 await test('only a valid signed SSV grants a reward; duplicate callback and acknowledgement are safe',async()=>{
  const waiting=(await call(a.token,'/bonus')).body.pending;
  assert.ok(waiting.some(item=>item.id===claim.id && typeof item.expires_at==='string'));
  assert.ok(!(await call(b.token,'/bonus')).body.pending.some(item=>item.id===claim.id));
  const signed=(extra={})=>{const content=new URLSearchParams({ad_unit:'1234567890',reward_item:'YOKIポイント',custom_data:claim.id,user_id:a.id,timestamp:String(Date.now()),transaction_id:'txn-'+claim.id,...extra}).toString();return content+'&signature='+sign('sha256',Buffer.from(decodeURIComponent(content)),privateKey).toString('base64url')+'&key_id=123';};
  const query=signed();
  const before=(await pool.query('SELECT * FROM yoki_bonus_claims ORDER BY id')).rows;
  const probe=signed({ad_unit:'different-console-unit',user_id:'yoki-admob-setup',custom_data:'connection-check',timestamp:'1'});
  for(let i=0;i<2;i++) {
   const response=await originalFetch(base+'/admob/ssv?'+probe);
   assert.equal(response.status,200);assert.equal(await response.text(),'verified; no reward granted');
  }
  // Neither half of the reserved pair can bypass actual claim validation.
  assert.equal((await originalFetch(base+'/admob/ssv?'+signed({user_id:'yoki-admob-setup'}))).status,400);
  assert.equal((await originalFetch(base+'/admob/ssv?'+signed({custom_data:'connection-check'}))).status,400);
  assert.equal((await originalFetch(base+'/admob/ssv?'+query.replace('1234567890','wrong-unit'))).status,400);
  assert.equal((await originalFetch(base+'/admob/ssv?'+signed({ad_unit:'wrong-unit'}))).status,400);
  assert.equal((await originalFetch(base+'/admob/ssv?'+signed({timestamp:'1'}))).status,400);
  assert.equal((await originalFetch(base+'/admob/ssv?'+signed({timestamp:String(Date.now()+120000)}))).status,400);
  assert.equal((await originalFetch(base+'/admob/ssv?'+signed({timestamp:String(Date.now()-3600000)}))).status,400);
  assert.deepEqual((await pool.query('SELECT * FROM yoki_bonus_claims ORDER BY id')).rows,before);
  assert.equal((await originalFetch(base+'/admob/ssv?'+query)).status,200);
  assert.equal((await originalFetch(base+'/admob/ssv?'+query)).status,200);
  assert.ok(!(await call(a.token,'/bonus')).body.pending.some(item=>item.id===claim.id));
  assert.equal((await call(a.token,'/bonus')).body.claims.length,1);
  await call(b.token,`/bonus/${claim.id}/ack`,'POST');assert.equal((await call(a.token,'/bonus')).body.claims.length,1);
  await call(a.token,`/bonus/${claim.id}/ack`,'POST');await call(a.token,`/bonus/${claim.id}/ack`,'POST');assert.equal((await call(a.token,'/bonus')).body.claims.length,0);
 });
 await test('verified monthly passes share a quota across restored identities and stop granting after expiry',async()=>{
  const d=await create(),e=await create();
  const subscriber={subscriber:{original_app_user_id:'one-test-store-account',entitlements:{bonus:{product_identifier:'monthly',expires_date:new Date(Date.now()+3600000).toISOString()}},subscriptions:{monthly:{is_sandbox:false}}}};
  subscribers.set(d.id,subscriber);subscribers.set(e.id,subscriber);
  assert.equal((await call(d.token,'/pass')).body.active,true);
  const results=await Promise.all(Array.from({length:6},(_,i)=>call(i%2?d.token:e.token,'/bonus/reserve','POST',{receipt:`egg-1792030000000-paid${i}`,mode:'pass'})));
  assert.equal(results.filter(r=>r.status===200).length,3);
  assert.equal(results.filter(r=>r.status===409).length,3);
  for(const result of results.filter(r=>r.status===200)){assert.equal(result.body.state,'earned');assert.equal(result.body.amount,30);}
  subscriber.subscriber.entitlements.bonus.expires_date=new Date(Date.now()-3600000).toISOString();
  assert.equal((await call(d.token,'/pass')).body.active,false);
  assert.equal((await call(d.token,'/bonus/reserve','POST',{receipt:'egg-1792030000000-expired',mode:'pass'})).status,403);
 });
 await test('daily placements and workshop share the same cap and daily claims require signed SSV',async()=>{
  const player=await create();
  const receipts=[`daily-home-${randomUUID()}`,`daily-meal-${randomUUID()}`,`egg-1792030000000-mixed1`];
  const responses=await Promise.all(receipts.map(receipt=>call(player.token,'/bonus/reserve','POST',{receipt,mode:'ad'})));
  assert.deepEqual(responses.map(r=>r.status),[200,200,200]);
  assert.equal((await call(player.token,'/bonus')).body.remaining,0);
  assert.equal((await call(player.token,'/bonus/reserve','POST',{receipt:`daily-street-${randomUUID()}`,mode:'ad'})).status,409);
  assert.equal((await call(player.token,'/bonus/reserve','POST',{receipt:`daily-home-${randomUUID()}`,mode:'pass'})).status,400);
  assert.equal((await call(player.token,'/bonus')).body.claims.length,0);
  const claim=responses[0].body;assert.ok(Number.isFinite(Date.parse(claim.expiresAt)));
  const content=new URLSearchParams({ad_unit:'1234567890',reward_item:'YOKIポイント',custom_data:claim.id,user_id:player.id,timestamp:String(Date.now()),transaction_id:'daily-'+claim.id}).toString();
  const query=content+'&signature='+sign('sha256',Buffer.from(decodeURIComponent(content)),privateKey).toString('base64url')+'&key_id=123';
  assert.equal((await originalFetch(base+'/admob/ssv?'+query)).status,200);
  assert.equal((await originalFetch(base+'/admob/ssv?'+query)).status,200);
  const confirmed=(await call(player.token,'/bonus')).body.claims;
  assert.equal(confirmed.length,1);assert.equal(confirmed[0].amount,30);assert.equal(confirmed[0].receipt_id,receipts[0]);
 });
 await test('metrics accept only explicit names and estimated revenue stays separate from rewards',async()=>{
  assert.equal((await call(a.token,'/metrics','POST',{id:randomUUID(),event:'mood_recorded',mood:1})).status,400);
  const id=randomUUID();for(let i=0;i<2;i++)await call(a.token,'/metrics','POST',{id,event:'ad_loaded',durationMs:1234,diary:'private'});
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM yoki_feature_metrics')).rows[0].n,1);
  await call(a.token,`/bonus/${claim.id}/revenue`,'POST',{micros:1000,currency:'JPY',test:true});
  await call(a.token,`/bonus/${claim.id}/revenue`,'POST',{micros:9000,currency:'JPY',test:false});
  const row=(await pool.query('SELECT estimated_revenue_micros,revenue_test,amount FROM yoki_bonus_claims WHERE id=$1',[claim.id])).rows[0];assert.equal(Number(row.estimated_revenue_micros),1000);assert.equal(row.revenue_test,true);assert.equal(row.amount,30);
 });
}finally{
 globalThis.fetch=originalFetch;
 if(server)await new Promise(resolve=>server.close(resolve));
 await pool.end();
 if(/^yoki_test_[a-f0-9]{16}$/.test(schema))await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
 await admin.end();delete globalThis.__yokiTestPool;await rm(temp,{recursive:true,force:true});
}
