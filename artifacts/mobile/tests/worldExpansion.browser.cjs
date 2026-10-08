// Actual DOM, native-style two-finger touch events and isolated guest storage.
// This is browser QA, not an iOS/Android device or performance certification.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=path.resolve(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_SCREENSHOTS;
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
  let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(root,'index.html');
  res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const errors=[];
  const shot=async(p,name)=>{if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,name+'.jpg'),quality:94});}};
  const open=async({level=1,time='2026-10-07T12:00:00+09:00',viewport={width:390,height:844},reduce=false}={})=>{
    const p=await browser.newPage({viewport,locale:'ja-JP',timezoneId:'Asia/Tokyo',hasTouch:true,reducedMotion:reduce?'reduce':'no-preference'});
    p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:new Date(time)});
    await p.addInitScript(level=>{
      if(localStorage.getItem('expansion-seed'))return;
      localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'確認',ageRange:'回答しない',gender:'回答しない'}));
      localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'},{charKey:'odango',metDate:'2026-09-02'},{charKey:'happa',metDate:'2026-09-03'}]}));
      localStorage.setItem('@mentore/progress_v2',JSON.stringify({level,experience:0,mentalMuscle:0,streak:0,totalDays:0,lastRecordDate:''}));
      localStorage.setItem('expansion-seed','yes');
    },level);
    await p.goto(origin);await p.getByTestId('room-resident').waitFor();await p.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});await p.waitForTimeout(500);return p;
  };
  const reload=async p=>{await p.reload();await p.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});await p.waitForTimeout(500);};
  const scale=p=>p.getByTestId('world-stage').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
  const foot=p=>p.evaluate(()=>{const r=document.querySelector('[data-testid="room-resident"]').getBoundingClientRect(),s=document.querySelector('[data-testid="world-stage"]').getBoundingClientRect();return{x:(r.x+r.width/2-s.x)/s.width,y:(r.y+r.height*.92-s.y)/s.height};});
  try{
    if(process.env.YOKI_QA_SECTION!=='care'){
    const p=await open();const cdp=await p.context().newCDPSession(p);
    const initial=await foot(p),hud=await p.getByTestId('home-daily-record').boundingBox();
    const touches=(distance)=>[{x:195-distance,y:420,id:1},{x:195+distance,y:420,id:2}];
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches(30)});
    for(let d=34;d<=126;d+=4){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(d)});await p.waitForTimeout(25);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(350);
    assert.ok(await scale(p)>1.8,'real two-finger pinch enlarges world');assert.deepEqual(await p.getByTestId('home-daily-record').boundingBox(),hud,'HUD stays fixed');
    const afterPinch=await foot(p);assert.ok(Math.hypot(initial.x-afterPinch.x,initial.y-afterPinch.y)<.002,'pinch does not grab character');
    await shot(p,'expansion-pinch');
    await p.getByTestId('world-zoom-reset').tap();await p.waitForTimeout(400);assert.ok(Math.abs(await scale(p)-1)<.01);
    await p.getByTestId('world-zoom-in').tap();await p.getByTestId('world-zoom-in').tap();await p.waitForTimeout(400);
    let r=await p.getByTestId('room-resident').boundingBox();const bodyBefore=await p.getByTestId('resident-volume').locator('path').first().getAttribute('d');
    await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.waitForTimeout(380);
    await p.mouse.move(r.x+r.width/2+65,r.y+r.height/2-40,{steps:20});await p.waitForTimeout(180);
    assert.notEqual(await p.getByTestId('resident-volume').locator('path').first().getAttribute('d'),bodyBefore,'3D hold changes silhouette');await shot(p,'expansion-volume-held');
    await p.mouse.up();await p.waitForTimeout(1000);assert.ok(!(await p.getByTestId('room-resident').getAttribute('aria-label')).includes('ころころ'));
    await p.getByTestId('world-zoom-reset').tap();await p.waitForTimeout(800);
    r=await p.getByTestId('room-resident').boundingBox();
    const start={x:r.x+r.width/2,y:r.y+r.height/2,id:1};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await p.waitForTimeout(25);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...start,x:start.x+28,y:start.y+12}]});await p.waitForTimeout(20);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...start,x:start.x+65,y:start.y+24}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(150);
    assert.match(await p.getByTestId('room-resident').getAttribute('aria-label'),/ころころ/,'real finger flick rolls');
    await p.waitForTimeout(5500);assert.doesNotMatch(await p.getByTestId('room-resident').getAttribute('aria-label'),/ころころ/,'roll settles');
    await p.getByTestId('world-travel-room').tap();
    await p.waitForFunction(()=>document.querySelector('[data-testid="room-resident"]')?.getAttribute('aria-label')?.includes('ころころ'),undefined,{timeout:30000});
    console.log('PASS idle autonomous rolling without a touch');
    const beforeRoll=await foot(p);await p.getByTestId('room-resident').focus();await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(350);assert.match(await p.getByTestId('room-resident').getAttribute('aria-label'),/ころころ/);const rolling=await foot(p);assert.ok(Math.hypot(rolling.x-beforeRoll.x,rolling.y-beforeRoll.y)>.01);await shot(p,'expansion-roll');
    await p.getByTestId('home-daily-record').tap();const paused=await foot(p);await p.waitForTimeout(400);assert.deepEqual(await foot(p),paused,'sheet cancels rolling');
    await p.getByRole('button',{name:'閉じる',exact:true}).last().tap();
    await p.getByTestId('world-map-open').tap();await p.waitForTimeout(500);await shot(p,'expansion-maps-locked');assert.match(await p.getByTestId('world-map-forest').innerText(),/レベル3でひらきます/);await p.close();
    console.log('PASS pinch/HUD, zoom reset, held volumetric shape, rolling, modal pause, map locks');

    const q=await open({level:6,reduce:true});
    const balance=await q.evaluate(()=>localStorage.getItem('@mentore/progress_v2'));
    for(const id of ['forest','lake','home']){
      await q.getByTestId('world-map-open').tap();await q.getByTestId('world-map-'+id).tap();await q.waitForTimeout(500);
      if(id!=='home')assert.equal(await q.getByTestId('room-bed').count(),0,'no cottage furniture floats on outdoor maps');
      const s=await q.getByTestId('world-stage').boundingBox();await q.touchscreen.tap(s.x+s.width*.54,s.y+s.height*.68);await q.waitForTimeout(500);assert.ok(Math.abs((await foot(q)).y-.68)<.005);
      await shot(q,'expansion-map-'+id);
    }
    assert.equal(await q.evaluate(()=>localStorage.getItem('@mentore/progress_v2')),balance,'travel never mints XP');
    await q.getByTestId('world-navigation').getByRole('tab',{name:'ひかり',exact:true}).tap();await q.getByTestId('energy-garden').waitFor();await shot(q,'expansion-light-garden');await q.close();
    console.log('PASS level-gated maps, dry ground travel, return, no rewards, light garden');

    }
    if(process.env.YOKI_QA_SECTION!=='world'){
    const t=await open({time:'2026-10-07T19:59:40+09:00',reduce:true});
    assert.equal(await t.getByTestId('daily-record-invitation').count(),0);await t.clock.fastForward(30000);await t.getByTestId('daily-record-invitation').waitFor();await shot(t,'expansion-record-invitation');
    await t.getByTestId('record-prompt-snooze').tap();await t.getByTestId('daily-record-invitation').waitFor({state:'hidden'});await reload(t);await t.getByTestId('room-resident').waitFor();assert.equal(await t.getByTestId('daily-record-invitation').count(),0);
    await t.clock.fastForward(31*60000);await t.getByTestId('daily-record-invitation').waitFor();
    await t.getByRole('button',{name:'記録する時間を設定',exact:true}).tap();await t.getByTestId('record-prompt-time').fill('25:00');await t.getByTestId('record-prompt-save').tap();await t.getByText(/時刻は 20:00 のように/).waitFor();
    await t.getByTestId('record-prompt-time').fill('21:00');await t.getByTestId('record-prompt-save').tap();await t.getByText('記録する時間を保存しました。',{exact:true}).waitFor();await shot(t,'expansion-record-settings');
    await reload(t);await t.getByTestId('record-prompt-time').waitFor();await t.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});await t.waitForFunction(()=>document.querySelector('[data-testid="record-prompt-time"]')?.value==='21:00');assert.equal(await t.getByTestId('record-prompt-time').inputValue(),'21:00');
    await t.getByRole('button',{name:'戻る',exact:true}).tap();await t.getByTestId('room-resident').waitFor();assert.equal(await t.getByTestId('daily-record-invitation').count(),0);
    await t.clock.fastForward(31*60000);await t.getByTestId('daily-record-invitation').waitFor();await t.getByTestId('record-prompt-skip').tap();await reload(t);await t.getByTestId('room-resident').waitFor();assert.equal(await t.getByTestId('daily-record-invitation').count(),0);
    await t.clock.fastForward(24*60*60000);await t.getByTestId('daily-record-invitation').waitFor();await t.getByTestId('daily-record-invitation-open').tap();await t.getByTestId('quick-mood-3').tap();await t.getByTestId('quick-record-save').tap();await t.getByTestId('quick-record-save').waitFor({state:'hidden'});assert.equal(await t.getByTestId('daily-record-invitation').count(),0);await reload(t);await t.getByTestId('room-resident').waitFor();assert.equal(await t.getByTestId('daily-record-invitation').count(),0);await t.close();
    console.log('PASS configured time, invalid input, snooze and reload, skip one day, save and reload');
    }
    assert.deepEqual(errors,[]);console.log('PASS no page errors');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
