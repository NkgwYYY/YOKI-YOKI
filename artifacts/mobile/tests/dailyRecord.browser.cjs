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
            '@mentore/profile_v1':{nickname:'記録復旧',ageRange:'回答しない',gender:'回答しない'},
            '@mentore/feed_state_v1':{points:100,lastFeedTime:null,satietyAtFeed:65},
            '@mentore/light_energy_v1':{date:today,storedEnergy:0,totalEnergy:0,todayEnergy:0,genki:50,lightPower:0,lastGeneratedAt:d.toISOString(),flags:{mood:false,diary:false}},
            '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:today}]},
          };
          for(const [key,value] of Object.entries(data))localStorage.setItem(key,JSON.stringify(value));
          localStorage.setItem('qa-seeded','true');
        }
        const original=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){
          if(key==='@mentore/feed_state_v1'&&localStorage.getItem('qa-block-record')&&localStorage.getItem('@yoki/balance_journal_v1'))
            throw new DOMException('QA record interruption','QuotaExceededError');
          return original.call(this,key,value);
        };
      });
      const base='http://127.0.0.1:'+server.address().port;
      await page.goto(base+'/record');
      await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
      await page.getByTestId('quick-mood-4').click();
      await page.evaluate(()=>localStorage.setItem('qa-block-record','true'));
      await page.getByTestId('quick-record-save').click();
      await page.getByText('保存できませんでした。もう一度お試しください。',{exact:true}).waitFor();
      assert.ok(await page.evaluate(()=>localStorage.getItem('@yoki/balance_journal_v1')));
      assert.equal(await page.getByText('この気持ちを残す',{exact:true}).count(),1);
      if(mode==='restart'){
        await page.reload();
        await page.getByText('もう一度読み込む',{exact:true}).waitFor();
      }
      await page.evaluate(()=>localStorage.removeItem('qa-block-record'));
      if(mode==='restart')await page.getByText('もう一度読み込む',{exact:true}).click();
      else await page.getByTestId('quick-record-save').click();
      await page.waitForFunction(()=>!localStorage.getItem('@yoki/balance_journal_v1')&&JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points===105);
      const snapshot=()=>page.evaluate(()=>Object.fromEntries(['records_v2','progress_v2','feed_state_v1','light_energy_v1','badges_v2'].map(k=>[k,JSON.parse(localStorage.getItem('@mentore/'+k))])));
      const saved=await snapshot();
      assert.equal(saved.records_v2.length,1);assert.equal(saved.records_v2[0].mood,4);assert.equal(saved.records_v2[0].sleepRecorded,false);
      assert.equal(saved.progress_v2.experience,15);assert.equal(saved.progress_v2.totalDays,1);
      assert.equal(saved.feed_state_v1.points,105);assert.equal(saved.light_energy_v1.totalEnergy,5);
      assert.ok(saved.badges_v2.some(b=>b.id==='firstStep'));
      await page.goto(base+'/record');await page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
      await page.getByTestId('quick-mood-5').click();await page.getByTestId('quick-record-save').click();
      await page.getByTestId('room-scene').waitFor();
      const edited=await snapshot();
      assert.equal(edited.records_v2[0].mood,5);assert.equal(edited.progress_v2.experience,15);
      assert.equal(edited.feed_state_v1.points,105);assert.equal(edited.light_energy_v1.totalEnergy,5);
      assert.deepEqual(errors,[]);await page.close();
      console.log('PASS daily-record '+mode+': record/progress/points/energy/badge recovery and same-day edit without duplicate reward');
    }
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
