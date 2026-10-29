// Opt-in verification of real, isolated build output (not a synthetic fixture).
// YOKI_NATIVE_BUILD_DIR=/tmp/... node --test tests/nativeBuildDelivery.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { readAssetDescriptors, verifyNativeBuild } from '../scripts/verifyNativeAssets.cjs';

const output = process.env.YOKI_NATIVE_BUILD_DIR;
const md5 = bytes => createHash('md5').update(bytes).digest('hex');
const serverScript = fileURLToPath(new URL('../server/serve.js', import.meta.url));
const iconNames = ['back-icon', 'clear-icon', 'close-icon', 'search-icon'];

test('real build: both OS icon scale files, descriptor hashes and HTTP delivery', { skip: !output }, async t => {
  const root = fs.realpathSync(output);
  const reports = verifyNativeBuild(root);
  const proc = spawn(process.execPath, [serverScript], {
    env: { ...process.env, PORT: '0', BASE_PATH: '/', STATIC_BUILD_DIR: root },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (proc.exitCode === null) { proc.kill(); await once(proc, 'exit'); }
  });
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('HTTP server startup timeout')), 10_000);
    proc.once('error', error => { clearTimeout(timer); reject(error); });
    proc.once('exit', code => { clearTimeout(timer); reject(new Error(`HTTP server exited ${code}`)); });
    proc.stdout.on('data', bytes => {
      const match = /on port (\d+)/.exec(String(bytes));
      if (match) { clearTimeout(timer); resolve('http://127.0.0.1:' + match[1]); }
    });
  });
  const results = [];
  for (const platform of ['ios', 'android']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, platform, 'manifest.json')));
    const launch = new URL(manifest.launchAsset.url);
    const bundlePath = path.join(root, decodeURIComponent(launch.pathname));
    const bundle = fs.readFileSync(bundlePath, 'utf8');
    const response = await fetch(origin + launch.pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/javascript/);
    assert.equal(await response.text(), bundle);
    const descriptors = readAssetDescriptors(bundle);
    for (const name of iconNames) {
      const matches = descriptors.filter(meta => meta.name === name && meta.type === 'png');
      assert.equal(matches.length, 1, `${platform}/${name} descriptor count`);
      const meta = matches[0];
      for (const scale of [2, 3, 4]) {
        const index = meta.scales.indexOf(scale);
        assert.ok(index >= 0, `${platform}/${name}@${scale}x scale`);
        const url = new URL(meta.httpServerLocation + '/' + name + `@${scale}x.png`);
        const file = path.join(root, decodeURIComponent(url.pathname));
        assert.ok(fs.existsSync(file), file);
        const expected = meta.fileHashes[index];
        assert.equal(md5(fs.readFileSync(file)), expected);
        const res = await fetch(origin + url.pathname);
        assert.equal(res.status, 200);
        assert.match(res.headers.get('content-type'), /^image\/png/);
        assert.equal(md5(Buffer.from(await res.arrayBuffer())), expected);
        results.push({ platform, filename: `${name}@${scale}x.png`, url: url.href, file, descriptorHash: expected, exists: true, hashMatches: true, httpStatus: 200, httpHashMatches: true });
      }
    }
  }
  assert.equal(results.length, 24);
  const missing = await fetch(origin + '/1790000000000-0/assets/ios/missing@3x.png');
  assert.equal(missing.status, 404);
  assert.doesNotMatch(await missing.text(), /<html/i);
  if (process.env.YOKI_NATIVE_REPORT) {
    fs.writeFileSync(process.env.YOKI_NATIVE_REPORT, JSON.stringify({ reports, icons: results, missingAssetStatus: 404, deviceTesting: 'not performed' }, null, 2) + '\n');
  }
  t.diagnostic('PASS: iOS 12/12 and Android 12/12 icons exist, match descriptor MD5 and are served over local HTTP with matching bytes; missing assets return 404.');
});
