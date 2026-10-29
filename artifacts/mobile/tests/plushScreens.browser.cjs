'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=pathname==='/qa-jp.ttf'?process.env.YOKI_QA_FONT:path.join(root,decodeURIComponent(pathname));const actual=file&&fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(actual)]||'application/octet-stream');fs.createReadStream(actual).pipe(res);});
function seed({empty=false,seen=false}){
 if(localStorage.getItem('plush-qa'))return;
 const now=Date.parse('2026-10-27T03:00:00Z');
 const values={
  '@mentore/profile_v1':{nickname:'テスト',ageRange:'回答しない',gender:'回答しない',bloodType:'A',mbti:'INFP'},
  '@mentore/feed_state_v1':{points:850,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:70,happiness:{value:80,updatedOn:'2026-10-27',updatedAt:now,lastSeenAt:now,days:{'2026-10-27':['visit']}},hygiene:{lastBathAt:now,completedBathDate:'2026-10-27',protectedUntil:0},housekeeping:{startedAt:now,updatedAt:now,owned:['robot'],cleaned:{},robotPlaced:false}},
  '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:3,totalDays:8,lastRecordDate:'2026-10-27',visits:{version:1,lastDate:'2026-10-27',streak:4,bestStreak:4,totalVisits:4,stage:'odango',highestStage:'odango',dates:['2026-10-24','2026-10-25','2026-10-26','2026-10-27']}},
  '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-10-24'},{charKey:'odango',metDate:'2026-10-26'}]},
  '@mentore/records_v2':empty?[]:['2026-10-12','2026-10-15','2026-10-19','2026-10-21','2026-10-23','2026-10-24','2026-10-26','2026-10-27'].map((date,i)=>({id:date,date,mood:[3,2,4,3,5,2,4,3][i],sleep:7,sleepRecorded:true,behaviors:['散歩'],notes:'今日はのんびり歩いた。',win:'外の空気を吸えた',activities:{exercise:1},exercise:2,meal:3,social:4})),
 };
 for(const [k,v] of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 if(seen)localStorage.setItem('@yoki/daily-letter/v1/guest/2026-10-27','seen');localStorage.setItem('plush-qa','yes');
}
let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(18000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-10-27T03:00:00Z'));await page.addInitScript(seed,{seen:true});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/community/config'))return r.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
 async function font(){if(process.env.YOKI_QA_FONT){await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),#yoki-boot p,body h1,body h2,body h3,body button,body input,body textarea{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);}}
 await page.goto(base);await page.getByTestId('world-map-open').click();await page.getByTestId('menu-shop').click();await page.getByTestId('shop-open-atelier').waitFor();await font();await page.screenshot({path:path.join(out,'shop.png')});
 await page.getByRole('button',{name:'ごはんを選ぶ',exact:true}).click();await page.getByRole('button',{name:'閉じる',exact:true}).waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();
 for(const route of ['egg-job','exchange-diary','profile','monthly-report','friends','guide','gallery','gifts']){
  await page.goto(base+'/'+route);await page.waitForTimeout(850);await font();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390,route+' fits viewport');await page.screenshot({path:path.join(out,route+'.png')});assert.ok((await page.locator('body').innerText()).length>20,route+' renders');console.log('PASS '+route);
 }
 await page.goto(base);await page.getByTestId('world-map-open').click();await page.getByTestId('menu-play').click();await page.getByTestId('menu-egg').click();await page.waitForURL('**/egg-job');console.log('PASS direct shop and egg navigation');assert.deepEqual(errors,[]);await context.close();
 const boot=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false,serviceWorkers:'block'});page=await boot.newPage();page.setDefaultTimeout(15000);await boot.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());console.log('CHECK boot navigation');await page.goto(base,{waitUntil:'domcontentloaded'});assert.equal(await page.locator('#yoki-boot').isVisible(),true);console.log('CHECK vector boot');assert.equal(await page.locator('#yoki-boot img').count(),0);assert.equal(await page.getByRole('img',{name:'YOKIYOKI'}).count(),1);await page.screenshot({path:path.join(out,'boot-before-js.png'),timeout:15000});console.log('PASS violet logo loading before JavaScript');await boot.close();
 const fail=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block'});page=await fail.newPage();await page.addInitScript(seed,{seen:true});await page.clock.setFixedTime(new Date('2026-10-27T03:00:00Z'));
 await fail.route('**/*',r=>{const u=new URL(r.request().url());if(/plush-home-/.test(u.pathname))return r.abort();if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});await page.goto(base);await page.getByRole('button',{name:'画像を待たずにはじめる',exact:true}).waitFor();await font();await page.screenshot({path:path.join(out,'loading-retry.png')});await page.getByRole('button',{name:'画像を待たずにはじめる',exact:true}).click();await page.getByTestId('world-map-open').click();await page.getByTestId('home-direct-menu').waitFor();console.log('PASS failed background does not block home');await fail.close();
})().catch(async e=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
