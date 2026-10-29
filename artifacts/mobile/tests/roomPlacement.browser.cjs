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
 for(const [width,height]of(process.env.YOKI_QA_CASES?JSON.parse(process.env.YOKI_QA_CASES):[[390,844],[320,568],[844,390]])){
  const ctx=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce',serviceWorkers:'block'});page=await ctx.newPage();page.setDefaultTimeout(14000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-27T03:00:00Z')});await page.addInitScript(seed,{});
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  const tid=id=>page.getByTestId(id).filter({visible:true});
  const ready=async()=>{await tid('home-view-toggle').waitFor();await tid('plush-loading').waitFor({state:'hidden'});await page.clock.runFor(8500);await page.waitForTimeout(400);await page.addStyleTag({content:"@font-face{font-family:QAJP;src:url('/qa-jp.ttf')}body div:not([style*=YokiFeather]):not([style*=feather]),svg text,body button{font-family:QAJP,sans-serif!important}"});await page.evaluate(()=>document.fonts.ready);};
  const room=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/room_customization_v1')));
  const drag=async(target,dx,dy)=>{const b=await target.boundingBox(),x=b.x+b.width*.5,y=b.y+b.height*.5;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:18});await page.mouse.up();await page.waitForTimeout(400);};
  await page.goto(base);await ready();
  const wallet=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points);
  for(const [kind,id] of width===390?[['furniture','sofa'],['furniture','vanity'],['furniture','bookshelf'],['flower','pink'],['flower','violet'],['flower','rainbow']]:[['furniture','sofa'],['flower','violet']]){
   await page.evaluate(({kind,id})=>{const k='@mentore/room_customization_v1',r=JSON.parse(localStorage.getItem(k));r[kind]=id;localStorage.setItem(k,JSON.stringify(r));},{kind,id});await page.reload();await ready();
   const item=tid(`home-${kind}-${id}`),before=await item.boundingBox();await item.click();await tid('furnishing-editor').waitFor();assert.equal(await tid('furnishing-selection-ring').count(),1);
   const resident=await tid('resident-body').boundingBox();
   await drag(item,kind==='flower'?-65:55,width>height?8:-58);
   const after=await item.boundingBox();assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>15,'drag moves '+id+': '+JSON.stringify({before,after}));
   await page.waitForFunction(({kind,id})=>!!JSON.parse(localStorage.getItem('@mentore/room_customization_v1')).positions?.[`${kind}:${id}`],{kind,id});
   const saved=await room();assert.equal(saved.ownedFurniture.length,3);assert.equal(saved.ownedFlowers.length,3);
   assert.ok(!(await tid('furnishing-save-status').innerText()).includes('できません'));
   assert.deepEqual(await tid('resident-body').boundingBox(),resident,'furniture gestures do not move resident');
   const dock=await tid('home-action-dock').boundingBox();assert.ok(after.x>=10&&after.x+after.width<=width-10&&after.y+after.height<=dock.y+2,'item clears dock '+JSON.stringify({after,dock}));
   if((width===390&&['sofa','pink'].includes(id))||width>height)await page.screenshot({path:path.join(out,`move-${id}-${width}.png`)});
   await tid('furnishing-done').click();assert.equal(await tid('furnishing-editor').count(),0);
   await page.reload();await ready();const restored=await item.boundingBox();assert.ok(Math.abs(restored.x-after.x)<2&&Math.abs(restored.y-after.y)<2,'restores after reload '+JSON.stringify({after,restored}));
   if(width===390&&id==='pink')await page.screenshot({path:path.join(out,'arranged-room.png')});
   console.log('PASS tap, drag, save, reload',width,height,kind,id);
  }
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),wallet);
  if(width===390){
   const flower=tid('home-flower-rainbow');await flower.press('Enter');const before=(await room()).positions['flower:rainbow'].x;await flower.press('ArrowRight');await page.waitForTimeout(500);assert.ok((await room()).positions['flower:rainbow'].x>before,'keyboard moves flower');await flower.press('Escape');
   await flower.click();await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='@yoki/balance_journal_v1')throw Error('QA disk full');return window.originalSetItem.call(this,k,v);};});
   await drag(flower,-24,5);assert.match(await tid('furnishing-save-status').innerText(),/保存できません/);await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});await tid('furnishing-retry').click();await page.waitForTimeout(400);assert.doesNotMatch(await tid('furnishing-save-status').innerText(),/できません/);await tid('furnishing-done').click();
   const positions=(await room()).positions;await page.setViewportSize({width:844,height:390});await page.waitForTimeout(500);assert.deepEqual((await room()).positions,positions,'rotation never overwrites saved coordinates');await page.setViewportSize({width,height});await page.waitForTimeout(500);
   await tid('home-view-toggle').click();await tid('home-view-option-close').click();await page.waitForTimeout(600);const b=await flower.boundingBox();if(b.x>0&&b.x+b.width<width&&b.y>170&&b.y+b.height<740){await flower.click();await drag(flower,22,-15);await tid('furnishing-done').click();console.log('PASS zoomed dragging');}
   console.log('PASS keyboard, save failure/retry, rotation');
  }
  assert.deepEqual(errors,[]);await ctx.close();
 }
})().catch(async e=>{console.error(e);if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText().catch(()=>String(e)));}process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
