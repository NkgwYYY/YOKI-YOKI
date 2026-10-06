import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { packageNativeAssets } from '../scripts/nativeAssets.cjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yoki-assets-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = (name, content) => {
    const target = path.join(root, name); fs.writeFileSync(target, content); return target;
  };
  const meta = {
    httpServerLocation: '/assets?unstable_path=..%2F..%2Fnode_modules%2Ficons',
    name: '相棒 の部屋', type: 'png', hash: 'collection-hash',
    scales: [1, 2, 3], fileHashes: ['one', 'two', 'three'],
    files: [file('room.ios.png', 'ios-1x'), file('room@2x.ios.png', 'ios-2x'), file('room@3x.ios.png', 'ios-3x')],
  };
  const bundle = `registerAsset({httpServerLocation:${JSON.stringify(meta.httpServerLocation)},scales:[1,2,3],name:"相棒 の部屋",type:"png"})`;
  const options = { bundle, assets: [meta], platform: 'ios', outputRoot: path.join(root, 'output'), buildId: '1790000000000-12', publicUrl: 'https://qa.yoki.jp/mobile', workspaceRoot: root };
  return { root, meta, options, file };
}

test('packages exact platform files for every density, encoded names and manifest hashes', t => {
  const { options, meta } = fixture(t);
  const result = packageNativeAssets(options);
  assert.equal(result.fileCount, 3);
  const location = JSON.parse(/httpServerLocation:("[^"]+")/.exec(result.bundle)[1]);
  assert.ok(location.startsWith(options.publicUrl + '/' + options.buildId + '/assets/ios/'));
  assert.ok(!location.includes('node_modules') && !location.includes('..') && !location.includes('?'));
  for (const [index, scale] of meta.scales.entries()) {
    const url = result.hashes.get(meta.fileHashes[index]);
    assert.equal(url, location + '/' + encodeURIComponent(meta.name + (scale === 1 ? '' : `@${scale}x`) + '.png'));
    const relative = decodeURIComponent(url.slice(options.publicUrl.length + 1));
    assert.equal(fs.readFileSync(path.join(options.outputRoot, relative), 'utf8'), `ios-${scale}x`);
  }
  assert.equal(result.hashes.get(meta.hash), result.hashes.get('one'));
});

test('matches the runtime first-match choice for duplicate scales', t => {
  const { options, meta, file } = fixture(t);
  meta.files.splice(1, 0, file('unused.png', 'not selected')); meta.scales.splice(1, 0, 1); meta.fileHashes.splice(1, 0, 'unused');
  const result = packageNativeAssets(options);
  assert.equal(result.fileCount, 3);
  assert.equal(result.hashes.has('unused'), false);
  assert.equal(fs.readFileSync(path.join(options.outputRoot, decodeURIComponent(result.hashes.get('one').slice(options.publicUrl.length + 1))), 'utf8'), 'ios-1x');
});

test('matches Expo encoded bundle queries to raw Metro metadata without losing plus or percent signs', t => {
  const { options, meta } = fixture(t);
  const raw = './../../node_modules/package+variant/50% art';
  meta.httpServerLocation = '/assets/?unstable_path=' + raw;
  delete meta.fileHashes;
  const result = packageNativeAssets({ ...options, bundle: `httpServerLocation:${JSON.stringify('/assets/?unstable_path=' + encodeURIComponent(raw))}` });
  assert.equal(result.fileCount, 3);
  assert.ok(result.hashes.has(createHash('md5').update('ios-2x').digest('hex')));
  assert.doesNotMatch(result.bundle, /unstable_path|node_modules/);
});

test('keeps Android and iOS source variants separate', t => {
  const { options, meta, file } = fixture(t);
  const ios = packageNativeAssets(options);
  const android = packageNativeAssets({ ...options, platform: 'android', assets: [{ ...meta, files: meta.scales.map(s => file(`room-${s}.android.png`, `android-${s}x`)) }] });
  assert.notEqual(ios.hashes.get('two'), android.hashes.get('two'));
  assert.equal(fs.readFileSync(path.join(options.outputRoot, decodeURIComponent(android.hashes.get('two').slice(options.publicUrl.length + 1))), 'utf8'), 'android-2x');
});

test('fails the build on unknown bundle references, missing scale files or invalid metadata', t => {
  const { options, meta } = fixture(t);
  assert.throws(() => packageNativeAssets({ ...options, bundle: 'httpServerLocation:"/missing"' }), /missing from Metro/);
  assert.throws(() => packageNativeAssets({ ...options, assets: [{ ...meta, scales: [1] }] }), /Incomplete/);
  fs.unlinkSync(meta.files[2]);
  assert.throws(() => packageNativeAssets(options), /ENOENT/);
});

test('rejects escaping filenames, out-of-workspace sources and conflicting targets', t => {
  const { options, meta, file } = fixture(t);
  assert.throws(() => packageNativeAssets({ ...options, assets: [{ ...meta, name: '../escape' }] }), /Incomplete/);
  assert.throws(() => packageNativeAssets({ ...options, workspaceRoot: options.outputRoot }), /ENOENT/);
  fs.mkdirSync(options.outputRoot);
  assert.throws(() => packageNativeAssets({ ...options, workspaceRoot: options.outputRoot }), /workspace file/);
  assert.throws(() => packageNativeAssets({ ...options, assets: [meta, { ...meta, files: [file('different.png', 'different'), ...meta.files.slice(1)] }] }), /Conflicting/);
});
