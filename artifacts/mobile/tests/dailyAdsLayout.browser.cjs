'use strict';
// Real placement components with a synthetic SDK: never contact real ads/services.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
const mobile = path.resolve(__dirname, '..');
const esbuild = require(require.resolve('esbuild', {paths: [path.resolve(mobile, '../api-server')]}));
const babel = require(require.resolve('@babel/core', {paths:[mobile]}));
const workletsPlugin = require.resolve('react-native-worklets/plugin', {paths:[mobile]});
const output = path.resolve(process.env.YOKI_QA_OUTPUT || '/tmp/yoki-ad-layout');
const packageRoot = name => path.dirname(require.resolve(name + '/package.json', {paths: [mobile]}));
const results = [];
let browser, server;
const box = async (page, id) => {
  const value = await page.getByTestId(id).boundingBox();
  assert.ok(value, id + ' has geometry');
  return value;
};
const relative = (value, origin) => ({x: value.x-origin.x, y:value.y-origin.y, width:value.width, height:value.height});
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function measure(page) {
  const outer = await box(page, 'fixture-home');
  return {
    canvas: relative(await box(page, 'home-world-canvas'), outer),
    resident: relative(await box(page, 'fixture-resident'), outer),
    care: relative(await box(page, 'fixture-care'), outer),
    dock: relative(await box(page, 'fixture-dock'), outer),
  };
}
function sameScene(before, after) {
  assert.deepEqual(after.canvas, before.canvas, 'ad lifecycle never changes the camera canvas');
  assert.deepEqual(after.resident, before.resident, 'ad lifecycle never changes resident scale/position');
  assert.deepEqual(after.dock, before.dock, 'navigation remains in its safe bottom space');
}
async function check(name, operation) {
  await operation(); results.push({name, status: 'passed'}); console.log('PASS '+name);
}
(async () => {
  fs.mkdirSync(output, {recursive: true});
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'dailyAds.browser-fixture.tsx')], bundle: true, platform: 'browser',
    outfile: path.join(output, 'app.js'),
    define: {'global':'globalThis', 'process.env': '{}', 'process.env.NODE_ENV': '"development"', '__DEV__': 'true', 'process.env.EXPO_OS': '"web"'},
    alias: {'react-native': packageRoot('react-native-web'), 'react-native-svg': packageRoot('react-native-svg')+'/src/ReactNativeSVG.web.ts'},
    resolveExtensions: ['.web.tsx','.web.ts','.web.js','.tsx','.ts','.js','.json'],
    mainFields: ['browser','module','main'], loader: {'.png': 'dataurl', '.webp':'dataurl'},
    tsconfig: path.join(mobile, 'tsconfig.json'),
    plugins: [{name:'fixture-worklets', setup(build) {
      build.onLoad({filter:/\.[jt]sx?$/}, async args => {
        if(!args.path.startsWith(mobile+path.sep) && !/node_modules\/.pnpm\/react-native-(reanimated|worklets)@/.test(args.path)) return;
        const js = await esbuild.transform(fs.readFileSync(args.path,'utf8'), {loader:args.path.endsWith('.tsx')?'tsx':args.path.endsWith('.ts')?'ts':'jsx', jsx:'automatic'});
        const transformed = await babel.transformAsync(js.code, {filename:args.path, babelrc:false, configFile:false, plugins:[workletsPlugin]});
        return {contents:transformed.code, loader:'js'};
      });
    }}],
  });
  fs.writeFileSync(path.join(output, 'index.html'), '<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script src="/app.js"></script></html>');
  server = http.createServer((request, response) => {
    const script = request.url === '/app.js';
    response.setHeader('Content-Type', script ? 'text/javascript' : 'text/html');
    fs.createReadStream(path.join(output, script ? 'app.js' : 'index.html')).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({headless:true, executablePath:process.env.YOKI_QA_CHROMIUM, args:['--no-sandbox','--disable-dev-shm-usage']});
  const context = await browser.newContext({viewport:{width:1000,height:1400}, reducedMotion:'reduce'});
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => {errors.push(error.message); console.error('FIXTURE_RUNTIME_ERROR '+error.message);});
  const fresh = async () => {
    await page.goto(origin);
    await page.getByTestId('daily-ad-loading-home').waitFor({state:'attached'});
    await page.waitForFunction(() => document.getElementById('mounts')?.textContent === '1');
    await settle(page);
    return measure(page);
  };
  const press = async label => {await page.getByRole('button',{name:label,exact:true}).click(); await settle(page);};
  let initial = await fresh();
  await check('before real load: zero-height rail and stable full canvas', async () => {
    const loading = await box(page,'daily-ad-loading-home');
    assert.equal(loading.height,0);
    assert.equal(initial.canvas.height,760);
    assert.ok(initial.care.y+initial.care.height < initial.dock.y);
  });
  await check('after load: care controls, banner, close control and navigation do not overlap', async () => {
    await press('load banner');
    const outer=await box(page,'fixture-home'), rail=relative(await box(page,'daily-ad-rail-home'),outer);
    const loaded=await measure(page), close=relative(await box(page,'daily-ad-close-home'),outer);
    sameScene(initial,loaded);
    assert.equal(rail.height,182);
    assert.ok(loaded.care.y+loaded.care.height <= rail.y-11);
    assert.ok(rail.y+112 <= loaded.dock.y);
    assert.equal(close.width,44); assert.equal(close.height,44);
    assert.ok(close.y>=rail.y && close.y+close.height <=rail.y+112);
    await page.getByTestId('fixture-home').screenshot({path:path.join(output,'loaded-layout.png')});
  });
  await check('movement, sheets and keyboard hide the creative without remount or scene resize', async () => {
    const loaded=await measure(page);
    for(const toggle of ['toggle movement','toggle overlay','toggle keyboard']) {
      await press(toggle);
      const opacity=await page.getByTestId('daily-ad-rail-home').locator(':scope > div').evaluate(el=>getComputedStyle(el).opacity);
      assert.equal(opacity,'0'); sameScene(initial,await measure(page));
      await press(toggle); assert.deepEqual((await measure(page)).care,loaded.care);
      assert.equal(await page.locator('#mounts').innerText(),'1');
    }
  });
  await check('dismissal persists through service refresh and placement changes', async () => {
    await page.getByTestId('daily-ad-close-home').click(); await settle(page);
    assert.equal(await page.locator('[data-testid^="daily-ad-rail-"]').count(),0);
    sameScene(initial,await measure(page));
    await press('refresh service'); await press('street'); await press('home');
    assert.equal(await page.locator('[data-testid^="daily-ad-rail-"]').count(),0);
    assert.equal(await page.locator('#mounts').innerText(),'1');
  });
  await check('no-fill before load has no flash or reserved blank rail', async () => {
    initial=await fresh(); await press('fail banner');
    assert.equal(await page.locator('[data-testid^="daily-ad-"]').count(),1); // optional reward action remains.
    sameScene(initial,await measure(page));
    assert.deepEqual((await measure(page)).care,initial.care);
  });
  await check('failure after load removes rail and restores care position without resizing room', async () => {
    initial=await fresh(); await press('load banner'); await press('fail banner');
    assert.equal(await page.locator('[data-testid^="daily-ad-rail-"]').count(),0);
    sameScene(initial,await measure(page)); assert.deepEqual((await measure(page)).care,initial.care);
  });
  await check('blurred or background screen unmounts advertising; return starts with no placeholder', async () => {
    for(const toggle of ['toggle screen','toggle foreground']) {
      initial=await fresh(); await press('load banner'); await press(toggle);
      assert.equal(await page.locator('[data-testid^="daily-ad-rail-"]').count(),0);
      sameScene(initial,await measure(page)); await press(toggle);
      assert.equal((await box(page,'daily-ad-loading-home')).height,0);
      sameScene(initial,await measure(page));
    }
  });
  await check('320-point narrow view never loads or reserves a banner', async () => {
    await fresh(); await press('toggle compact');
    assert.equal(await page.locator('[data-testid^="daily-ad-loading-"]').count(),0);
    assert.equal(await page.locator('[data-testid^="daily-ad-rail-"]').count(),0);
    assert.equal((await box(page,'fixture-home')).width,320);
  });
  assert.deepEqual(errors,[],'no application runtime exceptions');
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({syntheticSDK:true,results,errors},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());});
