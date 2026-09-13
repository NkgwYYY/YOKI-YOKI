/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with two special routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * - GET / without expo-platform → landing page HTML
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Text-based types worth compressing (images/fonts like woff2 are already compressed)
const COMPRESSIBLE_EXTS = new Set(['.html', '.js', '.json', '.css', '.svg', '.map', '.ttf', '.otf']);

// In-memory cache of compressed static payloads keyed by absolute path + encoding.
// Values are Promise<Buffer> so concurrent first hits share one compression job.
// LRU-evicted with a total byte cap so memory stays bounded.
const compressedCache = new Map();
const CACHE_MAX_BYTES = 64 * 1024 * 1024;
let cacheBytes = 0;

function cachePut(key, promise) {
  compressedCache.set(key, promise);
  promise
    .then((buf) => {
      cacheBytes += buf.length;
      // Evict oldest entries (Map preserves insertion order) past the cap.
      for (const [k, p] of compressedCache) {
        if (cacheBytes <= CACHE_MAX_BYTES) break;
        if (k === key) continue;
        compressedCache.delete(k);
        p.then((b) => { cacheBytes -= b.length; }).catch(() => {});
      }
    })
    .catch(() => compressedCache.delete(key));
}

/**
 * Pick a response encoding honoring Accept-Encoding quality values,
 * so `br;q=0` or `gzip;q=0` are treated as unacceptable.
 */
function pickEncoding(req) {
  const accept = String(req.headers['accept-encoding'] || '');
  const q = { br: null, gzip: null, '*': null };
  for (const part of accept.split(',')) {
    const [rawName, ...params] = part.trim().split(';');
    const name = rawName.trim().toLowerCase();
    if (!(name in q)) continue;
    let quality = 1;
    for (const p of params) {
      const m = /^\s*q\s*=\s*([\d.]+)\s*$/i.exec(p);
      if (m) quality = parseFloat(m[1]);
    }
    q[name] = quality;
  }
  const allowed = (name) => {
    const quality = q[name] !== null ? q[name] : q['*'];
    return quality !== null && quality > 0;
  };
  if (allowed('br')) return 'br';
  if (allowed('gzip')) return 'gzip';
  return null;
}

function compressBuffer(buf, encoding) {
  return new Promise((resolve, reject) => {
    const done = (err, out) => (err ? reject(err) : resolve(out));
    if (encoding === 'br') {
      zlib.brotliCompress(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }, done);
    } else {
      zlib.gzip(buf, { level: 6 }, done);
    }
  });
}

/**
 * Send a static file, compressing text-based types when the client supports it.
 * Compression runs on zlib's thread pool (async) and results are cached,
 * so the event loop is never blocked and repeat hits are served from memory.
 */
function sendFile(req, res, filePath, contentType, cacheControl) {
  const ext = path.extname(filePath).toLowerCase();
  const headers = { 'content-type': contentType, 'cache-control': cacheControl, vary: 'accept-encoding' };
  const encoding = COMPRESSIBLE_EXTS.has(ext) ? pickEncoding(req) : null;

  if (!encoding) {
    res.writeHead(200, headers);
    res.end(fs.readFileSync(filePath));
    return;
  }

  const key = `${filePath}\u0000${encoding}`;
  let promise = compressedCache.get(key);
  if (!promise) {
    promise = compressBuffer(fs.readFileSync(filePath), encoding);
    cachePut(key, promise);
  } else {
    // Refresh LRU position
    compressedCache.delete(key);
    compressedCache.set(key, promise);
  }
  promise
    .then((body) => {
      headers['content-encoding'] = encoding;
      res.writeHead(200, headers);
      res.end(body);
    })
    .catch(() => {
      // Compression failed — fall back to the uncompressed file.
      res.writeHead(200, headers);
      res.end(fs.readFileSync(filePath));
    });
}

/**
 * Warm the cache at startup: precompress the large hashed bundles so the
 * first real visitor never waits on compression.
 */
