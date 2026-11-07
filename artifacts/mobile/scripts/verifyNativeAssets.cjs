const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// Read Metro's serialized asset descriptors without executing the app bundle.
function readAssetDescriptors(bundle) {
  // Resolver code also returns objects with __packager_asset. Serialized Metro
  // descriptors have httpServerLocation immediately after that marker.
  const start = /\{\s*(?:__packager_asset|"__packager_asset")\s*:\s*(?:!0|true)\s*,\s*(?:httpServerLocation|"httpServerLocation")\s*:/g;
  const descriptors = [];
  for (let match; (match = start.exec(bundle));) {
    let quoted = false, escaped = false, depth = 0, end = match.index;
    for (; end < bundle.length; end++) {
      const char = bundle[end];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) break;
    }
    if (end === bundle.length) throw new Error('Unterminated native asset descriptor');
    const literal = bundle.slice(match.index, end + 1);
    // Preserve JSON strings verbatim; only normalize minified keys/booleans.
    const json = literal.replace(/"(?:[^"\\]|\\.)*"|([A-Za-z_$][\w$]*)(\s*:)|!([01])\b/g,
      (token, key, colon, bool) => key ? JSON.stringify(key) + colon : bool ? (bool === '0' ? 'true' : 'false') : token);
    descriptors.push(JSON.parse(json));
    start.lastIndex = end + 1;
  }
  if (!descriptors.length) throw new Error('No native asset descriptors found; output cannot be verified');
  return descriptors;
}

function isWithin(root, file) {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function localFile(outputRoot, publicUrl, value) {
  const base = new URL(publicUrl + '/');
  const url = new URL(value);
  if (url.origin !== base.origin || url.username || url.password || !url.pathname.startsWith(base.pathname)) {
    throw new Error('URL is outside the build public path');
  }
  const file = path.resolve(outputRoot, decodeURIComponent(url.pathname.slice(base.pathname.length)));
  if (!isWithin(outputRoot, file)) throw new Error('Asset path escapes build output');
  const real = fs.realpathSync(file);
  if (!isWithin(outputRoot, real) || !fs.statSync(real).isFile()) throw new Error('Asset is not a build output file');
  return real;
}

function inspectNativeBundleAssets({ bundle, platform, outputRoot, buildId, publicUrl }) {
  const root = fs.realpathSync(outputRoot);
  const descriptors = readAssetDescriptors(bundle);
  const errors = [];
  let files = 0, densityVariants = 0;
  for (const meta of descriptors) {
    const { name, type, scales, fileHashes, httpServerLocation } = meta;
    if (typeof name !== 'string' || !name || /[/\\\0]/.test(name) ||
        typeof type !== 'string' || !/^[a-zA-Z0-9]+$/.test(type) ||
        !Array.isArray(scales) || !scales.length || scales.some(scale => !Number.isFinite(scale) || scale <= 0) ||
        !Array.isArray(fileHashes) || fileHashes.length !== scales.length ||
        fileHashes.some(hash => typeof hash !== 'string' || !/^[a-f0-9]{32}$/.test(hash))) {
      throw new Error(`Invalid native asset descriptor: ${platform}/${name || '(unnamed)'}`);
    }
    const prefix = `${publicUrl}/${buildId}/assets/${platform}/`;
    if (typeof httpServerLocation !== 'string' || !httpServerLocation.startsWith(prefix)) {
      errors.push({ platform, name, problem: 'Asset location does not reference this build/platform' });
      continue;
    }
    const seen = new Set();
    for (const [index, scale] of scales.entries()) {
      // Expo selects the first matching scale/hash, including duplicated scales.
      if (seen.has(scale)) continue;
      seen.add(scale);
      const filename = name + (scale === 1 ? '' : `@${scale}x`) + '.' + type;
      const url = httpServerLocation + '/' + encodeURIComponent(name) + (scale === 1 ? '' : `@${scale}x`) + '.' + encodeURIComponent(type);
      files++;
      if (scale > 1) densityVariants++;
      try {
        const file = localFile(root, publicUrl, url);
        const hash = createHash('md5').update(fs.readFileSync(file)).digest('hex');
        if (hash !== fileHashes[index]) throw new Error('File hash does not match the bundle descriptor');
      } catch (error) {
        errors.push({ platform, name: filename, problem: error.code === 'ENOENT' ? 'Missing file' : error.message });
      }
    }
  }
  return { platform, descriptors: descriptors.length, files, densityVariants, errors };
}

function verifyNativeBuild(outputRoot) {
  const root = fs.realpathSync(outputRoot);
  const reports = [];
  for (const platform of ['ios', 'android']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, platform, 'manifest.json'), 'utf8'));
    const launch = new URL(manifest.launchAsset?.url);
    const match = /^(.*)\/(\d+-\d+)\/_expo\/static\/js\/(ios|android)\/bundle\.js$/.exec(launch.pathname);
    if (!match || match[3] !== platform) throw new Error(`Unexpected ${platform} launch bundle path`);
    const publicUrl = launch.origin + match[1];
    const bundle = fs.readFileSync(localFile(root, publicUrl, launch.href), 'utf8');
    reports.push(inspectNativeBundleAssets({ bundle, platform, outputRoot: root, buildId: match[2], publicUrl }));
  }
  const errors = reports.flatMap(report => report.errors);
  if (errors.length) {
    const error = new Error(`Native asset verification failed (${errors.length}):\n` +
      errors.map(item => `${item.platform}/${item.name}: ${item.problem}`).join('\n'));
    error.reports = reports;
    throw error;
  }
  return reports;
}

if (require.main === module) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node verifyNativeAssets.cjs <static-build-directory>');
    const root = path.resolve(process.argv[2] || 'artifacts/mobile/static-build');
    for (const report of verifyNativeBuild(root)) {
      console.log(`PASS ${report.platform}: ${report.descriptors} descriptors, ${report.files} files, ${report.densityVariants} higher-density files; every file hash matches`);
    }
    console.log('YOKI_NATIVE_ASSETS_OK');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { readAssetDescriptors, inspectNativeBundleAssets, verifyNativeBuild };
