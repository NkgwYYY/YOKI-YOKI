// Real AppProvider, journal and status UI; synthetic auth/network/storage failures.
// This harness never calls Clerk, a production API or a production database.
const fs = require('node:fs'), http = require('node:http'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(__dirname, '../../api-server/package.json'));
const { build } = apiRequire('esbuild');
const { chromium } = require(process.env.YOKI_QA_PLAYWRIGHT || 'playwright');
const mobile = path.resolve(__dirname, '..');
const auth = `import React from 'react';
  const Auth = React.createContext(null);
  export const API_BASE = location.origin + '/api';
  export const useAuth = () => React.useContext(Auth);
  export function TestAuth({children}) {
    const [id, setId] = React.useState('account-a');
    window.qaAuth = setId;
    return <Auth.Provider value={{ isSignedIn: !!id, user: id ? {id} : null, isLoading: false,
      getToken: async () => id, logout: async () => setId(null) }}>{children}</Auth.Provider>;
  }`;
const entry = `import React from 'react'; import {createRoot} from 'react-dom/client';
  import {View, Text} from 'react-native';
  import {AppProvider, useApp} from './contexts/AppContext';
  import {TestAuth} from './contexts/AuthContext';
  import {CloudSyncStatus} from './components/account/CloudSyncStatus';
  import {Button} from './components/ui/Button';
  function Probe() {
    const app = useApp();
    window.qaApp = app;
    return <View style={{padding:24, gap:20, maxWidth:440, margin:'auto', backgroundColor:'#F7F3EA'}}>
      <Text style={{fontSize:21, color:'#34352E'}}>アカウント同期・ローカル検証</Text>
      <CloudSyncStatus state={app.cloudSyncState} onRetry={app.retryCloudSync}/>
      <Text testID="saved-name">{app.mascotName}</Text>
      <Text testID="saved-record-count">保存された記録：{app.records.length}件</Text>
      <Text testID="saved-points">ごはんポイント：{app.feedState.points}</Text>
      <Button label="記録を保存する" disabled={!app.cloudSynced || app.isLoading}
        onPress={() => app.saveRecord(4, 0, [], 'ローカル検証の記録', {sleepRecorded:false})}/>
      <Button label="名前を変更する" disabled={!app.cloudSynced || app.isLoading}
        onPress={() => app.setMascotName('新しい相棒')}/>
      <Text testID="storage-error">{app.storageError || ''}</Text>
      <Text style={{fontSize:12}}>認証と通信は検証用の代替です。実アカウントの確認結果ではありません。</Text>
    </View>;
  }
  createRoot(document.getElementById('root')).render(<TestAuth><AppProvider><Probe/></AppProvider></TestAuth>);`;

