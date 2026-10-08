// Real AuthProvider/AppProvider + storage/sync; independently changing synthetic
// Clerk hooks reproduce transient SDK disagreements without any live accounts.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {build}=createRequire(path.resolve(__dirname,'../../api-server/package.json'))('esbuild');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const mobile=path.resolve(__dirname,'..');
const sdk=`import React from 'react'; const SDK=React.createContext(null);
  const users=Object.fromEntries(['a','b'].map(k=>['account-'+k,{id:'account-'+k,delete:async()=>{window.qaIdentityDeletes.push(k);}}]));
  const sessions=Object.fromEntries(['a','b'].map(k=>['session-'+k,{id:'session-'+k,user:users['account-'+k],getToken:async()=>{
    window.qaTokenCalls.push('session-'+k);
    if(window.qaHoldToken==='session-'+k)await new Promise(resolve=>{window.qaReleaseToken=resolve;});return 'account-'+k;
  }}]));
  export function TestSDK({children}){const [state,setState]=React.useState({isLoaded:true,isSignedIn:true,userId:'account-b',sessionId:'session-b',profileId:'account-a',resourceId:'session-b'});
    window.qaSetSdk=patch=>setState(s=>({...s,...patch}));return <SDK.Provider value={state}>{children}</SDK.Provider>;}
  export const useAuth=()=>({...React.useContext(SDK),getToken:async()=>{window.qaGlobalTokenCalls++;return window.qaGlobalAccount||'account-b';},signOut:async options=>{window.qaSignOuts.push(options);}});
  export const useUser=()=>({user:users[React.useContext(SDK).profileId]||null});
  export const useSession=()=>({session:sessions[React.useContext(SDK).resourceId]||null});`;
