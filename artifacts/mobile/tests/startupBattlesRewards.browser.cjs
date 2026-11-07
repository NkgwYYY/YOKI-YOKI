'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),date='2026-11-07';
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg','.css':'text/css'};
const server=http.createServer((req,res)=>{
 const loc=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(loc!==root&&!loc.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const file=fs.existsSync(loc)&&fs.statSync(loc).isFile()?loc:path.join(root,'index.html');
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
function seed(moyamoya){
 if(localStorage.getItem('battle-rewards-qa'))return;
 const date='2026-11-07',now=Date.parse(date+'T03:00:00Z');
 const values={
  '@mentore/profile_v1':{nickname:'テスト',ageRange:'30代',gender:'回答しない'},
  '@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:1,totalDays:1,lastRecordDate:date},
  '@mentore/feed_state_v1':{points:200,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100},
  '@mentore/records_v2':[{id:'existing',date,mood:3,fatigue:1,worry:1,notes:'保存済みの日記',moyamoya}],
 };
 for(const[k,v]of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem('@yoki/first-steps/v1/guest','done');
 localStorage.setItem('@yoki/daily-letter/v1/guest/'+date,'seen');
 localStorage.setItem('@yoki/scenic-return/v1/guest/'+date,'home');
 localStorage.setItem('@yoki/daily-check-in/v1/guest/'+date,'seen');
 localStorage.setItem('battle-rewards-qa','yes');
}
let browser,page;
(async()=>{
 const {recordMoyamoya,battleChoices,battleScene}=await import('../utils/moyamoya.ts');
 const {MENTAL_HEALTH_SOURCES}=await import('../utils/moyamoyaSources.ts');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height]of [[390,844],[320,568]]){
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
  page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date(date+'T03:00:00Z'));
  const initial=recordMoyamoya(undefined,{has:true,pattern:'anger',memo:'言い方を練習'},'qa-anger-'+width);
  await page.addInitScript(seed,initial);
  await context.route('**/*',r=>{
   const u=new URL(r.request().url());
   if(u.pathname.endsWith('/community/config'))return r.fulfill({contentType:'application/json',body:JSON.stringify({enabled:true,ads:true,passSales:false,rewardPolicy:'daily10',bonusPoints:10,dailyLimit:3})});
   if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,contentType:'application/json',body:'{}'});
   return r.continue();
  });
  await page.goto(base);await page.getByTestId('moyamoya-fight').click();
  await page.getByTestId('battle-question').waitFor();
  assert.equal(await page.getByTestId('battle-question').innerText(),battleScene(initial.battle));
  await page.getByTestId('battle-sources-toggle').click();
  await page.getByTestId('battle-sources-panel').waitFor();
  assert.match(await page.getByTestId('battle-sources-panel').innerText(),/公開資料|監修|引用/);
  const sourceButtons=page.locator('[data-testid^="battle-source-"]');assert.ok(await sourceButtons.count()>0);
  for(const id of await sourceButtons.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-testid').replace('battle-source-',''))))assert.ok(MENTAL_HEALTH_SOURCES[id]?.url.startsWith('https://'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  await page.getByTestId('battle-sources-toggle').click();
  const readBattle=()=>page.evaluate(d=>JSON.parse(localStorage.getItem('@mentore/records_v2')).find(r=>r.date===d).moyamoya.battle,date);
  let current=await readBattle();const scenarioId=current.scenarioId;assert.ok(scenarioId);
  await page.reload();await page.getByTestId('battle-question').waitFor();
  assert.equal((await readBattle()).scenarioId,scenarioId);
  for(let turn=0;turn<2;turn++){
   current=await readBattle();const choice=battleChoices(current).find(c=>c.good);assert.ok(choice);
   await page.getByTestId('battle-choice-'+choice.id).click();await page.getByTestId('battle-feedback').waitFor();
   assert.match(await page.getByTestId('battle-feedback').innerText(),new RegExp(choice.feedback.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
   await page.getByTestId('battle-next').click();
  }
  await page.getByTestId('battle-result-home').waitFor();
  current=await readBattle();assert.equal(current.status,'won');assert.equal(current.awarded,10);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),210);
  await page.getByTestId('battle-result-home').click();await page.getByTestId('home-points').click();
  await page.getByTestId('points-reward-panel').waitFor();
  assert.match(await page.getByTestId('points-reward-availability').innerText(),/アプリ版/);
  assert.equal(await page.locator('[data-testid^="daily-ad-reward-"]').count(),0,'web never fabricates a rewarded SDK button');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  assert.deepEqual(errors,[]);
  await context.close();console.log(`PASS ${width}x${height}: sourced anger battle, saved scenario resume, victory +10 once, discoverable points panel, no fake web ad`);
 }
})().catch(async e=>{if(page&&!page.isClosed())console.error((await page.locator('body').innerText()).slice(0,3000));console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
