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
 const scenarios=[
  {width:320,height:568,visits:saved(2,'egg'),stage:'モフモフ',streak:3},
  {width:390,height:844,visits:saved(9,'odango'),stage:'はっぱ',streak:10},
  {width:844,height:390,visits:saved(29,'stage3'),stage:'カラフルはっぱ',streak:30},
  {width:820,height:1180,visits:saved(30,'stage4',12),stage:'カラフルはっぱ',streak:1,absenceHours:48},
 ];
 for(const s of scenarios){
  const context=await browser.newContext({viewport:{width:s.width,height:s.height},reducedMotion:'reduce',locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];activePage=page;
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-21T03:00:00Z'));
  await page.addInitScript(seed,{visits:s.visits,absenceHours:s.absenceHours});
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname.endsWith('/community/config'))return route.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});
   if(url.origin!==base||url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});
   return route.continue();
  });
  await page.goto(base);
  await page.waitForFunction(expected=>JSON.parse(localStorage.getItem('@mentore/progress_v2')).visits.streak===expected,s.streak);
  await page.getByTestId('room-scene').waitFor();
  const calendar=await fit(page,'room-visit-calendar');
  await page.waitForFunction(expected=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).happiness?.value===expected,s.absenceHours===48?27:75);
  assert.match(await page.getByTestId('home-hygiene').getAttribute('aria-label'),/^清潔度50パーセント/);
  await page.getByTestId('home-hygiene').click();
  await page.getByRole('button',{name:'お部屋を掃除する',exact:true}).click();
  await page.getByRole('heading',{name:'お部屋のお掃除',exact:true}).waitFor();
  await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
  // Check collisions in the current camera position. Trial-clicking an existing
  // world hotspot can scroll the clipped scene in Chromium before any real tap.
  for(const prop of ['room-visit-calendar']){
   const a=await page.getByTestId(prop).boundingBox();
   for(const id of ['world-map-open','room-clean-open','room-record','room-bed']){
    const b=await page.getByTestId(id).boundingBox();
    assert.ok(a&&b&&(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y),prop+' clear of '+id+' '+JSON.stringify({a,b}));
   }
  }
  assert.equal(await page.getByTestId('room-clean-status').count(),0,'one cleanliness indicator');
  assert.ok((await calendar.boundingBox()).width>=52,'calendar remains readable');
  await page.screenshot({path:path.join(out,`keepsakes-home-${s.width}.png`)});
  await tap(page,'room-visit-calendar');
  assert.equal(await page.getByTestId('visit-streak-value').innerText(),'累計 '+(s.visits.totalVisits+1)+'日');
  assert.equal(await page.getByTestId('visit-current-form').getAttribute('aria-label'),'いまの姿は'+s.stage);
  await page.screenshot({path:path.join(out,`keepsakes-calendar-${s.width}.png`)});
  await tap(page,'room-mood-frame');
  assert.equal(await page.locator('[data-testid^="mood-bar-"]').count(),3);
  assert.equal(await page.getByTestId('mood-bar-2026-10-19').count(),0);
  if(s.width===390)await page.screenshot({path:path.join(out,'keepsakes-moods.png')});
  await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/progress_v2')));
  assert.equal(before.experience,980);assert.equal(before.streak,4);assert.equal(before.totalDays,28);
  await page.reload();await page.getByTestId('room-visit-calendar').waitFor();
  await tap(page,'room-visit-calendar');
  assert.equal(await page.getByTestId('visit-streak-value').innerText(),'累計 '+(s.visits.totalVisits+1)+'日');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/progress_v2')).visits),before.visits);
  await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
  if(s.width===390){
   await page.clock.setFixedTime(new Date('2026-10-21T13:00:00Z'));await page.reload();
   await fit(page,'room-visit-calendar');
   assert.match(await page.getByTestId('home-happiness').getAttribute('aria-label'),/^幸福度65パーセント/,'ten offline hours decay on reopening');
   await page.screenshot({path:path.join(out,'keepsakes-home-night.png')});
   await page.clock.setFixedTime(new Date('2026-10-22T03:00:00Z'));await page.reload();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/progress_v2')).visits.streak===11);
   await page.clock.setFixedTime(new Date('2026-10-24T03:00:00Z'));await page.reload();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/progress_v2')).visits.streak===1);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/progress_v2')).visits.stage),'stage3');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS room furniture, actual visit evolution, mood gaps, close/reopen and persistence '+s.width+'x'+s.height);
  await context.close();
 }
})().catch(async e=>{
 if(activePage&&!activePage.isClosed()){
  console.log('ROOM_GEOMETRY',await activePage.locator('[data-testid="world-stage"], [data-testid="room-scene"], [data-testid="room-visit-calendar"], [data-testid="room-mood-frame"]').evaluateAll(es=>es.map(e=>({id:e.dataset.testid,rect:e.getBoundingClientRect().toJSON(),transform:getComputedStyle(e).transform,scrollTop:e.scrollTop}))));
  await activePage.screenshot({path:path.join(out,'keepsakes-failure.png')}).catch(()=>{});
  fs.writeFileSync(path.join(out,'keepsakes-failure.txt'),await activePage.locator('body').innerText().catch(()=>''));
 }
 console.error(e);process.exitCode=1;
}).finally(async()=>{if(browser)await browser.close();server.close();});
