// Actual AuthProvider, AppProvider, chat screen, InsightCard and HOME comment
// utility. Only identity/network/native artwork adapters are synthetic.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {build}=createRequire(path.resolve(__dirname,'../../api-server/package.json'))('esbuild');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const mobile=path.resolve(__dirname,'..');
const sdk=`import React from 'react';const SDK=React.createContext(null);
export function TestSDK({children}){const [id,setId]=React.useState(()=>localStorage.getItem('qa-id')||'account-a');
window.qaSwitch=id=>{localStorage.setItem('qa-id',id);setId(id);};return <SDK.Provider value={id}>{children}</SDK.Provider>;}
export const useAuth=()=>{const id=React.useContext(SDK);return {isLoaded:true,isSignedIn:id!=='guest',userId:id,sessionId:'session-'+id,signOut:async()=>window.qaSwitch('guest')};};
export const useUser=()=>{const id=React.useContext(SDK);return {user:id==='guest'?null:{id,delete:async()=>{window.qaIdentityDeletes++;}}};};
export const useSession=()=>{const id=React.useContext(SDK);return {session:{id:'session-'+id,user:{id},getToken:async()=>id}};};`;
(async()=>{
 const built=await build({absWorkingDir:mobile,stdin:{resolveDir:mobile,loader:'tsx',contents:`import React from 'react';import {createRoot} from 'react-dom/client';
import {View,Text} from 'react-native';import {TestSDK} from '@clerk/expo';import {AuthProvider,useAuth} from './contexts/AuthContext';
import {AppProvider,useApp} from './contexts/AppContext';import ChatScreen from './app/(tabs)/chat';import {InsightCard} from './components/InsightCard';
import {getHomeComment} from './utils/homeComment';import {getTodayDate} from './utils/dateUtils';
function Probe(){const auth=useAuth(),app=useApp(),[tab,setTab]=React.useState('chat');window.qaAuth=auth;window.qaApp=app;window.qaTab=setTab;
window.qaComment=async()=>{window.qaCommentResult=await getHomeComment({date:getTodayDate(),mascotName:'検証の相棒',completed:0,total:0},app.privateCache);};
return <View style={{height:'100%'}}><Text style={{padding:8,backgroundColor:'#F7F3EA'}}>ローカル検証：認証・通信は代替です</Text>
<Text testID="identity">{app.privateCache?(auth.user?.id||'guest'):'loading'}</Text>
{tab==='chat'?<ChatScreen/>:<View style={{padding:20}}><InsightCard/></View>}</View>;}
createRoot(document.getElementById('root')).render(<TestSDK><AuthProvider><AppProvider><Probe/></AppProvider></AuthProvider></TestSDK>);`},
 bundle:true,write:false,platform:'browser',format:'iife',loader:{'.png':'dataurl','.jpg':'dataurl'},alias:{'react-native':'react-native-web'},
 define:{'process.env.NODE_ENV':'"production"','process.env.EXPO_PUBLIC_DOMAIN':'"qa.invalid"',__DEV__:'false',global:'globalThis'},
 plugins:[{name:'private-fixtures',setup(build){const fixtures={
 '@clerk/expo':sdk,
 '@react-native-async-storage/async-storage':`export default {getItem:async k=>localStorage.getItem(k),setItem:async(k,v)=>localStorage.setItem(k,v),removeItem:async k=>localStorage.removeItem(k),getAllKeys:async()=>Object.keys(localStorage)};`,
 'expo-haptics':'export const notificationAsync=async()=>{};export const impactAsync=async()=>{};export const selectionAsync=async()=>{};export const NotificationFeedbackType={Success:1};export const ImpactFeedbackStyle={Light:1};',
 'expo-router':`import {useEffect} from 'react';export const useRouter=()=>({back:()=>{},push:()=>{}});export const useFocusEffect=fn=>useEffect(fn,[fn]);`,
 'react-native-safe-area-context':'export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});',
 '@/components/ui/Icon':'export const Icon=()=>null;export const IconBadge=()=>null;export const iconSize={md:18,sm:16};',
 '@/components/Mascot':'export const Mascot=()=>null;export const StaticMascot=()=>null;',
 '@/components/SkyBackground':'export const SkyBackground=()=>null;',
 '@/components/RestEventModal':'export const RestEventModal=()=>null;',
 '@/utils/analytics':'export const Analytics={chatMessageSent:()=>{}};'};
 build.onResolve({filter:/.*/},({path:name})=>name in fixtures?{path:name,namespace:'fixture'}:null);
 build.onLoad({filter:/.*/,namespace:'fixture'},({path:name})=>({contents:fixtures[name],loader:'tsx',resolveDir:mobile}));}}]});
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?built.outputFiles[0].text:'<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><title>非公開キャッシュのローカル検証</title><style>html,body,#root{margin:0;height:100%;background:#F7F3EA}</style><div id="root"></div><script src="/bundle.js"></script></html>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  const args=process.env.YOKI_QA_CHROMIUM_BUNDLE?(await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(x=>x!=='--single-process'):['--no-sandbox'];
  browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args});
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,locale:'ja-JP',reducedMotion:'reduce'});
  const errors=[],sync=[],comments=[];let releaseChat,releaseInsight,releaseComment,holdChat=false,holdInsight=false,holdComment=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.qaIdentityDeletes=0;if(localStorage.getItem('qa-seeded'))return;
    localStorage.setItem('qa-seeded','true');localStorage.setItem('@yoki/local_data_owner_v1',JSON.stringify({version:1,accountId:'account-a'}));
    localStorage.setItem('@mentore/chat_history_v1',JSON.stringify([{id:'legacy',role:'user',content:'アカウントAだけの会話',timestamp:new Date().toISOString()}]));
    localStorage.setItem('@mentore/insight_v1',JSON.stringify({date:'2000-01-01',insights:[{title:'以前の気づき',body:'A専用の保存データ'}]}));});
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,PUT,POST,DELETE,OPTIONS'};
  await page.route('https://qa.invalid/api/**',async route=>{
    const req=route.request(),url=req.url();if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
    const reply=async body=>route.fulfill({json:body,headers}).catch(()=>{});
    if(url.endsWith('/chat/message')){const held=holdChat;if(held)await new Promise(r=>releaseChat=r);return reply({content:held?'遅れて届いたAの返事':'ゲストへの検証用の返事'});}
    if(url.endsWith('/insight')){if(holdInsight)await new Promise(r=>releaseInsight=r);return reply({insights:[{title:'Aへの気づき',body:'合成したテストの応答です'}]});}
    if(url.endsWith('/home-comment')){comments.push(req.postDataJSON());if(holdComment)await new Promise(r=>releaseComment=r);return reply({comment:'検証したひとこと'});}
    if(req.method()==='DELETE')return reply({ok:true});
    if(req.method()==='PUT'){sync.push(req.postDataJSON());return reply({ok:true});}
    const id=req.headers().authorization?.replace('Bearer ','');return reply({data:{'@mentore/profile_v1':{nickname:id,ageRange:'回答しない',gender:'回答しない'},
      '@mentore/records_v2':[{date:'2026-10-06',mood:3,sleep:0,sleepRecorded:false,behaviors:[],notes:''}],'@mentore/mascot_name_v1':id}});
  });
  const waitReady=async id=>page.getByTestId('identity').filter({hasText:new RegExp('^'+id+'$')}).waitFor();
  const switchTo=async id=>{await page.evaluate(id=>window.qaSwitch(id),id);await waitReady(id);};
  const waitRelease=async getter=>{const until=Date.now()+5000;while(!getter()){if(Date.now()>until)throw Error('No pending request');await new Promise(r=>setTimeout(r,10));}};
  await page.goto('http://127.0.0.1:'+server.address().port);await waitReady('account-a');await page.getByText('アカウントAだけの会話',{exact:true}).waitFor();
  await page.evaluate(()=>window.qaComment());assert.match(comments.at(-1).recentChat,/アカウントAだけの会話/);
  await switchTo('account-b');assert.equal(await page.getByText('アカウントAだけの会話',{exact:true}).count(),0);
  await page.evaluate(()=>window.qaComment());assert.equal(comments.at(-1).recentChat,undefined);
  await switchTo('guest');assert.equal(await page.getByText('アカウントAだけの会話',{exact:true}).count(),0);
  await page.getByRole('textbox',{name:'話しかける内容'}).fill('ゲストだけの会話');await page.getByRole('button',{name:'送信',exact:true}).tap();
  await page.getByText('ゲストへの検証用の返事',{exact:true}).waitFor();
  await switchTo('account-a');await page.getByText('アカウントAだけの会話',{exact:true}).waitFor();assert.equal(await page.getByText('ゲストだけの会話',{exact:true}).count(),0);
  console.log('PASS legacy migration, account/guest separation and HOME recent-chat request isolation');
  holdChat=true;await page.getByRole('textbox',{name:'話しかける内容'}).fill('切り替え前の送信');await page.getByRole('button',{name:'送信',exact:true}).tap();await waitRelease(()=>releaseChat);
  await switchTo('account-b');releaseChat();await page.getByRole('textbox',{name:'話しかける内容'}).fill('Bの下書き');
  assert.equal(await page.getByText('遅れて届いたAの返事',{exact:true}).count(),0);assert.equal(await page.getByText('切り替え前の送信',{exact:true}).count(),0);
  await switchTo('account-a');await page.getByText('切り替え前の送信',{exact:true}).waitFor();assert.equal(await page.getByText('遅れて届いたAの返事',{exact:true}).count(),0);
  holdInsight=true;await page.evaluate(()=>window.qaTab('insight'));await page.getByRole('button',{name:'すごいところを見つけてもらう',exact:true}).tap();await waitRelease(()=>releaseInsight);
  await switchTo('account-b');releaseInsight();await page.getByRole('button',{name:'すごいところを見つけてもらう',exact:true}).waitFor();assert.equal(await page.getByText('Aへの気づき',{exact:true}).count(),0);
  console.log('PASS actual chat and insight reject late responses and reset in-memory state on identity change');
  await switchTo('account-a');holdComment=true;await page.evaluate(()=>{void window.qaApp.privateCache.removeItem('@mentore/home_comment_v1').then(()=>window.qaComment());});await waitRelease(()=>releaseComment);
  await page.evaluate(()=>window.qaAuth.deleteAccount());releaseComment();await page.waitForFunction(()=>window.qaCommentResult==='');
  const deleted=await page.evaluate(()=>JSON.parse(localStorage.getItem('@yoki/private_cache_v1/account/account-a')));assert.deepEqual(deleted,{version:1,accountId:'account-a',data:{},deleted:true});
  assert.equal(await page.evaluate(()=>window.qaIdentityDeletes),1);assert.equal(await page.getByText('Aへの気づき',{exact:true}).count(),0);
  await switchTo('guest');await page.evaluate(()=>window.qaTab('chat'));await page.getByText('ゲストだけの会話',{exact:true}).waitFor();
  await page.reload();await waitReady('guest');await page.getByText('ゲストだけの会話',{exact:true}).waitFor();
  assert.ok(sync.length>0,'exercise a real managed cloud upload');
  for(const data of sync)assert.ok(!/chat_history|insight_v1|home_comment_v1|private_cache/.test(JSON.stringify(data)));
  assert.deepEqual(errors,[]);console.log('PASS deletion rejects a delayed HOME comment, preserves guest history across restart, no private cloud payload/page errors');
  if(process.env.YOKI_QA_SCREENSHOTS){fs.mkdirSync(process.env.YOKI_QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.YOKI_QA_SCREENSHOTS,'private-chat-preserved.jpg'),quality:90});}
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
