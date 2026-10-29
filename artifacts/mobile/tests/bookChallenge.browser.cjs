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
  '@mentore/records_v2':empty?[]:['2026-10-12','2026-10-15','2026-10-19','2026-10-21','2026-10-23','2026-10-24','2026-10-26','2026-10-27'].map((date,i)=>({id:date,date,mood:[3,2,4,3,5,2,4,3][i],sleep:7,sleepRecorded:true,behaviors:['散歩'],notes:'今日はのんびり歩いた。',win:'外の空気を吸えた',activities:{exercise:1},exercise:2,meal:3,social:2})),
 };
 for(const [k,v] of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 if(seen)localStorage.setItem('@yoki/daily-letter/v1/guest/2026-10-27','seen');localStorage.setItem('plush-qa','yes');
}
let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'no-preference',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(18000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date('2026-10-27T03:00:00Z')});await page.addInitScript(seed,{seen:true});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
 async function font(){await page.getByTestId('plush-loading').waitFor({state:'hidden'});await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body button,body input,body textarea{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);}
 await page.goto(base+'/exchange-diary');await page.getByTestId('diary-cover').waitFor();await font();await page.waitForTimeout(800);
 const diary=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).exchangeDiary);
 assert.equal((await diary()).pages['2026-10-27'].letterReadAt,undefined,'closed cover does not mark the letter read');
 await page.screenshot({path:path.join(out,'notebook-cover.png')});
 await page.getByTestId('diary-open-cover').click();await page.waitForTimeout(180);assert.equal(await page.getByTestId('diary-cover').count(),1);await page.screenshot({path:path.join(out,'notebook-opening.png')});
 await page.getByTestId('diary-cover').waitFor({state:'hidden'});await page.waitForTimeout(800);assert.ok((await diary()).pages['2026-10-27'].letterReadAt);
 await page.getByTestId('diary-next-page').click();await page.waitForTimeout(90);const during=await page.getByTestId('diary-turning-pages').evaluate(el=>getComputedStyle(el).transform);assert.match(during,/matrix3d/);await page.screenshot({path:path.join(out,'notebook-turning.png')});
 await page.getByTestId('diary-input').fill('ページをめくっても残る下書き');await page.getByTestId('diary-input').blur();
 await page.getByTestId('diary-close-cover').click();await page.getByTestId('diary-cover').waitFor();await page.getByTestId('diary-open-cover').click();await page.getByTestId('diary-cover').waitFor({state:'hidden'});assert.equal(await page.getByTestId('diary-input').inputValue(),'ページをめくっても残る下書き');
 console.log('PASS cover, unread gate, hinge animation, page turn and draft retention');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/egg-job');await page.getByTestId('egg-job-scene').waitFor();await font();await page.screenshot({path:path.join(out,'egg-challenge.png')});
 await page.getByTestId('egg-job-action').click();await page.getByTestId('egg-job-timing').waitFor();const pot=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).eggJob.active);assert.equal(pot.round,0);
 await page.clock.setFixedTime(pot.startedAt+pot.targetMs);await page.getByTestId('egg-job-action').click();await page.getByTestId('egg-job-pay').waitFor();assert.match(await page.getByTestId('egg-job-pay').innerText(),/80/);
 await page.getByTestId('egg-job-action').click();await page.getByTestId('egg-job-timing').waitFor();const second=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).eggJob.active);assert.equal(second.round,1);
 await page.clock.setFixedTime(second.startedAt+10000);await page.getByTestId('egg-job-action').click();await page.getByTestId('egg-job-day-ended').waitFor();assert.equal(await page.getByTestId('egg-job-action').isDisabled(),true);await page.screenshot({path:path.join(out,'egg-day-ended.png')});
 await page.reload();await page.getByTestId('egg-job-day-ended').waitFor();assert.equal(await page.getByTestId('egg-job-action').isDisabled(),true);
 await page.clock.setFixedTime(new Date('2026-10-28T03:00:00Z'));await page.reload();await page.getByTestId('plush-loading').waitFor({state:'hidden'});await page.getByTestId('egg-job-action').click({trial:true});assert.equal(await page.getByTestId('egg-job-action').isDisabled(),false);assert.match(await page.getByTestId('egg-job-difficulty').innerText(),/自己ベスト 1 個/);assert.equal(await page.getByTestId('egg-job-day-ended').count(),0);
 console.log('PASS daily egg challenge success, acceleration, failure, reload lock and tomorrow reset');assert.deepEqual(errors,[]);
})().catch(async e=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