(async()=>{
  const built=await build({absWorkingDir:mobile,stdin:{resolveDir:mobile,loader:'tsx',contents:`import React from 'react';import {createRoot} from 'react-dom/client';
    import {View,Text} from 'react-native';import {TestSDK} from '@clerk/expo';import {AuthProvider,useAuth} from './contexts/AuthContext';
    import {AppProvider,useApp} from './contexts/AppContext';import {Button} from './components/ui/Button';
    function Probe(){const auth=useAuth(),app=useApp();window.qaAuth=auth;window.qaApp=app;
      const [error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
      const ready=!auth.isLoading&&!app.isLoading&&app.cloudSynced;
      return <View style={{flex:1,padding:24,gap:20,justifyContent:'center',backgroundColor:'#F7F3EA'}}>
        <Text style={{fontSize:22,fontWeight:700,color:'#263E32'}}>アカウント切り替えの確認</Text>
        <Text testID="session-status">{ready?'現在のアカウントを確認しました':'アカウントデータを確認しています'}</Text>
        {ready?<><Text testID="current-name">{app.mascotName}</Text><Text testID="current-owner">{auth.user?.id}</Text></>:null}
        <Button label="検証用アカウント削除" disabled={!ready||busy} onPress={async()=>{setBusy(true);try{await auth.deleteAccount();}catch(e){setError(e.message);}finally{setBusy(false);}}}/>
        <Button label="ログアウト" disabled={!ready||busy} onPress={auth.logout}/>
        {error?<Text accessibilityRole="alert">{error}</Text>:null}
        <Text style={{fontSize:12}}>認証と通信は検証用の代替です。実アカウントの確認結果ではありません。</Text>
      </View>;
    }
    createRoot(document.getElementById('root')).render(<TestSDK><AuthProvider><AppProvider><Probe/></AppProvider></AuthProvider></TestSDK>);`},
    bundle:true,write:false,platform:'browser',format:'iife',loader:{'.png':'dataurl','.jpg':'dataurl'},alias:{'react-native':'react-native-web'},
    define:{'process.env.NODE_ENV':'"production"','process.env.EXPO_PUBLIC_DOMAIN':'"qa.invalid"',__DEV__:'false',global:'globalThis'},
    plugins:[{name:'identity-adapters',setup(build){const fixtures={
      '@clerk/expo':sdk,
      '@react-native-async-storage/async-storage':`export default {getItem:async k=>localStorage.getItem(k),setItem:async(k,v)=>localStorage.setItem(k,v),removeItem:async k=>localStorage.removeItem(k),getAllKeys:async()=>Object.keys(localStorage)};`,
      'expo-haptics':'export const notificationAsync=async()=>{};export const impactAsync=async()=>{};export const selectionAsync=async()=>{};export const NotificationFeedbackType={Success:1};export const ImpactFeedbackStyle={Light:1};',
      '@/components/ui/Icon':'export const Icon=()=>null;export const iconSize={md:18,sm:16};'};
      build.onResolve({filter:/.*/},({path:name})=>name in fixtures?{path:name,namespace:'fixture'}:null);
      build.onLoad({filter:/.*/,namespace:'fixture'},({path:name})=>({contents:fixtures[name],loader:'tsx',resolveDir:mobile}));}}]});
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?built.outputFiles[0].text:'<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><title>認証切替のローカル検証</title><style>html,body,#root{margin:0;height:100%;background:#F7F3EA}</style><div id="root"></div><script src="/bundle.js"></script></html>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    const args=process.env.YOKI_QA_CHROMIUM_BUNDLE?(await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(arg=>arg!=='--single-process'):['--no-sandbox'];
    browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args});
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,locale:'ja-JP',reducedMotion:'reduce'});
    const errors=[],calls=[];let deleteRelease;
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.qaTokenCalls=[];window.qaGlobalTokenCalls=0;window.qaIdentityDeletes=[];window.qaSignOuts=[];
      localStorage.setItem('@yoki/local_data_owner_v1',JSON.stringify({version:1,accountId:'account-a'}));
      localStorage.setItem('@mentore/mascot_name_v1','前のアカウントの名前');});
    await page.route('https://qa.invalid/api/**',async route=>{const request=route.request(),id=request.headers().authorization?.replace('Bearer ','');
      calls.push({method:request.method(),id,data:request.postData()});
      if(request.method()==='DELETE'){await new Promise(resolve=>{deleteRelease=resolve;});await route.fulfill({json:{ok:true}});return;}
      await route.fulfill({json:request.method()==='GET'?{data:{'@mentore/profile_v1':{nickname:id,ageRange:'回答しない',gender:'回答しない'},'@mentore/records_v2':[],
        '@mentore/mascot_name_v1':id==='account-a'?'アカウントAの相棒':'アカウントBの相棒'}}:{ok:true}});});
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.getByTestId('session-status').filter({hasText:'アカウントデータを確認しています'}).waitFor();
    assert.equal(await page.evaluate(()=>window.qaAuth.user),null);assert.equal(calls.length,0);
    assert.equal(await page.evaluate(()=>localStorage.getItem('@mentore/mascot_name_v1')),'前のアカウントの名前');
    assert.equal(await page.getByRole('button',{name:'検証用アカウント削除',exact:true}).getAttribute('aria-disabled'),'true');
    console.log('PASS disagreeing SDK hooks hide cached identity, block writes and preserve storage');
    await page.evaluate(()=>window.qaSetSdk({profileId:'account-b'}));await page.getByTestId('current-name').filter({hasText:'アカウントBの相棒'}).waitFor();
    assert.ok(calls.length>0 && calls.every(c=>c.id==='account-b'));
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@yoki/local_data_owner_v1')).accountId),'account-b');

    const switchTo=async id=>{await page.evaluate(id=>window.qaSetSdk({userId:'account-'+id,sessionId:'session-'+id,profileId:'account-'+id,resourceId:'session-'+id}),id);
      await page.getByTestId('current-owner').filter({hasText:'account-'+id}).waitFor();};
    await switchTo('a');
    const bound=await page.evaluate(async()=>{window.qaGlobalAccount='account-b';return window.qaAuth.getToken();});
    assert.equal(bound,'account-a');assert.equal(await page.evaluate(()=>window.qaGlobalTokenCalls),0);
    await page.evaluate(()=>{window.qaHoldToken='session-a';window.qaPendingToken='waiting';void window.qaAuth.getToken().then(t=>{window.qaPendingToken=t;});});
    await page.waitForFunction(()=>!!window.qaReleaseToken);
    await page.evaluate(()=>window.qaSetSdk({userId:'account-b',sessionId:'session-b',resourceId:'session-b'}));
    await page.waitForFunction(()=>window.qaAuth.isLoading);
    await page.evaluate(()=>{window.qaHoldToken=null;window.qaReleaseToken();});await page.waitForFunction(()=>window.qaPendingToken===null);
    await page.evaluate(()=>window.qaSetSdk({profileId:'account-b'}));await page.getByTestId('current-owner').filter({hasText:'account-b'}).waitFor();
    console.log('PASS tokens use the captured session; delayed tokens are discarded after identity transition');

    await switchTo('a');await page.getByRole('button',{name:'検証用アカウント削除',exact:true}).tap();
    await page.waitForFunction(()=>document.querySelector('[aria-label="検証用アカウント削除"]')?.getAttribute('aria-disabled')==='true');
    // Wait for the locally intercepted DELETE, not a production service.
    await new Promise((resolve,reject)=>{const deadline=setTimeout(()=>{clearInterval(timer);reject(Error('DELETE was not requested'));},5000);const timer=setInterval(()=>{if(deleteRelease){clearInterval(timer);clearTimeout(deadline);resolve();}},5);});
    await switchTo('b');const before=await page.evaluate(()=>localStorage.getItem('@mentore/mascot_name_v1'));
    deleteRelease();await page.getByRole('alert').filter({hasText:'削除を完了できませんでした'}).waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem('@mentore/mascot_name_v1')),before);
    assert.equal(await page.evaluate(()=>window.qaApp.cloudSynced),true);assert.deepEqual(await page.evaluate(()=>window.qaIdentityDeletes),[]);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@yoki/local_data_owner_v1')).accountId),'account-b');
    const deletion=calls.filter(c=>c.method==='DELETE');assert.deepEqual(deletion.map(c=>c.id),['account-a']);
    console.log('PASS delayed account A deletion cannot clear account B storage or delete its identity');
    if(process.env.YOKI_QA_SCREENSHOTS){fs.mkdirSync(process.env.YOKI_QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.YOKI_QA_SCREENSHOTS,'auth-transition-preserved.jpg'),quality:90});}
    await page.getByRole('button',{name:'ログアウト',exact:true}).tap();assert.deepEqual(await page.evaluate(()=>window.qaSignOuts),[{sessionId:'session-b'}]);
    assert.deepEqual(errors,[]);console.log('PASS logout names its initiating session; no page errors');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
