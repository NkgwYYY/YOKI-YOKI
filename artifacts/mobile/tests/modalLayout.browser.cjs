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
    const within=async(locator,page)=>{
      await locator.click({trial:true});
      const b=await locator.boundingBox(),v=page.viewportSize();
      assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1,JSON.stringify({b,v}));
      return b;
    };
    for(const viewport of [{width:320,height:480},{width:844,height:390},{width:820,height:1180}]){
      const page=await makePage();await page.setViewportSize(viewport);await page.goto(origin);
      await page.getByTestId('room-scene').waitFor();await ready(page);
      await page.getByTestId('room-record').click();await page.getByTestId('quick-mood-4').click();
      const save=page.getByTestId('quick-record-save');const saveBox=await within(save,page);assert.ok(saveBox.width<=512);
      await save.click();await page.getByTestId('quick-record-save').waitFor({state:'hidden'});
      await page.getByTestId('home-more-menu').click();await page.getByText('なまえをつける',{exact:true}).click();
      const name=page.getByLabel('なかまの名前',{exact:true});await name.fill('ちいさな相棒');
      const nameSave=page.getByRole('button',{name:'この名前にする',exact:true});
      const b=await within(nameSave,page);assert.ok(b.width<=432,'center dialog has a readable maximum width');
      const close=page.getByRole('button',{name:'閉じる',exact:true}).last();const cb=await within(close,page);
      assert.ok(cb.width>=44&&cb.height>=44,'visible close target is at least 44px');
      // Return to the save control after testing the fixed close control.
      await within(nameSave,page);
      if(process.env.YOKI_QA_SCREENSHOT&&viewport.width===844)await page.screenshot({path:process.env.YOKI_QA_SCREENSHOT});
      await nameSave.click();await name.waitFor({state:'hidden'});
      await page.getByTestId('home-more-menu').click();
      await page.getByRole('dialog').waitFor();
      await page.getByRole('button',{name:'閉じる',exact:true}).focus();
      assert.equal(await page.getByRole('button',{name:'閉じる',exact:true}).count(),1);
      await page.keyboard.press('Escape');await page.getByText('この部屋でできること',{exact:true}).waitFor({state:'hidden'});
      await page.getByTestId('room-meal').click();await page.getByText('ごはんをあげる',{exact:true}).waitFor();
      await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
      await page.getByTestId('home-more-menu').click();await page.getByText('なまえをつける',{exact:true}).click();
      assert.equal(await page.getByLabel('なかまの名前',{exact:true}).inputValue(),'ちいさな相棒');
      await page.getByRole('dialog').waitFor();
      assert.equal(await page.getByRole('button',{name:'閉じる',exact:true}).count(),1);
      await page.keyboard.press('Escape');await page.getByLabel('なかまの名前',{exact:true}).waitFor({state:'hidden'});
      await page.close();console.log('PASS '+viewport.width+'x'+viewport.height+' record save, name save/reopen, bounded dialogs and close targets');
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
