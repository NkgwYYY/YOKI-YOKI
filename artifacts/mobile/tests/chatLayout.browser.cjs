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
    localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'テスト',ageRange:'回答しない',gender:'回答しない'}));
    localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
   });
   await page.route('**/api/chat/message',route=>route.fulfill({status:503,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},contentType:'application/json',body:'{}'}));
   await page.goto('http://127.0.0.1:'+server.address().port+'/chat');
   const input=page.getByRole('textbox',{name:'話しかける内容'});await input.waitFor();
   await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
   const send=page.getByRole('button',{name:'送信',exact:true});
   const bounds=async()=>{for(const locator of [input,send]){const b=await locator.boundingBox();assert.ok(b.y>=0&&b.y+b.height<=viewport.height-84,JSON.stringify({viewport,b}));}};
   await bounds();await input.fill('表示テスト');await send.click();
   await page.getByRole('button',{name:'返事をもう一度受け取る'}).waitFor();await bounds();
   assert.deepEqual(errors,[]);
   if(process.env.YOKI_QA_SCREENSHOTS){fs.mkdirSync(process.env.YOKI_QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.YOKI_QA_SCREENSHOTS,'chat-'+viewport.width+'.png')});}
   console.log('PASS visible chat input/send before and after network error '+viewport.width+'x'+viewport.height);await page.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
