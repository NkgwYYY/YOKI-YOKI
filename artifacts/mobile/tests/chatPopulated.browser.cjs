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
  for(const viewport of [{width:320,height:568},{width:844,height:390}]){
   const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'テスト',ageRange:'回答しない',gender:'回答しない'}));
    localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
    localStorage.setItem('@mentore/mascot_name_v1','とても長い名前のキャラクターテスト');
    if(!localStorage.getItem('qa-populated')){
     const list=Array.from({length:120},(_,i)=>({id:'u_'+(1790985600000+i*60000),role:i%2?'assistant':'user',content:'会話'+i+' '+('長い文章の表示を確認しています。'.repeat(10)),timestamp:i%3===0?1790985600000+i*60000:new Date(1790985600000+i*60000).toISOString(),dateKey:i%7===0?'2026-02-30':'2026-10-03'}));
     localStorage.setItem('@mentore/chat_history_v1',JSON.stringify(list));localStorage.setItem('qa-populated','true');
    }
   });
   await page.goto('http://127.0.0.1:'+server.address().port+'/chat');
   await page.getByText('60件の会話',{exact:true}).waitFor();await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('@yoki/private_cache_v1/guest')).data['@mentore/chat_history_v1']).length),120,'hydration does not rewrite stored history');
   const input=page.getByRole('textbox',{name:'話しかける内容'});await input.fill('長い下書き'.repeat(30));
   const send=page.getByRole('button',{name:'送信',exact:true});const b=await send.boundingBox();assert.ok(b.y>=0&&b.y+b.height<=viewport.height-84);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
   await page.reload();await page.getByText('60件の会話',{exact:true}).waitFor();assert.deepEqual(errors,[]);
   console.log('PASS 120 legacy messages load as latest 60, unchanged storage, long name/message/input bounds and reload '+viewport.width+'x'+viewport.height);await page.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
