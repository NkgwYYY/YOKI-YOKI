'use strict';

/**
 * End-to-end release evidence against an actual Expo web export.
 * Start a static SPA server separately, then run:
 *   YOKI_BASE_URL=http://127.0.0.1:4173 node tests/companionRelease.browser.cjs
 * Optional: YOKI_QA_PLAYWRIGHT (module path), YOKI_QA_BROWSER (executable),
 * YOKI_QA_OUTPUT (artifact directory). No existing browser/profile is attached.
 * Linux capture hosts need a Japanese system font (for example fonts-noto-cjk).
 * Screenshots are internal web QA evidence, not native App Store screenshots.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = new URL(process.env.YOKI_BASE_URL || 'http://127.0.0.1:4173');
const out = path.resolve(process.env.YOKI_QA_OUTPUT || path.join(__dirname, '../qa/companion-release'));
const today = '2026-11-01';
const fixedTime = '2026-11-01T03:00:00Z'; // Noon in the app's test timezone.
const keys = {
  records: '@mentore/records_v2', feed: '@mentore/feed_state_v1',
  room: '@mentore/room_customization_v1', hints: '@mentore/hints_v1/guest',
};

function fixture() {
  const now = Date.parse(fixedTime);
  const day = offset => new Date(now - offset * 86400000).toISOString().slice(0, 10);
  // Both groups span the same period. Today is deliberately absent so a real
  // UI save, rather than fixture replacement, supplies the nineteenth record.
  const records = Array.from({ length: 18 }, (_, i) => ({
    id: `synthetic-pattern-${i + 1}`, date: day(i + 1),
    mood: i % 2 === 0 ? 5 : 2, sleep: 0, sleepRecorded: false,
    behaviors: [i % 2 === 0 ? '外に出た' : 'ひとりで休んだ'], notes: '',
  }));
  return {
    '@mentore/profile_v1': { nickname: 'テスト', ageRange: '回答しない', gender: '回答しない' },
    [keys.records]: records,
    [keys.feed]: {
      points: 5000, lastFeedTime: fixedTime, satietyAtFeed: 70,
      happiness: { value: 80, updatedOn: today, updatedAt: now, lastSeenAt: now, days: { [today]: ['visit'] } },
      hygiene: { lastBathAt: now, completedBathDate: today, protectedUntil: 0 },
      housekeeping: { startedAt: now, updatedAt: now, owned: ['robot'], cleaned: {}, robotPlaced: false },
    },
    '@mentore/progress_v2': {
      level: 1, experience: 0, mentalMuscle: 0, streak: 18, totalDays: 18, lastRecordDate: day(1),
      visits: { version: 1, lastDate: today, streak: 4, bestStreak: 4, totalVisits: 4,
        stage: 'odango', highestStage: 'odango', dates: [day(3), day(2), day(1), today] },
    },
    '@mentore/encounters_v1': { list: [{ charKey: 'egg', metDate: day(3) }, { charKey: 'odango', metDate: day(1) }] },
    [keys.room]: { furniture: 'sofa', flower: 'violet',
      ownedFurniture: ['sofa', 'vanity', 'bookshelf'], ownedFlowers: ['pink', 'violet', 'rainbow'] },
  };
}

function seed({ origin, values, date, timestamp }) {
  if (location.origin !== origin) return;
  // Do not replace animation/requestAnimationFrame timers. Playwright's full
  // clock interferes with Reanimated's frame callback cleanup on web.
  const RealDate = Date;
  window.Date = class FixedDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [timestamp])); }
    static now() { return timestamp; }
  };
  const sentinel = '@yoki/qa/companion-release';
  if (localStorage.getItem(sentinel)) return;
  // This should only ever execute in the disposable context created below.
  if (Object.keys(localStorage).some(key => key.startsWith('@mentore/'))) {
    throw new Error('Refusing to seed an existing app profile. Use a fresh browser context.');
  }
  for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
  localStorage.setItem('@yoki/first-steps/v1/guest', 'done');
  localStorage.setItem(`@yoki/scenic-return/v1/guest/${date}`, 'home');
  localStorage.setItem(`@yoki/daily-letter/v1/guest/${date}`, 'seen');
  localStorage.setItem(sentinel, 'synthetic-only');
}

const report = {
  scope: 'Actual Expo web export; fresh, isolated synthetic guest contexts only.',
  limitations: 'Web layout/persistence QA. Native keyboard, AdMob fill and native App Store captures require separate simulator/device validation.',
  baseURL: base.href, sourceCommit: process.env.GITHUB_SHA || process.env.YOKI_QA_COMMIT || null,
  fixedTime, timezone: 'Asia/Tokyo', syntheticPatternDays: 18,
  expectedAfterSave: { recordedDays: 19, selectedDays: 10, selectedGoodDays: 10, comparisonDays: 9, comparisonGoodDays: 0 },
  status: 'running', cases: [],
};

async function readState(page) {
  return page.evaluate(storageKeys => Object.fromEntries(Object.entries(storageKeys).map(([name, key]) =>
    [name, JSON.parse(localStorage.getItem(key) || 'null')])), keys);
}

function visible(page, id) { return page.getByTestId(id).filter({ visible: true }); }

async function assertReachable(locator, label, viewport) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, `${label}: has a rendered target`);
  assert.ok(box.x >= -1 && box.x + box.width <= viewport.width + 1, `${label}: fits horizontally`);
  assert.ok(box.y >= -1 && box.y + box.height <= viewport.height + 1, `${label}: reachable without clipping`);
  const unobscured = await locator.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return target !== null && (target === element || element.contains(target));
  });
  assert.ok(unobscured, `${label}: center is not obscured by a navigation rail or overlay`);
  return box;
}

async function assertNoOverflow(page, viewport, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
  }));
  assert.equal(dimensions.viewport, viewport.width, `${label}: expected viewport`);
  assert.ok(Math.max(dimensions.document, dimensions.body) <= viewport.width + 1,
    `${label}: no horizontal overflow (${JSON.stringify(dimensions)})`);
}

async function screenshot(page, result, name) {
  // Startup permits interaction before its cosmetic fade finishes. Wait for
  // the actual overlay to unmount so captures cannot contain that fade.
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="plush-loading"]').length === 0);
  const brokenImages = await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images).filter(img => {
      const box = img.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth;
    });
    await Promise.all(images.map(img => img.decode().catch(() => {})));
    return images.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.currentSrc || img.src);
  });
  assert.deepEqual(brokenImages, [], `${name}: all visible image assets decoded`);
  const filename = `${result.viewport.width}x${result.viewport.height}-${name}.png`;
  await page.screenshot({ path: path.join(out, filename), animations: 'disabled' });
  result.screenshots.push(filename);
}

async function journey(browser, viewport) {
  const result = { viewport, status: 'running', checks: [], screenshots: [],
    pageErrors: [], consoleErrors: [], blockedRequests: [], aiRequests: [], assetFailures: [] };
  report.cases.push(result);
  const context = await browser.newContext({ viewport, locale: 'ja-JP', timezoneId: 'Asia/Tokyo',
    reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  page.setDefaultNavigationTimeout(45000);
  page.on('pageerror', error => result.pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') result.consoleErrors.push({ text: message.text(), location: message.location() });
  });
  const intercepted = new Set();
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).origin === base.origin && !intercepted.has(response.url())) {
      result.assetFailures.push({ url: response.url(), status: response.status() });
    }
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === base.origin && !intercepted.has(request.url())
      && request.failure()?.errorText !== 'net::ERR_ABORTED') {
      result.assetFailures.push({ url: request.url(), failure: request.failure()?.errorText });
    }
  });
  await page.addInitScript(seed, { origin: base.origin, values: fixture(), date: today, timestamp: Date.parse(fixedTime) });
  // Every API/external request is fulfilled locally. Never transmit fixture
  // journal content, contact a live model, log request bodies or load real ads.
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url()), type = request.resourceType();
    const dynamic = type === 'xhr' || type === 'fetch';
    const ai = dynamic && /\/(?:chat\/message|diary\/reply)(?:\/|$)/.test(url.pathname);
    if (ai) result.aiRequests.push({ method: request.method(), url: url.origin + url.pathname });
    const isStaticFetch = /\.(?:js|json|css|ttf|woff2?|png|webp|jpe?g|svg|gif|mp3|m4a|mp4|wasm)$/.test(url.pathname);
    if (url.origin !== base.origin || url.pathname.startsWith('/api/') || ai
      || !['GET', 'HEAD'].includes(request.method()) || (dynamic && !isStaticFetch)) {
      intercepted.add(request.url());
      result.blockedRequests.push({ method: request.method(), url: url.origin + url.pathname, type });
      if (url.pathname.endsWith('/community/config')) {
        return route.fulfill({ contentType: 'application/json', body: '{"enabled":false,"ads":false}' });
      }
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Isolated synthetic QA: network disabled"}' });
    }
    return route.continue();
  });
  const go = pathname => page.goto(new URL(pathname, base).href, { waitUntil: 'domcontentloaded' });
  try {
    await go('/');
    await visible(page, 'home-action-dock').waitFor();
    await visible(page, 'world-navigation').waitFor();
    const initial = await readState(page);
    assert.equal(initial.records.length, 18);
    assert.equal(new Set(initial.records.map(record => record.date)).size, 18);
    assert.ok(initial.records.every(record => record.date < today));
    assert.equal(initial.feed.points, 5000);
    assert.equal(initial.room.furniture, 'sofa');
    assert.equal(initial.room.flower, 'violet');
    const dock = await visible(page, 'home-action-dock').boundingBox();
    const navigation = await visible(page, 'world-navigation').boundingBox();
    assert.ok(dock && navigation && dock.y + dock.height <= navigation.y + 1,
      'Home care actions do not overlap the four navigation tabs');
    for (const id of ['home-points', 'home-more-menu', 'home-daily-record', 'home-chat', 'home-condition']) {
      await assertReachable(visible(page, id), id, viewport);
    }
    await assertNoOverflow(page, viewport, 'Home');
    await screenshot(page, result, 'home');
    result.checks.push('Home: furnished scene, 5000 synthetic points, four reachable tabs, care/navigation separation, no horizontal overflow.');

    // Exercise the actual tab -> legacy route -> notebook redirect.
    await visible(page, 'home-daily-record').click();
    await visible(page, 'diary-open-cover').waitFor();
    await assertReachable(visible(page, 'diary-open-cover'), 'Diary cover', viewport);
    await screenshot(page, result, 'diary-cover');
    await visible(page, 'diary-open-cover').click();
    await visible(page, 'diary-character-page').waitFor();
    await visible(page, 'diary-tab-user').click();
    await visible(page, 'diary-input').waitFor();
    // An empty body verifies the supported mood/tag-only path and local reply.
    assert.equal(await visible(page, 'diary-input').inputValue(), '');
    await visible(page, 'diary-input').focus();
    await visible(page, 'diary-mood-4').click();
    await visible(page, 'diary-quick-behavior-外に出た').click();
    // RN Web 0.21 does not map RN accessibilityState to aria-checked. Verify
    // the visible checkmark here and the committed mood/tag values below.
    assert.match(await visible(page, 'diary-quick-behavior-外に出た').innerText(), /✓\s*外に出た/);
    await assertReachable(visible(page, 'diary-send'), 'Diary save', viewport);
    await assertNoOverflow(page, viewport, 'Diary editor');
    await screenshot(page, result, 'diary-editor');
    await visible(page, 'diary-send').click();
    await visible(page, 'diary-user-page').waitFor();
    await visible(page, 'diary-local-reply').waitFor();
    assert.match(await visible(page, 'diary-details-summary').innerText(), /外に出た/);
    await visible(page, 'diary-user-page').scrollIntoViewIfNeeded();
    await screenshot(page, result, 'diary-saved');
    const saved = await readState(page);
    assert.equal(saved.records.length, 19);
    const record = saved.records.find(item => item.date === today);
    assert.equal(record.mood, 4);
    assert.deepEqual(record.behaviors, ['外に出た']);
    assert.equal(record.sleepRecorded, false);
    assert.deepEqual(saved.records.filter(item => item.date !== today), initial.records,
      'Saving today preserves all eighteen historical records');
    const savedPage = saved.feed.exchangeDiary.pages[today];
    assert.equal(savedPage.user.text, '');
    assert.equal(savedPage.replyKind, 'local');
    assert.deepEqual(savedPage.user.details.behaviors, ['外に出た']);
    assert.ok(saved.feed.points > initial.feed.points, 'First save grants its normal daily reward');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await visible(page, 'diary-open-cover').click();
    await visible(page, 'diary-tab-user').click();
    await visible(page, 'diary-user-page').waitFor();
    assert.match(await visible(page, 'diary-details-summary').innerText(), /外に出た/);
    const reloaded = await readState(page);
    assert.deepEqual(reloaded.records, saved.records, 'Daily records survive reload without duplication');
    assert.deepEqual(reloaded.feed.exchangeDiary.pages[today].user, savedPage.user, 'Saved diary survives reload');
    assert.equal(reloaded.feed.points, saved.feed.points, 'Opening/reloading does not replay the daily reward');
    assert.equal(await visible(page, 'diary-error').count(), 0);
    result.checks.push('Diary: real navigation, cover/page opening, mood + optional tag, local reply, unchanged historical records, save/reload, no repeated reward.');

    await visible(page, 'diary-insights').click();
    await visible(page, 'personal-insights-screen').waitFor();
    await page.getByText('最近30日・19日分の気分', { exact: true }).waitFor();
    const card = visible(page, 'personal-insight-card').filter({ hasText: '外に出た日' });
    assert.equal(await card.count(), 1, 'The known fixture produces one outdoor observation');
    await card.getByText('比較した記録を見る（19日分）', { exact: true }).click();
    const evidence = card.getByTestId('personal-insight-evidence');
    await evidence.waitFor();
    const evidenceText = (await evidence.innerText()).replace(/\s+/g, '');
    assert.match(evidenceText, /10日中10日が元気な日/);
    assert.match(evidenceText, /9日中0日が元気な日/);
    assert.match(evidenceText, /2026-10-03〜2026-11-01/);
    const saveHint = card.getByRole('button', { name: 'この気づきをヒント帳に保存', exact: true });
    await assertReachable(saveHint, 'Save insight to hintbook', viewport);
    await assertNoOverflow(page, viewport, 'Insights');
    await screenshot(page, result, 'insight-evidence');
    await saveHint.click();
    await card.getByRole('button', { name: 'ヒント帳に保存済み', exact: true }).waitFor();
    const withHint = await readState(page);
    assert.equal(withHint.hints.length, 1);
    assert.equal(withHint.hints[0].source, 'insight');
    assert.equal(withHint.hints[0].title, '外に出た日');
    assert.match(withHint.hints[0].evidence, /10日中10日/);
    assert.match(withHint.hints[0].evidence, /9日中0日/);
    assert.match(withHint.hints[0].evidence, /原因を示すものではありません/);
    await page.getByRole('button', { name: '自分のヒント帳を開く', exact: true }).click();
    await visible(page, 'hintbook-screen').waitFor();
    await visible(page, 'saved-hint').waitFor();
    assert.equal(await visible(page, 'saved-hint').count(), 1);
    assert.match(await visible(page, 'saved-hint').innerText(), /外に出た日/);
    await assertNoOverflow(page, viewport, 'Hintbook');
    await screenshot(page, result, 'hintbook');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await visible(page, 'saved-hint').waitFor();
    assert.deepEqual((await readState(page)).hints, withHint.hints, 'Saved wording, evidence and timestamp survive reload');
    await go('/insights');
    const alreadySaved = page.getByRole('button', { name: 'ヒント帳に保存済み', exact: true });
    await alreadySaved.waitFor();
    assert.equal(await alreadySaved.isDisabled(), true, 'Previously saved insight cannot be duplicated');
    result.checks.push('Insights: 19 real UI records, 10/10 versus 0/9 evidence, local save, saved wording/evidence/timestamp on reload, duplicate save disabled.');

    await go('/chat');
    const listen = visible(page, 'chat-mode-listen'), think = visible(page, 'chat-mode-think');
    await listen.waitFor();
    await visible(page, 'chat-welcome').waitFor();
    await page.getByText('気持ちを受け止めてほしいときに', { exact: true }).waitFor();
    await assertReachable(listen, 'Listen mode', viewport);
    await assertReachable(think, 'Think together mode', viewport);
    await think.click();
    await page.getByText('今できることを、一つずつ', { exact: true }).waitFor();
    await visible(page, 'chat-input').fill('テスト用の未送信メモ');
    await listen.click();
    await page.getByText('気持ちを受け止めてほしいときに', { exact: true }).waitFor();
    assert.equal(await visible(page, 'chat-input').inputValue(), 'テスト用の未送信メモ');
    await assertReachable(visible(page, 'chat-input'), 'Chat text input', viewport);
    await visible(page, 'chat-input').fill('');
    await visible(page, 'chat-input').blur();
    await assertNoOverflow(page, viewport, 'Chat');
    await screenshot(page, result, 'chat-modes');
    assert.equal(await visible(page, 'chat-assistant-message').count(), 0, 'Mode selection does not fabricate a response');
    assert.deepEqual(result.aiRequests, [], 'No diary or conversation AI endpoint was requested');
    result.checks.push('Conversation: listen/think mode selection, retained unsent draft, accessible input, no AI request or fabricated response.');

    // Closing the journey on the notebook verifies persistence across other screens.
    await go('/hints');
    await visible(page, 'saved-hint').waitFor();
    const final = await readState(page);
    assert.deepEqual(final.hints, withHint.hints);
    assert.deepEqual(final.records, saved.records);
    assert.equal(final.feed.points, saved.feed.points);
    assert.equal(final.room.furniture, 'sofa');
    assert.equal(final.room.flower, 'violet');
    assert.deepEqual(result.pageErrors, [], 'No uncaught browser errors');
    assert.deepEqual(result.assetFailures, [], 'No failed local export assets');
    result.unexpectedConsoleErrors = result.consoleErrors.filter(message =>
      !(intercepted.has(message.location.url) && message.text.includes('Failed to load resource: the server responded with a status of 503')));
    assert.deepEqual(result.unexpectedConsoleErrors, [], 'No console errors beyond explicitly blocked QA network requests');
    result.checks.push('Final persistence: hintbook, daily records, wallet and purchased furnishings retained; zero uncaught errors, unexpected console errors or local asset failures.');
    result.status = 'passed';
    console.log(`PASS ${viewport.width}x${viewport.height}: home, diary, observed evidence, saved hints, chat modes and reload persistence`);
  } catch (error) {
    result.status = 'failed';
    result.error = error.stack || String(error);
    const stem = `${viewport.width}x${viewport.height}-failure`;
    await page.screenshot({ path: path.join(out, `${stem}.png`) }).then(() => result.screenshots.push(`${stem}.png`)).catch(() => {});
    fs.writeFileSync(path.join(out, `${stem}.txt`), `URL: ${page.url()}\n\n${await page.locator('body').innerText().catch(() => '')}`);
    console.error(result.error);
  } finally {
    await context.close();
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
  }
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  let browser;
  try {
    const { chromium } = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
    browser = await chromium.launch({ headless: true, executablePath: process.env.YOKI_QA_BROWSER || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 740 }]) await journey(browser, viewport);
    report.status = report.cases.every(result => result.status === 'passed') ? 'passed' : 'failed';
  } catch (error) {
    report.status = 'failed';
    report.error = error.stack || String(error);
    console.error(report.error);
  } finally {
    await browser?.close();
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    if (report.status !== 'passed') process.exitCode = 1;
  }
}

if (require.main === module) void main();
// Export the fixture for a fast pure-data sanity check without launching a browser.
module.exports = { fixture, today, fixedTime };
