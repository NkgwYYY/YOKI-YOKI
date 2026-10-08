import test from 'node:test';
import assert from 'node:assert/strict';
import release from '../scripts/releaseDomain.cjs';
const { getReleaseDomain } = release;

test('release domain accepts HTTPS production hosts and preserves explicit-variable precedence', () => {
  assert.equal(getReleaseDomain({ NATIVE_BUNDLE_PUBLIC_DOMAIN: ' https://Yoki.replit.app/ ' }), 'yoki.replit.app');
  assert.equal(getReleaseDomain({ EXPO_PUBLIC_DOMAIN: 'app.yoki.jp' }), 'app.yoki.jp');
  assert.equal(getReleaseDomain({ NATIVE_BUNDLE_PUBLIC_DOMAIN: ' ', REPLIT_INTERNAL_APP_DOMAIN: 'app.yoki.jp' }), 'app.yoki.jp');
  assert.throws(() => getReleaseDomain({ NATIVE_BUNDLE_PUBLIC_DOMAIN: 'localhost', EXPO_PUBLIC_DOMAIN: 'app.yoki.jp' }));
});
test('release domain rejects missing, local, development and URL payload values', () => {
  assert.throws(() => getReleaseDomain({}));
  for (const value of ['http://app.yoki.jp', 'localhost', '127.0.0.1', '[::1]', '10.0.0.1',
    'work.replit.dev', 'work.repl.co', 'app.local', 'app.internal', 'https://app.yoki.jp:8080',
    'https://user:pass@app.yoki.jp', 'https://app.yoki.jp/path', 'https://app.yoki.jp?key=abc',
    'https://app.yoki.jp#fragment', 'https://app.yoki.jp.', 'not a host']) {
    assert.throws(() => getReleaseDomain({ NATIVE_BUNDLE_PUBLIC_DOMAIN: value }), value);
  }
});
