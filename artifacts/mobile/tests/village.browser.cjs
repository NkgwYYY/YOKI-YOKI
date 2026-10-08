// Actual exported UI with isolated guest data; no production account or native-device claim.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
const root = path.resolve(process.env.YOKI_QA_EXPORT);
const out = process.env.YOKI_QA_SCREENSHOTS;
const mime = {'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.mp4':'video/mp4'};
const server = http.createServer((req,res) => {
  if(req.url.startsWith('/__qa_fonts/') && process.env.YOKI_QA_FONT_DIR){
    const font=path.join(process.env.YOKI_QA_FONT_DIR,'files',path.basename(req.url));
    res.setHeader('Content-Type','font/woff2');fs.createReadStream(font).pipe(res);return;
  }
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if (file !== root && !file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file=path.join(root,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  let args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'];
  if(process.env.YOKI_QA_CHROMIUM_BUNDLE) args=(await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(a=>a!=='--single-process');
  const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args});
  const errors=[];
  const shot=async(p,name)=>{if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.png')});}};
  const open=async({level=6,reduce=true,viewport={width:390,height:844}}={})=>{
    const p=await browser.newPage({viewport,hasTouch:true,locale:'ja-JP',timezoneId:'Asia/Tokyo',reducedMotion:reduce?'reduce':'no-preference'});
    p.setDefaultTimeout(12000);
    p.on('pageerror',e=>errors.push(e.message));
    await p.clock.install({time:new Date('2026-10-08T12:00:00+09:00')});
    await p.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
    await p.addInitScript(level=>{
      if(localStorage.getItem('village-qa-seeded'))return;
      localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'確認',ageRange:'回答しない',gender:'回答しない'}));
      localStorage.setItem('@mentore/feed_state_v1',JSON.stringify({points:100,lastFeedTime:null,satietyAtFeed:50}));
      localStorage.setItem('@mentore/progress_v2',JSON.stringify({level,experience:0,mentalMuscle:0,streak:0,totalDays:0,lastRecordDate:''}));
      localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
      localStorage.setItem('village-qa-seeded','yes');
    },level);
    await p.goto(origin);await p.getByTestId('room-resident').waitFor();
    await p.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});await p.waitForTimeout(350);
    if(process.env.YOKI_QA_FONT_DIR){
      const css=fs.readFileSync(path.join(process.env.YOKI_QA_FONT_DIR,'400.css'),'utf8').replaceAll('./files/','/__qa_fonts/');
      await p.addStyleTag({content:css+'\n[dir="auto"]:not([style*="font-family"]) {font-family:"Noto Sans JP",sans-serif !important}'});
      await p.evaluate(()=>document.fonts.ready);
    }
    return p;
  };
  const map=async(p,id)=>{await p.getByTestId('world-map-open').tap();await p.getByTestId('world-map-'+id).tap();await p.waitForTimeout(400);};
  const foot=p=>p.evaluate(()=>{const r=document.querySelector('[data-testid="room-resident"]').getBoundingClientRect(),s=document.querySelector('[data-testid="world-stage"]').getBoundingClientRect();return{x:(r.x+r.width/2-s.x)/s.width,y:(r.y+r.height*.92-s.y)/s.height};});
  const bounds=async(p,id)=>{const b=await p.getByTestId(id).boundingBox(),v=p.viewportSize();assert.ok(b&&b.x>=-1&&b.y>=-1&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1,`${id} out of viewport ${JSON.stringify(b)}`);};
  try{
    if(process.env.YOKI_QA_SECTION==='bath-visual'){
      for(const viewport of [{width:390,height:844},{width:320,height:568}]){
        const p=await open({viewport});await map(p,'onsen');await p.getByTestId('village-bath').tap();await p.getByTestId('village-bathing').waitFor();
        await bounds(p,'village-experience-exit');await shot(p,'village-bath-final-'+viewport.width);await p.getByTestId('village-experience-exit').tap();await p.close();
      }
      assert.deepEqual(errors,[]);console.log('PASS final bathing visual/exit at phone and small sizes');return;
    }
    const p=await open();
    await shot(p,'village-home');
    assert.equal(await p.getByTestId('world-steering').count(),1,'one fixed steering control, not a duplicate in each furniture hotspot');
    const progress=await p.evaluate(()=>localStorage.getItem('@mentore/progress_v2'));
    await map(p,'market');await shot(p,'village-market');
    await p.getByTestId('village-shop').tap();await p.waitForURL('**/shop');await p.getByRole('button',{name:'戻る',exact:true}).tap();await p.getByTestId('room-resident').waitFor();await map(p,'market');
    const at=await foot(p);await p.getByTestId('world-steering').focus();await p.keyboard.press('ArrowRight');await p.waitForTimeout(350);
    assert.ok((await foot(p)).x>at.x+.03,'keyboard steering changes position');
    await p.getByTestId('village-portal-village').tap();await p.getByTestId('village-neighbor-suzu').waitFor();
    await p.getByTestId('village-neighbor-suzu').tap();await p.getByTestId('village-dialogue').waitFor();
    assert.match(await p.getByTestId('village-dialogue').innerText(),/急がなくていい村/);
    await p.getByRole('button',{name:'少し疲れたな',exact:true}).tap();
    assert.match(await p.getByTestId('village-dialogue').innerText(),/話さなくても大丈夫/);await shot(p,'village-conversation');
    await p.getByRole('button',{name:'またね',exact:true}).tap();
    await p.getByTestId('village-portal-onsen').tap();await p.getByTestId('village-bath').waitFor();
    await p.getByTestId('village-bath').tap();await p.getByTestId('village-bathing').waitFor();
    assert.equal(await p.getByTestId('village-experience-exit').count(),1);await bounds(p,'village-experience-exit');await shot(p,'village-bathing');
    assert.equal(await p.getByTestId('room-resident').getAttribute('aria-hidden'),'true','hidden ground resident is removed from accessibility while bathing');
    await p.getByTestId('village-experience-exit').tap();await p.getByTestId('village-bathing').waitFor({state:'hidden'});
    await map(p,'lake');await p.getByTestId('village-ride').tap();await p.getByTestId('village-experience-exit').waitFor();await shot(p,'village-wheel');
    await p.getByTestId('village-experience-exit').tap();await p.getByTestId('village-experience-exit').waitFor({state:'hidden'});
    await map(p,'forest');await p.getByTestId('village-portal-home').tap();await p.getByTestId('room-bed').waitFor();
    assert.equal(await p.evaluate(()=>localStorage.getItem('@mentore/progress_v2')),progress,'travel and activities never mint XP');
    console.log('PASS six destinations, portal travel, keyboard steering, NPC dialogue, bath and wheel exit, no XP');
    await map(p,'market');await p.getByTestId('village-food-stall').tap();await p.getByText('きのみ',{exact:true}).tap();
    await p.getByTestId('world-food-offering').waitFor();await shot(p,'village-meal');
    const feed=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')));
    assert.equal((await feed()).points,95);
    await p.getByTestId('room-meal').tap();assert.equal(await p.getByText('きのみ',{exact:true}).count(),0,'re-feeding blocked during saved meal');
    await p.getByTestId('world-food-offering').waitFor({state:'hidden'});assert.equal((await feed()).points,95);
    await p.reload();await p.getByTestId('room-resident').waitFor();assert.equal((await feed()).points,95);
    console.log('PASS market food transaction returns home, visible meal, re-entry guard, one debit and saved reload');
    await p.close();
    const moving=await open({reduce:false});await map(moving,'market');
    const pad=await moving.getByTestId('world-steering').boundingBox(),before=await foot(moving);
    const cdp=await moving.context().newCDPSession(moving),touch={x:pad.x+pad.width/2,y:pad.y+pad.height/2,id:1};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touch,x:touch.x+28}]});
    await moving.waitForTimeout(550);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const released=await foot(moving);assert.ok(released.x>before.x+.045,'real finger steering moves continuously');
    await moving.waitForTimeout(250);assert.ok(Math.abs((await foot(moving)).x-released.x)<.004,'release stops steering');
    await moving.getByTestId('home-daily-record').tap();const paused=await foot(moving);await moving.waitForTimeout(400);assert.deepEqual(await foot(moving),paused);
    await moving.getByRole('button',{name:'閉じる',exact:true}).last().tap();
    await map(moving,'lake');await moving.getByTestId('village-ride').tap();await moving.getByTestId('village-experience-exit').waitFor();
    const rotor=moving.getByTestId('village-wheel').locator('g[transform^="rotate"]').first();
    const angle=await rotor.getAttribute('transform');await moving.waitForTimeout(800);assert.notEqual(await rotor.getAttribute('transform'),angle,'wheel rotates with passenger');
    await moving.getByTestId('world-map-open').tap();await moving.waitForTimeout(200);const stopped=await rotor.getAttribute('transform');await moving.waitForTimeout(350);assert.equal(await rotor.getAttribute('transform'),stopped,'map sheet pauses the ride');
    await moving.getByRole('button',{name:'閉じる',exact:true}).last().tap();await moving.waitForTimeout(350);assert.notEqual(await rotor.getAttribute('transform'),stopped,'ride resumes after sheet closes');
    await shot(moving,'village-wheel-moving');await moving.clock.fastForward(25000);await moving.getByTestId('village-experience-exit').waitFor({state:'hidden'});await moving.close();
    const eating=await open({level:1,reduce:false});await eating.getByTestId('room-meal').tap();await eating.getByText('きのみ',{exact:true}).tap();await eating.getByTestId('world-food-offering').waitFor();
    // Pause the real page clock so screenshot/font timing cannot skip a bite.
    await eating.clock.pauseAt(new Date(await eating.evaluate(()=>Date.now()+100)));
    const opacity=i=>eating.getByTestId('meal-portion-'+i).evaluate(el=>Number(getComputedStyle(el).opacity));
    await eating.clock.runFor(1700);assert.equal(await opacity(0),0);assert.equal(await opacity(2),1);await shot(eating,'village-meal-bite');
    await eating.clock.runFor(2800);assert.equal(await opacity(2),0);await shot(eating,'village-meal-swallow');
    await eating.clock.runFor(4000);await eating.getByTestId('world-food-offering').waitFor({state:'hidden'});await eating.close();
    console.log('PASS real touch steering/release, modal pause, rotating wheel/pause/resume/automatic exit, visible portions disappear in order');
    for(const viewport of [{width:320,height:568},{width:844,height:390}]){
      const q=await open({viewport});await bounds(q,'world-steering');await bounds(q,'home-daily-record');
      for(const id of ['home','market','forest','onsen','village','lake']){
        await map(q,id);
        // Landscape intentionally follows the resident: walk down to the exits
        // before checking them, rather than requiring the whole map on screen.
        if(viewport.width>viewport.height){
          if(id==='home')await q.getByTestId('world-travel-garden').tap();
          else {await q.getByTestId('world-steering').focus();for(let i=0;i<3;i++){await q.keyboard.press('ArrowDown');await q.waitForTimeout(150);}}
          await q.waitForTimeout(400);
        }
        for(const sign of await q.locator('[data-testid^="village-portal-"]').all()){
          assert.ok(await sign.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),`${id} return/exit sign is obscured at ${viewport.width}`);
        }
      }
      await map(q,'onsen');await q.getByTestId('village-bath').tap();await q.getByTestId('village-bathing').waitFor();await bounds(q,'village-experience-exit');await shot(q,'village-bath-'+viewport.width);await q.getByTestId('village-experience-exit').tap();await q.close();
    }
    const locked=await open({level:1});await map(locked,'market');await locked.getByTestId('village-portal-village').tap();
    await locked.getByText(/となりの村はレベル4でひらきます/).waitFor();await locked.getByTestId('village-shop').waitFor();await locked.close();
    assert.deepEqual(errors,[]);console.log('PASS level locks, small/landscape controls, no page errors');
  }catch(e){for(const [i,p] of browser.contexts().flatMap(c=>c.pages()).entries()){await shot(p,'failure-'+i);console.error((await p.locator('body').innerText()).slice(0,2000));}throw e;
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
