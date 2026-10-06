// Actual GrowthScreen account dialogs and AuthProvider. Synthetic Clerk/API/data only.
const fs = require('node:fs'), http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { build } = createRequire(path.resolve(__dirname, '../../api-server/package.json'))('esbuild');
const { chromium } = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
const mobile = path.resolve(__dirname, '..');

(async () => {
  const built = await build({ absWorkingDir: mobile,
    stdin: { resolveDir: mobile, loader: 'tsx', contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import {AuthProvider} from './contexts/AuthContext'; import GrowthScreen from './app/(tabs)/growth';
      createRoot(document.getElementById('root')).render(<AuthProvider><GrowthScreen/></AuthProvider>);` },
    bundle: true, write: false, platform: 'browser', format: 'iife', loader: { '.png': 'dataurl', '.jpg': 'dataurl' },
    define: { 'process.env.NODE_ENV': '"production"', 'process.env.EXPO_PUBLIC_DOMAIN': '"qa.invalid"', __DEV__: 'false', global: 'globalThis' },
    alias: { 'react-native': 'react-native-web' },
    plugins: [{ name: 'account-fixtures', setup(build) {
      const fixtures = {
        '@clerk/expo': `export const useAuth=()=>({isLoaded:true,isSignedIn:true,getToken:async()=>'synthetic-token',
          signOut:async()=>{window.qaLogouts++; if(window.qaLogoutFail)throw Error('offline');}});
          export const useUser=()=>({user:{id:'account-a',primaryEmailAddress:{emailAddress:'local-test@example.invalid'},
            delete:async()=>{window.qaIdentityDeletes++;}}});`,
        '@react-native-async-storage/async-storage': `export default {
          getItem:async k=>localStorage.getItem(k), setItem:async(k,v)=>localStorage.setItem(k,v), getAllKeys:async()=>Object.keys(localStorage),
          removeItem:async k=>{if(k===window.qaFailKey)throw Error('disk unavailable');localStorage.removeItem(k);}
        };`,
        '@/contexts/AppContext': `export const useApp=()=>({progress:{level:1,experience:0,totalDays:0},records:[],unlockedBadges:[],
          growth:{growthSize:1,lastSeenSize:1,history:[]},markGrowthSeen:async()=>{},encounters:{list:[]},mascotName:'検証用',
          cloudSyncState:{ready:true,phase:'idle',error:null},retryCloudSync:()=>{}});`,
        '@/utils/runtimeConfig': 'export const ACCOUNT_ENABLED=true;',
        '@/components/room/useRoomActivity': 'export const useRoomActivity=()=>({active:false});',
        '@/components/ui/Icon': 'export const Icon=()=>null; export const IconBadge=()=>null; export const iconSize={md:18,sm:16};',
        'react-native-safe-area-context': 'export const useSafeAreaInsets=()=>({top:0,bottom:0,left:0,right:0});',
        'expo-router': 'export const useRouter=()=>({replace:path=>window.qaRoutes.push(path),push:path=>window.qaRoutes.push(path)});',
        expo: `export const reloadAppAsync=async()=>{window.qaReloads++; if(window.qaReloadFail)throw Error('reload unavailable');};`,
      };
      build.onResolve({ filter: /.*/ }, ({ path: name }) => {
        if (name in fixtures) return { path: name, namespace: 'account-fixture' };
        if (/^@\/components\/(GrowthChart|BadgeCard|MoodCalendar|InsightCard|dex\/CharacterDexModal|world\/MemoryBook)$/.test(name)) {
          return { path: name.split('/').at(-1), namespace: 'account-static' };
        }
      });
      build.onLoad({ filter: /.*/, namespace: 'account-fixture' }, ({ path: name }) => ({ contents: fixtures[name], loader: 'js', resolveDir: mobile }));
      build.onLoad({ filter: /.*/, namespace: 'account-static' }, ({ path: name }) => ({ contents: `export const ${name}=()=>null;`, loader: 'js' }));
    } }],
  });
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/bundle.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/bundle.js' ? built.outputFiles[0].text : '<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><title>アカウント操作のローカル検証</title><body style="margin:0"><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    const args = process.env.YOKI_QA_CHROMIUM_BUNDLE
      ? (await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(arg => arg !== '--single-process') : ['--no-sandbox'];
    browser = await chromium.launch({ executablePath: process.env.YOKI_QA_BROWSER, headless: true, args });
    const page = await browser.newPage({ viewport: { width: 320, height: 480 }, hasTouch: true, locale: 'ja-JP', reducedMotion: 'reduce' });
    const errors = []; let apiCalls = 0, mode = 'hold', release;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.qaLogouts = 0; window.qaIdentityDeletes = 0; window.qaReloads = 0; window.qaRoutes = []; window.qaLogoutFail = true;
      localStorage.setItem('@mentore/records_v2', '[{"notes":"ローカル検証用"}]');
      localStorage.setItem('@yoki/balance_journal_v1', JSON.stringify({ version: 1, entries: [['@mentore/records_v2', '[]']] }));
      localStorage.setItem('@yoki/cloud_outbox_v1/account-a', 'own synthetic pending');
      localStorage.setItem('@yoki/cloud_outbox_v1/account-b', 'other synthetic pending');
    });
    await page.route('https://qa.invalid/api/account', async route => {
      apiCalls++; assert.equal(route.request().method(), 'DELETE');
      if (mode === 'hold') await new Promise(resolve => { release = resolve; });
      await route.fulfill({ json: mode === 'bad-ack' ? { ok: false } : { ok: true } });
    });
    await page.goto('http://127.0.0.1:' + server.address().port);
    const open = () => page.getByRole('button', { name: 'アカウント', exact: true }).tap();
    await open(); await page.getByRole('button', { name: 'ログアウト', exact: true }).tap();
    await page.getByRole('alert').filter({ hasText: 'ログアウトできませんでした' }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.qaRoutes), []);
    if (process.env.YOKI_QA_SCREENSHOTS) {
      fs.mkdirSync(process.env.YOKI_QA_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: path.join(process.env.YOKI_QA_SCREENSHOTS, 'account-logout-retry.jpg'), quality: 90 });
    }
    await page.evaluate(() => { window.qaLogoutFail = false; });
    await page.getByRole('button', { name: 'ログアウト', exact: true }).tap();
    assert.deepEqual(await page.evaluate(() => window.qaRoutes), ['/login']);
    assert.equal(await page.evaluate(() => window.qaLogouts), 2);
    console.log('PASS logout failure stays in the dialog; touch retry navigates only after success');

    await open(); await page.getByTestId('delete-account-button').tap();
    const confirm = page.getByTestId('confirm-delete-account-button');
    await confirm.tap(); await page.getByText('削除しています…', { exact: true }).waitFor();
    assert.equal(await confirm.getAttribute('aria-disabled'), 'true');
    await page.keyboard.press('Escape'); await confirm.waitFor();
    mode = 'bad-ack'; release();
    await page.getByRole('alert').filter({ hasText: '削除を完了できませんでした' }).waitFor();
    assert.equal(await page.evaluate(() => window.qaIdentityDeletes), 0);
    assert.ok(await page.evaluate(() => localStorage.getItem('@mentore/records_v2')));
    mode = 'ready'; await page.evaluate(() => { window.qaFailKey = '@yoki/balance_journal_v1'; });
    await confirm.tap(); await page.getByRole('alert').filter({ hasText: '削除を完了できませんでした' }).waitFor();
    assert.equal(await page.evaluate(() => window.qaIdentityDeletes), 0);
    console.log('PASS deletion remains modal/disabled while busy; invalid ack and cleanup failure keep identity retryable');

    await page.evaluate(() => { window.qaFailKey = null; window.qaReloadFail = true; });
    await confirm.tap();
    await page.getByRole('alert').filter({ hasText: '削除は完了しています' }).waitFor();
    assert.equal(await page.evaluate(() => window.qaIdentityDeletes), 1);
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), ['@yoki/cloud_outbox_v1/account-b']);
    if (process.env.YOKI_QA_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.YOKI_QA_SCREENSHOTS, 'account-reopen-retry.jpg'), quality: 90 });
    const before = apiCalls;
    await page.evaluate(() => { window.qaReloadFail = false; });
    await page.getByRole('button', { name: 'アプリを開き直す', exact: true }).tap();
    assert.equal(apiCalls, before); assert.equal(await page.evaluate(() => window.qaIdentityDeletes), 1);
    assert.equal(await page.evaluate(() => window.qaReloads), 2);
    console.log('PASS successful deletion removes journal/own outbox; reopening retry does not delete twice');
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
