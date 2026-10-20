import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync(new URL('../utils/aiConsent.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
function fixture() {
  const saved = new Map(), sent = [];
  let failRead = false, failWrite = false, fetcher = async () => ({ ok: true, json: async () => ({ content: 'ok' }) });
  const storage = {
    getItem: async key => { if (failRead) throw Error('read'); return saved.get(key) ?? null; },
    setItem: async (key, value) => { if (failWrite) throw Error('write'); saved.set(key, value); },
  };
  const api = {};
  new Function('require', 'exports', 'fetch', code)(() => storage, api,
    async (url, options) => { sent.push({ url, options }); return fetcher(url, options); });
  return { ...api, saved, sent, setFailure: (read, write) => { failRead = read; failWrite = write; }, setFetch: fn => { fetcher = fn; } };
}
test('missing, malformed, old and unreadable consent never sends data', async () => {
  for (const receipt of [undefined, 'bad JSON', '{"version":0,"allowed":true}', '{"version":1,"allowed":false}']) {
    const f = fixture(); if (receipt) f.saved.set('@yoki/ai-sharing-v1/guest', receipt);
    await assert.rejects(f.postAiJson('guest', '/ai', { privateText: 'example' }));
    assert.equal(f.sent.length, 0);
  }
  const f = fixture(); await f.setAiConsent('guest', true); f.setFailure(true, false);
  await assert.rejects(f.postAiJson('guest', '/ai', {})); assert.equal(f.sent.length, 0);
});
test('consent belongs to one owner and only grants after successful storage', async () => {
  const f = fixture(); f.setFailure(false, true);
  await assert.rejects(f.setAiConsent('A', true));
  assert.equal(await f.hasAiConsent('A'), false);
  f.setFailure(false, false); await f.setAiConsent('A', true);
  assert.equal(await f.hasAiConsent('B'), false);
  assert.deepEqual(await f.postAiJson('A', '/ai', { message: 'sample' }), { ok: true, data: { content: 'ok' } });
  assert.equal(f.sent.length, 1);
});
test('withdrawal aborts an in-flight request and blocks later requests even if storage fails', async () => {
  const f = fixture(); await f.setAiConsent('A', true);
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  f.setFetch((_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(Error('aborted')), { once: true }); started();
  }));
  const pending = f.postAiJson('A', '/ai', {});
  const rejected = assert.rejects(pending, /aborted/);
  await ready; f.setFailure(false, true);
  await assert.rejects(f.setAiConsent('A', false)); await rejected;
  await assert.rejects(f.postAiJson('A', '/ai', {})); assert.equal(f.sent.length, 1);
});
test('last choice wins when a grant and withdrawal overlap', async () => {
  const f = fixture(); await Promise.all([f.setAiConsent('A', true), f.setAiConsent('A', false)]);
  assert.equal(await f.hasAiConsent('A'), false);
  assert.equal(JSON.parse(f.saved.get('@yoki/ai-sharing-v1/A')).allowed, false);
});
test('already cancelled caller never sends data', async () => {
  const f = fixture(); await f.setAiConsent('A', true);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(f.postAiJson('A', '/ai', {}, { signal: controller.signal }));
  assert.equal(f.sent.length, 0);
});
