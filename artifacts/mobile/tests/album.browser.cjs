const fs=require('node:fs'), http=require('node:http'), path=require('node:path'), assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=path.resolve(process.env.YOKI_QA_EXPORT||path.join(__dirname,'../../../build-yoki-v2-storage'));
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
  let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  try{
    const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      if(localStorage.getItem('qa-seeded'))return;
      const date=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
      const record=(offset,mood,sleep,sleepRecorded)=>({date:date(offset),mood,sleep,sleepRecorded,behaviors:[],activities:{},notes:'',win:'',exercise:0});
      const data={
        '@mentore/profile_v1':{nickname:'アルバムテスト',ageRange:'回答しない',gender:'回答しない'},
        '@mentore/feed_state_v1':{points:100,lastFeedTime:null,satietyAtFeed:50},
        '@mentore/records_v2':[record(-20,1,12,true),record(-1,2,7,true),record(0,4,0,false)],
        '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:date(-20)},{charKey:'colorful_happa',metDate:date(-1)}]},
      };
      for(const [key,value]of Object.entries(data))localStorage.setItem(key,JSON.stringify(value));
      localStorage.setItem('qa-seeded','true');
    });
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.getByTestId('room-scene').waitFor();await page.waitForTimeout(2000);
    const before=await page.evaluate(()=>localStorage.getItem('@mentore/records_v2'));
    await page.getByText('アルバム',{exact:true}).last().click();
    await page.getByText('ふたりのアルバム',{exact:true}).waitFor();
    assert.equal(await page.getByTestId('album-details').count(),0);
    assert.equal(await page.getByTestId('album-character-colorful_happa').count(),0);
    await page.getByTestId('album-character-egg').click();
    await page.getByTestId('character-album-detail').waitFor();
    await page.waitForTimeout(400);
    for (const label of ['ジャンプ', 'なでる']) {
      const box=await page.getByRole('button',{name:label,exact:true}).boundingBox();
      assert.ok(box && box.x>=0 && box.x+box.width<=320, `${label} fits the narrow sheet`);
    }
    const motion=page.getByTestId('dex-character-motion');
    const pose=await motion.getAttribute('style');
    await page.getByText('ジャンプ',{exact:true}).click();
    await page.getByText('いっしょにいると、うれしいね',{exact:true}).waitFor();
    assert.equal(await motion.getAttribute('style'),pose);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await page.getByText('いっしょにいると、うれしいね',{exact:true}).waitFor({state:'hidden'});
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForTimeout(200);
    await page.getByText('ジャンプ',{exact:true}).click();
    await page.getByText('ぴょん！',{exact:true}).waitFor();
    await page.waitForTimeout(100);
    assert.notEqual(await motion.getAttribute('style'),pose);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await page.getByText('ぴょん！',{exact:true}).waitFor({state:'hidden'});
    assert.equal(await motion.getAttribute('style'),pose);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
    await page.getByLabel('閉じる',{exact:true}).click();
    await page.getByTestId('album-details-toggle').click();
    await page.getByTestId('album-details').waitFor();
    assert.equal(await page.getByTestId('album-details-toggle').getAttribute('aria-expanded'),'true');
    assert.equal(await page.getByTestId('weekly-heart').textContent(),'3.0');
    assert.equal(await page.getByTestId('weekly-moon').textContent(),'7.0h');
    assert.equal(await page.getByTestId('weekly-file-text').textContent(),'2');
    await page.getByTestId('album-details-toggle').click();
    assert.equal(await page.getByTestId('album-details').count(),0);
    assert.equal(await page.evaluate(()=>localStorage.getItem('@mentore/records_v2')),before);
    assert.deepEqual(errors,[]);
    if(process.env.YOKI_QA_SCREENSHOT){
      await page.reload();
      await page.getByText('ふたりのアルバム',{exact:true}).waitFor();
      await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
      await page.screenshot({path:process.env.YOKI_QA_SCREENSHOT});
    }
    console.log('PASS 320px album/actions, discovered-only dex, reduced motion, interrupted jump reset, detail toggle, seven-day averages and unchanged records');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
