'use strict';
// UI behavior and data preservation. Uses isolated, fictional local records.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{const loc=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(loc!==root&&!loc.startsWith(root+'/'))return res.writeHead(403).end();const f=fs.existsSync(loc)&&fs.statSync(loc).isFile()?loc:root+'/index.html';res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
function seed(mode){
 if(localStorage.getItem('record56-seeded'))return;
 const today='2026-11-08'; const rows=[];
 for(let i=0;i<30;i++){if([1,9,10,17,25].includes(i))continue;let d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-i);const date=d.toISOString().slice(0,10);rows.push({id:'sample-'+i,date,mood:[4,3,4,2,3,5,4][i%7],fatigue:[1,2,1,3,2,1,2][i%7],worry:[2,1,1,3,2,1,1][i%7],sleep:i===3?0:[7.5,6,8,5,6.5,8,7][i%7],sleepRecorded:i!==4,exercise:i%3+1,meal:3-i%3,social:i%3+1,dayType:i%3===0?'rest':'work',behaviors:i%2===0?['散歩','友人と会った']:['読書した','ひとりで休んだ'],behaviorsRecorded:i!==4,notes:'ゆっくり散歩をして、友人と話した。自分のペースで過ごせた日。',win:'外の空気を吸えた',moyamoya:i%4?{has:false}:{has:true,pattern:'loop',memo:'明日の予定が少し気になった。'}});}
 localStorage.setItem('record56-seeded','yes');
 const values={'@mentore/profile_v1':{nickname:'確認用',ageRange:'回答しない',gender:'回答しない'},'@mentore/records_v2':mode==='empty'?[]:rows,'@mentore/progress_v2':{level:1,experience:0,mentalMuscle:0,streak:4,totalDays:30,lastRecordDate:today},'@mentore/feed_state_v1':{points:200,lastFeedTime:today+'T12:00:00Z',satietyAtFeed:100}};
 for(const[k,v]of Object.entries(values))localStorage.setItem(k,JSON.stringify(v));
 localStorage.setItem('@yoki/first-steps/v1/guest','done');for(const k of ['daily-letter','daily-check-in','scenic-return'])localStorage.setItem('@yoki/'+k+'/v1/guest/'+today,k==='scenic-return'?'home':'seen');
}
let browser,page;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[];
 for(const [width,height,mode]of [[390,844,'full'],[320,568,'full'],[768,1024,'full'],[390,844,'empty']]){
  const context=await browser.newContext({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-08T12:00:00Z'));await page.addInitScript(seed,mode);
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/community/config'))return r.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(u.origin!==base||u.pathname.startsWith('/api/'))return r.fulfill({status:503,body:'{}'});return r.continue()});
  await page.goto(base+'/condition');await page.getByTestId('condition-summary').waitFor();await page.getByTestId('plush-loading').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);
  const capture=async name=>{await page.screenshot({path:path.join(out,name+'-'+mode+'-'+width+'.png')});};
  const checkWidth=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,'no horizontal overflow');
  const close=()=>page.getByRole('button',{name:'閉じる',exact:true}).click();
  const read=()=>page.evaluate(()=>({records:localStorage.getItem('@mentore/records_v2'),points:JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points}));
  const before=await read();
  const scrollHeight=await page.getByTestId('record-overview-scroll').evaluate(el=>el.scrollHeight);
  assert.ok(scrollHeight<1150,'overview stays short instead of stacking all graphs: '+scrollHeight);
  assert.equal(await page.locator('[data-testid^="condition-chart-"]').count(),1,'one focused graph');
  await checkWidth();await capture('overview');
  if(mode==='empty'){
   for(const key of ['mood','fatigue','worry'])assert.equal(await page.getByTestId('condition-current-'+key).innerText(),'未記録');
   await page.getByText('まだ、この項目の記録はありません',{exact:true}).waitFor();
   await page.getByTestId('record-life-open').click();assert.equal(await page.getByTestId('life-selected-sleep').innerText(),'未記録');await page.getByTestId('life-tab-activities').click();await page.getByText('この期間の回答は、まだありません',{exact:true}).waitFor();await close();
   assert.deepEqual(await read(),before);results.push({width,mode,scrollHeight,passed:true});await context.close();continue;
  }
  assert.equal(await page.getByTestId('condition-current-mood').innerText(),'いい感じ');
  assert.equal(await page.getByTestId('condition-current-fatigue').innerText(),'ない');
  assert.equal(await page.getByTestId('condition-current-worry').innerText(),'少しある');
  if(width===390){const card=await page.getByTestId('record-focus-card').boundingBox();assert.ok(card.y+card.height<height-70,'main graph visible above the dock');}
  for(const [key,value]of [['fatigue','ない'],['worry','少しある'],['moyamoya','ある'],['mood','いい感じ']]){await page.getByTestId('record-metric-'+key).click();assert.equal(await page.getByTestId((key==='moyamoya'?'life':'condition')+'-selected-'+key).innerText(),value);}
  await page.getByRole('button',{name:'前の日の記録',exact:true}).click();assert.equal(await page.getByTestId('condition-selected-mood').innerText(),'未記録');await page.getByTestId('record-selected-day').click();await page.getByTestId('record-day-details').getByText('この日の記録はありません。',{exact:false}).waitFor();await close();
  await page.getByTestId('condition-period-30').click();assert.equal(await page.getByTestId('condition-record-count').innerText(),'25日分');
  await page.getByTestId('condition-history').click();await page.getByTestId('record-calendar').waitFor();await capture('calendar');await page.getByTestId('record-calendar-2026-11-05').click();assert.equal(await page.getByTestId('day-detail-sleep').innerText(),'0時間');assert.equal(await page.getByTestId('record-day-edit').count(),0);await capture('day-detail');await close();
  await page.getByTestId('record-life-open').click();assert.equal(await page.getByTestId('life-selected-sleep').innerText(),'0時間');await capture('sleep');
  for(const [key,value]of [['exercise','なし'],['meal','整ってた'],['social','しんどい']]){await page.getByTestId('life-tab-'+key).click();assert.equal(await page.getByTestId('life-selected-'+key).innerText(),value);await checkWidth();}
  await page.getByTestId('life-tab-activities').click();await page.getByTestId('life-row-activities-散歩').click();
  for(const [date,state]of [['2026-11-08','選択'],['2026-11-07','未記録'],['2026-11-05','選択なし'],['2026-11-04','未記録']])assert.equal(await page.getByTestId('life-cell-activities-散歩-'+date).getAttribute('aria-label'),date+'、散歩、'+state);
  await capture('activities');await page.getByTestId('life-cell-activities-散歩-2026-11-08').click();await page.getByTestId('record-day-details').waitFor();assert.equal(await page.getByTestId('day-detail-sleep').innerText(),'7.5時間');assert.equal(await page.getByTestId('day-detail-moyamoya').innerText(),'ある');await page.getByText('友人と会った',{exact:true}).waitFor();await close();
  await page.getByTestId('condition-history').click();await page.getByTestId('record-calendar-2026-10-15').click();await close();await page.getByTestId('condition-period-7').click();await page.getByTestId('condition-selected-mood').getByText('いい感じ',{exact:true}).waitFor();assert.equal(await page.getByTestId('condition-selected-mood').innerText(),'いい感じ','range change moves an out-of-range selection to today');
  await page.getByTestId('condition-insights-tab').click();await page.getByTestId('personal-insights-screen').waitFor();await page.getByTestId('insights-changes-tab').click();await page.getByTestId('condition-screen').waitFor();
  await page.getByTestId('condition-menu').click();await page.getByRole('button',{name:'月のまとめ',exact:false}).click();await page.getByTestId('monthly-report-card').waitFor();await page.goto(base+'/condition');await page.getByTestId('condition-summary').waitFor();
  assert.deepEqual(await read(),before,'browsing never mutates records or wallet');await page.getByTestId('condition-edit').click();await page.getByTestId('check-in-screen').waitFor();await page.getByRole('button',{name:'気分：いい感じ',exact:true}).waitFor();assert.deepEqual(await read(),before);
  assert.deepEqual(errors,[]);results.push({width,height,mode,scrollHeight,passed:true});console.log('PASS record overview',width);await context.close();
 }
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,results},null,2));console.log(JSON.stringify(results));
})().catch(async e=>{console.error(e);if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());}process.exitCode=1;}).finally(async()=>{await browser?.close();server.close()});
