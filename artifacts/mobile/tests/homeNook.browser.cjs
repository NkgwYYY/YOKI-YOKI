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
 const context=await browser.newContext({viewport:process.env.YOKI_QA_VIEWPORT?JSON.parse(process.env.YOKI_QA_VIEWPORT):{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block'});
 page=await context.newPage();page.setDefaultTimeout(18000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.stack);});
 await page.clock.install({time:new Date('2026-10-27T03:00:00Z')});await page.addInitScript(seed,{});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
 const tid=id=>page.getByTestId(id).filter({visible:true});
 const ready=async()=>{await tid('home-view-toggle').waitFor();await tid('plush-loading').waitFor({state:'hidden'});};
 const point=()=>tid('room-resident').evaluate(el=>{const stage=el.closest('[data-testid="world-stage"]'),s=getComputedStyle(el),m=new DOMMatrix(s.transform),size=parseFloat(s.width);return {x:(m.e+size/2)/parseFloat(getComputedStyle(stage).width),y:(m.f+size*.92)/parseFloat(getComputedStyle(stage).height),label:el.getAttribute('aria-label')};});
 const select=async mode=>{await tid('home-view-toggle').click();await tid('home-view-option-'+mode).click();await page.waitForTimeout(1400);await ready();};
 await page.goto(base);await ready();
 await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body button{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.getByRole('button',{name:/階段.*(登る|上る|のぼる)/}).count(),0,'no obsolete staircase button');
 await tid('room-bed').click();const route=[];
 for(let i=0;i<50;i++){await page.clock.runFor(400);route.push(await point());if(route.at(-1).label.includes('ひと休み'))break;}
 const bed=route.at(-1);assert.ok(bed.label.includes('ひと休み')&&Math.abs(bed.x-.76)<.02&&Math.abs(bed.y-.37)<.02,'rests on the single-floor bed '+JSON.stringify(bed));
 assert.ok(route.every(p=>!/[12]階|階段/.test(p.label)&&p.y>=.36),'no invisible upstairs route');
 assert.ok(route.some(p=>p.x>.60&&p.y>.43&&p.y<.48),'approaches the foot of the bed');
 await page.screenshot({path:path.join(out,'nook-bed.png')});
 await select('eye');assert.ok((await tid('home-camera-art').locator('img').getAttribute('src')).includes('nook-eye'));
 await select('close');await page.screenshot({path:path.join(out,'nook-close-bed.png')});await select('overview');
 async function carry(target){
  const before=await point(),stage=await tid('world-stage').boundingBox(),b=await tid('room-resident').boundingBox();
  const from={x:b.x+b.width/2,y:b.y+b.height/2};
  await page.mouse.move(from.x,from.y);await page.mouse.down();await page.waitForTimeout(350);
  await page.mouse.move(from.x+(target.x-before.x)*stage.width,from.y+(target.y-before.y)*stage.height,{steps:20});await page.mouse.up();await page.waitForTimeout(500);
  return point();
 }
 const rug=await carry({x:.52,y:.71});assert.ok(Math.abs(rug.y-.71)<.02,'carried back to rug');
 const wall=await carry({x:.43,y:.265});assert.ok(wall.y>.40,'old upstairs drop settles on the new floor '+JSON.stringify(wall));
 await page.waitForTimeout(900);const still=await point();assert.ok(still.y>.40,'drop cancels obsolete bed command');
 await carry({x:.52,y:.71});await select('eye');await select('close');await page.reload();await ready();await page.waitForTimeout(1000);
 const closeDrop=await carry({x:.59,y:.73});assert.ok(Math.abs(closeDrop.x-.59)<.018,'close-view reload preserves drag scale '+JSON.stringify(closeDrop));
 await select('overview');await carry({x:.52,y:.71});
 await tid('room-visit-calendar').click();await page.getByRole('heading',{name:'カレンダー',exact:true}).waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();
 await page.reload();await ready();let automatic=false;
 for(let i=0;i<60;i++){await page.clock.runFor(1000);const p=await point();if(Math.abs(p.y-.71)>.04){automatic=true;break;}}
 assert.ok(automatic,'autonomous exploration follows the new single floor');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'nook-route.json'),JSON.stringify(route,null,2));
 console.log('PASS: single-floor bed route, all views, carry and old-floor drops, saved zoom, calendar and autonomous walking');await context.close();
})().catch(async e=>{console.error(e);if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText().catch(()=>String(e)));}process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
