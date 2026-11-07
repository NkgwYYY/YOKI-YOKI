// Real browser components -> real HTTP app -> installed Clerk RSA verifier ->
// isolated SQL DB. The SDK session and AI vendor output are test substitutes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {build}=createRequire(path.resolve(__dirname,'../../api-server/package.json'))('esbuild');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const mobile=path.resolve(__dirname,'..');
(async()=>{
 const {createAuthenticatedServer}=await import('../../api-server/tests/fixtures/authenticatedServer.mjs');
 const api=await createAuthenticatedServer();let server,browser,release;
 try{
  const tokens=Object.fromEntries(['user_a','user_limit'].map(id=>[id,api.token(id)]));
  const expired=api.token('user_a',{exp:Math.floor(Date.now()/1000)-60});
  const sdk=`import React from 'react';const SDK=React.createContext('guest');
   export function TestSDK({children}){const [id,setId]=React.useState(()=>localStorage.getItem('qa-id')||'guest');window.qaSwitch=id=>{localStorage.setItem('qa-id',id);setId(id);};return <SDK.Provider value={id}>{children}</SDK.Provider>;}
   export const useAuth=()=>{const id=React.useContext(SDK);return {isLoaded:true,isSignedIn:id!=='guest',userId:id,sessionId:'session-'+id,signOut:async()=>window.qaSwitch('guest')};};
   export const useUser=()=>{const id=React.useContext(SDK);return {user:id==='guest'?null:{id,delete:async()=>{}}};};
   export const useSession=()=>{const id=React.useContext(SDK);return {session:{id:'session-'+id,user:{id},getToken:async()=>window.qaTokenMode==='missing'?null:window.qaTokenMode==='expired'?window.qaExpired:window.qaTokens[id]}};};`;
  const built=await build({absWorkingDir:mobile,stdin:{resolveDir:mobile,loader:'tsx',contents:`import React from 'react';import {createRoot} from 'react-dom/client';
   import {View,Text,ScrollView} from 'react-native';import {TestSDK} from '@clerk/expo';import {AuthProvider,useAuth} from './contexts/AuthContext';
   import {AppProvider,useApp} from './contexts/AppContext';import {InsightCard} from './components/InsightCard';import {Button} from './components/ui/Button';
   function Probe(){const app=useApp(),auth=useAuth();window.qaApp=app;return <ScrollView contentContainerStyle={{padding:20,gap:20,maxWidth:460,width:'100%',alignSelf:'center'}}>
     <Text style={{fontSize:20}}>記録のふりかえり・接続確認</Text><Text>認証セッションとAI応答は検証用です。</Text>
     <Text testID="identity">{app.privateCache?(auth.user?.id||'guest'):'loading'}</Text><InsightCard/>
     <Button label="検証用の記録を保存" disabled={!app.privateCache} onPress={()=>app.saveRecord(3,0,[],'API接続の検証',{sleepRecorded:false})}/>
   </ScrollView>;}
   createRoot(document.getElementById('root')).render(<TestSDK><AuthProvider><AppProvider><Probe/></AppProvider></AuthProvider></TestSDK>);`},
   bundle:true,write:false,platform:'browser',format:'iife',alias:{'react-native':'react-native-web'},loader:{'.png':'dataurl','.jpg':'dataurl'},
   define:{'process.env.NODE_ENV':'"production"','process.env.EXPO_PUBLIC_DOMAIN':'"qa.invalid"',__DEV__:'false',global:'globalThis'},
   plugins:[{name:'local-session-adapters',setup(build){const fixtures={
    '@clerk/expo':sdk,
    '@react-native-async-storage/async-storage':`export default {getItem:async k=>localStorage.getItem(k),setItem:async(k,v)=>{if(k.startsWith('@yoki/private_cache_v1/')&&window.qaFailPrivate)throw Error('disk unavailable');localStorage.setItem(k,v);},removeItem:async k=>localStorage.removeItem(k),getAllKeys:async()=>Object.keys(localStorage)};`,
    'expo-haptics':'export const notificationAsync=async()=>{};export const impactAsync=async()=>{};export const selectionAsync=async()=>{};export const NotificationFeedbackType={Success:1};export const ImpactFeedbackStyle={Light:1};',
    '@/components/ui/Icon':'export const Icon=()=>null;export const IconBadge=()=>null;export const iconSize={md:18,sm:16};'};
    build.onResolve({filter:/.*/},({path:name})=>name in fixtures?{path:name,namespace:'fixture'}:null);
    build.onLoad({filter:/.*/,namespace:'fixture'},({path:name})=>({contents:fixtures[name],loader:'tsx',resolveDir:mobile}));}}]});
  server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?built.outputFiles[0].text:'<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><title>API連携のローカル検証</title><style>html,body,#root{height:100%;margin:0;background:#F7F3EA}</style><div id="root"></div><script src="/bundle.js"></script></html>');});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const args=process.env.YOKI_QA_CHROMIUM_BUNDLE?(await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(x=>x!=='--single-process'):['--no-sandbox'];
  browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args});
  const page=await browser.newPage({viewport:{width:320,height:568},hasTouch:true,locale:'ja-JP',reducedMotion:'reduce'});
  const errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-06T03:00:00Z')});
  await page.addInitScript(({tokens,expired})=>{window.qaTokens=tokens;window.qaExpired=expired;
    if(localStorage.getItem('qa-seeded'))return;localStorage.setItem('qa-seeded','true');
    localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'検証用',ageRange:'回答しない',gender:'回答しない'}));
    localStorage.setItem('@mentore/records_v2',JSON.stringify([{date:'2026-10-01',mood:3,sleep:0,sleepRecorded:false,behaviors:[],notes:''},{date:'2026-10-02',mood:2,sleep:0,sleepRecorded:false,behaviors:[],notes:'',win:'一歩を残せた'}]));
    localStorage.setItem('@mentore/insight_v1',JSON.stringify({date:'2026-10-06',insights:[{title:'以前のAI結果',body:'古いキャッシュ'}]}));
  },{tokens,expired});
  await page.route('https://qa.invalid/api/**',async route=>{
    const req=route.request(),pathname=new URL(req.url()).pathname;calls.push({path:pathname,method:req.method(),body:req.postData()});
    try{const response=await route.fetch({url:api.origin+pathname,maxRedirects:0});await route.fulfill({response});}catch(error){if(!page.isClosed())await route.abort().catch(()=>{});}
  });
  const ready=async id=>page.getByTestId('identity').filter({hasText:new RegExp('^'+id+'$')}).waitFor();
  const swap=async id=>{await page.evaluate(id=>window.qaSwitch(id),id);await ready(id);};
  const until=async check=>{const deadline=Date.now()+5000;while(!check()){if(Date.now()>deadline)throw Error('Expected HTTP request not observed');await new Promise(r=>setTimeout(r,10));}};
  await page.goto('http://127.0.0.1:'+server.address().port);await ready('guest');
  assert.equal(await page.getByText('以前のAI結果',{exact:true}).count(),0);
  await page.evaluate(()=>window.qaFailPrivate=true);await page.getByRole('button',{name:'記録をふりかえる',exact:true}).tap();
  await page.getByText('2日分の記録を残したね',{exact:true}).waitFor();await page.getByText('1日分の「できた」があるよ',{exact:true}).waitFor();
  await page.getByRole('button',{name:'保存をもう一度試す',exact:true}).waitFor();assert.equal(calls.filter(c=>c.path==='/api/insight').length,0);
  await page.evaluate(()=>window.qaFailPrivate=false);await page.getByRole('button',{name:'保存をもう一度試す',exact:true}).tap();
  await page.getByRole('button',{name:'保存をもう一度試す',exact:true}).waitFor({state:'hidden'});await page.reload();await page.getByText('2日分の記録を残したね',{exact:true}).waitFor();
  assert.equal(api.aiCalls.length,0);console.log('PASS guest reflection uses real saved days, preserves cache retry/reload, sends no AI request');
  await page.getByRole('button',{name:'検証用の記録を保存',exact:true}).tap();
  await page.getByRole('button',{name:'記録をふりかえる',exact:true}).tap();await page.getByText('3日分の記録を残したね',{exact:true}).waitFor();
  assert.equal(api.aiCalls.length,0);console.log('PASS a newly saved guest day invalidates only the local reflection cache');
  if(process.env.YOKI_QA_SCREENSHOTS){fs.mkdirSync(process.env.YOKI_QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.YOKI_QA_SCREENSHOTS,'guest-reflection.jpg'),quality:90});}
  await swap('user_a');const generate=page.getByRole('button',{name:'すごいところを見つけてもらう',exact:true});await generate.waitFor();
  await page.evaluate(()=>window.qaTokenMode='missing');await generate.tap();await page.getByRole('alert').filter({hasText:'ログイン状態を確認できませんでした'}).waitFor();
  assert.equal(calls.filter(c=>c.path==='/api/insight').length,0);
  await page.evaluate(()=>window.qaTokenMode='expired');await generate.tap();await page.getByRole('alert').filter({hasText:'ログイン状態を確認できませんでした'}).waitFor();
  assert.equal(api.aiCalls.length,0);await page.evaluate(()=>window.qaTokenMode=null);
  const original=api.ai.reply;api.ai.reply=JSON.stringify({insights:[{title:{bad:true},body:'invalid'}]});await generate.tap();
  await page.getByRole('alert').filter({hasText:'うまく見つけられなかった'}).waitFor();assert.equal(await page.getByText('[object Object]',{exact:true}).count(),0);api.ai.reply=original;
  api.ai.hold=new Promise(r=>release=r);const beforeHold=api.aiCalls.length;await generate.tap();await until(()=>api.aiCalls.length>beforeHold);
  await page.clock.fastForward(16000);await page.getByRole('alert').filter({hasText:'返事を待つ時間が長くなったため中断しました'}).waitFor();release();api.ai.hold=null;
  await page.evaluate(()=>window.qaFailPrivate=true);await generate.tap();await page.getByText('記録を残した一歩',{exact:true}).waitFor();
  await page.getByRole('button',{name:'保存をもう一度試す',exact:true}).waitFor();const aiCount=api.aiCalls.length;
  await page.evaluate(()=>window.qaFailPrivate=false);await page.getByRole('button',{name:'保存をもう一度試す',exact:true}).tap();
  await page.getByRole('button',{name:'保存をもう一度試す',exact:true}).waitFor({state:'hidden'});assert.equal(api.aiCalls.length,aiCount);
  await page.reload();await ready('user_a');await page.getByText('記録を残した一歩',{exact:true}).waitFor();assert.equal(api.aiCalls.length,aiCount);
  console.log('PASS missing/expired token, actual malformed AI response, timeout, authenticated retry and save-only retry/reload');
  await page.getByRole('button',{name:'検証用の記録を保存',exact:true}).tap();
  await page.waitForFunction(()=>window.qaApp.records.some(r=>r.notes==='API接続の検証')&&window.qaApp.cloudSyncState.phase==='idle');
  const cloud=await (await api.request('/sync','GET',tokens.user_a)).json();assert.ok(cloud.data['@mentore/records_v2'].some(r=>r.notes==='API接続の検証'));
  assert.ok(!/insight_v1|private_cache/.test(JSON.stringify(cloud)));
  const snapshot={data:{'@mentore/profile_v1':{nickname:'上限確認',ageRange:'回答しない',gender:'回答しない'},'@mentore/records_v2':[{date:'2026-10-01',mood:3,sleep:0,behaviors:[]}]}};
  assert.equal((await api.request('/sync','PUT',tokens.user_limit,snapshot)).status,200);
  for(let i=0;i<10;i++)assert.equal((await api.request('/insight','POST',tokens.user_limit,{records:snapshot.data['@mentore/records_v2']})).status,200);
  await swap('user_limit');await generate.tap();await page.getByRole('alert').filter({hasText:'利用回数が上限に達しました'}).waitFor();
  await page.setViewportSize({width:844,height:390});await page.getByRole('alert').scrollIntoViewIfNeeded();
  if(process.env.YOKI_QA_SCREENSHOTS)await page.screenshot({path:path.join(process.env.YOKI_QA_SCREENSHOTS,'insight-limit-wide.jpg'),quality:90});
  assert.deepEqual(errors,[]);assert.deepEqual(api.outbound,[]);console.log('PASS actual provider record -> verified HTTP -> SQL -> reload, private exclusions and real per-user limit; no page errors or external calls');
 }finally{release?.();await browser?.close();if(server)await new Promise(r=>server.close(r));await api.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
