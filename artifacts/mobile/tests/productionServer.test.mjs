import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../server/serve.js', import.meta.url));
async function fixture(t, basePath = '/') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yoki-serving-'));
  const write = (name, data) => { const target = path.join(root, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, data); };
  write('web/index.html', '<!doctype html><html lang="ja">YOKI QA</html>');
  write('web/assets/相棒 の部屋.png', 'web-image');
  write('1790000000000-12/assets/ios/icons/相棒 の部屋@3x.png', 'native-image-3x');
  write('1790000000000-12/_expo/static/js/ios/bundle.js', 'console.log("native QA");');
  write('ios/manifest.json', JSON.stringify({ launchAsset: { url: '/1790000000000-12/_expo/static/js/ios/bundle.js' } }));
  // A similarly prefixed sibling must never pass containment checks.
  const sibling = root + '-private'; fs.mkdirSync(sibling); fs.writeFileSync(path.join(sibling, 'private.txt'), 'must not serve');
  const proc = spawn(process.execPath, [script], { env: { ...process.env, PORT: '0', BASE_PATH: basePath, STATIC_BUILD_DIR: root }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { if (proc.exitCode === null) { proc.kill(); await once(proc, 'exit'); } fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(sibling, { recursive: true, force: true }); });
  const origin = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not start')), 5000);
    proc.once('error', error => { clearTimeout(timeout); reject(error); });
    proc.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited: ${code}`)); });
    proc.stdout.on('data', data => { const port = /on port (\d+)/.exec(String(data)); if (port) { clearTimeout(timeout); resolve('http://127.0.0.1:' + port[1]); } });
  });
  return { origin, root, sibling };
}

test('production server delivers decoded Web/native assets, manifests, bundles and HEAD', async t => {
  const { origin } = await fixture(t);
  for (const [uri, expected, type] of [
    ['/assets/' + encodeURIComponent('相棒 の部屋.png'), 'web-image', 'image/png'],
    ['/1790000000000-12/assets/ios/icons/' + encodeURIComponent('相棒 の部屋@3x.png'), 'native-image-3x', 'image/png'],
    ['/1790000000000-12/_expo/static/js/ios/bundle.js', 'console.log("native QA");', 'application/javascript'],
  ]) {
    const res = await fetch(origin + uri); assert.equal(res.status, 200); assert.ok(res.headers.get('content-type').startsWith(type)); assert.equal(await res.text(), expected);
    const head = await fetch(origin + uri, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(await head.text(), '');
  }
  const manifest = await fetch(origin + '/manifest', { headers: { 'expo-platform': 'ios' } });
  assert.equal(manifest.status, 200); assert.ok((await manifest.json()).launchAsset.url.endsWith('bundle.js'));
  assert.match(manifest.headers.get('cache-control'), /no-store/);
});

test('missing bundles/assets return 404 while application deep links still open', async t => {
  const { origin } = await fixture(t);
  for (const uri of ['/assets/missing@3x.png', '/_expo/static/js/web/missing.js', '/1790000000000-12/assets/missing', '/not-found.json']) {
    const res = await fetch(origin + uri); assert.equal(res.status, 404); assert.doesNotMatch(await res.text(), /<html/);
  }
  for (const uri of ['/', '/guide', '/monthly-report']) {
    const res = await fetch(origin + uri, { headers: { 'accept-encoding': 'gzip' } }); assert.equal(res.status, 200); assert.match(await res.text(), /YOKI QA/); assert.match(res.headers.get('cache-control'), /no-store/);
  }
});

test('malformed and escaping paths cannot crash the server or expose sibling files', async t => {
  const { origin, sibling } = await fixture(t);
  const raw = uri => new Promise((resolve, reject) => { http.get(origin + uri, res => { let text = ''; res.on('data', b => text += b); res.on('end', () => resolve({ status: res.statusCode, text })); }).on('error', reject); });
  for (const uri of ['/%E0%A4', '/bad%00name', '/bad%5Cname']) assert.equal((await raw(uri)).status, 400);
  const escape = await raw('/..%2F' + path.basename(sibling) + '/private.txt');
  assert.notEqual(escape.status, 200); assert.doesNotMatch(escape.text, /must not serve/);
  assert.equal((await fetch(origin + '/')).status, 200);
});

test('configured base path has a segment boundary and retains deep-link routing', async t => {
  const { origin } = await fixture(t, '/mobile');
  assert.equal((await fetch(origin + '/mobile/guide')).status, 200);
  assert.equal((await fetch(origin + '/mobile/assets/' + encodeURIComponent('相棒 の部屋.png'))).status, 200);
  assert.equal((await fetch(origin + '/mobile-other/guide')).status, 404);
});
