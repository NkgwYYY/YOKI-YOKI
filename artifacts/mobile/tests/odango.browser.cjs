// Actual exported world, real gestures, synthetic local guest state only.
// Browser rendering cannot certify native SVG texture or device performance.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=path.resolve(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_SCREENSHOTS;
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/__qa_fonts/')&&process.env.YOKI_QA_FONT_DIR){res.setHeader('Content-Type','font/woff2');fs.createReadStream(path.join(process.env.YOKI_QA_FONT_DIR,'files',path.basename(req.url))).pipe(res);return;}
  let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(root,'index.html');
  res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const args=process.env.YOKI_QA_CHROMIUM_BUNDLE?(await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(a=>a!=='--single-process'):['--no-sandbox','--disable-dev-shm-usage'];
  const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args});
  const errors=[];
  const shot=async(p,name)=>{if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.png')});}};
  const open=async({reduce=false,viewport={width:390,height:844}}={})=>{
    const p=await browser.newPage({viewport,deviceScaleFactor:2,hasTouch:true,locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:reduce?'reduce':'no-preference'});
    p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date('2026-10-08T12:00:00+09:00')});
    await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
    await p.addInitScript(()=>{
      if(localStorage.getItem('odango-seeded'))return;
      localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'確認',ageRange:'回答しない',gender:'回答しない'}));
      localStorage.setItem('@mentore/progress_v2',JSON.stringify({level:3,experience:12,mentalMuscle:0,streak:0,totalDays:0,lastRecordDate:''}));
      localStorage.setItem('@mentore/feed_state_v1',JSON.stringify({points:100,lastFeedTime:null,satietyAtFeed:50}));
      localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'},{charKey:'odango',metDate:'2026-09-02'}]}));
      localStorage.setItem('odango-seeded','yes');
    });
    await p.goto(origin);await p.getByTestId('resident-volume-odango').waitFor();await p.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
    if(process.env.YOKI_QA_FONT_DIR){const css=fs.readFileSync(path.join(process.env.YOKI_QA_FONT_DIR,'400.css'),'utf8').replaceAll('./files/','/__qa_fonts/');await p.addStyleTag({content:css+'\n[dir="auto"]:not([style*="font-family"]) {font-family:"Noto Sans JP",sans-serif !important}'});await p.evaluate(()=>document.fonts.ready);}
    return p;
  };
  const scaleY=p=>p.getByTestId('resident-body').evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return Math.hypot(m.c,m.d);});
  const body=p=>p.getByTestId('resident-volume-odango').locator('path').first().getAttribute('d');
  const face=p=>p.getByTestId('resident-volume-odango').locator('path[stroke="#22271F"]').getAttribute('opacity');
  const pos=p=>p.getByTestId('room-resident').getAttribute('style');
  const hold=async p=>{const r=await p.getByTestId('room-resident').boundingBox();const at={x:r.x+r.width/2,y:r.y+r.height/2};await p.mouse.move(at.x,at.y);await p.mouse.down();await p.waitForFunction(()=>document.querySelector('[data-testid="room-resident"]').style.zIndex==='999');return at;};
  try{
    if(process.env.YOKI_QA_SECTION!=='meal'){
    const p=await open(),svg=p.getByTestId('resident-volume-odango');
    const saved=await p.evaluate(()=>localStorage.getItem('@mentore/progress_v2'));
    const front=await body(p);assert.equal(await face(p),'1');
    assert.ok(await svg.locator('image').evaluate(el=>!!el.getAttribute('href')),'original fur texture is bound');
    await shot(p,'odango-front');
    const start=await hold(p),scene=await p.getByTestId('world-stage').boundingBox();
    const sign=start.x>195?-1:1;
    await p.mouse.move(start.x+sign*scene.width*.125,start.y,{steps:15});await p.waitForTimeout(200);
    assert.notEqual(await body(p),front,'side silhouette is volume, not billboard rotation');assert.ok(await scaleY(p)<=1.001);await shot(p,'odango-held-side');
    await p.mouse.move(start.x+sign*scene.width*.25,start.y,{steps:15});await p.waitForTimeout(250);
    assert.equal(await face(p),'0','rear has no painted-on face');await shot(p,'odango-held-rear');
    await p.mouse.up();await p.waitForTimeout(1200);assert.ok(await scaleY(p)<=1.001,'landing never stretches vertically');
    await p.getByTestId('world-map-open').tap();await p.getByTestId('world-map-forest').tap();await p.waitForTimeout(450);
    const pad=await p.getByTestId('world-steering').boundingBox();await p.mouse.move(pad.x+48,pad.y+48);await p.mouse.down();await p.mouse.move(pad.x+48,pad.y+16,{steps:4});await p.waitForTimeout(900);
    assert.equal(await face(p),'0','walk away shows back');await p.mouse.up();await shot(p,'odango-walking-away');
    await p.getByTestId('room-resident').focus();await p.keyboard.press('ArrowRight');await p.waitForTimeout(250);
    assert.match(await p.getByTestId('room-resident').getAttribute('aria-label'),/ころころ/);await shot(p,'odango-roll');
    await p.getByTestId('home-daily-record').tap();const paused=await pos(p);await p.waitForTimeout(400);assert.equal(await pos(p),paused);await p.getByRole('button',{name:'閉じる',exact:true}).last().tap();
    await hold(p);await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await p.mouse.up();
    await p.waitForFunction(()=>document.querySelector('[data-testid="room-resident"]').style.zIndex!=='999');
    await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await p.evaluate(()=>localStorage.getItem('@mentore/progress_v2')),saved);await p.reload();await p.getByTestId('resident-volume-odango').waitFor();assert.equal(await p.evaluate(()=>localStorage.getItem('@mentore/progress_v2')),saved);await p.close();
    console.log('PASS original fur, front/side/rear hold, broad soft shape, travel yaw, rolling, modal/background interruption, saved growth');
    const flick=await open(),cdp=await flick.context().newCDPSession(flick);
    for(const axis of ['horizontal','vertical']){
      await flick.getByTestId('world-map-open').tap();await flick.getByTestId('world-map-forest').tap();await flick.waitForTimeout(300);
      const b=await flick.getByTestId('room-resident').boundingBox(),at={x:b.x+b.width/2,y:b.y+b.height/2};
      const initial=await body(flick),delta=axis==='horizontal'?{x:65,y:0}:{x:0,y:-65};
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[at]});await flick.waitForTimeout(25);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:at.x+delta.x*.45,y:at.y+delta.y*.45}]});await flick.waitForTimeout(20);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:at.x+delta.x,y:at.y+delta.y}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await flick.waitForTimeout(150);
      assert.match(await flick.getByTestId('room-resident').getAttribute('aria-label'),/ころころ/,axis+' finger flick rolls');assert.notEqual(await body(flick),initial);
      await hold(flick);await flick.mouse.up();await flick.waitForTimeout(1000);assert.ok(await scaleY(flick)<=1.001,'re-grab during roll lands without stretching');
      await flick.reload();await flick.getByTestId('resident-volume-odango').waitFor();
    }
    await flick.close();console.log('PASS real horizontal/vertical touch flicks and interrupted rolling re-grab');
    }
    const eating=await open(),openMouth=eating.getByTestId('resident-volume-odango').locator('path[stroke="#332A24"]'),cheek=eating.getByTestId('resident-volume-odango').locator('path[fill*="cheek"]').first();
    const restingCheek=await cheek.getAttribute('d');assert.equal(await openMouth.getAttribute('opacity'),'0');
    await eating.getByTestId('room-meal').tap();await eating.getByText('きのみ',{exact:true}).tap();await eating.getByTestId('world-food-offering').waitFor();
    await eating.clock.pauseAt(new Date(await eating.evaluate(()=>Date.now()+100)));
    let sawBite=false,sawChew=false;
    for(let i=0;i<30;i++){
      await eating.clock.runFor(80);
      if(!sawBite&&await openMouth.getAttribute('opacity')==='1'){
        sawBite=true;assert.ok(await scaleY(eating)<=1.001);
        const mouthX=await openMouth.evaluate(el=>{const b=el.getBBox();return b.x+b.width/2;});
        assert.ok(mouthX>45&&mouthX<55,'finish travel yaw before biting so food meets the front mouth');
        await shot(eating,'odango-meal-bite');
      }
      if(sawBite&&await openMouth.getAttribute('opacity')==='0'&&await cheek.getAttribute('d')!==restingCheek)sawChew=true;
    }
    assert.ok(sawBite,'shared meal sequence visibly opens odango mouth');assert.ok(sawChew,'chew moves cheeks after mouth closes');
    await eating.clock.runFor(8000);await eating.getByTestId('world-food-offering').waitFor({state:'hidden'});assert.equal(await openMouth.getAttribute('opacity'),'0');
    assert.equal(await eating.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),95);await eating.close();console.log('PASS odango bite/chew sequence, no stretch and single saved food debit');
    for(const viewport of [{width:320,height:568},{width:844,height:390}]){
      const q=await open({viewport,reduce:true});const still=await body(q);await q.waitForTimeout(700);assert.equal(await body(q),still);await hold(q);assert.ok(await scaleY(q)<=1.001);await q.mouse.up();
      await q.getByTestId('room-meal').tap();await q.getByText('きのみ',{exact:true}).tap();await q.getByTestId('world-food-offering').waitFor();await q.getByTestId('world-food-offering').waitFor({state:'hidden'});
      assert.equal(await q.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),95);await shot(q,'odango-reduced-'+viewport.width);await q.close();
    }
    assert.deepEqual(errors,[]);console.log('PASS reduced motion/small/landscape and food consumed once; no page errors');
  }catch(e){for(const [i,p] of browser.contexts().flatMap(c=>c.pages()).entries()){await shot(p,'failure-'+i);console.error((await p.locator('body').innerText()).slice(0,1200));}throw e;
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
