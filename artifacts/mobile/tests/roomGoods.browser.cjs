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
  '@mentore/room_customization_v1':{furniture:'sofa',flower:'violet',ownedFurniture:['sofa','vanity','bookshelf'],ownedFlowers:['pink','violet','rainbow']},
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
 browser=await engines.chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const cases=process.env.YOKI_QA_CASES?JSON.parse(process.env.YOKI_QA_CASES):[[390,844,'day'],[375,670,'day'],[320,568,'night'],[844,390,'day']];
 for(const [width,height,period] of cases){
  const ctx=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce',serviceWorkers:'block'});page=await ctx.newPage();page.setDefaultTimeout(18000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date(period==='night'?'2026-10-27T12:00:00Z':'2026-10-27T03:00:00Z')});await page.addInitScript(seed,{});
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  const tid=id=>page.getByTestId(id).filter({visible:true});
  const ready=async()=>{await tid('home-view-toggle').waitFor();await tid('plush-loading').waitFor({state:'hidden'});await page.waitForTimeout(600);};
  const font=async()=>{await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body button{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);};
  const select=async mode=>{await tid('home-view-toggle').click();await tid('home-view-option-'+mode).click();await ready();};
  const check=async(label)=>{
   await tid('world-speech').waitFor();const b=await tid('resident-speech-bubble').boundingBox(),r=await tid('resident-body').boundingBox(),dock=await tid('home-action-dock').boundingBox();
   assert.ok(b.x>=10&&b.x+b.width<=width-10,'speech fits width '+label);
   assert.ok(b.y>=166&&b.y+b.height<=dock.y-3,'speech clears header and dock '+label+' '+JSON.stringify({b,r,dock}));
   const dx=Math.max(b.x-r.x-r.width,r.x-b.x-b.width,0),dy=Math.max(b.y-r.y-r.height,r.y-b.y-b.height,0);
   assert.ok(Math.hypot(dx,dy)<45,'speech stays by resident '+label+' '+JSON.stringify({b,r,dx,dy}));
   const text=await tid('world-speech').evaluate(e=>({h:e.clientHeight,scroll:e.scrollHeight}));assert.ok(text.h>=text.scroll-1,'full text visible');
   return {b,r};
  };
  await page.goto(base);await ready();await font();await page.clock.runFor(8500);
  for(const mode of ['overview','close','eye']){
   if(mode!=='overview')await select(mode);
   await tid('room-resident').press('Enter');await page.waitForTimeout(150);await check(mode);
   await tid('room-resident').evaluate(e=>e.blur());await page.screenshot({path:path.join(out,`${mode}-${period}-${width}.png`)});
  }
  await select('overview');await tid('room-bed').click();
  for(let n=0;n<50;n++){await page.clock.runFor(400);if((await tid('room-resident').getAttribute('aria-label')).includes('ひと休み'))break;}
  await tid('room-resident').press('Enter');await check('bed');
  const b=await tid('room-resident').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(350);await page.mouse.move(width*.48,height*.58,{steps:16});await page.waitForTimeout(200);await check('held');await page.mouse.up();await page.waitForTimeout(300);await check('landed');
  if(width===390){
   for(const furniture of ['sofa','vanity','bookshelf']){
    await page.evaluate(id=>{const key='@mentore/room_customization_v1',v=JSON.parse(localStorage.getItem(key));v.furniture=id;localStorage.setItem(key,JSON.stringify(v));},furniture);
    await page.reload();await ready();await font();await page.clock.runFor(8500);
    const f=await tid('home-furniture-'+furniture).boundingBox(),resident=await tid('room-resident').boundingBox(),dock=await tid('home-action-dock').boundingBox();assert.ok(f.x>=10&&f.x+f.width<=width-10&&f.width>resident.width&&f.y+f.height<dock.y,'furniture is larger than the resident and above menu '+JSON.stringify(f));
    await tid('room-resident').press('Enter');await check(furniture);await tid('room-resident').evaluate(e=>e.blur());await page.screenshot({path:path.join(out,`furniture-${furniture}.png`)});
   }
  }
  assert.deepEqual(errors,[]);console.log('PASS',width,height,period,'all speech views, bed, carrying, furnishings');await ctx.close();
 }
})().catch(async e=>{console.error(e);if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText().catch(()=>String(e)));}process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
