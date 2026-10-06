// Isolated PostgreSQL engine, real route and Drizzle schema. No production DB/auth.
// YOKI_QA_PGLITE may point at a temporary @electric-sql/pglite installation.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../package.json', import.meta.url));
const { build } = require('esbuild');
const express = require('express');
const { drizzle } = require('drizzle-orm/pglite');
const { PGlite } = await import(process.env.YOKI_QA_PGLITE || '@electric-sql/pglite');

async function compile(file, plugins = []) {
  const built = await build({ entryPoints: [fileURLToPath(new URL(file, import.meta.url))],
    bundle: true, packages: 'external', write: false, platform: 'node', format: 'cjs', plugins });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', built.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}

test('sync API preserves snapshots and account boundaries', async t => {
  const pg = new PGlite();
  const { userData } = await compile('../../../lib/db/src/schema/user_data.ts');
  const db = drizzle(pg);
  await pg.exec(`CREATE TABLE user_data (
    id serial PRIMARY KEY, user_id text NOT NULL, key text NOT NULL,
    value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, key), CHECK (key <> 'reject-late')
  )`);
  globalThis.__yokiSyncFixture = { db, userData };
  const { default: router } = await compile('../src/routes/sync.ts', [{ name: 'isolated-sync-dependencies', setup(build) {
    build.onResolve({ filter: /^@workspace\/db$/ }, () => ({ path: 'db', namespace: 'sync-test' }));
    build.onResolve({ filter: /\/lib\/auth$/ }, () => ({ path: 'auth', namespace: 'sync-test' }));
    build.onLoad({ filter: /.*/, namespace: 'sync-test' }, ({ path }) => ({ contents: path === 'db'
      ? 'export const { db, userData } = globalThis.__yokiSyncFixture; export const userItemEquipment = {}; export const userItemInventory = {};'
      : `export const requireAuth = (req, res, next) => {
          const user = req.headers['x-qa-user'];
          if (!user) return res.sendStatus(401);
          req.userId = user; next();
        };`, loader: 'js' }));
  } }]);
  delete globalThis.__yokiSyncFixture;
  const app = express(); app.use(express.json()); app.use('/api', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/sync`;
  const put = (body, user = 'account-a') => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-qa-user': user }, body: JSON.stringify(body) });
  const get = async (user = 'account-a') => (await fetch(url, { headers: { 'x-qa-user': user } })).json();
  try {
    await t.test('missing authentication cannot read or write', async () => {
      assert.equal((await fetch(url)).status, 401);
      assert.equal((await fetch(url, { method: 'PUT' })).status, 401);
    });
    await t.test('invalid request shapes fail before any saved value changes', async () => {
      assert.equal((await put({ data: { records: ['saved'], balance: 25 } })).status, 200);
      for (const body of [{}, { data: [] }, { data: null }, { data: 'bad' }, { data: { records: ['changed'], balance: null } }]) {
        assert.equal((await put(body)).status, 400);
      }
      assert.deepEqual(await get(), { data: { records: ['saved'], balance: 25 } });
    });
    await t.test('a late database constraint failure rolls back the entire snapshot', async () => {
      assert.equal((await put({ data: { records: ['must roll back'], 'reject-late': 1 } })).status, 500);
      assert.deepEqual(await get(), { data: { records: ['saved'], balance: 25 } });
    });
    await t.test('retry is idempotent and empty snapshots do not erase data', async () => {
      const update = { data: { records: ['new'], balance: 31 } };
      for (let i = 0; i < 2; i++) assert.deepEqual(await (await put(update)).json(), { ok: true });
      await put({ data: {} }); assert.deepEqual(await get(), update);
      assert.equal((await pg.query('SELECT * FROM user_data WHERE user_id = $1', ['account-a'])).rows.length, 2);
    });
    await t.test('concurrent first writes leave one consistent snapshot without duplicate keys', async () => {
      const results = await Promise.all(Array.from({ length: 6 }, (_, i) => put({ data: { records: [i], balance: i } }, 'concurrent')));
      assert.ok(results.every(r => r.status === 200));
      const { data } = await get('concurrent'); assert.equal(data.records[0], data.balance);
      assert.equal((await pg.query('SELECT * FROM user_data WHERE user_id = $1', ['concurrent'])).rows.length, 2);
    });
    await t.test('another account cannot change or retrieve the first account data', async () => {
      await put({ data: { records: ['other'] } }, 'account-b');
      assert.deepEqual(await get('account-b'), { data: { records: ['other'] } });
      assert.deepEqual(await get('account-a'), { data: { records: ['new'], balance: 31 } });
    });
  } finally { await new Promise(resolve => server.close(resolve)); await pg.close(); }
});
