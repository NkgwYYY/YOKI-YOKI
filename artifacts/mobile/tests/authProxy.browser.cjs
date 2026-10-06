// Actual exported app/Clerk SDK -> actual Express/proxy package -> local
// failing upstream. Only routing and upstream identity service are fixtures.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
const out = process.env.YOKI_QA_SCREENSHOTS;

(async () => {
  assert.ok(process.env.YOKI_QA_PROXY_EXPORT, 'Set YOKI_QA_PROXY_EXPORT to the completed synthetic-key Web export with the Clerk proxy URL');
  const { createClerkProxyServer } = await import('../../api-server/tests/fixtures/clerkProxyServer.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yoki-proxy-web-'));
  fs.symlinkSync(path.resolve(process.env.YOKI_QA_PROXY_EXPORT), path.join(root, 'web'), 'dir');
  const proc = spawn(process.execPath, [path.resolve(__dirname, '../server/serve.js')], {
    env: { ...process.env, PORT: '0', BASE_PATH: '/', STATIC_BUILD_DIR: root }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser, proxy;
  try {
    const origin = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Server startup timed out')), 10000);
      proc.once('error', e => { clearTimeout(timer); reject(e); });
      proc.once('exit', code => { clearTimeout(timer); reject(Error('Server exited ' + code)); });
      proc.stdout.on('data', data => { const match = /on port (\d+)/.exec(String(data)); if (match) { clearTimeout(timer); resolve('http://127.0.0.1:' + match[1]); } });
    });
    const html = await (await fetch(origin)).text(), entry = /<script[^>]+src="([^"]+)"/.exec(html)?.[1];
    assert.ok(entry); const bundle = await (await fetch(origin + entry)).text();
    assert.ok(bundle.includes('pk_test_Y2xlcmsueW9raS5pbnZhbGlkJA=='));
    assert.ok(bundle.includes('https://yoki-yoki.replit.app/api/__clerk'));
    let args = ['--no-sandbox'];
    if (process.env.YOKI_QA_CHROMIUM_BUNDLE) args = (await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(arg => arg !== '--single-process');
    browser = await chromium.launch({ executablePath: process.env.YOKI_QA_BROWSER, headless: true, args });
    if (out) fs.mkdirSync(out, { recursive: true });
    for (const mode of ['reset', 'timeout']) {
      proxy = await createClerkProxyServer({ deadlineMs: 100, handler: req => { if (mode === 'reset') req.socket.destroy(); } });
      const context = await browser.newContext({ viewport: { width: 320, height: 568 }, locale: 'ja-JP', hasTouch: true });
      const page = await context.newPage(), errors = [], unexpected = [], responses = [], routeErrors = [];
      let closing = false;
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        // Seed once per fresh context, never again on reload: a re-seed would
        // conceal accidental data loss during recovery.
        if (!sessionStorage.getItem('proxy-fixture-seeded')) {
          localStorage.setItem('@mentore/records_v2', '[{"notes":"local proxy fixture"}]');
          sessionStorage.setItem('proxy-fixture-seeded', '1');
        }
        window.proxyDataWrites = [];
        for (const method of ['setItem', 'removeItem', 'clear']) {
          const original = Storage.prototype[method];
          Storage.prototype[method] = function (...args) {
            if (method === 'clear' || /^@(mentore|yoki)\//.test(args[0])) window.proxyDataWrites.push(method);
            return original.apply(this, args);
          };
        }
      });
      await page.route('**/*', async route => {
        try {
          if (closing) { await route.abort(); return; }
          const url = new URL(route.request().url());
          if (url.origin === origin) return route.continue();
          if (url.origin !== 'https://yoki-yoki.replit.app' || !url.pathname.startsWith('/api/__clerk/')) {
            unexpected.push(url.origin + url.pathname); return route.abort();
          }
          const response = await route.fetch({ url: proxy.origin + url.pathname + url.search,
            headers: { ...route.request().headers(), 'x-forwarded-host': 'yoki-yoki.replit.app, local-edge', 'x-forwarded-proto': 'https, http' }, maxRedirects: 0 });
          const body = await response.body(), headers = response.headers();
          responses.push({ status: response.status(), length: headers['content-length'], encoding: headers['transfer-encoding'], bytes: body.length });
          // The browser fixture is on localhost, unlike the same-origin deployed
          // app/proxy; allow only that local origin for this intercepted response.
          await route.fulfill({ response, headers: { ...headers, 'access-control-allow-origin': origin } });
        } catch (error) {
          // Closing the context cancels an SDK retry already in flight. Only
          // teardown cancellation is expected; a live routing failure fails QA.
          if (!closing) routeErrors.push(error.message);
        }
      });
      await page.clock.install();
      const firstResponse = page.waitForResponse(r => r.url().includes('/api/__clerk/') && r.status() === (mode === 'reset' ? 502 : 504));
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.getByText('小さな世界を準備しています', { exact: true }).waitFor();
      await firstResponse;
      await page.clock.fastForward(16000);
      const retry = page.getByRole('button', { name: 'もう一度接続する', exact: true }); await retry.waitFor();
      assert.deepEqual(await page.evaluate(() => window.proxyDataWrites), []);
      assert.equal(await page.getByText('小さな世界へようこそ', { exact: true }).count(), 0);
      if (out) await page.screenshot({ path: path.join(out, `proxy-${mode}-320.jpg`) });
      const navigation = page.waitForEvent('framenavigated', frame => frame === page.mainFrame());
      const responseAfterReload = page.waitForResponse(r => r.url().includes('/api/__clerk/') && r.status() === (mode === 'reset' ? 502 : 504));
      await retry.tap(); await navigation; await responseAfterReload;
      await page.clock.fastForward(16000); await retry.waitFor();
      assert.ok(responses.length >= 2);
      assert.ok(responses.every(r => r.status === (mode === 'reset' ? 502 : 504) && r.length === '0' && !r.encoding && r.bytes === 0));
      assert.ok(proxy.requests.every(r => r.headers['clerk-proxy-url'] === 'https://yoki-yoki.replit.app/api/__clerk'));
      assert.equal(await page.evaluate(() => localStorage.getItem('@mentore/records_v2')), '[{"notes":"local proxy fixture"}]');
      assert.deepEqual(await page.evaluate(() => window.proxyDataWrites), []);
      assert.deepEqual(unexpected, []);
      // The real SDK may report the deliberately failed script as an unhandled
      // rejection as well as a console error. Record that exact expected error;
      // all other app errors fail QA. Do not suppress it in application code.
      assert.deepEqual(errors.filter(error => !(error.startsWith('Clerk: Failed to load Clerk JS') &&
        error.includes('(code="failed_to_load_clerk_js")') && error.includes('https://yoki-yoki.replit.app/api/__clerk/npm/'))), []);
      closing = true;
      await context.close(); await proxy.close(); proxy = null;
      assert.deepEqual(routeErrors, []);
      console.log(`PASS actual app/SDK/proxy ${mode}: length-delimited gateway response, correct forwarded URL, visible recovery, touch reload, saved data retained; expected SDK load errors: ${errors.length}`);
    }
  } finally {
    await browser?.close(); await proxy?.close();
    if (proc.exitCode === null) { proc.kill(); await once(proc, 'exit'); }
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
