const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=path.resolve(process.env.YOKI_QA_EXPORT||'build-yoki-v3');
const output=process.env.YOKI_QA_SCREENSHOTS;
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const args=process.env.YOKI_QA_CHROMIUM_BUNDLE?(await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(a=>a!=='--single-process'):['--no-sandbox','--disable-dev-shm-usage'];
  const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args});
  const errors=[];
  const shot=async(p,name)=>{if(output){fs.mkdirSync(output,{recursive:true});await p.screenshot({path:path.join(output,name+'.jpg'),quality:90});}};
  try {
    for(const [name,width,height,amount] of [['phone',390,844,50],['empty',320,568,0],['tablet',820,1180,100],['wide',844,390,250]]) {
      const p=await browser.newPage({viewport:{width,height},locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
      p.on('pageerror',e=>errors.push(e.message));
      await p.clock.install({time:new Date('2026-10-05T12:00:00+09:00')});
      await p.addInitScript(amount=>{
        if(localStorage.getItem('qa-seeded'))return;
        localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'ゆき',ageRange:'回答しない',gender:'回答しない'}));
        localStorage.setItem('@mentore/mascot_name_v1','よっきー');
        localStorage.setItem('@mentore/feed_state_v1',JSON.stringify({points:100,lastFeedTime:null,satietyAtFeed:50}));
        localStorage.setItem('@mentore/light_energy_v1',JSON.stringify({date:'2026-10-05',genki:75,lightPower:40,todayEnergy:amount,storedEnergy:amount,totalEnergy:amount,lastGeneratedAt:new Date().toISOString(),flags:{mood:true,diary:false}}));
        localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'},{charKey:'colorful_happa',metDate:'2026-09-02'}]}));
        localStorage.setItem('@mentore/progress_v2',JSON.stringify({level:1,experience:0,mentalMuscle:0,streak:0,totalDays:amount?3:0,lastRecordDate:amount?'2026-10-05':''}));
        localStorage.setItem('@mentore/records_v2',JSON.stringify(amount?[
          {date:'2026-10-03',mood:2,sleep:0,sleepRecorded:false,behaviors:['休んだ'],notes:''},
          {date:'2026-10-04',mood:3,sleep:0,sleepRecorded:false,behaviors:[],notes:'本を読んだ'},
          {date:'2026-10-05',mood:4,sleep:0,sleepRecorded:false,behaviors:[],notes:'',win:'朝の散歩'},
        ]:[]));
        localStorage.setItem('qa-seeded','true');
      },amount);
      await p.goto('http://127.0.0.1:'+server.address().port+'/plant');
      await p.getByTestId('energy-garden').waitFor({state:'visible',timeout:30000});
      await p.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
      assert.equal(await p.getByTestId('energy-amount').innerText(),`${amount} ひかり`);
      if(amount===0)assert.equal(await p.getByTestId('energy-liquid').count(),0);
      else assert.equal(Number(await p.getByTestId('energy-liquid').locator('rect').getAttribute('height')),166*Math.min(1,amount/100));
      for(const id of ['energy-tank','energy-amount','energy-receive']) {
        const b=await p.getByTestId(id).boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,`${name} ${id} out of frame`);
      }
      await shot(p,'energy-'+name);
      if(name==='phone'){
        assert.equal(await p.getByTestId('energy-flow').count(),0);
        await p.emulateMedia({reducedMotion:'no-preference'});await p.getByTestId('energy-flow').first().waitFor();
        const flow=p.getByTestId('energy-flow').first();const before=await flow.getAttribute('style');await p.waitForTimeout(300);
        assert.notEqual(await flow.getAttribute('style'),before);
        await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
        await flow.waitFor({state:'hidden'});
        await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
        await flow.waitFor();await p.emulateMedia({reducedMotion:'reduce'});await flow.waitFor({state:'hidden'});
        console.log('PASS garden motion follows activity and reduced-motion preference');
      }
      if(amount>0){
        await p.getByTestId('energy-receive').click();
        await p.getByTestId('energy-message').filter({hasText:`${amount}ポイント`}).waitFor();
        assert.equal(await p.getByTestId('energy-liquid').count(),0);
        assert.equal(await p.getByTestId('energy-receive').getAttribute('aria-disabled'),'true');
      }
      const balance=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points);
      assert.equal(await balance(),100+amount);
      await p.reload();await p.getByTestId('energy-garden').waitFor();await p.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
      assert.equal(await balance(),100+amount);assert.equal(await p.getByTestId('energy-liquid').count(),0);
      await p.getByRole('tab',{name:'おうち',exact:true}).click();await p.getByTestId('room-scene').waitFor();
      const records=await p.evaluate(()=>localStorage.getItem('@mentore/records_v2'));
      await p.getByRole('tab',{name:'思い出',exact:true}).click();await p.getByTestId('memory-book').waitFor();
      assert.equal(await p.getByTestId('album-character-colorful_happa').count(),0);
      assert.equal(await p.getByTestId('album-details').count(),0);
      await shot(p,'book-'+name);
      await p.getByTestId('album-character-egg').click();await p.getByTestId('character-album-detail').waitFor();
      await p.getByLabel('閉じる',{exact:true}).click();
      assert.equal(await p.getByTestId('memory-entry').count(),amount?3:0);
      if(amount)assert.match(await p.getByTestId('memory-entry').first().innerText(),/朝の散歩/);
      await p.getByTestId('memory-records').scrollIntoViewIfNeeded();await shot(p,'book-memories-'+name);
      await p.getByTestId('album-details-toggle').click();await p.getByTestId('album-details').waitFor();
      await p.getByTestId('album-details-toggle').click();assert.equal(await p.getByTestId('album-details').count(),0);
      assert.equal(await p.evaluate(()=>localStorage.getItem('@mentore/records_v2')),records);
      await p.getByTestId('memory-records').click();await p.waitForURL('**/monthly-report');
      await p.close();console.log('PASS '+name+': book, encountered-only characters, actual memories, detail disclosure, unchanged records, report link');console.log(`PASS ${name}: actual liquid level, visible tank/receipt, one balance credit, reload, return home`);
    }
    assert.deepEqual(errors,[]);console.log('PASS no page errors');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
