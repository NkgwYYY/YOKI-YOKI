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
 if(localStorage.getItem('room53-qa'))return;
 const date='2026-11-08',now=Date.parse(date+'T12:00:00Z');
 const values={
 '@mentore/profile_v1':{nickname:'確認用',ageRange:'回答しない',gender:'回答しない'},
 '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:4,totalDays:4,lastRecordDate:date,visits:{version:1,lastDate:date,streak:4,bestStreak:4,totalVisits:4,stage:'odango',highestStage:'odango',dates:[date]}},
 '@mentore/records_v2':[{id:'qa',date:recordDate||date,mood:3,fatigue:1,worry:1,notes:'保存済みの日記',moyamoya}],
 '@mentore/feed_state_v1':{points:native?87:10000,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100,wardrobe:{version:1,owned:['panda'],equipped:null,changedAt:100}}};
 for(const[k,v]of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem('@yoki/first-steps/v1/guest','done');for(const kind of ['daily-letter','scenic-return','daily-check-in'])localStorage.setItem('@yoki/'+kind+'/v1/guest/'+date,kind==='scenic-return'?'home':'seen');localStorage.setItem('room53-qa','yes');
}
function bridge(){
 const listeners=new Set();window.__roomQA={status:'cancelled',purchases:0,syncs:0,emit:()=>listeners.forEach(fn=>fn())};globalThis.ExpoDomWebView={};globalThis.expo.modules.YokiRoomProducts={
 catalog:async()=>['panda-set','rabbit-set','panda-furniture','rabbit-furniture','rain-cafe','star-room','washitsu'].map(id=>({id:'yokiyoki.room.'+id.replaceAll('-','_'),price:['rain-cafe','star-room','washitsu'].includes(id)?'￥500':'￥200'})),
 purchase:async id=>{window.__roomQA.purchases++;if(window.__roomQA.status==='purchased'){const p=JSON.parse(localStorage.getItem('qa-room-products')||'[]');localStorage.setItem('qa-room-products',JSON.stringify([...new Set([...p,id])]));}return{status:window.__roomQA.status};},
 snapshot:async()=>({products:JSON.parse(localStorage.getItem('qa-room-products')||'[]'),finishable:[]}),finish:async()=>{},sync:async()=>{window.__roomQA.syncs++;},addListener:(_,fn)=>{listeners.add(fn);return{remove:()=>listeners.delete(fn)}}};
}
let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 async function setup(width,height,native){
 const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(date+'T12:00:00Z'));
 if(native){await page.addInitScript({content:coreJS+';globalThis.expo={EventEmitter,NativeModule,SharedObject,SharedRef,modules:{}};'});await page.addInitScript(bridge);}await page.addInitScript(seed,{native,moyamoya:{has:false}});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/community/config'))return r.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});return {context,errors};}
 const wallet=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')));
 const room=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/room_customization_v1')));
 const capture=async name=>{await page.getByTestId('plush-loading').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,name+'.png')});};
 const choose=async id=>{await page.getByTestId('room-product-'+id).click();await page.getByTestId('room-product-title').waitFor();};
 for(const [width,height,native]of [[390,844,false],[320,568,true]]){
  console.log('room shop',width,native);const {context,errors}=await setup(width,height,native);
  await page.goto(base);await page.getByTestId('home-wardrobe').filter({visible:true}).click();await page.getByTestId('wardrobe-matching-preview').click();await page.getByTestId('room-owned-discount').getByText('もっている分を差し引いて 1,300 pt',{exact:true}).waitFor();
  const before=await wallet(),beforeRoom=await room();await choose('rabbit-set');await page.getByTestId('room-preview-light').click();assert.equal((await wallet()).points,before.points);assert.deepEqual((await wallet()).wardrobe,before.wardrobe);assert.deepEqual(await room(),beforeRoom);await page.waitForFunction(()=>{const frame=document.querySelector('[data-testid=room-set-preview]'),art=document.querySelector('[data-testid=room-set-preview-background]');return frame&&art&&Math.abs(frame.getBoundingClientRect().width-art.getBoundingClientRect().width)<1;});await page.getByTestId('room-set-preview').screenshot({path:path.join(out,'preview-art-'+width+'.png')});await capture('matching-preview-'+width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  if(!native){
   await choose('panda-set');await page.getByTestId('room-buy-points').click();await page.getByTestId('room-cancel-points').click();assert.equal((await wallet()).points,10000);
   await page.getByTestId('room-buy-points').click();await page.getByTestId('room-confirm-points').click();await page.getByTestId('room-apply').waitFor();assert.equal((await wallet()).points,8700);assert.equal((await wallet()).wardrobe.equipped,null);await page.getByTestId('room-apply').click();await page.getByTestId('room-shop-notice').getByText('おうちに反映しました。',{exact:true}).waitFor();assert.equal((await wallet()).wardrobe.equipped,'panda');assert.deepEqual((await room()).boutique.goods,['bamboo-cushion']);
   await page.getByTestId('room-show-home').click();await page.getByTestId('home-roomGood-bamboo-cushion').filter({visible:true}).waitFor();await capture('panda-set-home');
   const good=page.getByTestId('home-roomGood-bamboo-cushion').filter({visible:true});await good.focus();await good.press('ArrowRight');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/room_customization_v1')).positions?.['roomGood:bamboo-cushion']);const position=(await room()).positions['roomGood:bamboo-cushion'];assert.equal((await wallet()).points,8700);
   await page.goto(base+'/room-shop');await page.getByTestId('room-shop-tab-room').click();await choose('rain-cafe');await capture('room-cafe-before-buy');await page.getByTestId('room-buy-points').click();await page.getByTestId('room-confirm-points').click();await page.getByTestId('room-apply').click();await page.getByTestId('room-shop-notice').getByText('おうちに反映しました。',{exact:true}).waitFor();assert.equal((await wallet()).points,5200);assert.equal((await room()).boutique.theme,'rain-cafe');
   await page.reload();await page.getByTestId('room-shop-tab-room').click();assert.equal(await page.getByTestId('room-apply').isDisabled(),true);assert.equal((await wallet()).points,5200);assert.deepEqual((await room()).positions['roomGood:bamboo-cushion'],position);
   await page.getByTestId('room-show-home').click();await page.getByTestId('home-wardrobe').filter({visible:true}).waitFor();await capture('cafe-home-night');
   await page.goto(base+'/?atelier=furniture');await page.getByTestId('atelier-furniture-bamboo-cushion').waitFor();assert.equal(await page.getByText('まだ家具を持っていません。ショップで、お気に入りを探してみよう。',{exact:true}).count(),0);await page.getByTestId('atelier-furniture-none').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/room_customization_v1')).boutique.goods.length===0);assert.equal((await wallet()).points,5200);await page.getByTestId('atelier-furniture-bamboo-cushion').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/room_customization_v1')).boutique.goods.includes('bamboo-cushion'));
   await page.goto(base+'/room-shop');await page.getByTestId('room-reset-theme').click();await page.getByTestId('room-reset-theme').waitFor({state:'hidden'});assert.equal((await room()).boutique.theme,null);assert.equal((await wallet()).points,5200);
  }else{
   assert.equal(await page.getByTestId('room-buy-points').isEnabled(),false);await page.getByTestId('room-buy-store').getByText('￥200で購入',{exact:true}).waitFor();await page.getByTestId('room-buy-store').click();await page.getByTestId('room-shop-notice').getByText('購入を取り消しました。',{exact:true}).waitFor();assert.equal((await wallet()).points,87);
   await page.evaluate(()=>{window.__roomQA.status='pending'});await page.getByTestId('room-buy-store').click();await page.getByTestId('room-shop-notice').getByText('購入の承認を待っています。完了後に自動で受け取ります。',{exact:true}).waitFor();assert.ok(!(await wallet()).wardrobe.owned.includes('rabbit'));
   await page.evaluate(()=>{window.__roomQA.status='purchased'});await page.getByTestId('room-buy-store').click();await page.getByTestId('room-apply').waitFor();assert.equal((await wallet()).points,87);await page.getByTestId('room-apply').click();await page.getByTestId('room-shop-notice').getByText('おうちに反映しました。',{exact:true}).waitFor();assert.equal((await wallet()).wardrobe.equipped,'rabbit');assert.equal(await page.evaluate(()=>window.__roomQA.syncs),0);
   await page.getByTestId('room-restore').click();await page.getByTestId('room-shop-notice').getByText('1種類の購入を復元しました。',{exact:true}).waitFor();await page.evaluate(()=>{localStorage.setItem('qa-room-products','[]');window.__roomQA.emit()});await page.getByTestId('room-buy-store').waitFor();assert.deepEqual((await wallet()).wardrobe.owned,['panda']);assert.equal((await wallet()).wardrobe.equipped,null);assert.deepEqual((await room()).boutique.goods,[]);
  }
  assert.deepEqual(errors,[]);results.push({width,nativeBridgeSimulated:native,passed:true});await context.close();
 }
 // Exercise every theme, time and camera on portrait and landscape home layouts.
 for(const [width,height]of [[390,844],[844,390]])for(const id of ['rain-cafe','star-room','washitsu']){
  const {context,errors}=await setup(width,height,false);await page.goto(base+'/room-shop');await page.getByTestId('room-shop-tab-room').click();await choose(id);await page.getByTestId('room-buy-points').click();await page.getByTestId('room-confirm-points').click();await page.getByTestId('room-apply').click();await page.getByTestId('room-shop-notice').getByText('おうちに反映しました。',{exact:true}).waitFor();await page.getByTestId('room-show-home').click();await page.getByTestId('home-wardrobe').filter({visible:true}).waitFor();
  for(const period of ['night','day']){
   await page.clock.setFixedTime(new Date(date+(period==='night'?'T12:00:00Z':'T02:00:00Z')));await page.reload();await page.getByTestId('home-wardrobe').filter({visible:true}).waitFor();
   for(const view of ['overview','eye','close']){
    await page.getByTestId('home-more-menu').filter({visible:true}).click();await page.getByTestId('home-menu-settings').click();await page.getByTestId('home-view-toggle').filter({visible:true}).click();await page.getByTestId('home-view-option-'+view).click();await page.getByTestId('home-view-option-'+view).waitFor({state:'hidden'});await capture(`${id}-${width}-${period}-${view}`);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   }
  }
  assert.deepEqual(errors,[]);results.push({width,id,allViewsAndPeriods:true});await context.close();
 }
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,results}));
})().catch(async e=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
