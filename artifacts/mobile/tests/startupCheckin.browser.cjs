'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),date='2026-11-06';
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg','.css':'text/css'};
const server=http.createServer((req,res)=>{const loc=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(loc!==root&&!loc.startsWith(root+path.sep)){res.writeHead(403).end();return;}const file=fs.existsSync(loc)&&fs.statSync(loc).isFile()?loc:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
function seed(mode){
 if(localStorage.getItem('startup-checkin-qa'))return;
 const date='2026-11-06',now=Date.parse(date+'T03:00:00Z');
 const record={id:'existing',date,mood:3,sleep:7,sleepRecorded:true,notes:'保存済みの日記',behaviors:['散歩']};
 if(mode==='complete')Object.assign(record,{fatigue:1,worry:1,moyamoya:{has:false}});
 const values={
  '@mentore/profile_v1':{nickname:'テスト',ageRange:'回答しない',gender:'回答しない'},
  '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:1,totalDays:1,lastRecordDate:date},
  '@mentore/feed_state_v1':{points:200,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100},
  '@mentore/records_v2':mode==='empty'?[]:[record],
 };
 for(const[k,v]of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem('@yoki/first-steps/v1/guest','done');
 localStorage.setItem('@yoki/daily-letter/v1/guest/'+date,'seen');
 localStorage.setItem('@yoki/scenic-return/v1/guest/'+date,'home');
 localStorage.setItem('startup-checkin-qa','yes');
}
let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 async function open(mode,width=390,height=844){
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
  page=await context.newPage();page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date(date+'T03:00:00Z'));await page.addInitScript(seed,mode);
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/community/config'))return r.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
  await page.goto(base);return {context,errors};
 }
 async function homeWithoutPrompt(){
  await page.getByRole('button',{name:'部屋のメニュー',exact:true}).waitFor();
  await page.waitForFunction(d=>localStorage.getItem('@yoki/daily-check-in/v1/guest/'+d)==='seen',date);
  assert.equal(await page.getByTestId('check-in-screen').count(),0);
  assert.equal(await page.getByRole('heading',{name:'今日の便り',exact:true}).count(),0);
 }
 for(const [width,height,has]of [[390,844,true],[320,568,false]]){
  const {context,errors}=await open('mood-only',width,height);
  await page.getByTestId('check-in-screen').waitFor();
  await page.getByTestId('check-in-mood-4').click();await page.getByTestId('check-in-next').click();
  await page.getByTestId('check-in-fatigue-2').click();await page.getByTestId('check-in-next').click();
  await page.getByTestId('check-in-worry-3').click();await page.getByTestId('check-in-next').click();
  await page.getByTestId(has?'moyamoya-yes':'moyamoya-no').click();
  if(has)await page.getByTestId('moyamoya-pattern-loop').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  await page.getByTestId('check-in-next').click();
  if(has){await page.getByTestId('moyamoya-encounter').waitFor();await page.getByTestId('moyamoya-decline').click();await page.getByTestId('moyamoya-encounter').waitFor({state:'hidden'});}
  await homeWithoutPrompt();
  const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/records_v2'))),record=records.find(r=>r.date===date);
  assert.equal(records.length,1);assert.equal(record.mood,4);assert.equal(record.fatigue,2);assert.equal(record.worry,3);assert.equal(record.moyamoya.has,has);assert.equal(record.notes,'保存済みの日記');assert.equal(record.sleep,7);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),200);
  await page.reload();await homeWithoutPrompt();
  await page.getByRole('button',{name:'部屋のメニュー',exact:true}).click();await page.getByTestId('home-menu-settings').click();await page.getByRole('button',{name:'今日の便り',exact:true}).click();
  assert.equal(await page.getByTestId('quick-mood-3').count(),0);
  await page.getByTestId('daily-letter-check-in').click();await page.getByTestId('check-in-screen').waitFor();
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}x${height}: automatic four-step entry, save, home/battle, preserved diary/points, no repeated prompt, manual entry`);
 }
 {
  const {context,errors}=await open('empty');await page.getByTestId('check-in-skip').click();await homeWithoutPrompt();await page.reload();await homeWithoutPrompt();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/records_v2'))),[]);assert.deepEqual(errors,[]);await context.close();console.log('PASS skip: no invented record and no repeated prompt');
 }
 {
  const {context,errors}=await open('complete');await homeWithoutPrompt();assert.deepEqual(errors,[]);await context.close();console.log('PASS completed record: no automatic entry');
 }
})().catch(async e=>{if(page&&!page.isClosed())console.error((await page.locator('body').innerText()).slice(0,2500));console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
