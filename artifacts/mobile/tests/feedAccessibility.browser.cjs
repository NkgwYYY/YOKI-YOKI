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
  const page=await browser.newPage({viewport:{width:320,height:480},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   if(localStorage.getItem('qa-feed-seeded'))return;
   localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'テスト',ageRange:'回答しない',gender:'回答しない'}));
   localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
   localStorage.setItem('@mentore/feed_state_v1',JSON.stringify({points:5,lastFeedTime:null,satietyAtFeed:0}));
   localStorage.setItem('qa-feed-seeded','true');
  });
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByTestId('room-meal').waitFor();await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
  await page.getByTestId('room-meal').click();
  const berry=page.getByRole('button',{name:'きのみ、5ポイント、満腹度プラス15',exact:true});
  const apple=page.getByRole('button',{name:'りんご、10ポイント、満腹度プラス28',exact:true});
  await berry.waitFor();assert.equal(await berry.isEnabled(),true);assert.equal(await apple.isDisabled(),true);
  await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='@yoki/balance_journal_v1'&&localStorage.getItem('qa-block-feed'))throw new DOMException('QA','QuotaExceededError');return set.call(this,key,value);};localStorage.setItem('qa-block-feed','true');});
  await berry.scrollIntoViewIfNeeded();await berry.focus();await page.keyboard.press('Enter');
  await page.getByText('ごはんを保存できませんでした。もう一度お試しください。',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),5);assert.equal(await berry.isEnabled(),true);
  await page.evaluate(()=>localStorage.removeItem('qa-block-feed'));await berry.click();await berry.waitFor({state:'hidden'});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points===0);
  await page.getByTestId('room-meal').click();await berry.waitFor();assert.equal(await berry.isDisabled(),true);assert.equal(await apple.isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320);
  await page.getByRole('button',{name:'閉じる',exact:true}).click();await page.reload();await page.getByTestId('room-scene').waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),0);assert.deepEqual(errors,[]);
  console.log('PASS named food controls, insufficient-point disabled state, keyboard activation, save failure/retry, one debit and reload');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
