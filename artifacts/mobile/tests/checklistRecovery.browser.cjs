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
  const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  try{
    for(const mode of ['retry','restart']){
      const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        if(!localStorage.getItem('qa-seeded')){
          const d=new Date(),today=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
          const data={
            '@mentore/profile_v1':{nickname:'チェック復旧',ageRange:'回答しない',gender:'回答しない'},
            '@mentore/feed_state_v1':{points:100,lastFeedTime:null,satietyAtFeed:65},
            '@mentore/light_energy_v1':{date:today,storedEnergy:0,totalEnergy:0,todayEnergy:0,genki:50,lightPower:0,lastGeneratedAt:d.toISOString(),flags:{mood:false,diary:false}},
            '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:today}]},
            '@mentore/checklist_items_v3':[{id:'b1',text:'お風呂やシャワーを浴びた',category:'basics',isDefault:true}],
          };
          for(const [key,value]of Object.entries(data))localStorage.setItem(key,JSON.stringify(value));
          localStorage.setItem('qa-seeded','true');
        }
        const original=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){
          if(key===localStorage.getItem('qa-block-check')&&localStorage.getItem('@yoki/balance_journal_v1'))
            throw new DOMException('QA check interruption','QuotaExceededError');
          return original.call(this,key,value);
        };
      });
      const base='http://127.0.0.1:'+server.address().port;
      const open=async()=>{await page.goto(base+'/record');await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});await page.getByText('チェックを見る',{exact:true}).click();};
      await open();
      const check=page.getByRole('checkbox',{name:'お風呂やシャワーを浴びた',exact:true});
      const error='保存できませんでした。同じ操作をもう一度行うと、保存状況を確認して再開します。';
      await page.evaluate(()=>localStorage.setItem('qa-block-check','@mentore/feed_state_v1'));
      await check.click();await page.getByText(error,{exact:true}).waitFor();
      assert.equal(await check.getAttribute('aria-checked'),'false');
      if(mode==='restart'){await page.reload();await page.getByText('もう一度読み込む',{exact:true}).waitFor();}
      await page.evaluate(()=>localStorage.removeItem('qa-block-check'));
      if(mode==='restart'){await page.getByText('もう一度読み込む',{exact:true}).click();await page.getByText('もう一度読み込む',{exact:true}).waitFor({state:'hidden'});await open();}
      else await check.click();
      await page.waitForFunction(()=>document.querySelector('[data-testid="checklist-item-b1"]')?.getAttribute('aria-checked')==='true');
      const snapshot=()=>page.evaluate(()=>Object.fromEntries(['checked_state_v2','progress_v2','feed_state_v1','light_energy_v1','badges_v2','checklist_items_v3'].map(k=>[k,JSON.parse(localStorage.getItem('@mentore/'+k))])));
      const saved=await snapshot();
      assert.equal(saved.progress_v2.experience,30);assert.equal(saved.feed_state_v1.points,112);assert.equal(saved.light_energy_v1.totalEnergy,10);
      assert.ok(saved.badges_v2.some(b=>b.id==='checkMaster'));
      await page.getByLabel('項目を編集',{exact:true}).click();
      await page.getByText('リセット',{exact:true}).click();await page.getByText('元の項目に戻す',{exact:true}).click();
      await page.getByText('元の項目に戻しますか？',{exact:true}).waitFor({state:'hidden'});
      await check.click();await page.waitForFunction(()=>!document.querySelector('[data-testid="checklist-item-b1"]')?.disabled);
      assert.equal((await snapshot()).feed_state_v1.points,112);
      await page.getByLabel('項目を編集',{exact:true}).click();await page.getByLabel('きほんのきに項目を追加',{exact:true}).click();
      await page.getByLabel('追加するチェック項目',{exact:true}).fill('中断しても一つだけ追加');
      await page.evaluate(()=>localStorage.setItem('qa-block-check','@mentore/checked_state_v2'));
      await page.getByText('追加する',{exact:true}).click();await page.getByText(error,{exact:true}).waitFor();
      assert.equal(await page.getByLabel('追加するチェック項目',{exact:true}).inputValue(),'中断しても一つだけ追加');
      await page.evaluate(()=>localStorage.removeItem('qa-block-check'));
      await page.getByText('追加する',{exact:true}).click();
      await page.getByText('チェック項目を追加',{exact:true}).waitFor({state:'hidden'});
      assert.equal((await snapshot()).checklist_items_v3.filter(i=>i.text==='中断しても一つだけ追加').length,1);
      await open();const final=await snapshot();
      assert.equal(final.feed_state_v1.points,112);assert.equal(final.progress_v2.experience,30);
      assert.equal(final.checklist_items_v3.filter(i=>i.text==='中断しても一つだけ追加').length,1);
      assert.deepEqual(errors,[]);await page.close();
      console.log('PASS checklist '+mode+': reward recovery, reset without extra reward, interrupted add retry without duplicates and reload');
    }
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
