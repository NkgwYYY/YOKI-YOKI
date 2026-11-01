'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
 const loc=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(loc!==root&&!loc.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const file=fs.existsSync(loc)&&fs.statSync(loc).isFile()?loc:path.join(root,'index.html');
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
function seed({tokenKey}){
 const now=Date.parse('2026-11-01T03:00:00Z');
 const values={
  '@mentore/profile_v1':{nickname:'プレビュー',ageRange:'回答しない',gender:'回答しない'},
  '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-10-28'},{charKey:'odango',metDate:'2026-10-30'}]},
  '@mentore/progress_v2':{level:7,experience:400,mentalMuscle:12,streak:4,totalDays:4,lastRecordDate:'2026-11-01',visits:{version:1,lastDate:'2026-11-01',streak:4,bestStreak:4,totalVisits:4,stage:'odango',highestStage:'odango',dates:['2026-10-29','2026-10-30','2026-10-31','2026-11-01']}},
  '@mentore/records_v2':[{date:'2026-11-01',mood:4,sleep:7,sleepRecorded:true,behaviors:[],activities:{},notes:'',win:'',exercise:0}],
  '@mentore/feed_state_v1':{points:200,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100,happiness:{value:75,updatedOn:'2026-11-01',updatedAt:now,lastSeenAt:now,days:{'2026-11-01':['visit']}},hygiene:{lastBathAt:now,protectedUntil:0},housekeeping:{startedAt:now,updatedAt:now,owned:['broom'],cleaned:{},robotPlaced:false}},
 };
 for(const[k,v]of Object.entries(values))if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem(tokenKey,'qa-existing-community-device');
}
let browser,activePage;
(async()=>{
 const {homeArtPoint}=await import('../utils/homeGeometry.ts');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference',locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block',recordVideo:{dir:out,size:{width:390,height:844}}});
 const videoStart=Date.now();const page=await context.newPage();activePage=page;page.setDefaultTimeout(20000);const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-11-01T03:00:00Z'));
 await page.addInitScript(seed,{tokenKey:'yoki.community.'+crypto.createHash('sha256').update('guest').digest('hex').slice(0,24)});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname.includes('/community/'))requests.push({path:url.pathname,method:route.request().method()});
  if(url.pathname.endsWith('/community/config'))return route.fulfill({contentType:'application/json',body:JSON.stringify({enabled:true,ads:false,passSales:false,dailyLimit:3,bonusPoints:5})});
  if(url.origin!==base||url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});
  return route.continue();
 });
 for(const url of ['/friends','/friend-home?id=example-friend']){
  await page.goto(base+url);await page.getByTestId('friends-coming-soon').waitFor();
  assert.equal(await page.getByTestId('friend-invite-code').count(),0);
  assert.equal(await page.getByTestId('friend-home-scene').count(),0);
  assert.equal(await page.getByText('友だち機能をはじめる',{exact:true}).count(),0);
  assert.ok((await page.locator('body').innerText()).includes('有料オプション'));
  await page.waitForTimeout(1800);
 }
 assert.equal(requests.filter(r=>/\/community\/(me|home|homes|friends|invite)(\/|$)/.test(r.path)).length,0,'unreleased routes and background home sync cannot access visit APIs');
 await page.screenshot({path:path.join(out,'friends-coming-soon.png')});
 await page.goto(base);await page.getByTestId('room-resident').waitFor();await page.getByTestId('plush-loading').waitFor({state:'hidden'});await page.waitForTimeout(1600);
 const letter=page.getByRole('button',{name:'よっきーに会いに行く',exact:true});if(await letter.isVisible())await letter.click();
 await page.getByTestId('home-more-menu').click();await page.getByTestId('home-menu-friends').waitFor();
 assert.match(await page.getByTestId('home-menu-friends').innerText(),/準備中・有料予定/);
 await page.getByTestId('home-menu-friends').click();await page.getByTestId('friends-coming-soon').waitFor();
 await page.getByRole('button',{name:'おうちへ戻る',exact:true}).click();await page.getByTestId('room-resident').waitFor();await page.waitForTimeout(1200);
 const motionStart=Date.now();
 const capture=()=>page.evaluate(()=>new Promise(resolve=>{
  const frames=[],start=performance.now();
  const sample=()=>{const b=document.querySelector('[data-testid="resident-body"]'),r=document.querySelector('[data-testid="room-resident"]'),s=document.querySelector('[data-testid="resident-contact-shadow"]');
   const m=new DOMMatrix(getComputedStyle(b).transform),root=new DOMMatrix(getComputedStyle(r).transform),sh=getComputedStyle(s);
   frames.push({t:performance.now()-start,x:root.e,y:root.f,sx:Math.hypot(m.a,m.b),sy:Math.hypot(m.c,m.d),angle:Math.atan2(m.b,m.a),lift:m.f,shadow:Number(sh.opacity)});
   if(performance.now()-start<1900)requestAnimationFrame(sample);else resolve(frames);
  };requestAnimationFrame(sample);
 }));
 const paths=[['left',{x:.29,y:.70}],['right',{x:.72,y:.70}],['up',{x:.60,y:.51}],['down',{x:.60,y:.79}]];
 const captures=[];
 for(const [direction,point] of paths){
  const box=await page.getByTestId('world-ground').boundingBox(),pos=homeArtPoint(point,false);
  const recording=capture();await page.mouse.click(box.x+pos.x*box.width,box.y+pos.y*box.height);const frames=await recording;
  const travel=frames.filter((f,i)=>i&&Math.hypot(f.x-frames[i-1].x,f.y-frames[i-1].y)>.05);
  fs.writeFileSync(path.join(out,'motion-'+direction+'.json'),JSON.stringify(frames));
  const span=(key,rows=travel)=>Math.max(...rows.map(f=>f[key]))-Math.min(...rows.map(f=>f[key]));
  assert.ok(travel.length>8,direction+' has continuous intermediate positions, got '+travel.length);
  assert.ok(span('sy')>.035,direction+' has visible whole-body compression');
  assert.ok(span('lift')>2,direction+' has a push and hop');
  assert.ok(span('angle')>.045,direction+' rocks rather than sliding');
  assert.ok(span('shadow')>.06,direction+' shadow responds to ground contact');
  captures.push({direction,frames:travel.length,compression:span('sy'),lift:span('lift')});
  await page.waitForTimeout(1700);
 }
 const motionEnd=Date.now();await page.screenshot({path:path.join(out,'motion-home.png')});
 await page.getByTestId('home-more-menu').click();const paused=await capture();
 assert.ok(Math.max(...paused.map(f=>f.sy))-Math.min(...paused.map(f=>f.sy))<.005,'modal pauses the body');
 await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(350);
 const reduced=await capture();
 fs.writeFileSync(path.join(out,'reduced.json'),JSON.stringify(reduced));
 assert.ok(Math.max(...reduced.map(f=>f.sy))-Math.min(...reduced.map(f=>f.sy))<.005,'reduced-motion mode is still');
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,captures,videoStart,motionStart,motionEnd,requests,errors},null,2));
 await context.close();console.log(JSON.stringify({passed:true,captures,checks:['friends-menu','direct-link-gate','no-visit-API','four-directions','compression','hop','contact-shadow','modal-pause','reduced-motion']}));
})().catch(async e=>{if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await activePage.locator('body').innerText());}console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
