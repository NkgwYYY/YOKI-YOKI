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
 if(localStorage.getItem('visual55-qa'))return;
 const date='2026-11-08',now=Date.parse(date+'T12:00:00Z');
 const values={
 '@mentore/profile_v1':{nickname:'確認用',ageRange:'回答しない',gender:'回答しない'},
 '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:4,totalDays:4,lastRecordDate:date,visits:{version:1,lastDate:date,streak:4,bestStreak:4,totalVisits:4,stage:'odango',highestStage:'odango',dates:[date]}},
 '@mentore/records_v2':[{id:'qa',date:recordDate||date,mood:3,fatigue:1,worry:1,notes:'保存済みの日記',moyamoya}],
 '@mentore/feed_state_v1':{points:native?87:10000,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100,wardrobe:{version:1,owned:['panda'],equipped:null,changedAt:100}}};
 for(const[k,v]of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem('@yoki/first-steps/v1/guest','done');for(const kind of ['daily-letter','scenic-return','daily-check-in'])localStorage.setItem('@yoki/'+kind+'/v1/guest/'+date,kind==='scenic-return'?'home':'seen');localStorage.setItem('visual55-qa','yes');
}
function bridge(){
 globalThis.ExpoDomWebView={};window.__shopQA={status:'cancelled',calls:[],syncs:0,emit:{}};
 for(const [moduleName,kind,ids,price]of [
  ['YokiRoomProducts','room',['panda-set','rabbit-set','panda-furniture','rabbit-furniture','rain-cafe','star-room','washitsu'],id=>['rain-cafe','star-room','washitsu'].includes(id)?'￥500':'￥200'],
  ['YokiCostumes','costume',['dog','cat','rabbit','frog','panda'],()=>'￥50']]){
  const listeners=new Set(),key='qa-products-'+kind;window.__shopQA.emit[kind]=()=>listeners.forEach(f=>f());
  globalThis.expo.modules[moduleName]={
   catalog:async()=>ids.map(id=>({id:'yokiyoki.'+kind+'.'+id.replaceAll('-','_'),price:price(id)})),
   purchase:async id=>{window.__shopQA.calls.push(id);if(window.__shopQA.status==='purchased'){const p=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([...new Set([...p,id])]));}return{status:window.__shopQA.status};},
   snapshot:async()=>({products:JSON.parse(localStorage.getItem(key)||'[]'),finishable:[]}),finish:async()=>{},sync:async()=>{window.__shopQA.syncs++;},addListener:(_,fn)=>{listeners.add(fn);return{remove:()=>listeners.delete(fn)}}};
 }
}

