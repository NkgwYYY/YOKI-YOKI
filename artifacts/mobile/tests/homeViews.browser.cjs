'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const engines=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright'),engine=process.env.YOKI_QA_ENGINE||'chromium';
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
 browser=await engines[engine].launch(engine==='webkit'?{headless:true}:{headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const cases=process.env.YOKI_QA_CASES?JSON.parse(process.env.YOKI_QA_CASES):[[390,844,'day','no-preference'],[390,740,'night','no-preference'],[320,568,'night','reduce'],[844,390,'day','no-preference'],[1363,936,'night','reduce']];
 for(const [width,height,period,motion] of cases){
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:motion,serviceWorkers:'block',...(engine==='webkit'?{isMobile:true,hasTouch:true,deviceScaleFactor:3}:{})});
  page=await context.newPage();page.setDefaultTimeout(18000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.stack);});
  await page.clock.install({time:new Date(period==='day'?'2026-10-27T03:00:00Z':'2026-10-27T12:00:00Z')});await page.addInitScript(seed,{});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  const tid=id=>page.getByTestId(id).filter({visible:true});
  const key='@mentore/home-view/v1/guest',labels={overview:'お部屋',close:'アップ',eye:'目線'};
  async function ready(mode){await page.getByRole('button',{name:`視点を変える。現在は${labels[mode]}`,exact:true}).waitFor();await page.waitForFunction(()=>{const el=[...document.querySelectorAll('[data-testid="home-view-toggle"]')].find(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');return el&&el.getAttribute('aria-disabled')!=='true';});await tid('plush-loading').waitFor({state:'hidden'});}
  async function font(){await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body button,body input,body textarea{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);}
  async function select(mode){await tid('home-view-toggle').click();await tid('home-view-option-'+mode).click();await ready(mode);await page.waitForTimeout(motion==='reduce'?200:1200);}
  await page.goto(base);await ready('overview');await font();
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null,'initial overview must not overwrite a preference during hydration');
  const dock=await tid('home-action-dock').boundingBox();
  assert.ok(dock.height<=60&&dock.y>=height-80,'one compact dock leaves the foreground visible');
  assert.equal(await tid('world-navigation').count(),0,'home must not stack a second navigation bar');
  for(const id of ['room-meal','home-quick-mood','home-daily-record','home-chat','home-bath','home-growth']){
   const b=await tid(id).boundingBox();assert.ok(b.width>=44&&b.height>=44&&b.x>=0&&b.x+b.width<=width,'care action fits with a full touch target: '+id);
  }
  const cal=await tid('room-visit-calendar').boundingBox();
  assert.ok(cal.x>=0&&cal.x+cal.width<=width&&cal.y+cal.height<dock.y,'calendar remains visible above the foreground controls');
  assert.ok(await tid('room-visit-calendar').evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),'calendar touch target is not covered by header controls');
  const before=await tid('room-resident').boundingBox();
  assert.ok(before.y+before.height<dock.y-24,'the resting resident has breathing room above the dock');
  for(const mode of ['overview','close','eye']){
   if(mode!=='overview')await select(mode);
   const image=await tid('home-camera-art').locator('img').getAttribute('src');
   assert.ok(image.includes(mode==='eye'?'nook-eye':width>height?'nook-wide':'nook-overview'));
   if(mode==='close'){const after=await tid('room-resident').boundingBox();assert.ok(after.width>before.width*1.4,'close view enlarges the resident');assert.equal(await tid('home-eye-level').count(),0,'close retains overhead daily-life mechanics');}
   if(mode==='eye'){
    const check=async()=>{
     // Wait for the rendered transform, rather than assuming the next RAF fits a fixed delay.
     await page.waitForFunction(()=>{const el=[...document.querySelectorAll('[data-testid="world-stage"]')].find(e=>e.getClientRects().length);if(!el)return false;const m=new DOMMatrix(getComputedStyle(el).transform);return m.a===1&&m.d===1&&m.e===0&&m.f===0;},{},{timeout:2000});
     const viewport=page.viewportSize(),b=await tid('room-resident').boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width&&b.y+b.height<=viewport.height-80,'eye resident stays above bottom navigation '+JSON.stringify(b));
     const matrix=await tid('world-stage').evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return [m.a,m.d,m.e,m.f];});assert.deepEqual(matrix,[1,1,0,0],'eye-level scene has no inherited zoom or pan');};
    await check();await tid('room-resident').press('Enter');await page.waitForTimeout(1300);await check();
    const b=await tid('room-resident').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+25,b.y+b.height/2+12,{steps:8});await page.mouse.up();await page.waitForTimeout(1500);await check();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(400);await page.mouse.move(b.x+b.width/2+55,b.y+b.height/2-35,{steps:8});await page.mouse.up();await page.waitForTimeout(1500);await check();
    if(engine==='webkit'){
     const at=await tid('room-resident').boundingBox();await page.touchscreen.tap(at.x+at.width/2,at.y+at.height/2);await page.waitForTimeout(1300);await check();
     await page.setViewportSize({width:740,height:390});await page.waitForTimeout(1500);await check();
     await page.setViewportSize({width,height});await page.waitForTimeout(1500);await check();
    }
    await page.mouse.click(8,200);await page.waitForTimeout(300);
   }
   const button=await tid('home-view-toggle').boundingBox();assert.ok(button.x>=0&&button.x+button.width<=width,'view selector fits');
   await page.screenshot({path:path.join(out,`${mode}-${period}-${width}.png`)});
   if(mode!=='overview'){
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),mode);
    await page.reload();await ready(mode);await font();
   }
  }
  await select('close');await select('eye');await select('overview');await page.reload();await ready('overview');await font();
  await tid('room-visit-calendar').click();await page.getByRole('heading',{name:'カレンダー',exact:true}).waitFor();await tid('room-mood-frame').click();await page.getByRole('heading',{name:'気分の推移',exact:true}).waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();await tid('room-record').click();await tid('diary-cover').waitFor();await tid('diary-home').click();await ready('overview');
  if(width===375){
   await tid('home-bath').click();await tid('home-bath-scene').waitFor();await page.getByRole('tab',{name:'おうち',exact:true}).click();await ready('overview');
   await tid('home-growth').click();await tid('album-screen').waitFor();await page.getByRole('tab',{name:'おうち',exact:true}).click();await ready('overview');
   await tid('home-quick-mood').click();await tid('quick-mood-1').waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();
   await tid('home-chat').click();await page.getByRole('button',{name:'閉じる',exact:true}).click();await ready('overview');await page.waitForTimeout(8000);
   await page.screenshot({path:path.join(out,'room-layout-final-375.png')});
  }
  if(width===390){
   await select('close');await tid('room-meal').click();await page.getByRole('button',{name:/きのみ.*ポイント.*満腹度プラス/}).click();await page.waitForTimeout(6500);await ready('close');
   assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'close','care does not replace the chosen view');
   await page.evaluate(k=>localStorage.setItem(k,'invalid'),key);await page.reload();await ready('overview');
   await context.route('**/*nook-eye*',r=>r.abort());await tid('home-view-toggle').click();await tid('home-view-option-eye').click();
   await page.getByText(/視点を切り替えられませんでした/).waitFor();await ready('overview');assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'invalid','image failure must not save the target view');
   await context.unroute('**/*nook-eye*');await page.getByRole('button',{name:'道の案内を閉じる',exact:true}).click();
   await page.evaluate(k=>{window.__qaSet=Storage.prototype.setItem;Storage.prototype.setItem=function(a,b){if(a===k)throw new DOMException('quota','QuotaExceededError');return window.__qaSet.call(this,a,b);};},key);
   await tid('home-view-toggle').click();await tid('home-view-option-eye').click();await page.getByText(/視点を切り替えられませんでした/).waitFor();await ready('overview');
   await page.evaluate(()=>{Storage.prototype.setItem=window.__qaSet;});await page.getByRole('button',{name:'道の案内を閉じる',exact:true}).click();await select('eye');
  }
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  console.log(`PASS ${width}x${height} ${period} ${motion}: default overview, three views, saved/reloaded selections, touch targets and care`);await context.close();
 }
})().catch(async e=>{console.error(e);if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText().catch(()=>String(e)));}process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
