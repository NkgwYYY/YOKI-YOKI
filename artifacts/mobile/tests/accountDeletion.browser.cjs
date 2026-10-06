// Actual AuthProvider + AppProvider + completion screen; synthetic SDK/API/storage.
// Exercises cancellation and cleanup together without touching any real account.
const fs = require('node:fs'), http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { build } = createRequire(path.resolve(__dirname, '../../api-server/package.json'))('esbuild');
const { chromium } = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
const mobile = path.resolve(__dirname, '..');
(async () => {
  const built = await build({ absWorkingDir: mobile,
    stdin: { resolveDir: mobile, loader: 'tsx', contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import {View,Text} from 'react-native'; import {AuthProvider,useAuth} from './contexts/AuthContext';
      import {AppProvider,useApp} from './contexts/AppContext'; import {AccountDeletionGate} from './components/account/AccountDeletionGate';
      import {Button} from './components/ui/Button';
      function Probe(){ const app=useApp(),auth=useAuth(); window.qaApp=app;window.qaAuth=auth;
        const [busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
        if(app.cloudSyncState.error==='deleted')return <AccountDeletionGate/>;
        return <View style={{padding:24,gap:20}}><Text>アカウント削除のローカル検証</Text>
          <Text testID="saved-name">{app.mascotName}</Text><Text testID="delete-error">{error}</Text>
          <Button label="検証用の削除開始" disabled={busy} onPress={async()=>{setBusy(true);try{await auth.deleteAccount();}catch(e){setError(e.message);}finally{setBusy(false);}}}/>
          <Text>認証・通信は検証用です。実アカウントの結果ではありません。</Text></View>;
      }
      createRoot(document.getElementById('root')).render(<AuthProvider><AppProvider><Probe/></AppProvider></AuthProvider>);` },
    bundle:true,write:false,platform:'browser',format:'iife',loader:{'.png':'dataurl','.jpg':'dataurl'},
    define:{'process.env.NODE_ENV':'"production"','process.env.EXPO_PUBLIC_DOMAIN':'"qa.invalid"',__DEV__:'false',global:'globalThis'},
    alias:{'react-native':'react-native-web'},
    plugins:[{name:'deletion-fixtures',setup(build){
      const fixtures={
        '@clerk/expo': `const getToken=async()=>'synthetic-token'; const user={id:'account-a',delete:async()=>{window.qaIdentityDeletes++;if(window.qaIdentityFail)throw Error('identity unavailable');}};
          export const useAuth=()=>({isLoaded:true,isSignedIn:true,getToken,signOut:async()=>{}}); export const useUser=()=>({user});`,
        '@react-native-async-storage/async-storage': `export default {getItem:async k=>localStorage.getItem(k),getAllKeys:async()=>Object.keys(localStorage),
          setItem:async(k,v)=>localStorage.setItem(k,v),removeItem:async k=>{if(k===window.qaFailKey)throw Error('disk unavailable');localStorage.removeItem(k);}};`,
        'expo-haptics':'export const notificationAsync=async()=>{};export const impactAsync=async()=>{};export const selectionAsync=async()=>{};export const NotificationFeedbackType={Success:1};export const ImpactFeedbackStyle={Light:1};',
        '@/components/ui/Icon':'export const Icon=()=>null;export const iconSize={md:18,sm:16};',
        expo:`export const reloadAppAsync=async()=>{window.qaReloads++;if(window.qaReloadFail)throw Error('reload unavailable');};`,
      };
      build.onResolve({filter:/.*/},({path:name})=>name in fixtures?{path:name,namespace:'fixture'}:null);
      build.onLoad({filter:/.*/,namespace:'fixture'},({path:name})=>({contents:fixtures[name],loader:'js',resolveDir:mobile}));
    }}],
  });
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');
    res.end(req.url==='/bundle.js'?built.outputFiles[0].text:'<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><title>削除のローカル検証</title><style>html,body,#root{margin:0;min-height:100%;height:100%;background:#F7F3EA}</style><div id="root"></div><script src="/bundle.js"></script></html>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    const args=process.env.YOKI_QA_CHROMIUM_BUNDLE?(await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(arg=>arg!=='--single-process'):['--no-sandbox'];
    browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args});
    const errors=[];
    const snapshot={'@mentore/profile_v1':{nickname:'削除検証',ageRange:'回答しない',gender:'回答しない'},'@mentore/records_v2':[], '@mentore/mascot_name_v1':'保存済みの相棒'};
    async function fixture({holdPull=false,deleted=false}={}) {
      const page=await browser.newPage({viewport:{width:320,height:480},hasTouch:true,locale:'ja-JP',reducedMotion:'reduce'});
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>{window.qaIdentityDeletes=0;window.qaIdentityFail=true;window.qaReloads=0;
        localStorage.setItem('@yoki/local_data_owner_v1',JSON.stringify({version:1,accountId:'account-a'}));
        localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'保存済み',ageRange:'回答しない',gender:'回答しない'}));});
      const state={deleted,holdPull,holdPush:false,deleteMode:'ok',gets:0,puts:0,deletes:0,release:null};
      await page.route('https://qa.invalid/api/**',async route=>{
        const method=route.request().method();
        if(method==='DELETE'){
          state.deletes++;
          if(state.deleteMode==='fail'){await route.fulfill({status:500,json:{error:'offline'}});return;}
          state.deleted=true;
          await route.fulfill({json:state.deleteMode==='lost-ack'?{ok:false}:{ok:true}});return;
        }
        const wasDeleted=state.deleted;
        if(method==='GET')state.gets++;else state.puts++;
        if((method==='GET'&&state.holdPull)||(method==='PUT'&&state.holdPush))await new Promise(resolve=>{state.release=resolve;});
        try{await route.fulfill(wasDeleted?{status:410,json:{code:'ACCOUNT_DELETED'}}:{json:method==='GET'?{data:snapshot}:{ok:true}});}catch(error){if(!/closed|disposed|aborted/i.test(error.message))throw error;}
      });
      await page.goto('http://127.0.0.1:'+server.address().port);
      return {page,state};
    }
    const start=page=>page.getByRole('button',{name:'検証用の削除開始',exact:true}).tap();
    async function assertCleared(page){
      const keys=await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('@mentore/')||key==='@yoki/balance_journal_v1'||key==='@yoki/local_data_owner_v1'||key==='@yoki/cloud_outbox_v1/account-a'));
      assert.deepEqual(keys,[]);
    }
    const {page,state}=await fixture();
    await page.waitForFunction(()=>window.qaApp.cloudSynced);
    state.holdPush=true;
    await page.evaluate(()=>{void window.qaApp.setMascotName('削除直前の編集');});
    await page.waitForFunction(()=>window.qaApp.cloudSyncState.phase==='push');
    await start(page);await page.getByTestId('account-deletion-gate').waitFor();
    state.release();state.holdPush=false;
    await assertCleared(page);assert.equal(await page.evaluate(()=>window.qaApp.cloudSynced),false);
    const before=state.puts;
    await page.evaluate(()=>window.qaApp.retryCloudSync());
    assert.equal(state.puts,before);
    console.log('PASS deletion cancels an actual provider upload; late success cannot revive sync or local data');

    await page.getByTestId('complete-account-deletion').tap();
    await page.getByRole('alert').filter({hasText:'削除を完了できませんでした'}).waitFor();
    assert.equal(await page.evaluate(()=>window.qaIdentityDeletes),2);
    if(process.env.YOKI_QA_SCREENSHOTS){fs.mkdirSync(process.env.YOKI_QA_SCREENSHOTS,{recursive:true});
      await page.screenshot({path:path.join(process.env.YOKI_QA_SCREENSHOTS,'account-deletion-complete-retry.jpg'),quality:90});}
    // Text enlargement is browser stress only, not OS Dynamic Type certification.
    await page.addStyleTag({content:'[role="heading"]{font-size:33px!important;line-height:45px!important}'});
    await page.setViewportSize({width:844,height:390});
    await page.getByTestId('complete-account-deletion').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.evaluate(()=>{window.qaIdentityFail=false;window.qaReloadFail=true;});
    await page.getByTestId('complete-account-deletion').tap();
    await page.getByRole('alert').filter({hasText:'削除は完了しています'}).waitFor();
    const count=state.deletes;
    await page.evaluate(()=>{window.qaReloadFail=false;});
    await page.getByRole('button',{name:'アプリを開き直す',exact:true}).tap();
    assert.equal(state.deletes,count);assert.equal(await page.evaluate(()=>window.qaReloads),2);
    console.log('PASS completion retry is reachable at small/landscape sizes; failed reopening never repeats deletion');
    await page.close();

    const late=await fixture({holdPull:true});
    await late.page.waitForFunction(()=>window.qaApp.cloudSyncState.phase==='pull');
    await start(late.page);await late.page.getByTestId('account-deletion-gate').waitFor();
    late.state.release();
    await assertCleared(late.page);
    assert.equal(await late.page.evaluate(()=>window.qaApp.cloudSyncState.error),'deleted');
    console.log('PASS a late initial pull cannot hydrate after account cleanup');
    await late.page.close();

    for(const mode of ['fail','lost-ack']){
      const f=await fixture();await f.page.waitForFunction(()=>window.qaApp.cloudSynced);f.state.deleteMode=mode;
      await start(f.page);
      if(mode==='fail'){
        await f.page.waitForFunction(()=>window.qaApp.cloudSynced);await f.page.getByTestId('delete-error').filter({hasText:'削除を完了できませんでした'}).waitFor();
        assert.ok(await f.page.evaluate(()=>localStorage.getItem('@mentore/profile_v1')));
      }else{await f.page.getByTestId('account-deletion-gate').waitFor();assert.equal(await f.page.evaluate(()=>window.qaIdentityDeletes),0);}
      console.log('PASS server '+mode+' resumes safely and distinguishes deletion from an ordinary sync failure');
      await f.page.close();
    }
    const restart=await fixture({deleted:true});await restart.page.getByTestId('account-deletion-gate').waitFor();
    assert.equal(restart.state.puts,0);
    await restart.page.close();
    assert.deepEqual(errors,[]);
    console.log('PASS restart of a server-deleted identity stays gated; no page errors');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
