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
    await page.getByText('くわしく残す',{exact:true}).click();
    await page.getByText('今日の記録ノート',{exact:true}).waitFor();
    await page.waitForTimeout(400); // Native/Web modal slide must settle before layout capture.
    if(process.env.YOKI_QA_FORM_SCREENSHOT) await page.screenshot({path:process.env.YOKI_QA_FORM_SCREENSHOT});
    for(const name of ['最悪','辛い','普通','良い','最高']){
      const box=await page.getByLabel('気分：'+name,{exact:true}).boundingBox();
      assert.ok(box && box.x>=0 && box.x+box.width<=320,'mood action fits: '+name);
    }
    assert.equal(await page.getByLabel('睡眠時間を増やす',{exact:true}).count(),0);
    for(const name of ['運動：軽め','食事：ふつう','人間関係：ふつう'])
      assert.equal(await page.getByRole('button',{name,exact:true}).isEnabled(),true);
    await page.getByLabel('今日のメモ',{exact:true}).fill('書き足したメモ');
    await page.evaluate(()=>{
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){
        if(key==='@mentore/records_v2'){Storage.prototype.setItem=original;throw new DOMException('QA quota failure','QuotaExceededError');}
        return original.call(this,key,value);
      };
    });
    await page.getByTestId('detailed-record-save').click();
    await page.getByText('保存できませんでした。入力内容はこのまま、もう一度お試しください。',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('今日のメモ',{exact:true}).inputValue(),'書き足したメモ');
    assert.equal(await page.getByLabel('今日のメモ',{exact:true}).isEditable(),true);
    assert.equal(await page.getByRole('button',{name:'食事：ふつう',exact:true}).isEnabled(),true);
    await page.getByTestId('detailed-record-save').click();
    await page.getByText('今日の記録ノート',{exact:true}).waitFor({state:'hidden'});
    const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/records_v2'))[0]);
    const saved=await read();
    assert.equal(saved.sleepRecorded,false);assert.equal(saved.sleep,0);assert.equal(saved.notes,'書き足したメモ');
    assert.deepEqual(saved.behaviors,['読書した']);assert.deepEqual(saved.activities,{rest:1});
    await page.reload();await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
    await page.getByText('くわしく残す',{exact:true}).click();
    await page.getByLabel('睡眠時間を記録する',{exact:true}).click();
    await page.getByLabel('睡眠時間を増やす',{exact:true}).click();
    await page.getByLabel('睡眠時間：7.5時間',{exact:true}).waitFor();
    await page.getByTestId('detailed-record-save').click();
    await page.getByText('今日の記録ノート',{exact:true}).waitFor({state:'hidden'});
    assert.equal((await read()).sleep,7.5);assert.equal((await read()).sleepRecorded,true);
    await page.goto(base+'/monthly-report');
    await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
    const current=await page.getByTestId('report-selected-month').textContent();
    assert.equal(await page.getByRole('button',{name:'次の月',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'前の月',exact:true}).click();
    assert.notEqual(await page.getByTestId('report-selected-month').textContent(),current);
    await page.getByRole('button',{name:'次の月',exact:true}).click();
    assert.equal(await page.getByTestId('report-selected-month').textContent(),current);
    const card=await page.getByTestId('monthly-report-card').boundingBox();
    assert.ok(card && card.x>=0 && card.x+card.width<=320);
    await page.evaluate(()=>{window.qaCanvas=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=()=>{throw Error('QA image export failure');};});
    await page.getByRole('button',{name:'画像を保存する',exact:true}).click();
    await page.getByText('画像を作れませんでした。もう一度お試しください。',{exact:true}).waitFor();
    await page.evaluate(()=>{HTMLCanvasElement.prototype.toDataURL=window.qaCanvas;});
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'画像を保存する',exact:true}).click();
    const download=await downloadPromise;
    const png=fs.readFileSync(await download.path());
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.ok(png.readUInt32BE(16)>=800 && png.readUInt32BE(20)>=2000);
    if(process.env.YOKI_QA_REPORT_PNG) fs.writeFileSync(process.env.YOKI_QA_REPORT_PNG,png);
    assert.deepEqual(errors,[]);
    console.log('PASS 320px detailed form, save failure/retry, optional sleep/reload, preserved fields, report month navigation and PNG export failure/retry');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
