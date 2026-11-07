// Real Express + installed proxy package, redirected ONLY here to a local
// upstream. No Clerk account, production secret, DB or external network.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { once } from 'node:events';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { build } = require('esbuild');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

export async function createClerkProxyServer({ handler, deadlineMs = 500, production = true, configured = true } = {}) {
  const requests = [], requestClosures = [], deadlines = [], timers = new Set(), errors = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const entry = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() };
    requests.push(entry); res.on('close', () => requestClosures.push(entry));
    handler ? handler(req, res, entry) : res.end('{}');
  });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const target = 'http://127.0.0.1:' + upstream.address().port;
  const built = await build({ entryPoints: [fileURLToPath(new URL('../../src/middlewares/clerkProxyMiddleware.ts', import.meta.url))],
    bundle: true, packages: 'external', write: false, platform: 'node', format: 'cjs' });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', built.outputFiles[0].text)(
    name => name === 'http-proxy-middleware' ? { createProxyMiddleware: options => createProxyMiddleware({ ...options, target }) } : require(name),
    module, module.exports,
    (fn, ms) => { deadlines.push(ms); const timer = setTimeout(() => { timers.delete(timer); fn(); }, deadlineMs); timers.add(timer); return timer; },
    timer => { timers.delete(timer); clearTimeout(timer); },
  );
  const previous = { NODE_ENV: process.env.NODE_ENV, CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY };
  process.env.NODE_ENV = production ? 'production' : 'development';
  if (configured) process.env.CLERK_SECRET_KEY = 'sk_test_local_proxy_fixture'; else delete process.env.CLERK_SECRET_KEY;
  let middleware;
  try { middleware = module.exports.clerkProxyMiddleware(); }
  finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
  const app = express();
  app.use(module.exports.CLERK_PROXY_PATH, middleware);
  app.use((_req, res) => res.status(404).end());
  app.use((error, _req, res, _next) => { errors.push(error.message); if (!res.headersSent && !res.destroyed) res.status(500).end(); });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;
  const request = (url = '/api/__clerk/v1/environment', { method = 'GET', headers = {}, body, timeout = 2000 } = {}) => new Promise((resolve, reject) => {
    const req = http.request(origin + url, { method, headers }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('error', reject);
      res.on('end', () => { clearTimeout(deadline); resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }); });
    });
    const deadline = setTimeout(() => req.destroy(Error('Client deadline exceeded')), timeout);
    req.on('error', error => { clearTimeout(deadline); reject(error); });
    req.end(body);
  });
  return { origin, request, requests, requestClosures, deadlines, timers, errors,
    close: async () => {
      for (const timer of timers) clearTimeout(timer); timers.clear();
      server.closeAllConnections(); upstream.closeAllConnections();
      await Promise.all([new Promise(r => server.close(r)), new Promise(r => upstream.close(r))]);
    },
  };
}
