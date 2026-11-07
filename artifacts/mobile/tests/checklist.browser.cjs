const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
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
      const d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const data={
        '@mentore/profile_v1':{nickname:'記録テスト',ageRange:'回答しない',gender:'回答しない'},
        '@mentore/feed_state_v1':{points:100,lastFeedTime:null,satietyAtFeed:50},
        '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:date}]},
        '@mentore/records_v2':[{id:'qa-today',date,mood:3,sleep:0,sleepRecorded:false,behaviors:['読書した'],notes:'前のメモ',activities:{rest:1}}],
      };
      for(const [key,value] of Object.entries(data))localStorage.setItem(key,JSON.stringify(value));
      localStorage.setItem('qa-seeded','true');
    });
    const base='http://127.0.0.1:'+server.address().port;
    await page.goto(base+'/record');
    await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
    await page.getByText('チェックを見る',{exact:true}).click();
    await page.getByText('全部埋めなくても大丈夫。',{exact:false}).waitFor();
    const first=page.getByRole('checkbox',{name:'お風呂やシャワーを浴びた',exact:true});
    assert.equal(await page.getByLabel(/を削除$/).count(),0);
    assert.equal(await first.getAttribute('aria-checked'),'false');
    await first.click();
    await page.waitForFunction(()=>document.querySelector('[data-testid="checklist-item-b1"]')?.getAttribute('aria-checked')==='true');
    await page.waitForFunction(()=>!document.querySelector('[data-testid="checklist-item-b1"]')?.disabled);
    const checked=await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/checked_state_v2')));
    assert.equal(checked.items.find(x=>x.id==='b1').checked,true);
    await page.getByLabel('項目を編集',{exact:true}).click();
    await page.getByLabel('お風呂やシャワーを浴びたを削除',{exact:true}).click();
    await page.getByText('この項目を削除しますか？',{exact:true}).waitFor();
    await page.getByText('キャンセル',{exact:true}).click();
    assert.equal(await page.getByLabel('お風呂やシャワーを浴びたを削除',{exact:true}).count(),1);
    await page.getByLabel('きほんのきに項目を追加',{exact:true}).click();
    await page.setViewportSize({width:320,height:400});
    const custom='好きな音楽を聴きながらゆっくり休んだことを、長い文章のままで残すチェック項目';
    await page.getByLabel('追加するチェック項目',{exact:true}).fill(custom);
    await page.getByText('追加する',{exact:true}).click();
    await page.getByText('チェック項目を追加',{exact:true}).waitFor({state:'hidden'});
    assert.equal(await page.getByLabel(custom+'を削除',{exact:true}).count(),1);
    const list=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/checklist_items_v3')));
    assert.equal((await list()).filter(x=>x.text===custom).length,1);
    await page.getByLabel(custom+'を削除',{exact:true}).click();
    await page.getByText('削除する',{exact:true}).click();
    await page.getByText('この項目を削除しますか？',{exact:true}).waitFor({state:'hidden'});
    assert.equal((await list()).filter(x=>x.text===custom).length,0);
    await page.getByText('リセット',{exact:true}).click();
    await page.getByText('元の項目に戻しますか？',{exact:true}).waitFor();
    await page.getByText('キャンセル',{exact:true}).click();
    assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/checked_state_v2')))).items.find(x=>x.id==='b1').checked,true);
    await page.getByText('リセット',{exact:true}).click();
    await page.getByText('元の項目に戻す',{exact:true}).click();
    await page.getByText('元の項目に戻しますか？',{exact:true}).waitFor({state:'hidden'});
    assert.equal(await first.getAttribute('aria-checked'),'false');
    await page.reload();await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
    await page.getByText('チェックを見る',{exact:true}).click();
    assert.equal(await first.getAttribute('aria-checked'),'false');
    assert.equal(await page.getByLabel(/を削除$/).count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS checklist checkbox semantics, hidden-delete removal, 320x400 add/long text, cancel/confirm delete/reset and reload');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
