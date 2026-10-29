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
    const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      if(!localStorage.getItem('qa-flower-seeded')){
        const data={
          '@mentore/profile_v1':{nickname:'花の部屋',ageRange:'回答しない',gender:'回答しない'},
          '@mentore/feed_state_v1':{points:100,lastFeedTime:null,satietyAtFeed:50},
          '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-09-01'}]},
          '@mentore/room_customization_v1':{furniture:'sofa',flower:'pink',ownedFurniture:['sofa'],ownedFlowers:['pink']},
        };
        for(const [k,v]of Object.entries(data))localStorage.setItem(k,JSON.stringify(v));
        localStorage.setItem('qa-flower-seeded','true');
      }
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(key==='@mentore/room_customization_v1'&&localStorage.getItem('qa-block-flower'))throw new DOMException('QA selection failure','QuotaExceededError');
        return original.call(this,key,value);
      };
    });
    await page.goto('http://127.0.0.1:'+server.address().port);
    const scene=page.getByTestId('room-scene');
    const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/room_customization_v1')));
    await scene.getByTestId('room-flower-pink').waitFor();
    assert.deepEqual((await saved()).ownedFlowers,['pink']);assert.deepEqual((await saved()).ownedFurniture,['sofa']);
    console.log('PASS single rose/sofa ownership survives hydration');
    await page.evaluate(()=>{const k='@mentore/room_customization_v1',v=JSON.parse(localStorage.getItem(k));v.ownedFlowers=['pink','violet','rainbow'];localStorage.setItem(k,JSON.stringify(v));});
    await page.reload();await scene.getByTestId('room-flower-pink').waitFor();
    const open=async()=>{await page.getByTestId('home-more-menu').click();await page.getByText('部屋の模様替え',{exact:true}).click();};
    const sources=[];
    for(const [id,name]of [['violet','バイオレット'],['rainbow','レインボー'],['pink','ローズ']]){
      await open();
      const button=page.getByRole('button',{name:name+' 選ぶ',exact:true});
      const preview=button.getByTestId('room-flower-'+id);
      const src=await preview.locator('img').getAttribute('src');sources.push(src);
      if(id==='violet'){
        await page.evaluate(()=>localStorage.setItem('qa-block-flower','true'));
        await button.click();await page.getByText('保存できませんでした。もう一度お試しください。',{exact:true}).waitFor();
        assert.equal((await saved()).flower,'pink');assert.equal(await scene.getByTestId('room-flower-violet').count(),0);
        await page.evaluate(()=>localStorage.removeItem('qa-block-flower'));
      }
      await button.click();await page.getByRole('button',{name:name+' 使用中',exact:true}).waitFor();
      await page.getByLabel('閉じる',{exact:true}).last().click();
      const art=scene.getByTestId('room-flower-'+id);await art.waitFor();
      assert.equal(await art.locator('img').getAttribute('src'),src);
      await art.locator('img').evaluate(img=>img.decode());
      assert.equal((await saved()).flower,id);
      await page.reload();await scene.getByTestId('room-flower-'+id).waitFor();
      if(id==='rainbow'&&process.env.YOKI_QA_SCREENSHOT){
        await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
        await scene.getByTestId('room-flower-'+id).locator('img').evaluate(img=>img.decode());
        await page.screenshot({path:process.env.YOKI_QA_SCREENSHOT});
      }
    }
    assert.equal(new Set(sources).size,3);
    await open();await page.getByRole('button',{name:'置かない 選ぶ',exact:true}).last().click();
    await page.getByLabel('閉じる',{exact:true}).last().click();
    assert.equal(await scene.locator('[data-testid^="room-flower-"]').count(),0);
    assert.deepEqual((await saved()).ownedFlowers,['pink','violet','rainbow']);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),100);
    assert.deepEqual(errors,[]);
    console.log('PASS three distinct preview/room sprites, failed selection/retry, reload, none and preserved ownership/wallet');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
