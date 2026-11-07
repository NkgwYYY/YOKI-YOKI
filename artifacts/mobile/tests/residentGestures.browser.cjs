// Real browser touch events exercise interrupted gestures; this is not native device certification.
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
const root = path.resolve(process.env.YOKI_QA_EXPORT || 'build-yoki-v3');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const args = process.env.YOKI_QA_CHROMIUM_BUNDLE
    ? (await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(arg => arg !== '--single-process')
    : ['--no-sandbox', '--disable-dev-shm-usage'];
  const browser = await chromium.launch({ executablePath: process.env.YOKI_QA_BROWSER, headless: true, args });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'ja-JP', timezoneId: 'Asia/Tokyo' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-06T09:00:00+09:00') });
    await page.addInitScript(() => {
      localStorage.setItem('@mentore/profile_v1', JSON.stringify({ nickname: 'テスト', ageRange: '回答しない', gender: '回答しない' }));
      localStorage.setItem('@mentore/encounters_v1', JSON.stringify({ list: [{ charKey: 'egg', metDate: '2026-09-01' }] }));
    });
    await page.goto('http://127.0.0.1:' + server.address().port);
    const resident = page.getByTestId('room-resident');
    await resident.waitFor();
    await page.getByText('Loading...', { exact: true }).waitFor({ state: 'hidden' });
    const client = await page.context().newCDPSession(page);
    const start = async () => {
      const b = await resident.boundingBox();
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
    };
    const end = type => client.send('Input.dispatchTouchEvent', { type, touchPoints: [] });
    const held = () => page.waitForFunction(() => document.querySelector('[data-testid="room-resident"]')?.style.zIndex === '999');
    const landed = () => page.waitForFunction(() => document.querySelector('[data-testid="room-resident"]')?.style.zIndex !== '999');
    const position = () => resident.evaluate(el => ({ left: el.style.left, top: el.style.top, transform: el.style.transform }));

    await start(); await held();
    await end('touchEnd');
    // Grab again before the previous 260ms landing completes.
    await start(); await page.waitForTimeout(350); await held();
    const before = await position();
    await page.waitForTimeout(7200);
    assert.deepEqual(await position(), before, 'an earlier landing must not restart walking during the new hold');
    assert.ok((await resident.getAttribute('aria-label')).includes('のんびりしています'));
    await end('touchEnd'); await landed();
    console.log('PASS immediate re-grab stays held and never resumes autonomous walking');

    await start(); await held();
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await landed(); await end('touchCancel');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.getByTestId('home-daily-record').tap();
    await page.getByTestId('quick-record-save').waitFor();
    await page.getByRole('button', { name: '閉じる', exact: true }).tap();
    await start(); await held(); await end('touchCancel'); await landed();
    assert.equal(await page.getByTestId('world-speech').filter({ hasText: 'ぽふっ' }).count(), 0);
    await page.getByTestId('home-chat').tap();
    await page.getByText('少し、お話しする', { exact: true }).waitFor();
    await page.getByRole('button', { name: '閉じる', exact: true }).tap();
    console.log('PASS background and touch-cancel release safely; record/chat stay usable');

    if (process.env.YOKI_QA_SCREENSHOTS) {
      await page.getByTestId('world-speech').filter({ hasText: 'ふわっ' }).waitFor({ state: 'hidden', timeout: 8000 });
      fs.mkdirSync(process.env.YOKI_QA_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: path.join(process.env.YOKI_QA_SCREENSHOTS, 'home-after-interruption.jpg'), quality: 90 });
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
