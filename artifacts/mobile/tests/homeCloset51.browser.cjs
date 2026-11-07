'use strict';
// StoreKit is simulated; these checks never make real purchases.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const ts=require('typescript');
const coreFile=path.join(path.dirname(require.resolve('expo/package.json')),'../expo-modules-core/src/polyfill/CoreModule.ts');
const coreJS=ts.transpileModule(fs.readFileSync(coreFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText.replace(/^export /gm,'');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const date='2026-11-08',mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg','.css':'text/css','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{const loc=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(loc!==root&&!loc.startsWith(root+path.sep)){res.writeHead(403).end();return;}const file=fs.existsSync(loc)&&fs.statSync(loc).isFile()?loc:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
function seed({native,moyamoya,recordDate}){
 if(localStorage.getItem('closet51-qa'))return;
 const date='2026-11-08',now=Date.parse(date+'T12:00:00Z');
 const values={
 '@mentore/profile_v1':{nickname:'確認用',ageRange:'回答しない',gender:'回答しない'},
 '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:4,totalDays:4,lastRecordDate:date,visits:{version:1,lastDate:date,streak:4,bestStreak:4,totalVisits:4,stage:'odango',highestStage:'odango',dates:[date]}},
 '@mentore/records_v2':[{id:'qa',date:recordDate||date,mood:3,fatigue:1,worry:1,notes:'保存済みの日記',moyamoya}],
 '@mentore/feed_state_v1':{points:native?87:1500,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100,wardrobe:{version:1,owned:['panda'],equipped:null,changedAt:100}}};
 for(const[k,v]of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem('@yoki/first-steps/v1/guest','done');for(const kind of ['daily-letter','scenic-return','daily-check-in'])localStorage.setItem('@yoki/'+kind+'/v1/guest/'+date,kind==='scenic-return'?'home':'seen');localStorage.setItem('closet51-qa','yes');
}
function bridge(){
 const listeners=new Set();window.__costumeQA={status:'cancelled',purchases:0,syncs:0,emit:()=>listeners.forEach(fn=>fn())};globalThis.ExpoDomWebView={};globalThis.expo.modules.YokiCostumes={
 catalog:async()=>['dog','cat','rabbit','frog','panda'].map(id=>({id:'yokiyoki.costume.'+id,price:'￥50'})),
 purchase:async id=>{window.__costumeQA.purchases++;if(window.__costumeQA.status==='purchased'){const p=JSON.parse(localStorage.getItem('qa-apple-products')||'[]');localStorage.setItem('qa-apple-products',JSON.stringify([...new Set([...p,id])]));}return{status:window.__costumeQA.status};},
 snapshot:async()=>({products:JSON.parse(localStorage.getItem('qa-apple-products')||'[]'),finishable:[]}),finish:async()=>{},sync:async()=>{window.__costumeQA.syncs++;},addListener:(_,fn)=>{listeners.add(fn);return{remove:()=>listeners.delete(fn)}}};
}
let browser,page;
(async()=>{
 const {recordMoyamoya,battleChoices}=await import('../utils/moyamoya.ts');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 async function setup(width,height,native,moyamoya,recordDate){
 const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(date+'T12:00:00Z'));
 if(native){await page.addInitScript({content:coreJS+';globalThis.expo={EventEmitter,NativeModule,SharedObject,SharedRef,modules:{}};'});await page.addInitScript(bridge);}await page.addInitScript(seed,{native,moyamoya,recordDate});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/community/config'))return r.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});return {context,errors};}
 const wallet=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')));
 const capture=async name=>{await page.getByTestId('plush-loading').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,name+'.png')});};
 for(const [width,height,native]of [[390,844,false],[320,568,true]]){
  console.log('closet',width,native);const {context,errors}=await setup(width,height,native,{has:false});
  await page.goto(base);await page.getByTestId('home-wardrobe').filter({visible:true}).waitFor();assert.equal(await page.getByTestId('home-moyamoya-battle').filter({visible:true}).count(),0);await capture('home-'+width);await page.getByTestId('home-wardrobe').filter({visible:true}).click();await page.getByTestId('wardrobe-preview-panda').waitFor();
  const before=await wallet();await page.getByTestId('wardrobe-preview-rabbit').click();await page.getByTestId('wardrobe-preview-status').getByText('試着中',{exact:true}).waitFor();assert.deepEqual(await wallet(),before,'preview must not change balance or wardrobe');await capture('closet-'+width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  await page.getByTestId('wardrobe-tab-owned').click();assert.equal(await page.getByTestId('wardrobe-preview-rabbit').count(),0);await page.getByTestId('wardrobe-wear-selected').click();await page.getByTestId('wardrobe-preview-status').getByText('着用中',{exact:true}).waitFor();assert.equal((await wallet()).wardrobe.equipped,'panda');await page.getByTestId('wardrobe-tab-shop').click();assert.equal(await page.getByTestId('wardrobe-preview-panda').count(),0);await page.getByTestId('wardrobe-preview-dog').click();
  if(native){
   assert.equal(await page.getByTestId('wardrobe-selected-points').isEnabled(),false);await page.getByTestId('wardrobe-selected-store').getByText('￥50で購入',{exact:true}).waitFor();await page.getByTestId('wardrobe-selected-store').click();await page.getByText('購入を取り消しました。',{exact:true}).waitFor();assert.equal((await wallet()).points,87);
   await page.evaluate(()=>{window.__costumeQA.status='pending'});await page.getByTestId('wardrobe-selected-store').click();await page.getByText('購入の承認を待っています。完了後に自動で受け取ります。',{exact:true}).waitFor();assert.ok(!(await wallet()).wardrobe.owned.includes('dog'));
   await page.evaluate(()=>{window.__costumeQA.status='purchased'});await page.getByTestId('wardrobe-selected-store').click();await page.getByTestId('wardrobe-wear-selected').waitFor();assert.equal((await wallet()).points,87);await page.getByTestId('wardrobe-wear-selected').click();await page.getByTestId('wardrobe-preview-status').getByText('着用中',{exact:true}).waitFor();assert.equal((await wallet()).wardrobe.equipped,'dog');assert.equal(await page.evaluate(()=>window.__costumeQA.purchases),3);
   assert.equal(await page.evaluate(()=>window.__costumeQA.syncs),0);await page.getByTestId('wardrobe-restore').click();await page.getByText('1種類の購入を復元しました。',{exact:true}).waitFor();await page.evaluate(()=>{localStorage.setItem('qa-apple-products','[]');window.__costumeQA.emit()});await page.getByTestId('wardrobe-preview-status').getByText('試着中',{exact:true}).waitFor();assert.deepEqual((await wallet()).wardrobe.owned,['panda']);assert.equal((await wallet()).wardrobe.equipped,null);
  }else{
   await page.getByTestId('wardrobe-selected-points').click();await page.getByTestId('wardrobe-buy-confirm').click();await page.getByTestId('wardrobe-buy-confirm').waitFor({state:'hidden'});assert.equal((await wallet()).points,before.points-500);await page.getByTestId('wardrobe-wear-selected').click();await page.getByTestId('wardrobe-preview-status').getByText('着用中',{exact:true}).waitFor();await page.reload();await page.getByTestId('wardrobe-preview-status').getByText('着用中',{exact:true}).waitFor();assert.equal((await wallet()).wardrobe.equipped,'dog');assert.equal((await wallet()).points,before.points-500);
  }
  assert.deepEqual(errors,[]);results.push({width,nativeBridgeSimulated:native,closet:true});await context.close();
 }
 console.log('battle');const initial=recordMoyamoya(undefined,{has:true,pattern:'anger',memo:'テストの気持ち'},'battle-51');const {context,errors}=await setup(390,844,false,initial);
 await page.goto(base);await page.getByTestId('moyamoya-decline').click();await page.getByTestId('moyamoya-encounter').waitFor({state:'hidden'});await page.reload();await page.getByTestId('home-moyamoya-battle').filter({visible:true}).waitFor();assert.equal(await page.getByTestId('moyamoya-encounter').count(),0);await capture('home-battle-deferred');await page.getByTestId('home-moyamoya-battle').filter({visible:true}).click();await page.getByTestId('battle-question').waitFor();
 const readBattle=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/records_v2'))[0].moyamoya.battle);let current=await readBattle();assert.equal(current.pattern,'anger');assert.equal(current.scenarioId,initial.battle.scenarioId);
 let choice=battleChoices(current).find(c=>c.good);await page.getByTestId('battle-choice-'+choice.id).click();await page.getByTestId('battle-feedback').waitFor();await page.getByTestId('battle-next').click();current=await readBattle();await page.getByTestId('battle-home').click();await page.getByTestId('home-moyamoya-battle').filter({visible:true}).getByText('モヤモヤバトル｜つづきから',{exact:true}).waitFor();assert.equal(await page.getByTestId('moyamoya-encounter').count(),0);await capture('home-battle-resume');await page.getByTestId('home-moyamoya-battle').filter({visible:true}).click();await page.getByTestId('battle-question').waitFor();assert.deepEqual(await readBattle(),current);
 choice=battleChoices(current).find(c=>c.good);await page.getByTestId('battle-choice-'+choice.id).click();await page.getByTestId('battle-feedback').waitFor();await page.getByTestId('battle-next').click();await page.getByTestId('battle-home').click();await page.getByTestId('home-wardrobe').filter({visible:true}).waitFor();assert.equal(await page.getByTestId('home-moyamoya-battle').filter({visible:true}).count(),0);assert.deepEqual(errors,[]);results.push({battleDeferredResumeAndComplete:true});await context.close();
 const past=await setup(390,844,false,initial,'2026-11-07');await page.goto(base);await page.getByTestId('home-wardrobe').filter({visible:true}).waitFor();assert.equal(await page.getByTestId('home-moyamoya-battle').filter({visible:true}).count(),0);assert.equal(await page.getByTestId('moyamoya-encounter').count(),0);await past.context.close();results.push({previousDayHidden:true});
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,results}));
})().catch(async e=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
