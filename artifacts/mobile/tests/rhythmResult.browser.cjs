const fs=require('node:fs'), http=require('node:http'), path=require('node:path'), assert=require('node:assert/strict');
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
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--autoplay-policy=no-user-gesture-required']});
  try{
    const page=await browser.newPage({viewport:{width:320,height:480},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      if(!localStorage.getItem('qa-seeded')){
        localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'音楽テスト',ageRange:'回答しない',gender:'回答しない'}));
        localStorage.setItem('@mentore/feed_state_v1',JSON.stringify({points:100,lastFeedTime:null,satietyAtFeed:50}));
        localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
        localStorage.setItem('qa-seeded','true');
      }
      const set=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(key==='@mentore/feed_state_v1'&&localStorage.getItem('qa-block-reward')&&localStorage.getItem('@yoki/balance_journal_v1'))throw new DOMException('QA reward failure','QuotaExceededError');
        return set.call(this,key,value);
      };
    });
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.getByTestId('room-scene').waitFor(); await page.waitForTimeout(3000);
    await page.getByTestId('room-music').click();
    await page.getByText('グリッティ・ブギ',{exact:true}).click();
    await page.getByText('つぎへ',{exact:true}).click();
    await page.getByText('つぎへ',{exact:true}).click();
    await page.getByText('START',{exact:true}).click();
    await page.getByText('今日のリズム',{exact:true}).waitFor({timeout:60000});
    await page.getByRole('img',{name:/今日のリズム、5段階中[1-5]/}).waitFor();
    await page.getByTestId('rhythm-result-static').waitFor();
    await page.emulateMedia({reducedMotion:'no-preference'});await page.getByTestId('rhythm-result-animated').waitFor();
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await page.getByTestId('rhythm-result-static').waitFor();
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
    await page.getByTestId('rhythm-result-static').waitFor();
    for(const viewport of [{width:320,height:480},{width:844,height:390},{width:820,height:1180}]){
      await page.setViewportSize(viewport);
      const back=page.getByRole('button',{name:'部屋に戻って、ひと休み',exact:true});await back.scrollIntoViewIfNeeded();
      const b=await back.boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width);
    }
    await page.getByRole('button',{name:'部屋に戻って、ひと休み',exact:true}).click();await page.getByTestId('room-scene').waitFor();
    assert.deepEqual(errors,[]);console.log('PASS result rating label, reduced/live/hidden mascot state, three result layouts and return to room');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
