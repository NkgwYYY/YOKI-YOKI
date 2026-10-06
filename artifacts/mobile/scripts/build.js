const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { getReleaseDomain } = require('./releaseDomain.cjs');
const { packageNativeAssets } = require('./nativeAssets.cjs');

let metroProcess = null;
let metroPort = null;

const projectRoot = path.resolve(__dirname, '..');
const staticBuild = path.resolve(projectRoot, process.env.STATIC_BUILD_DIR || 'static-build');
const expoCli = require.resolve('expo/bin/cli');

function findWorkspaceRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error(
    'Could not find workspace root (no pnpm-workspace.yaml found)',
  );
}

const workspaceRoot = findWorkspaceRoot(projectRoot);
const basePath = (process.env.BASE_PATH || '/').replace(/\/+$/, '');

function exitWithError(message) {
  console.error(message);
  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(1);
}

function setupSignalHandlers() {
  const cleanup = () => {
    if (metroProcess) {
      console.log('Cleaning up Metro process...');
      metroProcess.kill();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);
}

function getDeploymentDomain() {
  return getReleaseDomain(process.env);
}

function prepareDirectories(timestamp) {
  console.log('Preparing build directories...');

  if (staticBuild === projectRoot || projectRoot.startsWith(staticBuild + path.sep)) {
    throw new Error('Build output cannot contain project sources');
  }
  if (fs.existsSync(staticBuild)) {
    if (process.env.STATIC_BUILD_DIR && fs.readdirSync(staticBuild).length &&
        !fs.existsSync(path.join(staticBuild, '.yoki-build-output'))) {
      throw new Error('Custom build output must be empty or an existing YOKI build directory');
    }
    fs.rmSync(staticBuild, { recursive: true });
  }

  const dirs = [
    path.join(staticBuild, timestamp, '_expo', 'static', 'js', 'ios'),
    path.join(staticBuild, timestamp, '_expo', 'static', 'js', 'android'),
    path.join(staticBuild, 'ios'),
    path.join(staticBuild, 'android'),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(path.join(staticBuild, '.yoki-build-output'), timestamp);
  console.log('Build:', timestamp);
}

function clearMetroCache() {
  console.log('Clearing Metro cache...');

  const cacheDirs = [
    path.join(projectRoot, '.metro-cache'),
    path.join(projectRoot, 'node_modules/.cache/metro'),
  ];

  for (const dir of cacheDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  console.log('Cache cleared');
}

function reserveAvailableMetroPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not reserve a Metro port'));
        return;
      }
      const port = address.port;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

function getMetroOrigin() {
  if (!metroPort) {
    throw new Error('Metro port has not been initialized');
  }
  return `http://127.0.0.1:${metroPort}`;
}

async function checkMetroHealth() {
  try {
    const response = await fetch(`${getMetroOrigin()}/status`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function getExpoPublicReplId() {
  return process.env.REPL_ID || process.env.EXPO_PUBLIC_REPL_ID;
}

function getClerkPublishableKey() {
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim();
  if (!publishableKey) {
    exitWithError(
      'ERROR: CLERK_PUBLISHABLE_KEY is required for native production builds. Refusing to create a build that would crash during authentication startup.',
    );
  }
  return publishableKey;
}

async function startMetro(expoPublicDomain, expoPublicReplId) {
  metroPort = await reserveAvailableMetroPort();

  console.log(`Starting Metro on port ${metroPort}...`);
  console.log(`Setting EXPO_PUBLIC_DOMAIN=${expoPublicDomain}`);
  const clerkPublishableKey = getClerkPublishableKey();
  const env = {
    ...process.env,
    EXPO_PUBLIC_DOMAIN: expoPublicDomain,
    EXPO_PUBLIC_REPL_ID: expoPublicReplId,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPublishableKey,
    EXPO_PUBLIC_CLERK_PROXY_URL: process.env.CLERK_PROXY_URL
      ? `https://${expoPublicDomain}${process.env.CLERK_PROXY_URL}`
      : '',
  };

  if (expoPublicReplId) {
    console.log(`Setting EXPO_PUBLIC_REPL_ID=${expoPublicReplId}`);
  }

  metroProcess = spawn(
    process.execPath,
    [
      expoCli,
      'start',
      '--clear',
      '--no-dev',
      '--minify',
      '--localhost',
      '--port',
      String(metroPort),
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      cwd: projectRoot,
      env,
    },
  );

  if (metroProcess.stdout) {
    metroProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[Metro] ${output}`);
    });
  }
  if (metroProcess.stderr) {
    metroProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) console.error(`[Metro Error] ${output}`);
    });
  }

  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const healthy = await checkMetroHealth();
    if (healthy) {
      console.log('Metro ready');
      return;
    }
  }

  console.error('Metro timeout');
  process.exit(1);
}

async function downloadFile(url, outputPath) {
  const controller = new AbortController();
  const fiveMinMS = 5 * 60 * 1_000;
  const timeoutId = setTimeout(() => controller.abort(), fiveMinMS);

  try {
    console.log(`Downloading: ${url}`);
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const file = fs.createWriteStream(outputPath);
    await pipeline(Readable.fromWeb(response.body), file);

    const fileSize = fs.statSync(outputPath).size;

    if (fileSize === 0) {
      fs.unlinkSync(outputPath);
      throw new Error('Downloaded file is empty');
    }
  } catch (error) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    if (error.name === 'AbortError') {
      throw new Error(`Download timeout after 5m: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function nativeEntryUrl(platform, extension) {
  const entryPath = path.resolve(
    projectRoot,
    'node_modules',
    'expo-router',
    'entry',
  );
  const bundlePath = path.relative(workspaceRoot, entryPath);
  const url = new URL(`${getMetroOrigin()}/${bundlePath}.${extension}`);
  url.searchParams.set('platform', platform);
  url.searchParams.set('dev', 'false');
  url.searchParams.set('hot', 'false');
  url.searchParams.set('lazy', 'false');
  url.searchParams.set('minify', 'true');
  return url;
}

async function downloadBundle(platform, timestamp) {
  const url = nativeEntryUrl(platform, 'bundle');
  const output = path.join(
    staticBuild,
    timestamp,
    '_expo',
    'static',
    'js',
    platform,
    'bundle.js',
  );

  console.log(`Fetching ${platform} bundle...`);
  await downloadFile(url.toString(), output);
  console.log(`${platform} bundle ready`);
}

async function downloadManifest(platform) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);

  try {
    console.log(`Fetching ${platform} manifest...`);
    const response = await fetch(`${getMetroOrigin()}/manifest`, {
      headers: { 'expo-platform': platform },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const manifest = await response.json();
    console.log(`${platform} manifest ready`);
    return manifest;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        `Manifest download timeout after 5m for platform: ${platform}`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadBundlesAndManifests(timestamp) {
  console.log('Downloading bundles and manifests...');
  console.log('This may take several minutes for production builds...');

  try {
    // Bundles are sequential — Metro can't handle both platforms simultaneously
    // without stalling. Manifests are cheap and run in parallel after.
    await downloadBundle('ios', timestamp);
    await downloadBundle('android', timestamp);

    const [iosManifest, androidManifest] = await Promise.all([
      downloadManifest('ios'),
      downloadManifest('android'),
    ]);

    console.log('All downloads completed successfully');
    return { ios: iosManifest, android: androidManifest };
  } catch (error) {
    exitWithError(`Download failed: ${error.message}`);
  }
}

async function packageAssets(timestamp, baseUrl) {
  const hashesByPlatform = {};
  for (const platform of ['ios', 'android']) {
    const response = await fetch(nativeEntryUrl(platform, 'assets'), {
      signal: AbortSignal.timeout(300_000),
    });
    if (!response.ok) throw new Error(`Asset metadata failed for ${platform}: HTTP ${response.status}`);
    const assets = await response.json();
    const bundlePath = path.join(staticBuild, timestamp, '_expo', 'static', 'js', platform, 'bundle.js');
    const result = packageNativeAssets({
      bundle: fs.readFileSync(bundlePath, 'utf8'), assets, platform,
      outputRoot: staticBuild, buildId: timestamp, publicUrl: baseUrl + basePath, workspaceRoot,
    });
    fs.writeFileSync(bundlePath, result.bundle);
    hashesByPlatform[platform] = result.hashes;
    console.log(`Packaged ${result.fileCount} exact ${platform} asset files (all selected scales)`);
  }
  return hashesByPlatform;
}

function updateManifests(manifests, timestamp, baseUrl, hashesByPlatform) {
  const updateForPlatform = (platform, manifest) => {
    if (!manifest.launchAsset || !manifest.extra) {
      exitWithError(`Malformed manifest for ${platform}`);
    }

    manifest.launchAsset.url = `${baseUrl}${basePath}/${timestamp}/_expo/static/js/${platform}/bundle.js`;
    manifest.launchAsset.key = `bundle-${timestamp}`;
    manifest.createdAt = new Date(
      Number(timestamp.split('-')[0]),
    ).toISOString();
    manifest.extra.expoClient.hostUri =
      baseUrl.replace('https://', '') + '/' + platform;
    manifest.extra.expoGo.debuggerHost =
      baseUrl.replace('https://', '') + '/' + platform;
    manifest.extra.expoGo.packagerOpts.dev = false;

    if (manifest.assets && manifest.assets.length > 0) {
      manifest.assets.forEach((asset) => {
        if (!asset.url) return;

        const hash = asset.hash;
        if (!hash) return;

        const assetUrl = hashesByPlatform[platform].get(hash);
        if (!assetUrl) throw new Error(`Manifest asset is missing for ${platform}`);
        asset.url = assetUrl;
      });
    }

    fs.writeFileSync(
      path.join(staticBuild, platform, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );
  };

  updateForPlatform('ios', manifests.ios);
  updateForPlatform('android', manifests.android);
  console.log('Manifests updated');
}

async function buildWeb(domain) {
  return new Promise((resolve, reject) => {
    const webBuildDir = path.join(staticBuild, 'web');
    fs.mkdirSync(webBuildDir, { recursive: true });

    console.log('Building web version...');
    const proc = spawn(
      process.execPath,
      // Expo inlines EXPO_PUBLIC_* into cached transforms. A release build must
      // not inherit local-only keys/domains from an earlier development export.
      [expoCli, 'export', '--clear', '--platform', 'web', '--output-dir', webBuildDir],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: projectRoot,
        env: {
          ...process.env,
          EXPO_PUBLIC_DOMAIN: domain,
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
          EXPO_PUBLIC_CLERK_PROXY_URL: process.env.CLERK_PROXY_URL
            ? `https://${domain}${process.env.CLERK_PROXY_URL}`
            : '',
          NODE_ENV: 'production',
        },
      },
    );

    if (proc.stdout) {
      proc.stdout.on('data', (d) => {
        const line = d.toString().trim();
        if (line) console.log(`[Web] ${line}`);
      });
    }
    if (proc.stderr) {
      proc.stderr.on('data', (d) => {
        const line = d.toString().trim();
        if (line) console.error(`[Web Error] ${line}`);
      });
    }

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('Web build complete');
        // Inject meta tags into the web index.html
        try {
          const indexPath = path.join(webBuildDir, 'index.html');
          if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, 'utf8');
            if (!html.includes('google-site-verification')) {
              const META = [
                '<meta name="google-site-verification" content="pz2YpceAZWVu-OXqardhMy8WmaPi_OXsSOugCiVPm2A" />',
                '<meta name="google-site-verification" content="4R-ZlbEXRH_5og-OkUNngJYN28bYCvVGXw5IY1m5UEw" />',
                '<meta property="og:title" content="YOKI YOKI｜毎日の気分記録・メンタルケアアプリ" />',
                '<meta property="og:site_name" content="YOKI YOKI" />',
                '<meta property="og:type" content="website" />',
                '<meta property="og:description" content="気分・感情を毎日記録して、AIとの会話でこころを育てるメンタルケアアプリ。日記・気分トラッカー・ストレス管理を楽しく続けられます。" />',
                '<meta property="og:url" content="https://yoki-yoki.replit.app/" />',
                '<meta name="description" content="気分・感情を毎日記録して、AIとの会話でこころを育てるメンタルケアアプリ。日記・気分トラッカー・ストレス管理を楽しく続けられます。" />',
                '<meta name="keywords" content="メンタルケア,気分記録,日記アプリ,感情トラッカー,ストレス管理,AIチャット,こころの健康,YOKI YOKI" />',
              ].join('\n    ');
              html = html.replace(/<title>[^<]*<\/title>/, '<title>YOKI YOKI｜毎日の気分記録・メンタルケアアプリ</title>');
              html = html.replace('<title>', `${META}\n    <title>`);
              html = html.replace('<html lang="en">', '<html lang="ja">');
              fs.writeFileSync(indexPath, html);
              console.log('Injected meta tags into web index.html');
            }
            // Copy web-extras (Google verification HTML files, etc.)
            const extrasDir = path.join(projectRoot, 'web-extras');
            if (fs.existsSync(extrasDir)) {
              for (const file of fs.readdirSync(extrasDir)) {
                fs.copyFileSync(path.join(extrasDir, file), path.join(webBuildDir, file));
              }
              console.log('Copied web-extras to web build');
            }
          }
        } catch (e) {
          console.warn('Meta injection warning (non-fatal):', e.message);
        }
        resolve();
      } else {
        // Web build failure is non-fatal — native will still work
        console.warn(`Web build exited with code ${code} — skipping web output`);
        resolve();
      }
    });

    proc.on('error', (err) => {
      console.warn('Web build error (non-fatal):', err.message);
      resolve();
    });
  });
}

async function main() {
  console.log('Building static Expo deployment (web + native) v2...');

  setupSignalHandlers();

  const domain = getDeploymentDomain();
  // Fail before deleting a previous build or starting the web/Metro processes.
  getClerkPublishableKey();
  const expoPublicReplId = getExpoPublicReplId();
  const baseUrl = `https://${domain}`;
  const timestamp = `${Date.now()}-${process.pid}`;

  prepareDirectories(timestamp);
  clearMetroCache();

  // Build web version before starting the dedicated native Metro process.
  await buildWeb(domain);

  await startMetro(domain, expoPublicReplId);

  const downloadTimeout = 600000;
  const downloadPromise = downloadBundlesAndManifests(timestamp);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Overall download timeout after ${downloadTimeout / 1000} seconds. ` +
            'Metro may be struggling to generate bundles. Check Metro logs above.',
        ),
      );
    }, downloadTimeout);
  });

  const manifests = await Promise.race([downloadPromise, timeoutPromise]);

  console.log('Processing assets...');
  const hashesByPlatform = await packageAssets(timestamp, baseUrl);

  console.log('Updating manifests and creating landing page...');
  updateManifests(manifests, timestamp, baseUrl, hashesByPlatform);

  console.log('Build complete! Deploy to:', baseUrl);

  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error('Build failed:', error.message);
  if (metroProcess) {
    metroProcess.kill();
  }
  process.exit(1);
});
