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
  '@mentore/feed_state_v1':{points:200,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100,happiness:{value:75,updatedOn:previous,updatedAt:last,lastSeenAt:last,days:{[previous]:['visit']}},hygiene:{lastBathAt:now,protectedUntil:0},housekeeping:{startedAt:now,updatedAt:now,owned:['broom'],cleaned:{},robotPlaced:false}},
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
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height,stage,days,motion] of [[320,568,'odango',3,'reduce'],[390,844,'stage3',11,'no-preference'],[820,1180,'stage4',31,'reduce'],[844,390,'stage3',11,'reduce']].filter(c=>!process.env.YOKI_QA_WIDTH||c[0]===Number(process.env.YOKI_QA_WIDTH))){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block'});
  const page=await context.newPage();activePage=page;const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(18000);
  await page.clock.setFixedTime(new Date('2026-10-21T03:00:00Z'));
  await page.addInitScript(seed,{visits:saved(days,stage,1)});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/community/config'))return route.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(url.origin!==base||url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});return route.continue();});
  await page.goto(base);await page.getByTestId('room-scene').waitFor();
  await tap(page,'home-view-toggle');await page.getByTestId('home-eye-level').waitFor();await fit(page,'home-view-toggle');
  await page.getByTestId('eye-feed').waitFor();assert.equal(await page.getByTestId('world-steering-frame').count(),0);
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points);
  await page.getByTestId('room-resident').press('Enter');
  await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:path.join(out,`eye-level-${width}.png`)});
  const resident=await page.getByTestId('room-resident').boundingBox();assert.ok(resident.width>100,'close resident');
  if(width===390){
   await tap(page,'eye-feed');await page.getByRole('button',{name:'きのみ、5ポイント、満腹度プラス15',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('[data-testid="room-resident"]')?.getAttribute('aria-label')?.includes('おやつの時間'));
   await page.getByText('ごちそうさま。また一緒に食べようね。',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),before-5);
  }
  await tap(page,'eye-rest');await page.waitForFunction(()=>document.querySelector('[data-testid="room-resident"]')?.getAttribute('aria-label')?.includes('ひと休みしています'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),width===390?before-5:before);
  await tap(page,'home-view-toggle');await page.getByTestId('home-eye-level').waitFor({state:'hidden'});await page.getByTestId('world-steering-frame').waitFor();
  await tap(page,'home-view-toggle');await page.getByTestId('home-eye-level').waitFor();
  await tap(page,'world-map-open');
  for(const id of ['forest','village','bank'])assert.equal(await page.getByTestId('world-map-'+id).count(),0);
  await page.getByTestId('world-map-onsen').click();await page.getByTestId('world-map-travel').click();await page.getByTestId('village-map').waitFor({state:'hidden'});await page.getByTestId('onsen-neighbors').waitFor();
  assert.equal(await page.getByTestId('home-view-toggle').count(),0);assert.equal(await page.getByTestId('home-eye-level').count(),0);
  await tap(page,'onsen-neighbors');await page.getByTestId('onsen-neighbor-kohaku').click();await page.getByTestId('village-dialogue').waitFor();
  assert.match(await page.getByTestId('village-dialogue').innerText(),/いい形の雲/);await page.getByRole('button',{name:'またね',exact:true}).click();
  await tap(page,'world-gate-home');await page.getByTestId('home-eye-level').waitFor();
  await tap(page,'room-clean-open');await page.getByTestId('room-use-broom').click();await page.getByTestId('room-clean-finish').waitFor();assert.equal(await page.getByTestId('home-eye-level').count(),0);
  await page.getByTestId('room-clean-finish').click();assert.deepEqual(errors,[]);
  console.log(`PASS ${width}x${height} ${stage}: perspective toggle, interaction, rest, retired maps, onsen conversations, return, cleaning`);await context.close();
 }
})().catch(async error=>{if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await activePage.locator('body').innerText());}console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
