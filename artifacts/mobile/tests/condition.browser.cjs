'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{const loc=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(loc!==root&&!loc.startsWith(root+path.sep)){res.writeHead(403).end();return;}const file=fs.existsSync(loc)&&fs.statSync(loc).isFile()?loc:path.join(root,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
function seed(){
 const values={
  '@mentore/profile_v1':{nickname:'プレビュー',ageRange:'回答しない',gender:'回答しない'},
  '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:1,totalDays:1,lastRecordDate:'2026-11-01'},
  '@mentore/records_v2':[{id:'r1',date:'2026-11-01',mood:3,sleep:7,sleepRecorded:true,notes:'保持する日記',behaviors:['外に出た'],meal:3,activities:{walk:1}},...Array.from({length:12},(_,i)=>({id:'past'+i,date:'2026-10-'+String(i+15).padStart(2,'0'),mood:i%5+1,sleep:0,sleepRecorded:false,notes:'',behaviors:[]}))],
  '@mentore/feed_state_v1':{points:200,lastFeedTime:'2026-11-01T03:00:00Z',satietyAtFeed:100},
 };
 for(const[k,v]of Object.entries(values))if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify(v));
}
let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox']});const results=[];
 for(const width of [390,320,768]){
  const context=await browser.newContext({viewport:{width,height:width===768?1024:844},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-11-01T03:00:00Z'));await page.addInitScript(seed);
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname.endsWith('/community/config'))return route.fulfill({contentType:'application/json',body:'{"enabled":true,"ads":false,"passSales":false}'});if(u.origin!==base||u.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});return route.continue();});
  await page.goto(base+'/condition');await page.getByTestId('condition-edit').waitFor();await page.getByTestId('plush-loading').waitFor({state:'hidden'});await page.getByTestId('condition-edit').click();
  await page.getByTestId('condition-mood-4').click();await page.getByTestId('condition-fatigue-3').click();await page.getByTestId('condition-worry-1').click();
  await page.screenshot({path:path.join(out,`editor-${width}.png`)});
  await page.getByTestId('condition-save').click();await page.getByTestId('condition-save').waitFor({state:'hidden'});
  assert.equal(await page.getByTestId('condition-current-mood').innerText(),'いい感じ');assert.equal(await page.getByTestId('condition-current-fatigue').innerText(),'強い');assert.equal(await page.getByTestId('condition-current-worry').innerText(),'ない');
  const r=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/records_v2')).find(r=>r.date==='2026-11-01'));
  assert.equal(r.notes,'保持する日記');assert.equal(r.sleep,7);assert.equal(r.meal,3);assert.deepEqual(r.activities,{walk:1});
  assert.equal((await page.getByTestId('condition-summary').innerText()).includes('よいところ　気分・心配ごと'),true);
  await page.screenshot({path:path.join(out,`condition-${width}.png`)});
  await page.getByTestId('condition-period-30').click();assert.equal(await page.getByTestId('condition-record-count').innerText(),'13日分の記録');
  await page.getByTestId('condition-chart-worry').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`trends-${width}.png`)});
  await page.getByRole('button',{name:'前の日の記録',exact:true}).click();
  for(const key of ['mood','fatigue','worry'])assert.match(await page.getByTestId('condition-selected-'+key).innerText(),/10\/31：未記録/);
  await page.getByTestId('condition-history').click();assert.ok((await page.locator('body').innerText()).includes('からだの疲れ：未記録'));await page.getByRole('button',{name:'閉じる',exact:true}).click();
  await page.getByTestId('condition-edit').click();await page.getByTestId('condition-worry-skip').click();await page.getByTestId('condition-save').click();await page.getByTestId('condition-save').waitFor({state:'hidden'});
  await page.reload();await page.getByTestId('condition-edit').waitFor();await page.getByTestId('plush-loading').waitFor({state:'hidden'});assert.equal(await page.getByTestId('condition-current-fatigue').innerText(),'強い');assert.equal(await page.getByTestId('condition-current-worry').innerText(),'未記録');
  await page.getByTestId('condition-menu').click();await page.getByTestId('home-dashboard-menu').waitFor();
  await page.screenshot({path:path.join(out,`menu-${width}.png`)});
  await page.getByTestId('home-menu-friends').click();await page.getByTestId('friends-coming-soon').waitFor();
  assert.equal(await page.getByTestId('friend-invite-code').count(),0);
  assert.deepEqual(errors,[]);results.push({width,passed:true,errors});await context.close();
 }
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify({passed:true,results}));
 await browser.close();server.close();
})().catch(async e=>{console.error(e);await browser?.close();server.close();process.exitCode=1;});
