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
  for(const viewport of [{width:320,height:480},{width:844,height:390},{width:820,height:1180}]){
   const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    if(localStorage.getItem('qa-new-friend'))return;
    localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'テスト',ageRange:'回答しない',gender:'回答しない'}));
    localStorage.setItem('qa-new-friend','true');
   });
   await page.goto('http://127.0.0.1:'+server.address().port);
   const card=page.getByTestId('new-friend-card');await card.waitFor();
   await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
   const character=page.getByTestId('new-friend-character');
   const scale=()=>character.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
   assert.equal(await scale(),1);
   const close=page.getByRole('button',{name:'閉じる',exact:true});assert.equal(await close.count(),1);
   const c=await close.boundingBox();assert.ok(c.y>=0&&c.y+c.height<=viewport.height&&c.width>=44&&c.height>=44);
   const welcome=page.getByRole('button',{name:'よろしくね！',exact:true});await welcome.scrollIntoViewIfNeeded();
   const w=await welcome.boundingBox();assert.ok(w.x>=0&&w.y>=0&&w.x+w.width<=viewport.width&&w.y+w.height<=viewport.height);
   // Active animation must settle immediately on backgrounding and preference changes.
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
   await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('[data-testid="new-friend-character"]')).transform).a===1);
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
   assert.equal(await scale(),1);
   if(viewport.width===844){await close.click();}else{await welcome.click();}
   await card.waitFor({state:'hidden'});
   await page.getByTestId('room-record').click();await page.getByTestId('quick-mood-4').waitFor();await page.getByRole('button',{name:'閉じる',exact:true}).click();
   const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/encounters_v1')));assert.equal(before.list.length,1);assert.equal(before.list[0].charKey,'egg');
   await page.reload();await page.getByTestId('room-scene').waitFor();await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
   assert.equal(await card.count(),0);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/encounters_v1'))),before);assert.deepEqual(errors,[]);
   await page.close();console.log(`PASS ${viewport.width}x${viewport.height} bounded discovery, static reduced/hidden character, dismiss, room interaction and encounter reload`);
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
