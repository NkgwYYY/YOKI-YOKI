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
    const errors=[];
    const makePage=async()=>{
      const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'});
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        if(localStorage.getItem('qa-nav-seeded'))return;
        const data={
          '@mentore/profile_v1':{nickname:'テスト',ageRange:'回答しない',gender:'回答しない'},
          '@mentore/feed_state_v1':{points:100,lastFeedTime:null,satietyAtFeed:50},
          '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-09-01'}]},
        };
        for(const [k,v]of Object.entries(data))localStorage.setItem(k,JSON.stringify(v));
        localStorage.setItem('qa-nav-seeded','true');
      });
      return page;
    };
    const origin='http://127.0.0.1:'+server.address().port;
    const ready=async page=>{await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});};
    for(const route of ['guide','profile','shop','monthly-report']){
      const page=await makePage();await page.goto(origin+'/'+route);
      const back=page.getByRole('button',{name:'戻る',exact:true});await back.waitFor();await ready(page);
      if(route==='guide'){
        await page.getByText('部屋のノートで記録',{exact:true}).waitFor();
        assert.equal(await page.getByText('きろく(記録タブ)',{exact:true}).count(),0);
        const overflow=await page.locator('body').evaluate(body=>[...body.querySelectorAll('*')].filter(el=>{
          const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1);
        }).map(el=>el.textContent.slice(0,60)));
        assert.deepEqual(overflow,[],'guide content fits 320px');
        if(process.env.YOKI_QA_SCREENSHOT)await page.screenshot({path:process.env.YOKI_QA_SCREENSHOT});
      }
      await back.click();await page.getByTestId('room-scene').waitFor();
      assert.equal(new URL(page.url()).pathname,'/');await page.close();
      console.log('PASS direct '+route+' returns to room');
    }
    const page=await makePage();await page.goto(origin);await page.getByTestId('room-scene').waitFor();await ready(page);
    for(const [label,route]of [['使い方ガイド','guide'],['プロフィール・話しかけ設定','profile'],['暮らしのお店','shop']]){
      await page.getByTestId('home-more-menu').click();await page.getByText(label,{exact:true}).click();
      await page.waitForURL('**/'+route);await page.getByRole('button',{name:'戻る',exact:true}).click();
      await page.getByTestId('room-scene').waitFor();assert.equal(new URL(page.url()).pathname,'/');
      console.log('PASS room menu '+route+' round trip');
    }
    await page.getByTestId('room-album').click();await page.waitForURL('**/growth');
    await page.getByTestId('album-details-toggle').click();
    await page.getByText('今月の心を、1枚のレポートに',{exact:true}).click();await page.waitForURL('**/monthly-report');
    await page.getByRole('button',{name:'戻る',exact:true}).click();await page.waitForURL('**/growth');
    console.log('PASS report returns to originating album');
    assert.deepEqual(errors,[]);await page.close();
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
