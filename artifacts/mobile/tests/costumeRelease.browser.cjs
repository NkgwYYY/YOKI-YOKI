'use strict';
// Native bridge is simulated here; this does not claim StoreKit/Apple validation.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const ts=require('typescript');
const coreFile=path.join(path.dirname(require.resolve('expo/package.json')),'../expo-modules-core/src/polyfill/CoreModule.ts');
const coreJS=ts.transpileModule(fs.readFileSync(coreFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText.replace(/^export /gm,'');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ttf':'font/ttf','.json':'application/json'};
const server=http.createServer((req,res)=>{const loc=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!loc.startsWith(root+path.sep)&&loc!==root){res.writeHead(403).end();return;}const file=fs.existsSync(loc)&&fs.statSync(loc).isFile()?loc:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
function seed({native,stage}){
 const today='2026-11-04',now=Date.parse(today+'T03:00:00Z');
 const values={
  '@mentore/profile_v1':{nickname:'確認用',ageRange:'回答しない',gender:'回答しない'},
  '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:1,totalDays:1,lastRecordDate:today,visits:{version:1,lastDate:today,streak:stage==='egg'?1:4,bestStreak:4,totalVisits:4,stage,highestStage:stage,dates:[today]}},
  '@mentore/records_v2':[],
  '@mentore/feed_state_v1':{points:native?22:1500,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100,wardrobe:{version:1,owned:['panda'],equipped:'panda',changedAt:100}},
 };
 for(const [key,value] of Object.entries(values))if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(value));
 localStorage.setItem('@yoki/first-steps/v1/guest','done');
 if(native){
  const listeners=new Set();window.__costumeQA={status:'cancelled',purchases:0,syncs:0,finishes:[],emit:()=>listeners.forEach(fn=>fn())};
  globalThis.ExpoDomWebView={};globalThis.expo=globalThis.expo||{};globalThis.expo.modules=globalThis.expo.modules||{};
  globalThis.expo.modules.YokiCostumes={
   catalog:async()=>['dog','cat','rabbit','frog','panda'].map(id=>({id:'yokiyoki.costume.'+id,price:'￥50'})),
   purchase:async id=>{window.__costumeQA.purchases++;if(window.__costumeQA.status==='purchased'){const products=JSON.parse(localStorage.getItem('qa-apple-products')||'[]');localStorage.setItem('qa-apple-products',JSON.stringify([...new Set([...products,id])]));}return {status:window.__costumeQA.status};},
   snapshot:async()=>({products:JSON.parse(localStorage.getItem('qa-apple-products')||'[]'),finishable:[]}),
   finish:async id=>window.__costumeQA.finishes.push(id),sync:async()=>{window.__costumeQA.syncs++;},
   addListener:(_,fn)=>{listeners.add(fn);return{remove:()=>listeners.delete(fn)}},
  };
 }
}
let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 for(const [width,native,stage] of [[390,false,'egg'],[320,true,'odango']]){
  const context=await browser.newContext({viewport:{width,height:width===320?568:844},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER',width,native,e.message)});console.log('CASE',width,native,stage);page.setDefaultTimeout(18000);await page.clock.setFixedTime(new Date('2026-11-04T03:00:00Z'));if(native)await page.addInitScript({content:coreJS+';globalThis.expo={EventEmitter,NativeModule,SharedObject,SharedRef,modules:{}};'});await page.addInitScript(seed,{native,stage});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname.endsWith('/community/config'))return route.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(u.origin!==base||u.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});return route.continue();});
  await page.goto(base+'/wardrobe');await page.getByTestId('wardrobe-action-dog').waitFor();await page.getByTestId('plush-loading').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);
  const balance=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points);
  const before=await balance();await page.getByTestId('wardrobe-action-dog').click();
  if(native){
   await page.getByTestId('wardrobe-buy-store').getByText('￥50で購入',{exact:true}).waitFor();assert.equal(await page.getByTestId('wardrobe-buy-confirm').isEnabled(),false);
   await page.screenshot({path:path.join(out,'purchase-choice-simulated-native.png')});
   await page.getByTestId('wardrobe-buy-store').click();await page.getByText('購入を取り消しました。',{exact:true}).last().waitFor();assert.equal(await balance(),before);
   await page.evaluate(()=>{window.__costumeQA.status='pending'});await page.getByTestId('wardrobe-buy-store').click();await page.getByTestId('wardrobe-buy-store').waitFor({state:'hidden'});assert.equal(await balance(),before);assert.equal(await page.getByTestId('wardrobe-action-dog').innerText(),'購入方法を選ぶ');
   await page.evaluate(()=>{window.__costumeQA.status='purchased'});await page.getByTestId('wardrobe-action-dog').click();await page.getByTestId('wardrobe-buy-store').click();await page.getByTestId('wardrobe-buy-store').waitFor({state:'hidden'});assert.equal(await balance(),before);assert.equal(await page.getByTestId('wardrobe-action-dog').innerText(),'着る');
   await page.getByTestId('wardrobe-action-dog').click();assert.equal(await page.evaluate(()=>window.__costumeQA.purchases),3,'wear does not purchase a second time');
   assert.equal(await page.evaluate(()=>window.__costumeQA.syncs),0,'startup does not trigger Apple Account authentication');await page.getByTestId('wardrobe-restore').click();await page.getByText('1種類の購入を復元しました。',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__costumeQA.syncs),1);
   await page.evaluate(()=>{localStorage.setItem('qa-apple-products','[]');window.__costumeQA.emit()});await page.getByText('いつもの姿',{exact:true}).waitFor();
   const owned=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).wardrobe.owned);assert.deepEqual(owned,['panda'],'refund revokes store purchase and preserves legacy points purchase');
  }else{
   await page.getByTestId('wardrobe-buy-confirm').click();await page.getByTestId('wardrobe-buy-confirm').waitFor({state:'hidden'});assert.equal(await balance(),before-500);await page.getByTestId('wardrobe-action-dog').click();assert.equal(await balance(),before-500);await page.reload();await page.getByTestId('wardrobe-selected-name').getByText('いぬを着用中',{exact:true}).waitFor();
   await page.getByTestId('wardrobe-action-panda').click();await page.getByTestId('wardrobe-preview').scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,'egg-panda-wardrobe.png')});
   await page.goto(base);await page.getByTestId('checkin-dashboard').waitFor();assert.equal(await page.getByTestId('record-radar').count(),0);assert.equal(await page.getByText('生活のバランス',{exact:true}).count(),0);await page.getByTestId('checkin-chart').waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,'daily-letter-no-radar.png')});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert.deepEqual(errors,[]);results.push({width,nativeBridgeSimulated:native,stage,passed:true});await context.close();
 }
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,results}));
})().catch(async error=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
