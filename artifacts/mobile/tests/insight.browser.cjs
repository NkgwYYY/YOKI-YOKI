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
    const page=await browser.newPage({viewport:{width:320,height:568},timezoneId:'Asia/Tokyo',reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    // Let Date advance so React Native's startup animation can finish.
    await page.clock.install({time:new Date('2026-10-01T15:30:00Z')});
    await page.addInitScript(()=>{
      if(!localStorage.getItem('qa-insight-seeded')){
        localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'テスト',ageRange:'回答しない',gender:'回答しない'}));
        localStorage.setItem('@mentore/records_v2',JSON.stringify([{date:'2026-10-02',mood:3,sleep:0,sleepRecorded:false,behaviors:[],notes:''}]));
        localStorage.setItem('@mentore/insight_v1',JSON.stringify({date:'2026-10-02',insights:{length:1}}));
        localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
        localStorage.setItem('qa-insight-seeded','true');
      }
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(key==='@yoki/private_cache_v1/guest'&&localStorage.getItem('qa-fail-insight'))throw new DOMException('QA disk full','QuotaExceededError');
        return original.call(this,key,value);
      };
    });
    let calls=0;
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'};
    await page.route('**/api/insight',async route=>{
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
      calls++;
      await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({insights:calls===1?[{title:{bad:true},body:'text'}]:[{title:'一歩を残せたね',body:'今日の記録を残したことに気づいたよ。'}]})});
    });
    const origin='http://127.0.0.1:'+server.address().port;
    const open=async()=>{await page.goto(origin+'/growth');try { await page.getByTestId('album-details-toggle').click(); } catch(error) { console.error(await page.locator('body').innerText()); throw error; }};
    await open();const generate=page.getByRole('button',{name:'記録をふりかえる',exact:true});
    await page.evaluate(()=>localStorage.setItem('qa-fail-insight','true'));await generate.click();
    await page.getByText('1日分の記録を残したね',{exact:true}).waitFor();
    await page.getByText('この結果を端末に保存できませんでした。画面を閉じる前に確認してください。',{exact:true}).waitFor();
    assert.equal(calls,0);assert.equal(await generate.count(),0,'local result remains available after cache failure');
    await page.getByRole('button',{name:'保存をもう一度試す',exact:true}).click();
    assert.equal(calls,0,'guest reflection never calls the protected AI API');
    await page.evaluate(()=>localStorage.removeItem('qa-fail-insight'));
    await page.getByRole('button',{name:'保存をもう一度試す',exact:true}).click();
    await page.getByRole('button',{name:'保存をもう一度試す',exact:true}).waitFor({state:'hidden'});
    const cached=await page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('@yoki/private_cache_v1/guest')).data['@mentore/insight_v1']));
    assert.equal(cached.date,'2026-10-02');assert.equal(cached.source,'local');
    await open();await page.getByText('1日分の記録を残したね',{exact:true}).waitFor();
    assert.equal(calls,0,'same local-day cache reload stays on device');assert.deepEqual(errors,[]);
    console.log('PASS corrupt legacy cache, guest reflection cache-write warning/retry, Japanese local-day reload, zero AI requests');
    await page.close();
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
