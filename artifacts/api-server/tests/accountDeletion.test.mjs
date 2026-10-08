// Real routes/schema with an isolated PostgreSQL engine and synthetic auth.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../package.json', import.meta.url));
const { build } = require('esbuild'), express = require('express');
const { drizzle } = require('drizzle-orm/pglite');
const { PGlite } = await import(process.env.YOKI_QA_PGLITE || '@electric-sql/pglite');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function compile(file, plugins = []) {
  const built = await build({ entryPoints: [fileURLToPath(new URL(file, import.meta.url))], bundle: true,
    packages: 'external', write: false, platform: 'node', format: 'cjs', plugins });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', built.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}

test('account deletion rejects authenticated delayed writes and permits completion retry', async t => {
  const pg = new PGlite(), db = drizzle(pg);
  const schema = { ...await compile('../../../lib/db/src/schema/user_data.ts'), ...await compile('../../../lib/db/src/schema/items.ts') };
  await pg.exec(`CREATE TABLE user_data(id serial PRIMARY KEY, user_id text NOT NULL, key text NOT NULL,
    value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,key));
    CREATE TABLE items(id text PRIMARY KEY, name text NOT NULL, category text NOT NULL, cost double precision NOT NULL,
      asset_url text NOT NULL, pos_x double precision DEFAULT 0, pos_y double precision DEFAULT 0, scale double precision DEFAULT 1,
      is_active boolean DEFAULT true, created_at timestamptz DEFAULT now());
    CREATE TABLE user_item_inventory(user_id text NOT NULL, item_id text REFERENCES items(id), created_at timestamptz DEFAULT now(), PRIMARY KEY(user_id,item_id));
    CREATE TABLE user_item_equipment(user_id text NOT NULL, category text NOT NULL, item_id text REFERENCES items(id), updated_at timestamptz DEFAULT now(), PRIMARY KEY(user_id,category));`);
  let entered, release;
  globalThis.__yokiDeleteFixture = { db, ...schema, gate: async () => { entered.resolve(); await release.promise; } };
  const plugins = [{ name: 'isolated-delete-dependencies', setup(build) {
    build.onResolve({ filter: /^@workspace\/db$/ }, () => ({ path: 'db', namespace: 'fixture' }));
    build.onResolve({ filter: /\/lib\/auth$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
    build.onResolve({ filter: /^@clerk\/express$/ }, () => ({ path: 'clerk', namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ loader: 'js', contents: path === 'db'
      ? 'export const {db,userData,items,userItemEquipment,userItemInventory}=globalThis.__yokiDeleteFixture;'
      : path === 'clerk' ? `export const getAuth=req=>({userId:req.headers['x-qa-user']});`
      : `const fixture=globalThis.__yokiDeleteFixture; export const requireAuth=async(req,res,next)=>{
          req.userId=req.headers['x-qa-user']; if(!req.userId)return res.sendStatus(401);
          if(req.headers['x-qa-hold'])await fixture.gate(); next(); };` }));
  } }];
  const sync = (await compile('../src/routes/sync.ts', plugins)).default;
  const items = (await compile('../src/routes/items.ts', plugins)).default;
  delete globalThis.__yokiDeleteFixture;
  const app = express(); app.use(express.json()); app.use((req,_res,next)=>{req.log={error:()=>{}};next();}); app.use('/api', sync, items);
  const server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = (path, method, user, body, hold = false) => fetch(base + path, { method,
    headers: { 'Content-Type': 'application/json', ...(user ? { 'x-qa-user': user } : {}), ...(hold ? { 'x-qa-hold': '1' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const seed = user => request('/sync','PUT',user,{data:{records:['saved'], '@mentore/feed_state_v1':{points:1000}}});
  const remove = user => request('/account','DELETE',user);
  try {
    await t.test('unauthenticated deletion is rejected', async () => { assert.equal((await remove(null)).status,401); });
    await t.test('deletion removes wallet, inventory and equipment but not another account', async () => {
      await seed('account-a'); await seed('account-b');
      const catalog = await (await request('/items','GET','account-a')).json();
      const item = catalog.items.find(item=>item.category==='accessory');
      assert.equal((await request('/shop/buy','POST','account-a',{itemId:item.id})).status,200);
      assert.equal((await request('/character/equip','POST','account-a',{category:'accessory',itemId:item.id})).status,200);
      assert.deepEqual(await (await remove('account-a')).json(),{ok:true});
      for(const table of ['user_item_inventory','user_item_equipment']) assert.equal((await pg.query(`SELECT * FROM ${table} WHERE user_id=$1`,['account-a'])).rows.length,0);
      assert.equal((await pg.query("SELECT * FROM user_data WHERE user_id='account-a' AND key='records'")).rows.length,0);
      assert.equal((await request('/sync','GET','account-b')).status,200);
    });
    for(const [path,method,body] of [['/sync','PUT',{data:{records:['late']}}],['/character/equip','POST',{category:'background',itemId:null}]]) {
      await t.test(`an authenticated request delayed before ${path} cannot recreate deleted data`, async () => {
        const user='delayed-'+method; await seed(user); entered=deferred();release=deferred();
        const late=request(path,method,user,body,true); await entered.promise;
        try { assert.equal((await remove(user)).status,200); } finally { release.resolve(); }
        const response=await late; assert.equal(response.status,410); assert.equal((await response.json()).code,'ACCOUNT_DELETED');
        assert.equal((await pg.query('SELECT * FROM user_item_equipment WHERE user_id=$1',[user])).rows.length,0);
        assert.equal((await pg.query("SELECT * FROM user_data WHERE user_id=$1 AND key='records'",[user])).rows.length,0);
      });
    }
    await t.test('deleted identities cannot read/write app data, but deletion retry is idempotent', async () => {
      for(const [path,method,body] of [['/sync','GET'],['/sync','PUT',{data:{}}],['/items','GET'],['/shop/buy','POST',{itemId:'valid-id'}]]) {
        const response=await request(path,method,'account-a',body); assert.equal(response.status,410);
      }
      assert.deepEqual(await (await remove('account-a')).json(),{ok:true});
      assert.equal((await request('/sync','GET','account-b')).status,200);
    });
    await t.test('client snapshots cannot write server deletion metadata', async () => {
      const response=await request('/sync','PUT','account-b',{data:{'@yoki/server/account-state-v1':{deleted:true}}});
      assert.equal(response.status,400); assert.equal((await request('/sync','GET','account-b')).status,200);
    });
    await t.test('database deletion failure rolls back the fence and preserves a usable account', async () => {
      await seed('reject-delete');
      await pg.exec(`CREATE FUNCTION reject_account_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF OLD.user_id='reject-delete' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN OLD; END $$;
        CREATE TRIGGER reject_account_delete BEFORE DELETE ON user_data FOR EACH ROW EXECUTE FUNCTION reject_account_delete();`);
      assert.equal((await remove('reject-delete')).status,500);
      assert.deepEqual((await (await request('/sync','GET','reject-delete')).json()).data.records,['saved']);
      assert.equal((await seed('reject-delete')).status,200);
      await pg.exec('DROP TRIGGER reject_account_delete ON user_data');
      assert.equal((await remove('reject-delete')).status,200);
    });
  } finally { await new Promise(r=>server.close(r)); await pg.close(); }
});
