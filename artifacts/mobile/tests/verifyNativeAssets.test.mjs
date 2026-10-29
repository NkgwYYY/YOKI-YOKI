import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { packageNativeAssets } from '../scripts/nativeAssets.cjs';
import { readAssetDescriptors, inspectNativeBundleAssets, verifyNativeBuild } from '../scripts/verifyNativeAssets.cjs';

const md5 = value => createHash('md5').update(value).digest('hex');
const checker = fileURLToPath(new URL('../scripts/verifyNativeAssets.cjs', import.meta.url));

function fixture(t, basePath = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yoki-native-output-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const buildId = '1790000000000-12', publicUrl = 'https://qa.yoki.jp' + basePath;
  const variants = [], assets = {};
  const write = (relative, content) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content);
    return file;
  };
  for (const platform of ['ios', 'android']) {
    assets[platform] = ['back-icon', 'clear-icon', 'close-icon', 'search-icon'].map(name => {
      const directory = `${buildId}/assets/${platform}/icons`;
      const hashes = [];
      for (const scale of [1, 2, 3, 4]) {
        const file = write(`${directory}/${name}${scale === 1 ? '' : `@${scale}x`}.png`, `${platform}/${name}/${scale}`);
        if (scale > 1) variants.push(file);
        hashes.push(md5(`${platform}/${name}/${scale}`));
      }
      return { __packager_asset: true, httpServerLocation: `${publicUrl}/${directory}`, name, type: 'png',
        scales: [1, 1, 2, 3, 4], fileHashes: [hashes[0], md5('unused duplicate'), ...hashes.slice(1)] };
    });
    write(`${buildId}/_expo/static/js/${platform}/bundle.js`, assets[platform].map(meta => `registerAsset(${JSON.stringify(meta)});`).join('\n'));
    write(`${platform}/manifest.json`, JSON.stringify({ launchAsset: { url: `${publicUrl}/${buildId}/_expo/static/js/${platform}/bundle.js` } }));
  }
  return { root, buildId, publicUrl, variants, assets, write };
}

test('verifies both platform outputs and first-match hashes for repeated scales, including a deployment base path', t => {
  const { root } = fixture(t, '/mobile');
  assert.deepEqual(verifyNativeBuild(root), ['ios', 'android'].map(platform => ({
    platform, descriptors: 4, files: 16, densityVariants: 12, errors: [],
  })));
  const result = spawnSync(process.execPath, [checker, root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /YOKI_NATIVE_ASSETS_OK/);
});

test('lists all twelve missing high-density icons per OS and exits unsuccessfully', t => {
  const { root, variants } = fixture(t);
  for (const file of variants) fs.unlinkSync(file);
  assert.throws(() => verifyNativeBuild(root), error => {
    assert.equal(error.reports.length, 2);
    for (const report of error.reports) {
      assert.equal(report.errors.length, 12);
      assert.ok(report.errors.every(item => /@[234]x\.png$/.test(item.name) && item.problem === 'Missing file'));
    }
    return true;
  });
  const result = spawnSync(process.execPath, [checker, root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ios\/back-icon@2x.png: Missing file/);
  assert.match(result.stderr, /android\/search-icon@4x.png: Missing file/);
  assert.doesNotMatch(result.stdout, /YOKI_NATIVE_ASSETS_OK/);
});

test('rejects a present high-density file whose bytes differ from the runtime hash', t => {
  const { root, variants } = fixture(t);
  fs.writeFileSync(variants[0], 'incorrect 1x fallback');
  assert.throws(() => verifyNativeBuild(root), /File hash does not match/);
});

test('detects bundle scales omitted by otherwise successful Metro metadata packaging', t => {
  const { root, buildId, publicUrl, write } = fixture(t);
  const source = write('source.png', 'one');
  const meta = { __packager_asset: true, httpServerLocation: '/assets/icons', name: 'arrow', type: 'png',
    scales: [1, 2, 3], fileHashes: ['one', 'two', 'three'].map(md5) };
  const packaged = packageNativeAssets({ bundle: `registerAsset({__packager_asset:!0,httpServerLocation:"/assets/icons",name:"arrow",type:"png",scales:[1,2,3],fileHashes:${JSON.stringify(meta.fileHashes)}})`,
    assets: [{ ...meta, scales: [1], fileHashes: [meta.fileHashes[0]], files: [source], hash: 'collection' }],
    platform: 'ios', outputRoot: root, buildId, publicUrl, workspaceRoot: root });
  assert.equal(packaged.fileCount, 1);
  const report = inspectNativeBundleAssets({ bundle: packaged.bundle, platform: 'ios', outputRoot: root, buildId, publicUrl });
  assert.deepEqual(report.errors.map(item => item.name), ['arrow@2x.png', 'arrow@3x.png']);
});

test('reads minified and quoted descriptors without changing escaped strings or executing code', () => {
  const name = '部屋 } " !0 {name: 100% +';
  const object = { __packager_asset: true, httpServerLocation: '/assets', name, scales: [1, 2, 3] };
  assert.deepEqual(readAssetDescriptors(`before;registerAsset(${JSON.stringify(object)});after;`), [object]);
  assert.equal(readAssetDescriptors('{__packager_asset:!0,httpServerLocation:"/assets",name:"back",scales:[1,2,3]}')[0].__packager_asset, true);
  assert.throws(() => readAssetDescriptors('{__packager_asset:!0,httpServerLocation:"/assets",name:process.exit(99)}'), SyntaxError);
  assert.throws(() => readAssetDescriptors('{__packager_asset:!0,httpServerLocation:"/assets",name:"broken'), /Unterminated/);
  assert.throws(() => readAssetDescriptors('no descriptors'), /No native asset descriptors/);
  const resolver = 'return {__packager_asset:!0,width:this.asset.width,uri:source,scale:pickScale(this.asset.scales)};';
  assert.deepEqual(readAssetDescriptors(resolver + JSON.stringify(object)), [object]);
});

test('rejects stale platform locations, malformed hashes and symlinks outside the output', t => {
  const { root, buildId, publicUrl, assets } = fixture(t);
  const options = { platform: 'ios', outputRoot: root, buildId, publicUrl };
  const meta = { ...assets.ios[0], httpServerLocation: assets.android[0].httpServerLocation };
  assert.match(inspectNativeBundleAssets({ ...options, bundle: JSON.stringify(meta) }).errors[0].problem, /this build\/platform/);
  assert.throws(() => inspectNativeBundleAssets({ ...options, bundle: JSON.stringify({ ...meta, fileHashes: ['bad'] }) }), /Invalid native asset descriptor/);
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'yoki-outside-'));
  t.after(() => fs.rmSync(external, { recursive: true, force: true }));
  const source = path.join(external, 'back.png'); fs.writeFileSync(source, 'outside');
  const target = path.join(root, buildId, 'assets/ios/icons/back-icon.png');
  fs.unlinkSync(target); fs.symlinkSync(source, target);
  assert.throws(() => verifyNativeBuild(root), /not a build output file/);
});

test('missing manifests or swapped launch platforms cannot produce a success result', t => {
  const { root, write, publicUrl, buildId } = fixture(t);
  write('ios/manifest.json', JSON.stringify({ launchAsset: { url: `${publicUrl}/${buildId}/_expo/static/js/android/bundle.js` } }));
  assert.throws(() => verifyNativeBuild(root), /Unexpected ios launch bundle/);
  fs.unlinkSync(path.join(root, 'ios/manifest.json'));
  assert.throws(() => verifyNativeBuild(root), /ENOENT/);
});
