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
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
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
    const progressBefore=await page.evaluate(()=>localStorage.getItem('@mentore/progress_v2'));
    const modes=['TAP BEAT','RHYTHM JUMP','RHYTHM SWIPE','RHYTHM COPY','RHYTHM RELAX'];
    const songs=['グリッティ・ブギ','ナイト・バロメーター','ローリング・デイズ','バウンシー・アウェイ'];
    let earnedTotal=0;
    for(let i=0;i<modes.length;i++){
      await page.getByTestId('room-music').click();
      await page.getByText(songs[i%4],{exact:true}).click();
      await page.getByText('つぎへ',{exact:true}).click();
      await page.getByText(modes[i],{exact:true}).click();
      await page.getByText('つぎへ',{exact:true}).click();
      if(i===0) await page.evaluate(()=>localStorage.setItem('qa-block-reward','true'));
      await page.getByText('START',{exact:true}).click();
      await page.getByText('今日のリズム',{exact:true}).waitFor({timeout:60000});
      if(i===0){
        await page.getByText('報酬の保存を再試行',{exact:true}).waitFor();
        assert.ok(await page.evaluate(()=>localStorage.getItem('@yoki/balance_journal_v1')));
        await page.evaluate(()=>localStorage.removeItem('qa-block-reward'));
        await page.getByText('報酬の保存を再試行',{exact:true}).click();
      }
      if(i<2){
        const chip=page.getByText(/^YOKIポイント \+[1-3]$/);
        await chip.waitFor(); earnedTotal+=Number((await chip.textContent()).match(/\+(\d+)/)[1]);
      }else assert.equal(await page.getByText(/^YOKIポイント \+/).count(),0);
      const saved=await page.evaluate(()=>({feed:JSON.parse(localStorage.getItem('@mentore/feed_state_v1')),game:JSON.parse(localStorage.getItem('@mentore/mini_game_v1')),progress:localStorage.getItem('@mentore/progress_v2')}));
      assert.equal(saved.feed.points,100+earnedTotal);
      assert.equal(saved.game.morning+saved.game.noon+saved.game.night,Math.min(i+1,2));
      assert.equal(saved.progress,progressBefore);
      assert.deepEqual(errors,[]);
      await page.getByLabel('音楽を止めて部屋へ戻る',{exact:true}).click();
      console.log(`PASS ${modes[i]} / ${songs[i%4]} full no-input play: saved points, cap and unchanged XP`);
    }
    await page.reload(); await page.getByTestId('room-scene').waitFor();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),100+earnedTotal);
    assert.deepEqual(errors,[]);
    console.log('PASS reward failure/retry and reload, no duplicate credit or page errors');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
