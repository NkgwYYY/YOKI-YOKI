import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import http from 'node:http';
import { once } from 'node:events';
import { createClerkProxyServer } from './fixtures/clerkProxyServer.mjs';

test('proxy retains raw body/query, cookie/encoding/status and exact buffered length', async () => {
  const body = gzipSync(JSON.stringify({ object: 'environment', test: 'local only' }));
  const f = await createClerkProxyServer({ handler: (_req, res) => {
    res.writeHead(201, { 'content-type': 'application/json', 'content-encoding': 'gzip', 'set-cookie': ['one=1; HttpOnly', 'two=2; Secure'], 'cache-control': 'no-store' });
    res.write(body.subarray(0, 10)); res.end(body.subarray(10));
  } });
  try {
    const result = await f.request('/api/__clerk/v1/client?__clerk_api_version=2025-11-10', {
      method: 'POST', body: 'value=a%2Bb&other=two', headers: { 'content-type': 'application/x-www-form-urlencoded',
        'x-forwarded-host': 'app.example.test, edge.local', 'x-forwarded-proto': 'https', 'x-forwarded-for': '192.0.2.10, 192.0.2.20' },
    });
    assert.equal(result.status, 201); assert.deepEqual(result.body, body);
    assert.equal(result.headers['content-length'], String(body.length)); assert.equal(result.headers['transfer-encoding'], undefined);
    assert.equal(result.headers['content-encoding'], 'gzip'); assert.equal(result.headers['set-cookie'].length, 2);
    assert.equal(f.requests[0].url, '/v1/client?__clerk_api_version=2025-11-10');
    assert.equal(f.requests[0].body, 'value=a%2Bb&other=two');
    assert.equal(f.requests[0].headers['clerk-proxy-url'], 'https://app.example.test/api/__clerk');
    assert.equal(f.requests[0].headers['clerk-secret-key'], 'sk_test_local_proxy_fixture');
    assert.equal(f.requests[0].headers['x-forwarded-for'], '192.0.2.10');
    assert.equal(f.timers.size, 0);
  } finally { await f.close(); }
});

test('multi-hop forwarded protocol selects the same first hop as the hostname', async () => {
  const f = await createClerkProxyServer();
  try {
    await f.request(undefined, { headers: { 'x-forwarded-host': 'app.example.test, internal', 'x-forwarded-proto': 'https, http' } });
    assert.equal(f.requests[0].headers['clerk-proxy-url'], 'https://app.example.test/api/__clerk');
  } finally { await f.close(); }
});

test('connection reset returns a length-delimited opaque gateway error', async () => {
  const f = await createClerkProxyServer({ handler: req => req.socket.destroy() });
  try {
    const result = await f.request('/api/__clerk/v1/environment?ticket=synthetic-private-value');
    assert.equal(result.status, 502); assert.equal(result.headers['content-length'], '0');
    assert.equal(result.headers['transfer-encoding'], undefined); assert.equal(result.body.length, 0);
  } finally { await f.close(); }
});

for (const mode of ['before headers', 'buffering body', 'dripping body']) test(`a deadline bounds ${mode} and releases the upstream`, async () => {
  const f = await createClerkProxyServer({ deadlineMs: 100, handler: (_req, res) => {
    if (mode !== 'before headers') { res.writeHead(200, { 'content-type': 'application/json' }); res.write('{'); }
    if (mode === 'dripping body') { const interval = setInterval(() => res.write(' '), 10); res.on('close', () => clearInterval(interval)); }
  } });
  try {
    const result = await f.request();
    assert.equal(result.status, 504); assert.equal(result.headers['content-length'], '0');
    assert.equal(result.body.length, 0); assert.equal(result.headers['transfer-encoding'], undefined);
    await new Promise(r => setTimeout(r, 30));
    assert.equal(f.requestClosures.length, 1); assert.equal(f.timers.size, 0);
    assert.deepEqual(f.deadlines, [12000]);
  } finally { await f.close(); }
});