function warmCompressedCache(root) {
  const dir = path.join(root, 'web', '_expo', 'static');
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { stack.push(p); continue; }
      if (!COMPRESSIBLE_EXTS.has(path.extname(e.name).toLowerCase())) continue;
      for (const enc of ['br', 'gzip']) {
        const key = `${p}\u0000${enc}`;
        if (!compressedCache.has(key)) {
          cachePut(key, compressBuffer(fs.readFileSync(p), enc));
        }
      }
    }
  }
}

const STATIC_ROOT = path.resolve(__dirname, '..', 'static-build');
const TEMPLATE_PATH = path.resolve(__dirname, 'templates', 'landing-page.html');
const basePath = (process.env.BASE_PATH || '/').replace(/\/+$/, '');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json',
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, '..', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    return appJson.expo?.name || 'App Landing Page';
  } catch {
    return 'App Landing Page';
  }
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, 'utf-8');
  res.writeHead(200, {
    'content-type': 'application/json',
    'cache-control': 'no-store, no-cache, must-revalidate',
    'expo-protocol-version': '1',
    'expo-sfv-version': '0',
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = forwardedProto || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate',
  });
  res.end(html);
}

function serveStaticFile(req, urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return true;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  sendFile(req, res, filePath, contentType, 'no-cache');
  return true;
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
const appName = getAppName();

const WEB_ROOT = path.join(STATIC_ROOT, 'web');
const hasWebBuild = () => fs.existsSync(path.join(WEB_ROOT, 'index.html'));

function serveWebApp(req, pathname, res) {
  // Try to serve a matching static file first (JS bundles, assets, etc.)
  if (pathname !== '/') {
    const filePath = path.join(WEB_ROOT, pathname);
    const normalizedFilePath = path.normalize(filePath);
    if (!normalizedFilePath.startsWith(WEB_ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (fs.existsSync(normalizedFilePath) && !fs.statSync(normalizedFilePath).isDirectory()) {
      const ext = path.extname(normalizedFilePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      // Hashed bundles under _expo/static can be cached forever; everything else must revalidate
      const cacheControl = pathname.includes('/_expo/static/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache';
      sendFile(req, res, normalizedFilePath, contentType, cacheControl);
      return;
    }
  }

  // SPA fallback — all routes serve index.html (never cache it)
  const indexPath = path.join(WEB_ROOT, 'index.html');
  sendFile(req, res, indexPath, 'text/html; charset=utf-8', 'no-store, no-cache, must-revalidate');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || '/';
  }

  const platform = req.headers['expo-platform'];

  // Native Expo Go → serve manifest
  if (platform === 'ios' || platform === 'android') {
    if (pathname === '/' || pathname === '/manifest') {
      return serveManifest(platform, res);
    }
  }

  // Google Search Console HTML verification files
  if (pathname.match(/^\/google[a-f0-9]+\.html$/)) {
    const verifyPath = path.join(WEB_ROOT, pathname);
    if (fs.existsSync(verifyPath)) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(verifyPath, 'utf-8'));
      return;
    }
    // Fallback: derive content from filename
    const code = pathname.replace(/^\//, '').replace(/\.html$/, '');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`google-site-verification: ${code}`);
    return;
  }

  // Native bundle and asset URLs live at the static-build root. Serve an
  // existing file before the web SPA fallback, otherwise requests such as
  // /<build-id>/_expo/static/js/ios/bundle.js receive index.html and Hermes
  // aborts while trying to evaluate HTML as JavaScript.
  if (pathname !== '/' && serveStaticFile(req, pathname, res)) {
    return;
  }

  // Browser → web build (SPA) if available
  if (hasWebBuild()) {
    return serveWebApp(req, pathname, res);
  }

  // Fallback: landing page / legacy static files
  if (pathname === '/') {
    return serveLandingPage(req, res, landingPageTemplate, appName);
  }

  if (!serveStaticFile(req, pathname, res)) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const port = parseInt(process.env.PORT || '3000', 10);
server.listen(port, '0.0.0.0', () => {
  console.log(`Serving static Expo build on port ${port}`);
  warmCompressedCache(STATIC_ROOT);
});
