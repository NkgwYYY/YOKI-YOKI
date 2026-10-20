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
        // A cache from an old signed-in session must never appear to the guest.
        localStorage.setItem('@mentore/insight_v1',JSON.stringify({date:'2026-10-02',insights:[{title:'別アカウントの結果',body:'表示してはいけない'}]}));
        localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
        localStorage.setItem('qa-insight-seeded','true');
      }
    });
    let calls=0;
    const origin='http://127.0.0.1:'+server.address().port;
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/api/insight')calls++;
      if(url.origin!==origin || url.pathname.startsWith('/api/'))return route.fulfill({status:401,contentType:'application/json',body:'{"error":"guest has no authenticated API session"}'});
      return route.continue();
    });
    const open=async()=>{
      await page.goto(origin+'/growth');
      await page.getByTestId('album-details-toggle').click();
      await page.getByTestId('guest-insights').waitFor();
      await page.getByText('1日分の記録を残したね',{exact:true}).waitFor();
    };
    await open();
    await page.getByText('端末の記録から振り返ります。AIには送信しません。',{exact:true}).waitFor();
    assert.equal(await page.getByText('別アカウントの結果',{exact:true}).count(),0,'old account cache stays hidden');
    assert.equal(await page.getByRole('button',{name:'すごいところを見つけてもらう',exact:true}).count(),0,'guest is not offered an unusable authenticated AI request');
    assert.equal(calls,0,'guest reflection never calls the authenticated insight endpoint');
    await open();
    assert.equal(calls,0,'reloading a guest reflection does not call AI');
    assert.deepEqual(errors,[]);
    if(process.env.YOKI_QA_OUTPUT){fs.mkdirSync(process.env.YOKI_QA_OUTPUT,{recursive:true});await page.getByTestId('guest-insights').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.YOKI_QA_OUTPUT,'guest-insights.png')});}
    console.log('PASS guest reflection with unavailable authenticated API, no AI request, no old account cache, and reload; external services blocked');
    await page.close();
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
