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
  const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--autoplay-policy=no-user-gesture-required']});
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
    const songNames=['グリッティ・ブギ','ナイト・バロメーター','ローリング・デイズ','バウンシー・アウェイ'];
    const modes=['TAP BEAT','RHYTHM JUMP','RHYTHM SWIPE','RHYTHM COPY','RHYTHM RELAX'];
    for(const viewport of [{width:320,height:480},{width:844,height:390},{width:820,height:1180}]){
      const page=await makePage();await page.setViewportSize(viewport);await page.goto(origin);
      await page.getByTestId('room-scene').waitFor();await ready(page);
      const before=await page.evaluate(()=>localStorage.getItem('@mentore/mini_game_v1'));
      await page.getByTestId('room-music').click();
      if(viewport.width===320){
        await page.route('**/*.mp3',route=>route.abort());
        await page.getByRole('radio',{name:songNames[0],exact:true}).click();
        await page.getByText('試聴できませんでした。同じ曲を選ぶと再試行できます。',{exact:true}).waitFor();
        assert.equal(await page.getByText('試聴中',{exact:true}).count(),0);
        await page.unroute('**/*.mp3');
        await page.getByRole('radio',{name:songNames[0],exact:true}).click();
        await page.getByText('試聴中',{exact:true}).waitFor();
        assert.equal(await page.getByRole('alert').count(),0);
        console.log('PASS failed audio load, accurate status and same-song retry');
      }
      for(const name of songNames){
        const option=page.getByRole('radio',{name,exact:true});await option.click();
        assert.equal(await option.getAttribute('aria-checked'),'true');
        const b=await option.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=viewport.width+1&&b.width<=552);
      }
      await page.getByRole('button',{name:'つぎへ',exact:true}).click();
      for(const name of modes){const option=page.getByRole('radio',{name,exact:true});await option.click();assert.equal(await option.getAttribute('aria-checked'),'true');}
      await page.getByRole('button',{name:'つぎへ',exact:true}).click();
      for(const name of ['EASY','NORMAL','HARD']){const option=page.getByRole('radio',{name,exact:true});await option.click();assert.equal(await option.getAttribute('aria-checked'),'true');}
      await page.getByRole('button',{name:'START',exact:true}).click({trial:true});
      await page.getByRole('button',{name:'もどる',exact:true}).click();
      assert.equal(await page.getByRole('radio',{name:'RHYTHM RELAX',exact:true}).getAttribute('aria-checked'),'true');
      await page.getByRole('button',{name:'もどる',exact:true}).click();
      const selected=page.getByRole('radio',{name:songNames[3],exact:true});await selected.waitFor();
      assert.equal(await selected.getAttribute('aria-checked'),'true');
      assert.equal(await page.getByText('試聴中',{exact:true}).count(),0);
      await page.getByLabel('音楽を止めて部屋へ戻る',{exact:true}).click();
      assert.equal(await page.evaluate(()=>localStorage.getItem('@mentore/mini_game_v1')),before);
      await page.close();console.log('PASS '+viewport.width+'x'+viewport.height+' four songs, five modes, three difficulties and preserved selections');
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
