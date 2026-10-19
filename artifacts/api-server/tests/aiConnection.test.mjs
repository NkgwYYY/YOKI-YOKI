import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { openAIConnection } from '../../../lib/integrations-openai-ai-server/src/connection.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const integrationRequire = createRequire(new URL('../../../lib/integrations-openai-ai-server/package.json', import.meta.url));
const OpenAI = integrationRequire('openai').default;
const source = readFileSync(new URL('../../../lib/integrations-openai-ai-server/src/client.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const managed = { AI_INTEGRATIONS_OPENAI_API_KEY: 'test-managed-token', AI_INTEGRATIONS_OPENAI_BASE_URL: 'http://localhost:1106/modelfarm/openai' };

// Run the real client entry point and SDK, replacing only HTTP transport.
function client(env, fetch) {
  const module = { exports: {} };
  const load = name => {
    if (name === './connection') return { openAIConnection: () => openAIConnection(env) };
    if (name === 'openai') return { default: class extends OpenAI {
      constructor(options) { super({ ...options, fetch, maxRetries: 0 }); }
    } };
    throw Error('Unexpected dependency');
  };
  new Function('require', 'module', 'exports', code)(load, module, module.exports);
  return module.exports.openai;
}
const response = () => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }), { headers: { 'content-type': 'application/json' } });
const request = { model: 'gpt-5.6-terra', messages: [{ role: 'user', content: 'synthetic test' }] };

test('default provider keeps managed credentials even when a personal key exists', async () => {
  const calls = [];
  const ai = client({ ...managed, OPENAI_API_KEY: 'test-personal-token' }, async (url, options) => {
    calls.push({ url: String(url), auth: new Headers(options.headers).get('authorization') });
    return response();
  });
  await ai.chat.completions.create(request);
  assert.deepEqual(calls, [{ url: managed.AI_INTEGRATIONS_OPENAI_BASE_URL + '/chat/completions', auth: 'Bearer test-managed-token' }]);
});

test('explicit direct connection keeps the personal key away from all gateway URLs', async () => {
  const calls = [];
  const ai = client({ ...managed, YOKI_AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test-personal-token', OPENAI_BASE_URL: 'https://unrelated.invalid/v1' }, async (url, options) => {
    calls.push({ url: String(url), auth: new Headers(options.headers).get('authorization') });
    return response();
  });
  await ai.chat.completions.create(request);
  assert.deepEqual(calls, [{ url: 'https://api.openai.com/v1/chat/completions', auth: 'Bearer test-personal-token' }]);
});

test('direct connection does not require managed credentials', () => {
  assert.deepEqual(openAIConnection({ YOKI_AI_PROVIDER: 'openai', OPENAI_API_KEY: ' personal-test ' }), { apiKey: 'personal-test', baseURL: 'https://api.openai.com/v1' });
});

for (const [name, env] of [
  ['missing direct key', { ...managed, YOKI_AI_PROVIDER: 'openai' }],
  ['blank direct key', { ...managed, YOKI_AI_PROVIDER: 'openai', OPENAI_API_KEY: '   ' }],
  ['missing managed key', { OPENAI_API_KEY: 'test-personal-token', AI_INTEGRATIONS_OPENAI_BASE_URL: managed.AI_INTEGRATIONS_OPENAI_BASE_URL }],
  ['missing managed URL', { AI_INTEGRATIONS_OPENAI_API_KEY: 'test-managed-token' }],
  ['unknown provider', { ...managed, YOKI_AI_PROVIDER: 'private-invalid-value' }],
]) {
  test(name + ' fails locally without leaking values or choosing a different provider', () => {
    assert.throws(() => openAIConnection(env), error => {
      assert.doesNotMatch(error.message, /test-managed-token|test-personal-token|private-invalid-value|localhost/);
      return /required|must be/.test(error.message);
    });
  });
}

test('401 never retries with a different key or destination', async () => {
  const calls = [];
  const ai = client({ ...managed, YOKI_AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test-personal-token' }, async (url, options) => {
    calls.push({ url: String(url), auth: new Headers(options.headers).get('authorization') });
    return new Response(null, { status: 401 });
  });
  await assert.rejects(ai.chat.completions.create(request, { maxRetries: 0 }), error => error.status === 401);
  assert.deepEqual(calls, [{ url: 'https://api.openai.com/v1/chat/completions', auth: 'Bearer test-personal-token' }]);
});
