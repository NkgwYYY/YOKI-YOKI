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
 let args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'];
 if(process.env.YOKI_QA_CHROMIUM_BUNDLE)args=(await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(arg=>arg!=='--single-process');
 const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'テスト',ageRange:'回答しない',gender:'回答しない'}));
   localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/guide');
  const back=page.getByRole('button',{name:'戻る',exact:true});await back.waitFor();await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
  const scale=()=>back.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
  const down=async()=>{const b=await back.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();};
  const cancel=async()=>{await page.mouse.move(380,800);await page.mouse.up();};
  await down();await page.waitForTimeout(200);assert.equal(await scale(),1,'reduced motion stays still');await cancel();
  await page.emulateMedia({reducedMotion:'no-preference'});await down();
  await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('[aria-label="戻る"]')).transform).a<0.99);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('[aria-label="戻る"]')).transform).a===1);
  await cancel();await back.focus();await page.keyboard.press('Enter');await page.getByTestId('room-scene').waitFor();assert.deepEqual(errors,[]);
  console.log('PASS reduced-motion press, normal spring, live preference change while held, keyboard activation');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
