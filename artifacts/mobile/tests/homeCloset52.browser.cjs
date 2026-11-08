'use strict';
// Visual integration of the cabinet with the existing room; no live purchases.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{const loc=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(loc!==root&&!loc.startsWith(root+path.sep)){res.writeHead(403).end();return;}const file=fs.existsSync(loc)&&fs.statSync(loc).isFile()?loc:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
function seed({period,hidden}){
 if(localStorage.getItem('closet52-qa'))return;
 const date='2026-11-08',now=Date.parse(date+(period==='day'?'T03:00:00Z':'T12:00:00Z'));
 const values={
 '@mentore/profile_v1':{nickname:'確認用',ageRange:'回答しない',gender:'回答しない'},
 '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:4,totalDays:4,lastRecordDate:date,visits:{version:1,lastDate:date,streak:4,bestStreak:4,totalVisits:4,stage:'odango',highestStage:'odango',dates:[date]}},
 '@mentore/records_v2':[{id:'qa',date,mood:3,fatigue:1,worry:1,notes:'保存済みの日記',moyamoya:{has:false}}],
 '@mentore/room_customization_v1':{furniture:'none',flower:'none',ownedFurniture:[],ownedFlowers:[],starterFurnishings:hidden?{[hidden]:{placed:false,updatedAt:now}}:{}},
 '@mentore/feed_state_v1':{points:92,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100,wardrobe:{version:1,owned:['panda'],equipped:'panda',changedAt:100}}};
 for(const[k,v]of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem('@yoki/first-steps/v1/guest','done');for(const kind of ['daily-letter','scenic-return','daily-check-in'])localStorage.setItem('@yoki/'+kind+'/v1/guest/'+date,kind==='scenic-return'?'home':'seen');localStorage.setItem('closet52-qa','yes');
}
let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 for(const [width,height,period,hidden] of [[390,844,'day'],[390,844,'night'],[320,568,'day'],[844,390,'night'],[390,844,'day','bookcase'],[390,844,'night','lounge']]){
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-08'+(period==='day'?'T03:00:00Z':'T12:00:00Z')));await page.addInitScript(seed,{period,hidden});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/community/config'))return r.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  const tid=id=>page.getByTestId(id).filter({visible:true});
  const ready=async()=>{await tid('home-wardrobe').waitFor();await tid('plush-loading').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);};
  console.log('Checking',width,height,period,hidden||'furnished');await page.goto(base);await ready();
  for(const mode of hidden?['overview']:['overview','eye','close']){
   if(mode!=='overview'){await tid('home-more-menu').click();await tid('home-menu-settings').click();await tid('home-view-toggle').click();await tid('home-view-option-'+mode).click();await page.waitForFunction(mode=>localStorage.getItem('@mentore/home-view/v1/guest')===mode,mode);await tid('home-view-option-'+mode).waitFor({state:'hidden'});await page.waitForFunction(()=>!document.querySelector('[data-testid="home-camera-outgoing"]'));await ready();}
   assert.equal(await tid('home-closet-interior').count(),hidden==='bookcase'?0:1);
   if(hidden!=='bookcase')assert.ok((await tid('home-closet-interior').locator('image').getAttribute('href')).includes('closet-interior-'+period));
   const target=await tid('home-wardrobe').boundingBox();assert.ok(target.x>=0&&target.x+target.width<=width&&target.y>=0&&target.y+44<=height,'wardrobe label is on screen');
   assert.ok(await tid('home-wardrobe').evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+22));}),'visible label receives touches');
   if(mode==='overview'){const cal=await tid('room-visit-calendar').boundingBox();assert.ok(target.x+target.width<=cal.x||cal.x+cal.width<=target.x||target.y+44<=cal.y||cal.y+cal.height<=target.y,'calendar and wardrobe label do not overlap');}
   await page.screenshot({path:path.join(out,`${width}-${period}-${mode}-${hidden||'furnished'}.png`)});
   await tid('home-wardrobe').click({position:{x:target.width/2,y:22}});await page.getByTestId('wardrobe-back').waitFor();await page.getByTestId('wardrobe-back').click();await ready();
  }
  assert.deepEqual(errors,[]);results.push({width,height,period,hidden:hidden||null,passed:true});console.log('PASS',results.at(-1));await context.close();
 }
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,results},null,2));
})().catch(async e=>{console.error(e);if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
