const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=path.resolve(process.env.YOKI_QA_EXPORT||path.join(__dirname,'../../../build-yoki-v2-storage'));
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
  let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
  const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce',acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-03T00:00:00Z')});
  await page.addInitScript(()=>{
   localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'テスト',ageRange:'回答しない',gender:'回答しない'}));
   localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
   localStorage.setItem('@mentore/records_v2',JSON.stringify(Array.from({length:30},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0'),mood:4,sleep:7,sleepRecorded:true,behaviors:['散歩'],notes:'記録テスト'}))));
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/monthly-report');
  const next=page.getByRole('button',{name:'次の月',exact:true});await next.waitFor();await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});assert.ok(await next.isDisabled());
  await page.getByRole('button',{name:'前の月',exact:true}).click();await page.getByTestId('report-selected-month').filter({hasText:'2026年 9月'}).waitFor();
  assert.equal(await page.getByText('30日',{exact:true}).count(),2);
  assert.equal(await page.getByLabel('2026年 9月30日、いい感じ',{exact:true}).count(),1);
  // Browser text-size stress, not an emulation of native Dynamic Type.
  await page.evaluate(()=>{for(const el of document.querySelectorAll('div,span')){if(el.children.length===0&&el.textContent?.trim()){const s=getComputedStyle(el);el.style.fontSize=parseFloat(s.fontSize)*1.5+'px';if(s.lineHeight!=='normal')el.style.lineHeight=parseFloat(s.lineHeight)*1.5+'px';}}});
  const save=page.getByRole('button',{name:'画像を保存する',exact:true});await save.scrollIntoViewIfNeeded();
  const box=await save.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=568&&box.height>=52);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320);
  const clipped=await page.getByTestId('monthly-report-card').evaluate(card=>{
   const bounds=card.getBoundingClientRect();
   return [...card.querySelectorAll('div,span')].filter(el=>!el.children.length&&el.textContent?.trim()).filter(el=>{
    const r=el.getBoundingClientRect();return r.left<bounds.left||r.right>bounds.right||r.bottom>bounds.bottom||el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1;
   }).map(el=>el.textContent);
  });assert.deepEqual(clipped,[],'report text must remain inside the exported card');
  const downloadPromise=page.waitForEvent('download');await save.click();const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'yoki-yoki-monthly-report-2026-09.png');
  const file=await download.path();const bytes=fs.readFileSync(file);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.ok(bytes.readUInt32BE(16)>500&&bytes.readUInt32BE(20)>500);
  await next.scrollIntoViewIfNeeded();await next.click();await page.getByTestId('report-selected-month').filter({hasText:'2026年 10月'}).waitFor();assert.ok(await next.isDisabled());assert.deepEqual(errors,[]);
  console.log('PASS populated September statistics/calendar, 150% browser text stress, PNG download and current-month navigation');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
