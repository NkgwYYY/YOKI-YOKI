const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// Metro supplies the exact platform/scale files. Guessing name + extension loses
// Retina variants and platform-specific artwork (e.g. icon.ios.png).
function packageNativeAssets({ bundle, assets, platform, outputRoot, buildId, publicUrl, workspaceRoot }) {
  if (!['ios', 'android'].includes(platform) || !/^\d+-\d+$/.test(buildId) || !Array.isArray(assets)) {
    throw new Error('Invalid native asset build metadata');
  }
  const locations = new Map();
  const hashes = new Map();
  const copied = new Map();
  const workspace = fs.realpathSync(workspaceRoot);
  for (const asset of assets) {
    const { httpServerLocation: location, name, type, files, scales } = asset;
    if (typeof location !== 'string' || !location.startsWith('/') ||
        typeof name !== 'string' || !name || /[/\\\0]/.test(name) ||
        typeof type !== 'string' || !/^[a-zA-Z0-9]+$/.test(type) ||
        !Array.isArray(files) || !files.length || !Array.isArray(scales) || files.length !== scales.length) {
      throw new Error('Incomplete native asset metadata');
    }
    const directory = `${buildId}/assets/${platform}/${createHash('sha256').update(location).digest('hex').slice(0, 24)}`;
    const remoteDirectory = `${publicUrl}/${directory}`;
    locations.set(location, remoteDirectory);
    // Metro's .assets endpoint returns the raw query path. Expo's serializer
    // percent-encodes that path in the JS descriptor (literal '+' stays '+').
    const encodedLocation = location.replace(/(\?(?:unstable_path|export_path)=)(.*)$/, (_match, prefix, value) => prefix + encodeURIComponent(value));
    locations.set(encodedLocation, remoteDirectory);
    const seenScales = new Set();
    for (let index = 0; index < files.length; index++) {
      const scale = scales[index];
      if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid native asset scale');
      // Expo's resolver chooses the first matching scale, including duplicate 1x
      // entries emitted by some navigation assets. Preserve that choice exactly.
      if (seenScales.has(scale)) continue;
      seenScales.add(scale);
      const source = fs.realpathSync(files[index]);
      const relative = path.relative(workspace, source);
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || !fs.statSync(source).isFile()) {
        throw new Error('Native asset source must be a workspace file');
      }
      const filename = `${name}${scale === 1 ? '' : `@${scale}x`}.${type}`;
      const destination = path.join(outputRoot, directory, filename);
      if (copied.has(destination) && copied.get(destination) !== source) throw new Error('Conflicting native asset destination');
      if (!copied.has(destination)) {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(source, destination);
        copied.set(destination, source);
      }
      const url = `${remoteDirectory}/${encodeURIComponent(filename)}`;
      const fileHash = asset.fileHashes?.[index] || createHash('md5').update(fs.readFileSync(source)).digest('hex');
      hashes.set(fileHash, url);
      if (!hashes.has(asset.hash)) hashes.set(asset.hash, url);
    }
  }
  let rewritten = 0;
  const updated = bundle.replace(/httpServerLocation:("(?:[^"\\]|\\.)*")/g, (_match, literal) => {
    const location = JSON.parse(literal);
    const url = locations.get(location);
    if (!url) throw new Error('Bundle asset is missing from Metro metadata');
    rewritten++;
    return `httpServerLocation:${JSON.stringify(url)}`;
  });
  if (assets.length && !rewritten) throw new Error('No native bundle asset references were updated');
  return { bundle: updated, hashes, fileCount: copied.size };
}

module.exports = { packageNativeAssets };
