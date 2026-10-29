'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=pathname==='/qa-jp.ttf'?process.env.YOKI_QA_FONT:path.join(root,decodeURIComponent(pathname));const actual=file&&fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(actual)]||'application/octet-stream');fs.createReadStream(actual).pipe(res);});
function seed({empty=true,seen=true,pending=false}){
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
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce',serviceWorkers:'block'});
  page=await context.newPage();page.setDefaultTimeout(18000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-27T03:00:00Z')});await page.addInitScript(seed,{});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  const tid=id=>page.getByTestId(id).filter({visible:true});
  async function font(){await tid('plush-loading').waitFor({state:'hidden'});await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body button,body input,body textarea{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);}
  const buttons={mood:'home-quick-mood',diary:'home-daily-record',feed:'room-meal'};
  async function visible(kind){
   const dot=tid('home-assist-dot-'+kind);await dot.waitFor();
   const b=await tid(buttons[kind]).boundingBox();assert.ok(b.width>=44&&b.height>=44&&b.x>=0&&b.x+b.width<=width,'hint uses an accessible dock action');
   assert.equal(await page.locator('[data-testid^="home-assist-dot-"]').count(),1,'only one small invitation');
   assert.equal(await page.locator('[data-testid="home-assist-mood"],[data-testid="home-assist-diary"],[data-testid="home-assist-feed"]').count(),0,'no floating guidance obscures the room');
  }
  await page.goto(base);await visible('mood');await font();await page.screenshot({path:path.join(out,`mood-${width}.png`)});
  await tid(buttons.mood).click();await tid('quick-mood-1').waitFor();
  assert.equal(await tid('home-assist-dot-mood').count(),0,'no hint over an open sheet');
  if(width===390){
   await page.evaluate(()=>{window.__originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='@mentore/records_v2')throw new DOMException('quota','QuotaExceededError');return window.__originalSet.call(this,k,v);};});
   await tid('quick-mood-1').click();await page.getByText('保存できませんでした。気分をもう一度タップしてね。',{exact:true}).waitFor();
   await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSet;});
  }
  await tid('quick-mood-1').click();await page.getByText('今日の気分を保存しました。',{exact:true}).waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();
  assert.equal(await page.locator('[data-testid^="home-assist-dot-"]').count(),0,'after acting the room stays quiet for this visit');
  await page.reload();await visible('diary');await font();
  await tid(buttons.diary).click();await tid('diary-cover').waitFor();await tid('diary-open-cover').click();await tid('diary-cover').waitFor({state:'hidden'});
  await page.waitForFunction(()=>!!JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).exchangeDiary.pages['2026-10-27'].letterReadAt);
  await tid('diary-write').click();await tid('diary-send').click();await tid('diary-user-page').waitFor();await tid('diary-home').click();
  await tid('home-daily-record').waitFor();assert.equal(await tid('home-assist-dot-diary').count(),0,'successful exchange stops the diary hint');
  await page.evaluate(()=>{const k='@mentore/feed_state_v1',f=JSON.parse(localStorage.getItem(k));f.satietyAtFeed=20;f.lastFeedTime=new Date().toISOString();localStorage.setItem(k,JSON.stringify(f));});
  await page.reload();await visible('feed');await font();
  await tid('home-view-toggle').click();await tid('home-view-option-eye').click();await tid('home-eye-level').waitFor();await visible('feed');
  await tid(buttons.feed).click();await page.getByRole('button',{name:/きのみ.*ポイント.*満腹度プラス/}).click();
  await tid('home-eye-level').waitFor();await page.waitForTimeout(6000);assert.equal(await tid('home-assist-dot-feed').count(),0,'successful feeding clears the hint');
  await page.clock.setSystemTime(new Date('2026-10-28T03:00:00Z'));await page.clock.fastForward(31000);await page.getByRole('heading',{name:'今日の便り',exact:true}).waitFor();await page.getByRole('button',{name:'よっきーに会いに行く',exact:true}).click();await visible('mood');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert.deepEqual(errors,[]);
  console.log(`PASS ${width}x${height}: compact hints, real save/read/send/feed, failure retry, eye view, reload and day rollover`);await context.close();
 }
})().catch(async e=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
