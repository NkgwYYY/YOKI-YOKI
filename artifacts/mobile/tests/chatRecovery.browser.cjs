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
    const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'}),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'テスト',ageRange:'回答しない',gender:'回答しない'}));
      localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
    });
    let mode='http',release;
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'};
    await page.route('**/api/chat/message',async route=>{
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
      requests.push(route.request().postDataJSON());
      if(mode==='pending')await new Promise(r=>release=r);
      await route.fulfill({status:mode==='http'?503:200,headers,contentType:'application/json',body:JSON.stringify({content:mode==='invalid'?{}:'テストの返事',citations:[{title:{},url:'bad'}]})}).catch(()=>{});
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/chat');
    await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
    await page.getByRole('textbox',{name:'話しかける内容'}).fill('テストの相談');
    await page.getByRole('button',{name:'送信',exact:true}).click();
    const retry=page.getByRole('button',{name:'返事をもう一度受け取る'});
    await retry.waitFor();
    mode='invalid';await retry.click();await retry.waitFor();
    mode='ok';await retry.click();await page.getByText('テストの返事',{exact:true}).waitFor();
    assert.equal(requests.length,3);assert.deepEqual(requests[0].messages,requests[2].messages,'retry does not duplicate user message');
    mode='pending';await page.getByRole('textbox',{name:'話しかける内容'}).fill('途中で部屋に戻る');await page.getByRole('button',{name:'送信',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[aria-label="会話履歴を消す"]')?.getAttribute('aria-disabled')==='true');
    while(!release)await new Promise(r=>setTimeout(r,10));
    await page.getByRole('button',{name:'部屋へ戻る'}).click();
    release();await page.getByTestId('room-scene').waitFor();
    assert.deepEqual(errors,[]);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/chat_history_v1')));
    assert.equal(stored.filter(m=>m.role==='assistant').length,1,'late response after leaving is ignored');
    console.log('PASS HTTP/malformed response retry, same user context, valid reply with invalid citations, cancellation on room return; mocked API only');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
