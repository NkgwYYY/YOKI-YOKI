// Run against a fresh Expo Web export; fixtures never contact a production account.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
const root = path.resolve(process.env.YOKI_QA_EXPORT || '../../../build-yoki-v3');
const out = process.env.YOKI_QA_SCREENSHOTS;
const mime = {'.html':'text/html','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server = http.createServer((req,res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) && file !== root) {res.writeHead(403).end();return;}
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root,'index.html');
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
async function seed(page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('qa-seeded')) return;
    localStorage.setItem('@mentore/profile_v1',JSON.stringify({nickname:'ゆき',ageRange:'回答しない',gender:'回答しない'}));
    localStorage.setItem('@mentore/mascot_name_v1','よっきー');
    localStorage.setItem('@mentore/feed_state_v1',JSON.stringify({points:100,lastFeedTime:null,satietyAtFeed:50}));
    localStorage.setItem('@mentore/encounters_v1',JSON.stringify({list:[{charKey:'egg',metDate:'2026-09-01'}]}));
    localStorage.setItem('qa-seeded','true');
  });
}
(async()=>{
  if (!process.env.YOKI_QA_ORIGIN) await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin = process.env.YOKI_QA_ORIGIN || 'http://127.0.0.1:'+server.address().port;
  let args = ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'];
  if (process.env.YOKI_QA_CHROMIUM_BUNDLE) args = (await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(arg=>arg!=='--single-process');
  const browser = await chromium.launch({executablePath:process.env.YOKI_QA_BROWSER,headless:true,args});
  const errors=[];
  const shot=async(page,name)=>{if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,name+'.jpg'),quality:90});}};
  const open=async(viewport,night=false,reducedMotion='no-preference')=>{
    const page=await browser.newPage({viewport,locale:'ja-JP',timezoneId:'Asia/Tokyo',hasTouch:true,reducedMotion});
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time: new Date(night?'2026-10-05T21:00:00+09:00':'2026-10-05T09:00:00+09:00')});
    await seed(page);
    await page.goto(origin);
    await page.getByTestId('room-scene').waitFor({state:'visible',timeout:30000});
    await page.getByText('Loading...', {exact:true}).waitFor({state:'hidden'});
    await page.waitForTimeout(500);
    return page;
  };
  const inBounds=async(page,id)=>{
    const b=await page.getByTestId(id).boundingBox(),v=page.viewportSize();
    assert.ok(b && b.x>=0 && b.y>=0 && b.x+b.width<=v.width+1 && b.y+b.height<=v.height+1,`${id} outside viewport: ${JSON.stringify(b)}`);
  };
  try {
    if (!process.env.YOKI_QA_VIEWPORT_ONLY) {
    const page=await open({width:390,height:844});
    const resident=page.getByTestId('room-resident');
    const pose=async text=>page.waitForFunction(t=>document.querySelector('[data-testid="room-resident"]')?.getAttribute('aria-label')?.includes(t),text,{timeout:20000});
    const speech=async text=>page.getByTestId('world-speech').filter({hasText:text}).waitFor();
    await shot(page,'home-day-phone');
    await resident.click();await speech('きてくれた');
    assert.equal(await page.getByText('少し、お話しする',{exact:true}).count(),0);
    let b=await resident.boundingBox();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
    // A slow stroke pets; a fast flick now rolls (covered by worldExpansion).
    for(let dx=12;dx<=48;dx+=12){await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2);await page.waitForTimeout(70);}
    await page.mouse.up();
    await speech('なでなで');
    b=await resident.boundingBox();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(350);
    await speech('抱っこ');
    assert.equal(await resident.evaluate(el=>el.style.zIndex),'999');
    await page.mouse.move(b.x+b.width/2+20,b.y+b.height/2-45,{steps:5});await page.mouse.up();
    await speech('ぽふっ');
    assert.notEqual(await resident.evaluate(el=>el.style.zIndex),'999');
    console.log('PASS greeting, pet, lift and soft landing');
    await page.getByTestId('room-bed').click();await pose('ひと休みしています');
    await shot(page,'home-rest-phone');
    await page.getByTestId('home-more-menu').click();
    const paused=await resident.getAttribute('style');await page.waitForTimeout(1000);
    assert.equal(await resident.getAttribute('style'),paused);
    assert.equal(await page.getByText(/音楽であそぶ|ミニゲーム|PLAY/).count(),0);
    await page.getByLabel('閉じる',{exact:true}).last().click();
    await page.getByTestId('room-meal').click();
    await page.getByText('きのみ',{exact:true}).click();
    await page.getByTestId('world-food-offering').waitFor();
    await pose('おやつの時間');await shot(page,'home-meal-phone');
    const feed=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')));
    assert.equal((await feed()).points,95);
    await page.getByTestId('world-food-offering').waitFor({state:'hidden'});
    await speech('ごちそうさま');
    assert.equal((await feed()).points,95);
    console.log('PASS bed route, paused routines, food offered/eaten/cleared, single debit, no games');
    await page.getByTestId('home-daily-record').click();
    await page.getByTestId('quick-mood-3').click();await shot(page,'record-phone');
    await page.getByTestId('quick-record-save').click();
    await page.getByTestId('light-flow-feedback').waitFor();await shot(page,'record-light-phone');
    await page.getByTestId('light-flow-garden').click();await page.getByTestId('energy-garden').waitFor();
    await shot(page,'energy-phone');
    await page.getByRole('tab',{name:'おうち',exact:true}).click();
    await page.getByTestId('home-daily-record').click();await page.getByTestId('quick-mood-4').click();await page.getByTestId('quick-record-save').click();
    await page.waitForTimeout(600);assert.equal(await page.getByTestId('light-flow-feedback').count(),0);
    await page.getByRole('tab',{name:'思い出',exact:true}).click();await page.waitForTimeout(400);await shot(page,'album-phone');
    console.log('PASS record→light→garden, same-day update without repeated gain, three-tab navigation');
    await page.close();
    }
    for (const [name,width,height,night] of [['small',320,568,false],['tablet',820,1180,false],['wide',844,390,false],['night',390,844,true]]) {
      if (process.env.YOKI_QA_VIEWPORT && name !== process.env.YOKI_QA_VIEWPORT) continue;
      const p=await open({width,height},night,'reduce');
      // A due invitation intentionally foregrounds daily care. Dismiss it before testing furniture hit targets.
      if(await p.getByTestId('record-prompt-snooze').count())await p.getByTestId('record-prompt-snooze').tap();
      for(const id of ['room-resident','room-record','room-meal','room-bed','room-album','home-daily-record','home-chat','world-navigation']) {
        await inBounds(p,id);
        assert.ok(await p.getByTestId(id).evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),`${name}: ${id} is obscured`);
      }
      await shot(p,'home-'+name);
      const before=await p.getByTestId('room-resident').getAttribute('style');
      await p.getByTestId('room-bed').click();await p.waitForTimeout(600);
      assert.equal(await p.getByTestId('room-resident').getAttribute('style'),before);
      await p.getByTestId('room-meal').tap();await p.getByText('きのみ',{exact:true}).tap();
      await p.getByTestId('world-food-offering').waitFor();await p.getByTestId('world-food-offering').waitFor({state:'hidden'});
      await p.getByTestId('home-chat').tap();await p.getByText('少し、お話しする',{exact:true}).waitFor();
      await p.getByLabel('閉じる',{exact:true}).last().tap();
      await p.getByTestId('home-daily-record').tap();await p.getByTestId('quick-mood-3').tap();
      await inBounds(p,'quick-record-save');await shot(p,'record-'+name);await p.getByTestId('quick-record-save').tap();
      await p.getByTestId('light-flow-feedback').waitFor();
      assert.equal(await p.getByTestId('light-flow-particle').count(),0);
      await p.reload();await p.getByTestId('room-scene').waitFor();await p.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
      assert.equal(await p.getByTestId('light-flow-feedback').count(),0);
      await p.close();console.log(`PASS ${name}: reachable controls, touch feeding/chat/record, static motion, saved reload`);
    }
    assert.deepEqual(errors,[]);console.log('PASS no page errors');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