test('known-length upstream truncation aborts the response without appending an error string', async () => {
  const f = await createClerkProxyServer({ handler: (_req, res) => {
    res.writeHead(200, { 'content-length': '20' }); res.write('partial'); setTimeout(() => res.destroy(), 20);
  } });
  try { await assert.rejects(f.request(), /aborted|socket|reset/i); }
  finally { await f.close(); }
});

test('buffered upstream truncation returns no partial JSON or reflected error text', async () => {
  const f = await createClerkProxyServer({ handler: (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' }); res.write('{"partial":'); setTimeout(() => res.destroy(), 20);
  } });
  try { const result = await f.request(); assert.equal(result.status, 502); assert.equal(result.headers['content-length'], '0'); assert.equal(result.body.length, 0); }
  finally { await f.close(); }
});

test('deadline also cancels a known-length stream after headers have been sent', async () => {
  const f = await createClerkProxyServer({ deadlineMs: 100, handler: (_req, res) => {
    res.writeHead(200, { 'content-length': '100' }); res.write('partial');
  } });
  try { await assert.rejects(f.request(), /aborted|socket|reset/i); assert.equal(f.timers.size, 0); }
  finally { await f.close(); }
});

test('a new request succeeds when the upstream recovers after a timeout', async () => {
  let pending = true;
  const f = await createClerkProxyServer({ deadlineMs: 100, handler: (_req, res) => { if (!pending) res.end('{"recovered":true}'); } });
  try {
    assert.equal((await f.request()).status, 504); pending = false;
    const result = await f.request(); assert.equal(result.status, 200);
    assert.deepEqual(JSON.parse(result.body), { recovered: true }); assert.equal(f.timers.size, 0);
  } finally { await f.close(); }
});

test('successful known-length stream and HEAD preserve declared length', async () => {
  const f = await createClerkProxyServer({ handler: (req, res) => {
    res.writeHead(200, { 'content-length': '5', 'content-type': 'application/javascript' });
    res.end(req.method === 'HEAD' ? undefined : 'hello');
  } });
  try {
    for (const method of ['GET', 'HEAD']) {
      const result = await f.request('/api/__clerk/npm/sdk.js', { method });
      assert.equal(result.status, 200); assert.equal(result.headers['content-length'], '5');
      assert.equal(result.body.toString(), method === 'HEAD' ? '' : 'hello'); assert.equal(f.timers.size, 0);
    }
  } finally { await f.close(); }
});

test('client disconnect closes pending upstream and clears deadline', async () => {
  const f = await createClerkProxyServer({ handler: (_req, res) => { res.writeHead(200, { 'content-length': '100' }); res.write('partial'); } });
  try {
    const req = http.get(f.origin + '/api/__clerk/v1/environment'); req.on('error', () => {});
    const [res] = await once(req, 'response'); res.on('error', () => {});
    req.destroy(); await new Promise(r => setTimeout(r, 40));
    assert.equal(f.requestClosures.length, 1); assert.equal(f.timers.size, 0);
  } finally { await f.close(); }
});

for (const status of [204, 304]) test(`bodyless ${status} retains status/cookies and completes`, async () => {
  const f = await createClerkProxyServer({ handler: (_req, res) => { res.writeHead(status, { 'set-cookie': 'session=test' }); res.end(); } });
  try { const result = await f.request(); assert.equal(result.status, status); assert.equal(result.body.length, 0); assert.equal(result.headers['set-cookie'][0], 'session=test'); }
  finally { await f.close(); }
});
for (const options of [{ production: false }, { configured: false }]) test('unconfigured/development proxy stays inactive', async () => {
  const f = await createClerkProxyServer(options);
  try { assert.equal((await f.request()).status, 404); assert.equal(f.requests.length, 0); assert.equal(f.timers.size, 0); }
  finally { await f.close(); }
});
