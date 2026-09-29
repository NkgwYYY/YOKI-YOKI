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
      const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{
        if(!localStorage.getItem('qa-seeded')){
          const date=new Date(),today=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
          const data={
            '@mentore/profile_v1':{nickname:'保存テスト',ageRange:'回答しない',gender:'回答しない'},
            '@mentore/feed_state_v1':{points:100,lastFeedTime:null,satietyAtFeed:65},
            '@mentore/light_energy_v1':{date:today,storedEnergy:12.75,totalEnergy:40,todayEnergy:12,genki:50,lightPower:0,lastGeneratedAt:date.toISOString(),flags:{mood:false,diary:false}},
            '@mentore/power_plant_v1':{ecoPoints:7,totalSold:9,sellCount:2,townBuilt:1},
            '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-09-01'}]},
          };
          for(const [key,value]of Object.entries(data))localStorage.setItem(key,JSON.stringify(value));
          localStorage.setItem('qa-seeded','true');
        }
        const set=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){
          if(key==='@mentore/feed_state_v1'&&localStorage.getItem('qa-block-balance')&&localStorage.getItem('@yoki/balance_journal_v1'))throw new DOMException('QA quota failure','QuotaExceededError');
          return set.call(this,key,value);
        };
      });
      await page.goto('http://127.0.0.1:'+server.address().port);
      await page.getByTestId('room-scene').waitFor({state:'visible'});
      await page.waitForTimeout(3000);
      await page.getByText('ひかりの庭',{exact:true}).last().click();
      await page.evaluate(()=>localStorage.setItem('qa-block-balance','true'));
      await page.getByTestId('energy-receive').click();
      await page.getByText('保存が完了しませんでした。もう一度押すと、受け取り状況を確認して再開します。',{exact:true}).waitFor();
      assert.ok(await page.evaluate(()=>localStorage.getItem('@yoki/balance_journal_v1')));
      if(mode==='restart'){
        await page.reload();
        await page.getByText('もう一度読み込む',{exact:true}).waitFor();
      }
      await page.evaluate(()=>localStorage.removeItem('qa-block-balance'));
      if(mode==='restart')await page.getByText('もう一度読み込む',{exact:true}).click();
      else await page.getByTestId('energy-receive').click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points===119);
      const result=await page.evaluate(()=>({feed:JSON.parse(localStorage.getItem('@mentore/feed_state_v1')),energy:JSON.parse(localStorage.getItem('@mentore/light_energy_v1')),plant:JSON.parse(localStorage.getItem('@mentore/power_plant_v1')),journal:localStorage.getItem('@yoki/balance_journal_v1')}));
      assert.equal(result.journal,null);assert.equal(result.plant.ecoPoints,0);assert.equal(result.plant.townBuilt,1);
      assert.equal(result.plant.totalSold,21);assert.equal(result.plant.sellCount,3);
      assert.ok(result.energy.storedEnergy>=0.75&&result.energy.storedEnergy<0.8);
      await page.reload();await page.getByTestId('energy-garden').waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),119);
      assert.deepEqual(errors,[]);await page.close();
      console.log(`PASS partial-save ${mode}: one reward, fractional energy/history retained, no page errors`);
    }
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
