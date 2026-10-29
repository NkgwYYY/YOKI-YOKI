'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=pathname==='/qa-jp.ttf'?process.env.YOKI_QA_FONT:path.join(root,decodeURIComponent(pathname));const actual=file&&fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(actual)]||'application/octet-stream');fs.createReadStream(actual).pipe(res);});
function seed({empty=true,seen=false,pending=true}){
 if(localStorage.getItem('plush-qa'))return;
 const now=Date.parse('2026-10-27T03:00:00Z');
 const values={
  '@mentore/profile_v1':{nickname:'テスト',ageRange:'回答しない',gender:'回答しない',bloodType:'A',mbti:'INFP'},
  '@mentore/feed_state_v1':{points:850,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:70,happiness:{value:80,updatedOn:'2026-10-27',updatedAt:now,lastSeenAt:now,days:{'2026-10-27':['visit']}},hygiene:{lastBathAt:now,completedBathDate:'2026-10-27',protectedUntil:0},housekeeping:{startedAt:now,updatedAt:now,owned:['robot'],cleaned:{},robotPlaced:false}},
  '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:3,totalDays:8,lastRecordDate:'2026-10-27',visits:{version:1,lastDate:'2026-10-27',streak:4,bestStreak:4,totalVisits:4,stage:'odango',highestStage:'odango',dates:['2026-10-24','2026-10-25','2026-10-26','2026-10-27']}},
  '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-10-24'},{charKey:'odango',metDate:'2026-10-26'}]},
  '@mentore/records_v2':empty?[]:['2026-10-12','2026-10-15','2026-10-19','2026-10-21','2026-10-23','2026-10-24','2026-10-26','2026-10-27'].map((date,i)=>({id:date,date,mood:[3,2,4,3,5,2,4,3][i],sleep:7,sleepRecorded:true,behaviors:['散歩'],notes:'今日はのんびり歩いた。',win:'外の空気を吸えた',activities:{exercise:1},exercise:2,meal:3,social:2})),
 };
 for(const [k,v] of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 if(pending)localStorage.setItem('@yoki/first-steps/v1/guest','pending');
 localStorage.setItem('@yoki/scenic-return/v1/guest/2026-10-27','home');
 if(seen)localStorage.setItem('@yoki/daily-letter/v1/guest/2026-10-27','seen');localStorage.setItem('plush-qa','yes');
}
let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[390,844],[320,568],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(18000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-27T03:00:00Z')});await page.addInitScript(seed,{});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  async function font(){await page.getByTestId('plush-loading').waitFor({state:'hidden'});if(process.env.YOKI_QA_FONT){await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body h1,body h2,body h3,body button,body input,body textarea{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);}}
  await page.goto(base);await page.getByTestId('tutorial-step-0').waitFor();await font();
  assert.equal(await page.getByRole('heading',{name:'今日の便り',exact:true}).count(),0,'tutorial has priority over daily modal');
  const next=page.getByTestId('tutorial-next'),box=await next.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=height,'tutorial action stays inside viewport');
  await page.screenshot({path:path.join(out,`tutorial-${width}.png`)});
  await next.click();await page.getByTestId('tutorial-step-1').waitFor();await next.click();await page.getByTestId('tutorial-step-2').waitFor();
  await page.getByRole('button',{name:'戻る',exact:true}).click();await page.getByTestId('tutorial-step-1').waitFor();await next.click();
  if(width===390){
   await page.evaluate(()=>{window.__qaSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='@yoki/first-steps/v1/guest'&&v==='done')throw new DOMException('quota','QuotaExceededError');return window.__qaSet.call(this,k,v);};});
   await next.click();await page.getByRole('alert').filter({hasText:'保存できませんでした'}).waitFor();assert.equal(await page.getByTestId('tutorial-step-2').count(),1,'failed save keeps tutorial recoverable');
   await page.evaluate(()=>{Storage.prototype.setItem=window.__qaSet;});
  }
  await next.click();await page.getByTestId('quick-mood-1').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('@yoki/first-steps/v1/guest')),'done');
  await page.getByTestId('quick-mood-1').click();await page.getByText('今日の気分を保存しました。',{exact:true}).waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();
  assert.equal(await page.getByTestId('home-mood-guide').count(),0,'a low mood is a valid saved mood');
  await page.reload();await page.getByTestId('home-more-menu').click({trial:true});assert.equal(await page.getByTestId('tutorial-step-0').count(),0,'completion survives reload');assert.equal(await page.getByRole('heading',{name:'今日の便り',exact:true}).count(),0);
  await page.getByTestId('home-more-menu').click();await page.getByRole('button',{name:'はじめての使い方',exact:true}).click();await page.getByTestId('tutorial-skip').click();await page.getByTestId('home-letter').click({trial:true});
  await page.getByTestId('home-letter').click();await page.getByTestId('zodiac-sasori').click();await page.getByTestId('zodiac-official-link').waitFor();
  assert.equal(await page.getByTestId('fortune-sourced-reading').count(),0,'no lunar advice shown');
  const popupPromise=context.waitForEvent('page');await page.getByTestId('zodiac-official-link').click();const popup=await popupPromise;await popup.waitForURL('https://uranai.nifty.com/f12seiza/sasori/');await popup.close();
  await page.screenshot({path:path.join(out,`fortune-${width}.png`)});await page.getByRole('button',{name:'よっきーに会いに行く',exact:true}).click();
  await page.getByTestId('world-map-open').click();await page.getByTestId('menu-fortune').click();assert.equal(await page.getByTestId('zodiac-official-link').getAttribute('aria-label'),'さそり座の今日の運勢をニフティで開く。外部サイト');
  await page.getByTestId('zodiac-change').click();await page.getByTestId('zodiac-uo').click();await page.getByRole('button',{name:'閉じる',exact:true}).click();
  await page.goto(base+'/guide');await page.getByTestId('guide-replay-tutorial').click();await page.getByTestId('tutorial-step-0').waitFor();await page.getByTestId('tutorial-skip').click();await page.getByTestId('home-letter').click({trial:true});assert.notEqual(new URL(page.url()).searchParams.get('learn'),'1','replay request is consumed');
  await page.clock.setSystemTime(new Date('2026-10-28T03:00:00Z'));await page.clock.fastForward(31000);await page.getByRole('heading',{name:'今日の便り',exact:true}).waitFor();await page.getByRole('button',{name:'よっきーに会いに行く',exact:true}).click();
  await page.getByTestId('home-mood-guide').waitFor();await font();await page.screenshot({path:path.join(out,`unrecorded-${width}.png`)});
  await page.getByTestId('home-mood-guide').click();await page.getByTestId('quick-mood-3').click();await page.getByText('今日の気分を保存しました。',{exact:true}).waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();assert.equal(await page.getByTestId('home-mood-guide').count(),0,'next-day guidance clears after successful save');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert.deepEqual(errors,[]);console.log(`PASS ${width}x${height}: tutorial completion/skip/replay, record guidance/day rollover, official zodiac links and persisted selection`);await context.close();
 }
 // Exercise the real first-time profile path, rather than only a seeded tutorial flag.
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(18000);
 await context.route('**/*',r=>{const u=new URL(r.request().url());return u.origin!==base||u.pathname.startsWith('/api/')?r.fulfill({status:503,contentType:'application/json',body:'{}'}):r.continue();});
 await page.goto(base+'/onboarding');await page.getByTestId('profile-nickname').fill('はじめて');await page.getByTestId('profile-age-unknown').click();await page.getByTestId('profile-gender-unknown').click();await page.getByRole('button',{name:'いっしょにはじめる',exact:true}).click();
 await page.getByTestId('tutorial-step-0').waitFor();await page.getByTestId('tutorial-skip').click();await page.reload();await page.getByTestId('home-mood-guide').click({trial:true});assert.equal(await page.getByTestId('tutorial-step-0').count(),0);console.log('PASS actual onboarding enrolls tutorial and skip persists');await context.close();
})().catch(async e=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(e);if(page&&!page.isClosed())console.error('URL',page.url(),await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('@yoki/daily-letter')||k.startsWith('@yoki/first-steps')))));process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
