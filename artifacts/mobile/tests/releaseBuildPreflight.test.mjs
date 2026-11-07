import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const build = fileURLToPath(new URL('../scripts/build.js', import.meta.url));
for (const key of ['', '   ']) test(`missing release auth (${key.length} characters) fails before touching outputs or launching builders`, () => {
  const result = spawnSync(process.execPath, [build], {
    env: { ...process.env, NATIVE_BUNDLE_PUBLIC_DOMAIN: 'qa.yoki.jp', CLERK_PUBLISHABLE_KEY: key,
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: '' },
    encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CLERK_PUBLISHABLE_KEY is required/);
  assert.doesNotMatch(result.stdout, /Preparing build directories|Cache cleared|Starting Metro|Setting EXPO_PUBLIC_DOMAIN/);
});