(async () => {
  const built = await build({ stdin: { contents: entry, resolveDir: mobile, loader: 'tsx' },
    absWorkingDir: mobile, bundle: true, write: false, platform: 'browser', format: 'iife',
    define: { 'process.env.NODE_ENV': '"production"', 'process.env.EXPO_PUBLIC_DOMAIN': '"qa.invalid"', __DEV__: 'false', global: 'globalThis' },
    alias: { 'react-native': 'react-native-web' }, loader: { '.png': 'dataurl', '.jpg': 'dataurl' },
    plugins: [{ name: 'isolated-browser-adapters', setup(build) {
      build.onResolve({ filter: /(?:^|\/)AuthContext$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
      build.onResolve({ filter: /^@react-native-async-storage\/async-storage$/ }, () => ({ path: 'storage', namespace: 'fixture' }));
      build.onResolve({ filter: /^expo-haptics$/ }, () => ({ path: 'haptics', namespace: 'fixture' }));
      build.onResolve({ filter: /^@\/components\/ui\/Icon$/ }, () => ({ path: 'icons', namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => ({ resolveDir: mobile, loader: 'tsx', contents:
        name === 'auth' ? auth : name === 'storage' ? `export default {
          getItem: async k => localStorage.getItem(k),
          removeItem: async k => { if(k === window.qaFailRemoveKey) throw Error('Injected removal failure'); localStorage.removeItem(k); },
          setItem: async (k,v) => { if(k === window.qaFailKey) throw Error('Injected storage failure'); localStorage.setItem(k,v); }
        };` : name === 'icons' ? 'export const Icon=()=>null; export const iconSize={md:18,sm:16};'
          : 'export const notificationAsync=async()=>{}; export const impactAsync=async()=>{}; export const selectionAsync=async()=>{}; export const NotificationFeedbackType={Success:1}; export const ImpactFeedbackStyle={Light:1};' }));
    } }],
  });
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/bundle.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/bundle.js' ? built.outputFiles[0].text : '<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><title>同期のローカル検証</title><body style="margin:0;background:#F7F3EA"><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const args = process.env.YOKI_QA_CHROMIUM_BUNDLE
    ? (await import(process.env.YOKI_QA_CHROMIUM_BUNDLE)).default.args.filter(arg => arg !== '--single-process') : ['--no-sandbox'];
  const browser = await chromium.launch({ executablePath: process.env.YOKI_QA_BROWSER, headless: true, args });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, locale: 'ja-JP' });
    const errors = [], sent = []; let pulls = 0, mode = 'invalid-pull';
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('@mentore/profile_v1', JSON.stringify({ nickname: '保存済み', ageRange: '回答しない', gender: '回答しない' })));
    await page.route('**/api/sync', async route => {
      const request = route.request();
      if (request.method() === 'GET') {
        pulls++;
        await route.fulfill({ json: mode === 'invalid-pull' ? { data: [] } : mode === 'sparse-pull' ? { data: {
          '@mentore/profile_v1': { nickname: '別のアカウント', ageRange: '回答しない', gender: '回答しない' },
        } } : { data: {
          '@mentore/profile_v1': { nickname: '検証', ageRange: '回答しない', gender: '回答しない' },
          '@mentore/records_v2': [], '@mentore/mascot_name_v1': '相棒',
          '@yoki/balance_journal_v1': 'must never be applied',
        } } });
      } else {
        sent.push(request.postDataJSON().data);
        await route.fulfill({ status: mode === 'upload-fail' ? 500 : 200, json: { ok: true } });
      }
    });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.getByTestId('cloud-sync-retry').waitFor();
    assert.equal(await page.getByRole('button', { name: '記録を保存する', exact: true }).getAttribute('aria-disabled'), 'true');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('@mentore/profile_v1')).nickname), '保存済み');
    assert.equal(sent.length, 0);
    mode = 'ready'; await page.getByTestId('cloud-sync-retry').tap();
    await page.waitForFunction(() => window.qaApp.cloudSynced);
    assert.equal(await page.evaluate(() => localStorage.getItem('@yoki/balance_journal_v1')), null);
    await page.getByTestId('saved-name').filter({ hasText: '相棒' }).waitFor();
    console.log('PASS malformed initial pull retains saved profile; retry hydrates and ignores foreign keys');

    mode = 'upload-fail'; await page.getByRole('button', { name: '記録を保存する', exact: true }).tap();
    await page.getByText('端末には保存されています。クラウドへの保存をもう一度お試しください。', { exact: true }).waitFor();
    const first = await page.evaluate(() => JSON.parse(localStorage.getItem('@mentore/records_v2')));
    assert.equal(first.length, 1); assert.equal(first[0].notes, 'ローカル検証の記録');
    await page.getByRole('button', { name: '名前を変更する', exact: true }).tap();
    await page.getByTestId('cloud-sync-retry').waitFor();
    if (process.env.YOKI_QA_SCREENSHOTS) {
      fs.mkdirSync(process.env.YOKI_QA_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: path.join(process.env.YOKI_QA_SCREENSHOTS, 'sync-upload-retry.jpg'), quality: 90 });
    }
    const beforeRetry = pulls; mode = 'ready'; await page.getByTestId('cloud-sync-retry').tap();
    await page.getByText('クラウドへの同期が完了しています。', { exact: true }).waitFor();
    assert.equal(pulls, beforeRetry, 'upload retry must not download over local edits');
    assert.equal(sent.at(-1)['@mentore/mascot_name_v1'], '新しい相棒');
    assert.deepEqual(sent.at(-1)['@mentore/records_v2'], first);
    console.log('PASS actual record save survives failed upload; touch retry uploads latest local data');

    // A partially applied snapshot stays behind recovery; no successful-sync state.
    await page.evaluate(() => { window.qaFailKey = '@mentore/records_v2'; window.qaAuth('account-b'); });
    await page.getByTestId('cloud-sync-retry').waitFor();
    assert.equal(await page.evaluate(() => window.qaApp.cloudSynced), false);
    assert.ok(await page.evaluate(() => localStorage.getItem('@yoki/balance_journal_v1')));
    await page.evaluate(() => { window.qaFailKey = null; });
    await page.getByTestId('cloud-sync-retry').tap();
    await page.waitForFunction(() => window.qaApp.cloudSynced);
    assert.equal(await page.evaluate(() => localStorage.getItem('@yoki/balance_journal_v1')), null);
    console.log('PASS interrupted multi-key hydration remains gated and recovers on retry');
    mode = 'upload-fail'; await page.getByRole('button', { name: '記録を保存する', exact: true }).tap();
    await page.getByTestId('cloud-sync-retry').waitFor();
    const unsent = await page.evaluate(() => JSON.parse(localStorage.getItem('@mentore/records_v2')));
    assert.equal(unsent.length, 1);
    // The authenticated fixture restarts as account-a; its failed upload must be
    // retained independently while another account's data is visible locally.
    mode = 'ready'; await page.reload();
    await page.waitForFunction(() => window.qaApp?.cloudSynced);
    await page.evaluate(() => window.qaAuth('account-b'));
    await page.waitForFunction(() => window.qaApp.cloudSynced && window.qaApp.records.length === 1);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('@mentore/records_v2'))), unsent);
    assert.deepEqual(sent.at(-1)['@mentore/records_v2'], unsent);
    console.log('PASS unacknowledged records survive app restart and an intervening account');
    // A sparse account must not inherit the preceding account's omitted keys.
    mode = 'sparse-pull';
    await page.evaluate(() => {
      localStorage.setItem('@mentore/shop_state_v2', '{"inventory":["previous-account-item"]}');
      window.qaFailRemoveKey = '@mentore/records_v2';
      window.qaAuth('account-c');
    });
    await page.getByTestId('cloud-sync-retry').waitFor();
    assert.equal(await page.evaluate(() => window.qaApp.cloudSynced), false);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('@yoki/balance_journal_v1')).version), 2);
    await page.evaluate(() => { window.qaFailRemoveKey = null; });
    await page.getByTestId('cloud-sync-retry').tap();
    await page.waitForFunction(() => window.qaApp.cloudSynced && window.qaApp.profile?.nickname === '別のアカウント');
    assert.deepEqual(await page.evaluate(() => window.qaApp.records), []);
    assert.equal(await page.evaluate(() => window.qaApp.feedState.points), 0);
    assert.equal(await page.evaluate(() => window.qaApp.mascotName), '');
    assert.equal(await page.evaluate(() => window.qaApp.progress.totalDays), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('@mentore/shop_state_v2')), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('@mentore/records_v2')), null);
    if (process.env.YOKI_QA_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.YOKI_QA_SCREENSHOTS, 'sync-account-switch.jpg'), quality: 90 });
    await page.getByRole('button', { name: '名前を変更する', exact: true }).tap();
    await page.getByText('クラウドへの同期が完了しています。', { exact: true }).waitFor();
    assert.equal('@mentore/records_v2' in sent.at(-1), false);
    assert.equal('@mentore/shop_state_v2' in sent.at(-1), false);
    console.log('PASS sparse account clears preceding records/points/name/inventory in storage and memory before editing');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
