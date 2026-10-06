// Exercises the real deployment server and compiled native asset URLs. This is
// HTTP/bundle verification, not an iOS/Android runtime or signed-build test.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const mobile = path.resolve(__dirname, '..');
const processes = [];

async function serve(root) {
  const proc = spawn(process.execPath, [path.join(mobile, 'server/serve.js')], {
    env: { ...process.env, PORT: '0', BASE_PATH: '/', STATIC_BUILD_DIR: root }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  processes.push(proc);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Production server startup timed out')), 10000);
    proc.once('error', e => { clearTimeout(timer); reject(e); });
    proc.once('exit', code => { clearTimeout(timer); reject(new Error('Production server exited ' + code)); });
    proc.stdout.on('data', data => { const match = /on port (\d+)/.exec(String(data)); if (match) { clearTimeout(timer); resolve('http://127.0.0.1:' + match[1]); } });
    proc.stderr.on('data', data => process.stderr.write(data));
  });
}

(async () => {
  assert.ok(process.env.YOKI_QA_NATIVE_BUILD, 'Set YOKI_QA_NATIVE_BUILD to a completed scripts/build.js output');
  assert.ok(process.env.YOKI_QA_EXPORT, 'Set YOKI_QA_EXPORT to a completed local guest Web export');
  const root = path.resolve(process.env.YOKI_QA_NATIVE_BUILD);
  const guestRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'yoki-production-guest-'));
  try {
    const origin = await serve(root);
    for (const platform of ['ios', 'android']) {
      const response = await fetch(origin + '/manifest', { headers: { 'expo-platform': platform } });
      assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /json/);
      const manifest = await response.json();
      const bundleUrl = new URL(manifest.launchAsset.url);
      const bundleResponse = await fetch(origin + bundleUrl.pathname);
      assert.equal(bundleResponse.status, 200); assert.match(bundleResponse.headers.get('content-type'), /javascript/);
      const bundle = await bundleResponse.text(); assert.ok(bundle.length > 100000);
      assert.equal(bundle, fs.readFileSync(path.join(root, bundleUrl.pathname), 'utf8'));
      let descriptors = 0, files = 0, densityVariants = 0;
      const pattern = /\{__packager_asset:(?:!0|true),httpServerLocation:("(?:[^"\\]|\\.)*")([^}]+)\}/g;
      for (const match of bundle.matchAll(pattern)) {
        const location = JSON.parse(match[1]);
        const field = name => JSON.parse(new RegExp(`${name}:("(?:[^"\\\\]|\\\\.)*"|\\[[^\\]]*\\])`).exec(match[2])[1]);
        const scales = field('scales'), hashes = field('fileHashes'), name = field('name'), type = field('type');
        const seen = new Set();
        for (const [index, scale] of scales.entries()) {
          if (seen.has(scale)) continue; seen.add(scale);
          const url = new URL(location + '/' + encodeURIComponent(name) + (scale === 1 ? '' : `@${scale}x`) + '.' + encodeURIComponent(type));
          assert.ok(url.pathname.includes(`/assets/${platform}/`));
          const asset = await fetch(origin + url.pathname + '?platform=' + platform);
          assert.equal(asset.status, 200, url.pathname); assert.doesNotMatch(asset.headers.get('content-type'), /html/);
          const bytes = Buffer.from(await asset.arrayBuffer());
          assert.equal(createHash('md5').update(bytes).digest('hex'), hashes[index], `Runtime hash mismatch: ${platform}/${name}@${scale}x`);
          files++; if (scale > 1) densityVariants++;
        }
        descriptors++;
      }
      assert.ok(descriptors > 50 && densityVariants > 0);
      console.log(`PASS ${platform}: real manifest/bundle, ${descriptors} descriptors, ${files} asset requests, ${densityVariants} higher-density files; every byte hash matches the runtime descriptor`);
    }
    // Inspect the current production Web build's routing/bundle headers too.
    const html = await (await fetch(origin + '/guide')).text();
    const entry = /<script[^>]+src="([^"]+)"/.exec(html)?.[1];
    assert.ok(entry, 'Production Web index has an entry bundle');
    const js = await fetch(origin + entry); assert.equal(js.status, 200); assert.match(js.headers.get('content-type'), /javascript/);
    assert.equal((await fetch(origin + '/_expo/static/js/web/missing.js')).status, 404);

    // Configured Web account startup still needs the actual identity service.
    // The local-only export uses the same source through the same real server,
    // so the touch/visual suite can run without fake credentials contacting it.
    fs.symlinkSync(path.resolve(process.env.YOKI_QA_EXPORT), path.join(guestRoot, 'web'), 'dir');
    const guestOrigin = await serve(guestRoot);
    const world = spawn(process.execPath, [path.join(__dirname, 'world.browser.cjs')], {
      env: { ...process.env, YOKI_QA_ORIGIN: guestOrigin }, stdio: 'inherit',
    });
    const [code] = await once(world, 'exit'); assert.equal(code, 0, 'World flow through production server');
  } finally {
    for (const proc of processes) if (proc.exitCode === null) { proc.kill(); await once(proc, 'exit'); }
    fs.rmSync(guestRoot, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
