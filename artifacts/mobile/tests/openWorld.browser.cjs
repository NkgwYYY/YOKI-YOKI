'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
 if(req.url==='/__qa_japanese.ttf'&&process.env.YOKI_QA_FONT){res.setHeader('Content-Type','font/ttf');fs.createReadStream(process.env.YOKI_QA_FONT).pipe(res);return;}
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
  '@mentore/feed_state_v1':{points:200,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100,happiness:{value:75,updatedOn:previous,updatedAt:last,lastSeenAt:last,days:{[previous]:['visit']}},hygiene:{lastBathAt:now-3*86400000,protectedUntil:0},housekeeping:{startedAt:now,updatedAt:now,owned:['broom'],cleaned:{},robotPlaced:false}},
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
  return r&&e.getAttribute('aria-disabled')!=='true'&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
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
 for(const [width,height] of [[390,844],[1363,936],[844,390],[320,568]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:width===320?'reduce':'no-preference',locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block'});
  const page=await context.newPage();activePage=page;const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(18000);
  await page.clock.setFixedTime(new Date('2026-10-21T03:00:00Z'));
  await page.addInitScript(seed,{visits:saved(4,'odango',1)});
  await page.addInitScript(()=>{const key='@mentore/progress_v2',p=JSON.parse(localStorage.getItem(key));p.level=1;p.experience=0;localStorage.setItem(key,JSON.stringify(p));});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/community/config'))return route.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(url.origin!==base||url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});return route.continue();});
  await page.goto(base);await page.getByTestId('room-scene').waitFor();await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
  if(process.env.YOKI_QA_FONT){await page.addStyleTag({content:'@font-face{font-family:QAJP;src:url(/__qa_japanese.ttf)} [dir="auto"]:not([style*="font-family"]) {font-family:QAJP,sans-serif!important}'});await page.evaluate(()=>document.fonts.ready);}
  await fit(page,'room-meal');assert.equal(await page.getByTestId('world-go-work').count(),0,'home has no duplicate job shortcut');
  await page.getByRole('button',{name:'景色の見かた',exact:true}).click();
  assert.equal(await page.locator('[data-testid^="world-travel-"]').count(),0,'no preset walk buttons');
  assert.equal(await page.getByTestId('home-eye-level-switch').count(),0,'no second view toggle');
  await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
  await tap(page,'world-map-open');await page.getByTestId('village-map').waitFor();
  const ids=['onsen','lake','homewares','market','ramen','fortune','workshop','bowling','home','tobacco'];
  const boxes=[];
  for(const id of ids){
   const e=page.getByTestId('world-map-'+id);await e.scrollIntoViewIfNeeded();
   const b=await e.boundingBox(),m=await page.getByTestId('village-map').boundingBox();
   assert.ok(b.width>=44&&b.height>=44,id+' touch size');
   assert.ok(b.x>=m.x&&b.y>=m.y&&b.x+b.width<=m.x+m.width+1&&b.y+b.height<=m.y+m.height+1,id+' inside map');
   boxes.push(await e.evaluate((el,id)=>{const b=el.getBoundingClientRect(),m=document.querySelector('[data-testid="village-map"]').getBoundingClientRect();return {id,x:b.x-m.x,y:b.y-m.y,w:b.width,h:b.height};},id));
   assert.ok(await e.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+20));}),id+' not obscured');
  }
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x+1||b.x+b.w<=a.x+1||a.y+a.h<=b.y+1||b.y+b.h<=a.y+1,a.id+' and '+b.id+' do not overlap '+JSON.stringify([a,b]));
  }
  for(const id of ['bank','forest','village','grandma'])assert.equal(await page.getByTestId('world-map-'+id).count(),0);
  assert.equal(await page.getByTestId('world-map-home-now').count(),0,'no return-home action while already home');
  await page.getByTestId('world-map-home').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'map-'+width+'.png')});
  await page.getByTestId('world-map-lake').click();await page.getByTestId('world-map-story-guide').waitFor();await fit(page,'world-map-travel');
  await page.screenshot({path:path.join(out,'map-locked-'+width+'.png')});
  await page.getByTestId('world-map-market').click();await tap(page,'world-map-travel');await page.getByTestId('world-gate-home').waitFor();
  await tap(page,'world-map-open');await page.getByTestId('world-map-home-now').waitFor();await tap(page,'world-map-home-now');await page.getByTestId('room-meal').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  if(width===390){
   await page.goto(base+'/character-preview');await page.getByTestId('resident-volume-odango').waitFor();
   await page.waitForFunction(()=>document.querySelector('[data-testid="resident-volume-odango"] canvas')?.dataset.coat==='original');
   if(process.env.YOKI_QA_FONT){await page.addStyleTag({content:'@font-face{font-family:QAJP;src:url(/__qa_japanese.ttf)} [dir="auto"]:not([style*="font-family"]) {font-family:QAJP,sans-serif!important}'});await page.evaluate(()=>document.fonts.ready);}
   for(const [name,label] of [['front','正面'],['quarter','ななめ'],['side','横'],['back','後ろ']]){
    await page.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(500);
    await page.screenshot({path:path.join(out,'mofumofu-'+name+'.png')});
    assert.equal(await page.getByTestId('resident-volume-odango-fallback').count(),0);
   }
   console.log('RENDER_MS '+await page.getByTestId('resident-volume-odango').locator('canvas').getAttribute('data-render-ms'));
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${width}x${height}: centred visible map, no overlapping targets, locked story guide, real travel/home, simplified controls, no page errors`);
  await context.close();
 }
})().catch(async error=>{if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await activePage.locator('body').innerText());}console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
