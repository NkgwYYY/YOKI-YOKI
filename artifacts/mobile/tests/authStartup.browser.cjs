// The actual production Web bundle and installed Clerk SDK, with outbound
// traffic blocked. This certifies unavailable-service recovery, not live login.
const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
const root = path.resolve(process.env.YOKI_QA_NATIVE_BUILD || '');
const expectedKey = 'pk_test_Y2xlcmsueW9raS5pbnZhbGlkJA=='; // clerk.yoki.invalid, never a real account
const mobile = path.resolve(__dirname, '..');
const out = process.env.YOKI_QA_SCREENSHOTS;

(async () => {
  assert.ok(process.env.YOKI_QA_NATIVE_BUILD, 'Set YOKI_QA_NATIVE_BUILD to the completed synthetic-key production build');
  const proc = spawn(process.execPath, [path.join(mobile, 'server/serve.js')], {
    env: { ...process.env, PORT: '0', BASE_PATH: '/', STATIC_BUILD_DIR: root }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser;
  try {
    const origin = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Server startup timed out')), 10000);
      proc.once('error', error => { clearTimeout(timer); reject(error); });
      proc.once('exit', code => { clearTimeout(timer); reject(Error('Server exited ' + code)); });
      proc.stdout.on('data', data => { const match = /on port (\d+)/.exec(String(data)); if (match) { clearTimeout(timer); resolve('http://127.0.0.1:' + match[1]); } });
      proc.stderr.on('data', data => process.stderr.write(data));
    });
    const html = await (await fetch(origin)).text();
    const entry = /<script[^>]+src="([^"]+)"/.exec(html)?.[1]; assert.ok(entry);
    const bundle = await (await fetch(origin + entry)).text();
    assert.ok(bundle.includes(expectedKey), 'Configured build must not reuse a previous guest export');
    assert.ok(bundle.includes('yoki-yoki.replit.app'), 'Configured API domain must be inlined');
    assert.ok(!bundle.includes('https://undefined'), 'No stale unconfigured API domain');
    let args = ['--no-sandbox'];
    if (process.env.YOKI_QA_CHROMIUM_BUNDLE) args = (await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(arg => arg !== '--single-process');
    browser = await chromium.launch({ executablePath: process.env.YOKI_QA_BROWSER, headless: true, args });
    if (out) fs.mkdirSync(out, { recursive: true });

    for (const mode of ['failure', 'pending']) {
      const context = await browser.newContext({ viewport: { width: 320, height: 568 }, locale: 'ja-JP', hasTouch: true });
      const page = await context.newPage(), errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.setItem('@mentore/records_v2', '[{"notes":"synthetic startup canary"}]');
        window.startupDataWrites = [];
        for (const method of ['setItem', 'removeItem', 'clear']) {
          const original = Storage.prototype[method];
          Storage.prototype[method] = function (...args) {
            if (method === 'clear' || /^@(mentore|yoki)\//.test(args[0])) window.startupDataWrites.push([method, ...args]);
            return original.apply(this, args);
          };
        }
      });
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        requests.push({ host: url.host, path: url.pathname });
        // Deliberately no outbound request, even if a future change misroutes one.
        if (mode === 'pending') return new Promise(() => {});
        return route.abort();
      });
      await page.clock.install();
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.getByText('小さな世界を準備しています', { exact: true }).waitFor();
      await page.clock.fastForward(mode === 'failure' ? 35000 : 16000);
      const retry = page.getByRole('button', { name: 'もう一度接続する', exact: true });
      await retry.waitFor();
      assert.equal(await page.getByText('接続を確認してください', { exact: true }).isVisible(), true);
      assert.ok(requests.some(request => request.host === 'clerk.yoki.invalid'));
      assert.equal(requests.some(request => request.path.startsWith('/api/')), false, 'Account data providers remain gated');
      assert.deepEqual(await page.evaluate(() => window.startupDataWrites), []);
      assert.equal(await page.evaluate(() => localStorage.getItem('@mentore/records_v2')), '[{"notes":"synthetic startup canary"}]');
      assert.equal(await page.getByText('小さな世界へようこそ', { exact: true }).count(), 0, 'No automatic guest onboarding');
      for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
        await page.setViewportSize(viewport); await retry.scrollIntoViewIfNeeded();
        const box = await retry.boundingBox(); assert.ok(box && box.height >= 48 && box.x >= 0 && box.x + box.width <= viewport.width);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (out) await page.screenshot({ path: path.join(out, `auth-${mode}-${viewport.width}.jpg`) });
      }
      const navigation = page.waitForEvent('framenavigated', frame => frame === page.mainFrame());
      await retry.tap(); await navigation;
      await page.getByText('小さな世界を準備しています', { exact: true }).waitFor();
      await page.clock.fastForward(35000); await retry.waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('@mentore/records_v2')), '[{"notes":"synthetic startup canary"}]');
      assert.deepEqual(await page.evaluate(() => window.startupDataWrites), []);
      assert.deepEqual(errors, []);
      console.log(`PASS actual SDK ${mode}: configured environment, bounded recovery, touch reload, unchanged data, no API call/guest fallback/page errors`);
      await context.close();
    }
  } finally {
    await browser?.close();
    if (proc.exitCode === null) { proc.kill(); await once(proc, 'exit'); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
