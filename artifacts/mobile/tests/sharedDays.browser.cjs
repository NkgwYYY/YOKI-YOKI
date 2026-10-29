// Run the real exported app with isolated guest saves and all external traffic blocked.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.YOKI_QA_PLAYWRIGHT||'playwright');
const root=fs.realpathSync(process.env.YOKI_QA_EXPORT),out=process.env.YOKI_QA_OUTPUT;
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
  const resolved=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(resolved!==root&&!resolved.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const file=fs.existsSync(resolved)&&fs.statSync(resolved).isFile()?resolved:path.join(root,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
const arc=n=>({episodes:Array.from({length:n},(_,i)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,choice:0}))});
let browser,activePage;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port,errors=[];
  browser=await chromium.launch({headless:true,executablePath:process.env.YOKI_QA_BROWSER,args:['--no-sandbox','--disable-dev-shm-usage']});
  const open=async({width=390,height=844,level=1,arcs={}}={})=>{
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',locale:'ja-JP',timezoneId:'Asia/Tokyo',serviceWorkers:'block'});
    const page=await context.newPage();activePage=page;page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-21T03:00:00Z'));
    await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/community/config'))return route.fulfill({contentType:'application/json',body:'{"enabled":false,"ads":false}'});if(url.origin!==origin||url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});return route.continue();});
    await page.addInitScript(({level,arcs})=>{
      if(localStorage.getItem('shared-days-qa'))return;
      const now=Date.parse('2026-10-21T03:00:00Z');
      const saved={
        '@mentore/profile_v1':{nickname:'検証',ageRange:'回答しない',gender:'回答しない'},
        '@mentore/progress_v2':{level,experience:level===1?0:4000,mentalMuscle:level===1?0:40,streak:0,totalDays:0,lastRecordDate:''},
        '@mentore/feed_state_v1':{points:200,lastFeedTime:new Date(now).toISOString(),satietyAtFeed:100,happiness:{value:75,updatedOn:'2026-10-21',updatedAt:now,lastSeenAt:now,days:{'2026-10-21':['visit']}},hygiene:{lastBathAt:now,protectedUntil:0},villageStories:{version:1,arcs}},
        '@mentore/encounters_v1':{list:[{charKey:'egg',metDate:'2026-10-01'}]},
        '@mentore/badges_v2':level>1?[{id:'levelUp5',unlockedAt:'2026-09-01T00:00:00Z'}]:[],
      };
      for(const [key,value] of Object.entries(saved))localStorage.setItem(key,JSON.stringify(value));
      localStorage.setItem('shared-days-qa','1');
    },{level,arcs});
    await page.goto(origin);await page.getByTestId('room-scene').waitFor();
    await page.waitForFunction(()=>!!JSON.parse(localStorage.getItem('@mentore/progress_v2')).worldAccess);
    return page;
  };
  const settled=page=>page.getByText('Loading...',{exact:true}).waitFor({state:'hidden'});
  const progress=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/progress_v2')));
  const map=async(page,id)=>{await page.getByTestId('world-map-open').click();await page.getByTestId('world-map-'+id).click();};
  const travel=async page=>{await page.getByTestId('world-map-travel').click();await page.getByTestId('village-map').waitFor({state:'hidden'});};
  const choose=async(page,speaker)=>{
    if(!await page.getByTestId('story-encounter-dialogue').isVisible())await page.getByRole('button',{name:speaker+'に話しかける',exact:true}).click();
    await page.getByTestId('story-choice-0').click();await page.getByTestId('story-path-invitation').waitFor();
  };
  for(const [width,height] of [[320,568],[390,844],[820,1180]]){
    const page=await open({width,height});
    assert.deepEqual((await progress(page)).worldAccess.unlocked,[]);
    await map(page,'onsen');
    assert.match(await page.getByTestId('village-map-selection').innerText(),/荷物を抱えたもふもふ/);
    const b=await page.getByTestId('world-map-travel').boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width&&b.y+b.height<=height);
    await settled(page);await page.screenshot({path:path.join(out,`story-map-${width}.png`)});
    await travel(page);await choose(page,'引っ越してきたもふもふ');
    assert.match(await page.getByTestId('story-path-invitation').innerText(),/森の温泉/);
    assert.deepEqual((await progress(page)).worldAccess.unlocked,['forest','onsen']);
    await settled(page);await page.screenshot({path:path.join(out,`story-invitation-${width}.png`)});
    await page.getByTestId('story-close').click();
    await map(page,'lake');assert.match(await page.getByTestId('world-map-story-guide').innerText(),/明日以降、暮らしのお店/);
    await page.getByRole('button',{name:'地図を閉じる',exact:true}).click();
    await map(page,'onsen');await travel(page);
    await map(page,'onsen');assert.match(await page.getByTestId('world-map-onsen').getAttribute('aria-label'),/いまここ/);
    await page.reload();await page.getByTestId('room-scene').waitFor();
    assert.deepEqual((await progress(page)).worldAccess.unlocked,['forest','onsen']);
    await page.goto(origin+'/growth');await page.getByTestId('album-details-toggle').click();
    const card=page.getByTestId('album-shared-days');await card.scrollIntoViewIfNeeded();
    assert.match(await card.innerText(),/累計 1日/);assert.match(await card.innerText(),/あと2日/);
    assert.doesNotMatch(await page.getByTestId('album-screen').innerText(),/Lv\.|\bXP\b|レベル|これまでの積み重ね/);
    await settled(page);await page.screenshot({path:path.join(out,`shared-days-album-${width}.png`)});
    await page.goto(origin+'/exchange-diary');await page.getByTestId('diary-write').click();await page.getByTestId('diary-mood-4').click();await page.getByTestId('diary-send').click();
    await page.getByTestId('diary-user-page').waitFor();await page.getByTestId('diary-home').click();await page.getByTestId('room-scene').waitFor();
    const recorded=await progress(page);assert.equal(recorded.level,1);assert.equal(recorded.experience,0);assert.equal(recorded.totalDays,1);assert.equal(recorded.visits.totalVisits,1);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points),205);
    console.log(`PASS ${width}x${height}: guided first conversation, immediate/persistent access, waiting hint, cumulative-only album, unchanged record rewards`);
    await page.context().close();
  }
  const legacy=await open({level:15});
  assert.equal((await progress(legacy)).visits.stage,'stage4');
  assert.deepEqual((await progress(legacy)).worldAccess.unlocked,['forest','onsen','village','lake']);
  await map(legacy,'lake');await travel(legacy);await map(legacy,'lake');assert.match(await legacy.getByTestId('world-map-lake').getAttribute('aria-label'),/いまここ/);
  await legacy.reload();await legacy.getByTestId('room-scene').waitFor();assert.equal((await progress(legacy)).visits.stage,'stage4');
  await legacy.goto(origin+'/growth');await legacy.getByTestId('album-details-toggle').click();await legacy.getByText('これまでの積み重ね',{exact:true}).waitFor();
  console.log('PASS legacy form, available destinations, retired badge and reload are preserved');await legacy.context().close();
  const {VILLAGE_STORIES}=await import('../data/villageStories.ts');
  for(const [id,arcs,destination] of [['cat',{newcomer:arc(6),cat:arc(5)},'lake']]){
    const page=await open({arcs}),episode=VILLAGE_STORIES.find(s=>s.id===id).episodes[5];
    await map(page,destination);await travel(page);
    if(id==='cat')await page.getByTestId('fortune-open').click();
    await choose(page,episode.speaker);assert.ok((await progress(page)).worldAccess.unlocked.includes(destination));
    await page.getByTestId('story-close').click();await map(page,destination);await travel(page);await map(page,destination);
    assert.match(await page.getByTestId('world-map-'+destination).getAttribute('aria-label'),/いまここ/);
    await page.reload();await page.getByTestId('room-scene').waitFor();assert.ok((await progress(page)).worldAccess.unlocked.includes(destination));
    console.log(`PASS ${id} ending opens ${destination} immediately and survives reload`);await page.context().close();
  }
  assert.deepEqual(errors,[]);
})().catch(async error=>{
  if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),await activePage.locator('body').innerText());}
  console.error(error);process.exitCode=1;
}).finally(async()=>{await browser?.close();server.close();});
