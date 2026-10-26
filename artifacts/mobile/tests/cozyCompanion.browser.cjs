'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
 const filePath=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(filePath!==root&&!filePath.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const file=fs.existsSync(filePath)&&fs.statSync(filePath).isFile()?filePath:path.join(root,'index.html');
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
const date='2026-10-21';
const day=(offset)=>new Date(Date.parse(date+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);
function saved(streak,stage,gap=1){return {version:1,lastDate:day(-gap),streak,bestStreak:streak,totalVisits:streak,stage,highestStage:stage,dates:Array.from({length:streak},(_,i)=>day(i-streak-gap+1))};}
function seed({visits,absenceHours=24}){
 const now=Date.parse("2026-10-21T03:00:00Z"),last=now-absenceHours*3600000,previous=new Date(last).toISOString().slice(0,10);
 if(localStorage.getItem('room-keepsakes-qa'))return;
 const values={
  '@mentore/feed_state_v1':{points:200,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100,happiness:{value:75,updatedOn:previous,updatedAt:last,lastSeenAt:last,days:{[previous]:['visit']}},hygiene:{lastBathAt:now,protectedUntil:0},housekeeping:{startedAt:now-4*86400000,updatedAt:now-4*86400000,owned:['broom'],cleaned:{},robotPlaced:false}},
  '@mentore/profile_v1':{nickname:'テスト',ageRange:'回答しない',gender:'回答しない'},
  '@mentore/encounters_v1':{list:['egg','odango','happa','colorful_happa'].map(charKey=>({charKey,metDate:'2026-09-01'}))},
  '@mentore/progress_v2':{level:15,experience:980,mentalMuscle:42,streak:4,totalDays:28,lastRecordDate:'2026-10-20',visits},
  '@mentore/records_v2':[{date:'2026-10-15',mood:2},{date:'2026-10-17',mood:3},{date:'2026-10-20',mood:4}].map(r=>({...r,sleep:7,sleepRecorded:true,behaviors:[],activities:{},notes:'検証用',win:'',exercise:0})),
 };
 for(const [key,value] of Object.entries(values))localStorage.setItem(key,JSON.stringify(value));
 localStorage.setItem('room-keepsakes-qa','1');
}
async function fit(page,id){
 await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
 const element=page.getByTestId(id);await element.waitFor();
 const b=await element.boundingBox(),v=page.viewportSize();
 assert.ok(b&&b.width>=44&&b.height>=44,id+' touch target');
 assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=v.width&&b.y+b.height<=v.height,id+' inside viewport '+JSON.stringify(b));
 // Native-like pointer input must not auto-scroll the clipped game world.
 await page.waitForFunction(id=>{
  const e=document.querySelector(`[data-testid="${id}"]`),r=e?.getBoundingClientRect();
  return r&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
 },id);
 return element;
}
async function tap(page,id){
 const element=await fit(page,id),b=await element.boundingBox();
 await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
}

let browser,activePage;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height,days] of [[320,568,13],[390,844,29],[820,1180,59]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block'});
  const page=await context.newPage();activePage=page;const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-21T03:00:00Z'));
  await page.addInitScript(seed,{visits:saved(days,'stage4',3),absenceHours:48});
  await page.addInitScript(()=>{
   if(localStorage.getItem('cozy-qa'))return;
   const f=JSON.parse(localStorage.getItem('@mentore/feed_state_v1'));
   f.points=200;f.bank={version:1,seed:11,balance:123,carry:50,lastDay:'2026-10-18',revision:1,serial:0,history:[],interestEarned:0,lost:0};
   f.happiness.smoking={sessions:3,lastSmokedAt:Date.parse('2026-10-18T03:00:00Z'),withdrawalSteps:0,recoveredAt:0,active:null,receipts:[],giftCigarettes:0,giftDays:[]};
   localStorage.setItem('@mentore/feed_state_v1',JSON.stringify(f));localStorage.setItem('cozy-qa','1');
  });
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/community/config'))return route.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(url.origin!==base||url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});return route.continue();});
  await page.goto(base);
  await page.getByTestId('room-scene').waitFor();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).bankRetirement?.returned===123);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/room_customization_v1')).keepsakes?.includes('flower'));
  await fit(page,'room-visit-calendar');
  await page.screenshot({path:path.join(out,`cozy-home-${width}.png`)});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),323);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/progress_v2')).visits.stage),'stage4');
  await tap(page,'room-visit-calendar');assert.equal(await page.getByTestId('visit-streak-value').innerText(),`累計 ${days+1}日`);
  await page.screenshot({path:path.join(out,`cozy-calendar-${width}.png`)});
  await page.getByTestId('calendar-open-collection').click();await page.getByTestId('companion-collection').waitFor();
  assert.equal(await page.locator('[data-testid^="keepsake-"]').count()>=9,true);
  await page.getByTestId('keepsake-flower').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/room_customization_v1')).displayedKeepsake==='flower');
  await page.screenshot({path:path.join(out,`cozy-collection-${width}.png`)});
  await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
  await page.getByTestId('room-displayed-keepsake').waitFor();
  await page.reload();await page.getByTestId('room-displayed-keepsake').waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),323,'no duplicate bank refund');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/progress_v2')).visits.totalVisits),days+1,'no duplicate visit');
  await page.getByTestId('world-map-open').click();await page.getByTestId('village-map').waitFor();await page.getByText('Loading...', {exact:true}).waitFor({state:'hidden'});
  assert.equal(await page.getByTestId('world-map-bank').count(),0,'bank retired from map');
  await page.screenshot({path:path.join(out,`cozy-map-${width}.png`)});
  await page.getByRole('button',{name:'地図を閉じる',exact:true}).click();
  await page.getByTestId('home-more-menu').click();await page.getByRole('button',{name:'ふたりの思い出・飾りもの',exact:true}).click();
  await page.getByTestId('keepsake-put-away').click();await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
  await page.getByTestId('room-displayed-keepsake').waitFor({state:'hidden'});
  await page.reload();await page.getByTestId('room-scene').waitFor();
  assert.equal(await page.getByTestId('room-displayed-keepsake').count(),0,'put away persists');
  assert.deepEqual(errors,[]);console.log(`PASS ${width}x${height}: visits, retirement, collection, selection, reload, map, menu`);
  await context.close();
 }
 // Normal-motion fixture: collection items change the resident's actual routine.
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'no-preference',locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block'});
 const page=await context.newPage();activePage=page;const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(25000);
 await page.clock.setFixedTime(new Date('2026-10-21T03:00:00Z'));
 await page.addInitScript(seed,{visits:saved(29,'stage4'),absenceHours:0});
 await page.addInitScript(()=>{
  const f=JSON.parse(localStorage.getItem('@mentore/feed_state_v1')),now=Date.parse('2026-10-21T03:00:00Z');
  f.housekeeping={startedAt:now,updatedAt:now,owned:['broom'],cleaned:{},robotPlaced:false};f.happiness.value=90;
  localStorage.setItem('@mentore/feed_state_v1',JSON.stringify(f));
 });
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/community/config'))return route.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(url.origin!==base||url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});return route.continue();});
 await page.goto(base);await page.getByTestId('room-displayed-keepsake').waitFor();
 const waitBeside=async(text)=>{
  await page.waitForFunction(text=>{
   const el=document.querySelector('[data-testid="room-resident"]'),stage=document.querySelector('[data-testid="world-stage"]');
   if(!el||!stage||!el.getAttribute('aria-label')?.includes(text))return false;
   const r=el.getBoundingClientRect(),s=stage.getBoundingClientRect();
   return Math.abs((r.x+r.width/2-s.x)/s.width-.49)<.006&&Math.abs((r.y+r.height*.92-s.y)/s.height-.475)<.006;
  },text);
 };
 await waitBeside('お気に入りのそばで、ひと休み');
 await page.screenshot({path:path.join(out,'cozy-polished-home.png')});
 await tap(page,'room-visit-calendar');await page.getByTestId('calendar-open-collection').click();
 await page.getByTestId('keepsake-flower').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/room_customization_v1')).displayedKeepsake==='flower');
 await page.screenshot({path:path.join(out,'cozy-polished-collection.png')});
 await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
 await waitBeside('飾った思い出を眺めています');
 await page.screenshot({path:path.join(out,'cozy-polished-home-flower.png')});
 assert.deepEqual(errors,[]);console.log('PASS normal motion: walks to displayed cushion, rests, changes routine after selecting flowers');
 await context.close();
})().catch(async e=>{if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:path.join(out,'cozy-failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'cozy-failure.txt'),await activePage.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
