'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname,file=pathname==='/qa-jp.ttf'?process.env.YOKI_QA_FONT:path.join(root,decodeURIComponent(pathname)),actual=file&&fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(actual)]||'application/octet-stream');fs.createReadStream(actual).pipe(res);});
function seed({date,home}){
 if(localStorage.getItem('checkin-scenes-qa'))return;
 const now=Date.parse(date+'T03:00:00Z'),dates=Array.from({length:4},(_,i)=>new Date(now-(3-i)*86400000).toISOString().slice(0,10));
 const values={
 '@mentore/profile_v1':{nickname:'テスト',ageRange:'回答しない',gender:'回答しない'},
 '@mentore/feed_state_v1':{points:850,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:70,happiness:{value:70,updatedOn:date,updatedAt:now,lastSeenAt:now,days:{[date]:['visit']}},hygiene:{lastBathAt:now,protectedUntil:0},housekeeping:{startedAt:now,updatedAt:now,owned:[],cleaned:{},robotPlaced:false}},
 '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:4,totalDays:4,lastRecordDate:date,visits:{version:1,lastDate:date,streak:4,bestStreak:4,totalVisits:4,stage:'odango',highestStage:'odango',dates}},
 '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:date},{charKey:'odango',metDate:date}]},'@mentore/records_v2':[]};
 for(const [k,v] of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem('@yoki/daily-letter/v1/guest/'+date,'seen');if(home)localStorage.setItem('@yoki/scenic-return/v1/guest/'+date,'home');localStorage.setItem('checkin-scenes-qa','yes');
}
let browser,page;
async function frameReady(p){await p.getByTestId('world-map-open').waitFor();await p.waitForFunction(()=>document.querySelector('[data-testid="world-map-open"]').getAttribute('aria-disabled')!=='true');await p.waitForTimeout(500);}
async function scrub(p){
 const body=p.getByTestId('home-bath-body');
 for(let pass=0;pass<4;pass++)for(const row of [.28,.49,.72]){
  if(await p.getByTestId('bath-rinse').count())return;
  const b=await body.boundingBox();
  await p.mouse.move(b.x+b.width*.24,b.y+b.height*row);await p.mouse.down();await p.mouse.move(b.x+b.width*.76,b.y+b.height*row,{steps:16});await p.mouse.up();
 }
 await p.getByTestId('bath-rinse').waitFor();
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 async function open(width,height,date,night=false,home=false){
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:width===320?'reduce':'no-preference',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(18000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date(date+(night?'T12:00:00Z':'T03:00:00Z')));await page.addInitScript(seed,{date,home});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/community/config'))return r.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  await page.goto(base);await frameReady(page);
  if(process.env.YOKI_QA_FONT){await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body h1,body h2,body h3,body button{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);}
  return {context,errors};
 }
 for(const [scene,date,night] of (process.env.YOKI_QA_BATH_ONLY?[]:[['sea','2026-10-21',false],['meadow','2026-10-31',false],['night','2026-10-31',true]]))for(const [w,h] of [[390,844],[844,390]]){
  const {context,errors}=await open(w,h,date,night);await page.getByTestId('scenic-visit').waitFor();
  const bg=page.getByTestId('scenic-background');await page.waitForFunction(()=>document.querySelector('[data-testid="scenic-background"] img')?.complete);
  assert.ok((await bg.locator('img').getAttribute('src')).includes('visit-'+scene));
  assert.equal(await page.getByTestId('world-steering-frame').count(),0);assert.equal(await page.getByTestId('room-resident').count(),1);
  await page.screenshot({path:path.join(out,`${scene}-${w}.png`)});
  if(scene==='sea'&&w===390){await page.clock.setFixedTime(new Date(date+'T12:00:00Z'));await page.waitForTimeout(1100);assert.ok((await bg.locator('img').getAttribute('src')).includes('visit-sea'),'sunset does not interrupt the scene');}
  await page.getByTestId('scenic-return-home').click();await page.getByTestId('scenic-visit').waitFor({state:'hidden'});assert.equal(await page.evaluate(d=>localStorage.getItem('@yoki/scenic-return/v1/guest/'+d),date),'home');
  await page.reload();await frameReady(page);assert.equal(await page.getByTestId('scenic-visit').count(),0,'home return survives refresh');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),w);assert.deepEqual(errors,[]);console.log(`PASS ${scene} ${w}x${h}: real resident, correct artwork, return and persistence`);await context.close();
 }
 for(const [w,h] of [[390,844],[1363,936],[844,390],[320,568]].filter(v=>!process.env.YOKI_QA_WIDTH||v[0]===Number(process.env.YOKI_QA_WIDTH))){
  const {context,errors}=await open(w,h,'2026-10-27',false,true);
  const view=await page.getByTestId('home-view-toggle').boundingBox(),cal=await page.getByTestId('room-visit-calendar').boundingBox();
  assert.ok(view.x+view.width<=cal.x||cal.x+cal.width<=view.x||view.y+view.height<=cal.y||cal.y+cal.height<=view.y,'view control does not overlap calendar');assert.equal(await page.getByTestId('world-steering-frame').count(),0);
  await page.getByRole('tab',{name:'おふろ',exact:true}).click();await page.getByTestId('home-bath-body').waitFor();await scrub(page);await page.screenshot({path:path.join(out,`washed-${w}.png`)});
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).happiness.value);
  await page.getByTestId('bath-rinse').click();await page.getByText('ふわふわになった！',{exact:true}).waitFor();await page.waitForTimeout(700);
  assert.match(await page.getByTestId('bath-feedback').innerText(),/幸福 ＋4/);const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).happiness.value);assert.equal(first,before+4);
  await page.screenshot({path:path.join(out,`rinsed-${w}.png`)});
  await page.getByTestId('bath-wash-again').click();await scrub(page);await page.getByTestId('bath-rinse').click();await page.getByText('ふわふわになった！',{exact:true}).waitFor();assert.match(await page.getByTestId('bath-feedback').innerText(),/受け取り済み/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).happiness.value),first);
  await page.getByTestId('bath-go-home').click();await frameReady(page);assert.equal(await page.getByTestId('scenic-visit').count(),0);assert.deepEqual(errors,[]);console.log(`PASS ${w}x${h}: no overlap/joystick, full pointer wash/rinse/result, one daily bonus, repeat and return`);await context.close();
 }
})().catch(async e=>{if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
