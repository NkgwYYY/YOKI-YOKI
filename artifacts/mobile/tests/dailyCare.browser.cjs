'use strict';
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
const root = fs.realpathSync(process.env.YOKI_QA_EXPORT);
const output = path.resolve(process.env.YOKI_QA_OUTPUT || '/tmp/yoki-care-browser');
fs.mkdirSync(output, {recursive: true});
const mime = {'.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.ttf':'font/ttf', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.ico':'image/x-icon'};
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {res.writeHead(403).end(); return;}
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch {res.writeHead(400).end();}
});
const results = [];
let browser;
function seed() {
  if (localStorage.getItem('daily-care-qa')) return;
  const now = new Date(), day = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const data = {
    '@mentore/profile_v1': {nickname:'操作確認', ageRange:'30代', gender:'回答しない'},
    '@mentore/feed_state_v1': {points:200, lastFeedTime:Date.now(), satietyAtFeed:20},
    '@mentore/records_v2': [{date:day,mood:4,sleep:7,sleepRecorded:true,behaviors:[],activities:{},notes:'検証用の記録',win:'',exercise:0}],
  };
  Object.entries(data).forEach(([key,value]) => localStorage.setItem(key, JSON.stringify(value)));
  localStorage.setItem('daily-care-qa', 'true');
}
async function check(name, fn) {
  try {await fn(); results.push({name, status:'passed'}); console.log('PASS ' + name);}
  catch (error) {results.push({name, status:'failed', error:String(error)}); throw error;}
}
async function visibleFit(page, id) {
  const element = page.getByTestId(id);
  await element.waitFor({state:'visible'});
  const box = await element.boundingBox(), size = page.viewportSize();
  assert.ok(box && box.width > 0 && box.height > 0, id + ' has visible geometry');
  assert.ok(box.x >= -1 && box.y >= -1 && box.x+box.width <= size.width+1 && box.y+box.height <= size.height+1,
    id + ' inside viewport: ' + JSON.stringify({box,size}));
  return box;
}
function separate(a,b,label) {
  assert.ok(a.x+a.width<=b.x+1 || b.x+b.width<=a.x+1 || a.y+a.height<=b.y+1 || b.y+b.height<=a.y+1,
    label + ' must not overlap: ' + JSON.stringify({a,b}));
}
async function saveFailure(page, errors, label) {
  await page.screenshot({path:path.join(output,'failure-'+label+'.png')}).catch(()=>{});
  const body = await page.locator('body').innerText().catch(()=> 'Page unavailable');
  fs.writeFileSync(path.join(output,'failure-'+label+'.txt'),body.slice(0,10000)+'\nERRORS\n'+JSON.stringify(errors));
  console.log('FAILURE_SCREEN_TEXT ' + JSON.stringify(body.slice(0,3000)));
}
async function createPage(viewport, base) {
  const context = await browser.newContext({viewport, reducedMotion:'reduce', locale:'ja-JP', timezoneId:'Asia/Tokyo', serviceWorkers:'block'});
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    // The real UI and local care store are used. Only remote services are unavailable.
    // Never hit the production database, authentication, analytics or real advertisements.
    if (url.pathname.endsWith('/community/config')) return route.fulfill({contentType:'application/json', body:JSON.stringify({enabled:false,ads:false,passSales:false,bonusPoints:30,dailyLimit:3})});
    if (url.origin !== base || url.pathname.startsWith('/api/')) return route.fulfill({status:503,contentType:'application/json',body:'{"error":"isolated browser QA"}'});
    return route.continue();
  });
  await page.addInitScript(seed);
  try {
    await page.goto(base);
    await page.getByTestId('room-scene').waitFor({state:'visible'});
    await page.getByTestId('world-stage').waitFor({state:'visible'});
    // A fresh profile really discovers the egg. Close that legitimate modal through
    // its UI; do not force-click through a backdrop or mutate the encounter store.
    await check(`${viewport.width}x${viewport.height} first encounter can be acknowledged`, async () => {
      await page.getByTestId('new-friend-card').waitFor({state:'visible'});
      await page.getByRole('button',{name:'よろしくね！',exact:true}).click();
      await page.getByTestId('new-friend-card').waitFor({state:'hidden'});
    });
    return {context, page, errors};
  } catch (error) {await saveFailure(page,errors,'startup-'+viewport.width+'x'+viewport.height);await context.close();throw error;}
}
async function travel(page, map) {
  await page.getByTestId('world-map-open').click();
  await page.getByTestId('world-map-' + map).click();
  await page.getByTestId('world-map-travel').click();
  await page.getByTestId('village-map').waitFor({state:'hidden'});
  await page.getByTestId('world-map-open').waitFor({state:'visible'});
  // Reopen the actual atlas to assert its current-location marker, not merely a click.
  await page.getByTestId('world-map-open').click();
  assert.match(await page.getByTestId('world-map-' + map).getAttribute('aria-label'), /いまここ/);
  await page.getByRole('button',{name:'地図を閉じる',exact:true}).click();
}
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  for (const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390}]) {
    const label = viewport.width + 'x' + viewport.height;
    const {context,page,errors} = await createPage(viewport,base);
    try {
      await check(label + ' HOME controls fit and unsupported native ads leave no rail', async () => {
        for (const id of ['home-points','home-more-menu','world-map-open','world-navigation']) await visibleFit(page,id);
        const steering = await visibleFit(page,'world-steering-frame');
        separate(steering,await visibleFit(page,'world-map-open'),'steering and travel');
        separate(steering,await visibleFit(page,'world-navigation'),'steering and navigation');
        assert.equal(await page.locator('[data-testid^="daily-ad-rail-"]').count(),0);
        assert.equal(await page.locator('[data-testid^="daily-ad-reward-"]').count(),0);
      });
      await check(label + ' points sheet opens and ordinary food remains usable', async () => {
        await page.getByTestId('home-points').click();
        await page.getByRole('button',{name:'ごはんを選ぶ',exact:true}).click();
        const food = page.getByRole('button',{name:/、\d+ポイント、満腹度プラス/}).first();
        await food.waitFor({state:'visible'});
        const label = await food.getAttribute('aria-label');
        const cost = Number(label.match(/、(\d+)ポイント/)[1]);
        const before = await page.evaluate(() => JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points);
        assert.ok(cost > 0 && before >= cost);
        await food.click();
        await page.waitForFunction(({before,cost}) => JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points === before-cost,{before,cost});
        await page.reload();
        await page.getByTestId('room-scene').waitFor({state:'visible'});
        const after = await page.evaluate(() => JSON.parse(localStorage.getItem('@mentore/feed_state_v1')).points);
        assert.equal(after,before-cost);
      });
      await check(label + ' HOME menu opens and closes', async () => {
        await page.getByTestId('home-more-menu').click();
        await page.getByText('この部屋でできること',{exact:true}).waitFor({state:'visible'});
        await page.getByRole('button',{name:'閉じる',exact:true}).last().click();
        await page.getByText('この部屋でできること',{exact:true}).waitFor({state:'hidden'});
      });
      await check(label + ' actual atlas travels to street and returns home', async () => {await travel(page,'market'); await travel(page,'home');});
      await check(label + ' no uncaught browser errors', async () => assert.deepEqual(errors,[]));
      await page.screenshot({path:path.join(output,'home-'+label+'.png')});
    } catch (error) {await saveFailure(page,errors,label);throw error;}
    finally {await context.close();}
  }
  const {context,page,errors} = await createPage({width:390,height:844},base);
  try {
    await check('workshop merchant opens the real egg-job route',async()=>{
      await travel(page,'workshop');
      await page.getByTestId('merchant-egg-job').click();
      const action = page.getByTestId('egg-job-action');
      const introduction = page.getByRole('button',{name:'バイトを始める',exact:true});
      await Promise.race([action.waitFor({state:'visible'}),introduction.waitFor({state:'visible'})]);
      if (await introduction.isVisible()) await introduction.click();
      await action.waitFor({state:'visible'});
      await visibleFit(page,'egg-job-action'); await visibleFit(page,'egg-job-back');
      assert.deepEqual(errors,[]);
    });
    await page.screenshot({path:path.join(output,'workshop-390x844.png')});
  } catch (error) {await saveFailure(page,errors,'workshop');throw error;}
  finally {await context.close();}
})().catch(error => {console.error(error);process.exitCode=1;}).finally(async () => {
  fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({results,realCurrentWebApp:true,realNativeAds:false,remoteServices:'isolated unavailable fixtures'},null,2));
  console.log(JSON.stringify({type:'browser:summary',passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length}));
  await browser?.close();server.close();
});
