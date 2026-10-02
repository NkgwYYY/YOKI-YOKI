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
      const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST, OPTIONS'};
      await page.route('**/api/chat/message',route=>route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify({content:'休憩テストの返事',restEvent:true})}));
      await page.goto('http://127.0.0.1:'+server.address().port+'/chat');
      await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
      const send=async()=>{await page.getByRole('textbox',{name:'話しかける内容'}).fill('休憩テスト');await page.getByRole('button',{name:'送信',exact:true}).click();await page.getByRole('button',{name:'今は大丈夫',exact:true}).waitFor();};
      await send();
      const skip=page.getByRole('button',{name:'今は大丈夫',exact:true});
      await skip.scrollIntoViewIfNeeded();let box=await skip.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=viewport.height+1);await skip.click();
      await send();const rain=page.getByRole('button',{name:'雨の音を聞く',exact:true});await rain.scrollIntoViewIfNeeded();box=await rain.boundingBox();assert.ok(box.width<=560&&box.x>=0);await rain.click();
      const close=page.getByRole('button',{name:'休憩を閉じる',exact:true});await close.waitFor();box=await close.boundingBox();assert.ok(box.width>=44&&box.height>=44&&box.y>=0);await close.click();
      await close.waitFor({state:'hidden'});await page.getByRole('textbox',{name:'話しかける内容'}).waitFor();assert.deepEqual(errors,[]);
      console.log('PASS rest selection skip, bounded scrollable choices, playing exit '+viewport.width+'x'+viewport.height);await page.close();
    }
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