let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 async function setup(width,height,native){
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date(date+'T12:00:00Z'));
  if(native){await page.addInitScript({content:coreJS+';globalThis.expo={EventEmitter,NativeModule,SharedObject,SharedRef,modules:{}};'});await page.addInitScript(bridge);}await page.addInitScript(seed,{native,moyamoya:{has:false}});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/community/config'))return r.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});return{context,errors};
 }
 const wallet=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')));
 const room=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/room_customization_v1')));
 const click=async id=>page.getByTestId(id).filter({visible:true}).click();
 const choose=async id=>click('shop-product-'+id);
 const notice=async text=>page.getByTestId('shop-notice').getByText(text,{exact:true}).waitFor();
 const capture=async name=>{await page.getByTestId('plush-loading').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,name+'.png')});};
 const preview=async name=>{await click('shop-see-preview');await page.waitForFunction(()=>{const c=document.querySelector('[data-testid="shop-fitting-preview"] canvas');return c&&c.style.opacity==='1'});await page.getByTestId('shop-fitting-preview').screenshot({path:path.join(out,name+'.png')});};
 for(const [width,height,native]of [[390,844,false],[320,568,true]]){
  console.log('unified shop',width,native);const {context,errors}=await setup(width,height,native);
  await page.goto(base);await page.getByTestId('home-wardrobe').filter({visible:true}).waitFor();await capture('home-'+width);
  const target=page.getByTestId('home-wardrobe').filter({visible:true});assert.ok(await target.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),'cabinet glow receives touches');
  await target.click();await page.getByTestId('unified-shop').waitFor();await capture('shop-first-'+width);
  const before=await wallet(),beforeRoom=await room();await click('shop-tab-costumes');
  for(const id of ['panda','dog','cat','rabbit','frog']){
   await choose('costume-'+id);await preview(id+'-front-'+width);
   if(!native)for(const view of ['angle','side','back','roll']){await click('shop-view-'+view);await page.waitForTimeout(150);await page.getByTestId('shop-fitting-preview').screenshot({path:path.join(out,id+'-'+view+'.png')});}
   await click('shop-view-front');
  }
  assert.equal((await wallet()).points,before.points);assert.deepEqual((await wallet()).wardrobe,before.wardrobe);assert.deepEqual(await room(),beforeRoom);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  if(!native){
   await choose('costume-cat');await click('shop-buy-points');await click('shop-cancel-points');assert.equal((await wallet()).points,10000);
   await click('shop-buy-points');await click('shop-confirm-points');await page.getByTestId('shop-apply').waitFor();assert.equal((await wallet()).points,9500);assert.equal((await wallet()).wardrobe.equipped,null);
   await click('shop-apply');await notice('おうちに反映しました。');assert.equal((await wallet()).wardrobe.equipped,'cat');
   await click('shop-tab-sets');await choose('panda-set');await page.getByTestId('shop-owned-discount').waitFor();await click('shop-buy-points');await click('shop-confirm-points');await page.getByTestId('shop-apply').waitFor();assert.equal((await wallet()).points,8200);await click('shop-apply');await notice('おうちに反映しました。');
   await click('shop-show-home');await page.getByTestId('home-roomGood-bamboo-cushion').filter({visible:true}).waitFor();await capture('panda-set-home');
   await page.goto(base+'/wardrobe');await page.getByTestId('unified-shop').waitFor();assert.ok(page.url().includes('/shop'));await choose('costume-cat');await click('shop-apply');await notice('おうちに反映しました。');
   await page.goto(base+'/room-shop?product=rain-cafe');await page.getByTestId('unified-shop').waitFor();await choose('rain-cafe');await click('shop-buy-points');await click('shop-confirm-points');await click('shop-apply');await notice('おうちに反映しました。');assert.equal((await wallet()).points,4700);
   await page.reload();await page.getByTestId('shop-apply').waitFor();assert.ok(await page.getByTestId('shop-apply').isDisabled());assert.equal((await room()).boutique.theme,'rain-cafe');await click('shop-reset-theme');await notice('いつものお部屋に戻しました。');
   await click('shop-tab-furniture');await choose('furniture-sofa');await preview('original-furniture-preview');await click('shop-tab-other');await page.getByText('ごはんを選ぶ',{exact:true}).waitFor();
  }else{
   await choose('costume-dog');assert.ok(await page.getByTestId('shop-buy-points').isDisabled());await page.getByTestId('shop-buy-store').getByText('￥50で購入',{exact:true}).waitFor();
   await click('shop-buy-store');await notice('購入を取り消しました。');assert.equal((await wallet()).points,87);
   await page.evaluate(()=>window.__shopQA.status='pending');await click('shop-buy-store');await notice('購入の承認を待っています。完了後に自動で受け取ります。');assert.ok(!(await wallet()).wardrobe.owned.includes('dog'));
   await page.evaluate(()=>window.__shopQA.status='purchased');await click('shop-buy-store');await page.getByTestId('shop-apply').waitFor();await click('shop-apply');await notice('おうちに反映しました。');assert.equal((await wallet()).wardrobe.equipped,'dog');assert.equal((await wallet()).points,87);
   await click('shop-tab-sets');await choose('panda-set');await page.getByTestId('shop-buy-store').getByText('￥200で購入',{exact:true}).waitFor();await click('shop-buy-store');await page.getByTestId('shop-apply').waitFor();assert.equal(await page.evaluate(()=>window.__shopQA.calls.at(-1)),'yokiyoki.room.panda_furniture');await click('shop-apply');await notice('おうちに反映しました。');
   await click('shop-restore');await notice('2種類の購入を復元しました。');assert.equal((await wallet()).points,87);
   await page.evaluate(()=>{localStorage.setItem('qa-products-room','[]');window.__shopQA.emit.room();});await page.getByTestId('shop-buy-store').waitFor();assert.deepEqual((await room()).boutique.goods,[]);assert.ok((await wallet()).wardrobe.owned.includes('panda'));assert.ok((await wallet()).wardrobe.owned.includes('dog'));
  }
  await page.goto(base+'/record');await page.getByTestId('memory-diary-art').waitFor();await capture('diary-top-'+width);await click('memory-open-diary');await page.getByTestId('diary-character-page').waitFor();await capture('diary-open-'+width);
  assert.deepEqual(errors,[]);results.push({width,nativeBridgeSimulated:native,passed:true});await context.close();
 }
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,results}));
})().catch(async e=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
