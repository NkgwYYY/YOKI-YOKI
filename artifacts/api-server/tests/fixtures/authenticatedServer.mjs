// Local integration server: real app/middleware/routes and SQL schema. RSA keys
// are generated in memory and trusted ONLY by this isolated test process.
// AI output is deterministic; no real identity, AI service or hosted DB is used.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
const require = createRequire(new URL('../../package.json', import.meta.url));
const zodRequire = createRequire(new URL('../../../../lib/api-zod/package.json', import.meta.url));
const { build } = require('esbuild'), jwt = require('jsonwebtoken');
const { drizzle } = require('drizzle-orm/pglite');
async function compile(file, plugins = []) {
  const built = await build({ entryPoints: [fileURLToPath(new URL(file, import.meta.url))], bundle: true,
    packages: 'external', write: false, platform: 'node', format: 'cjs', plugins });
  const module = { exports: {} };
  new Function('require','module','exports','__dirname',built.outputFiles[0].text)(name=>name==='zod'||name.startsWith('zod/')?zodRequire(name):require(name),module,module.exports,fileURLToPath(new URL('../../',import.meta.url)));
  return module.exports;
}
export async function createAuthenticatedServer() {
  const { PGlite } = await import(process.env.YOKI_QA_PGLITE || '@electric-sql/pglite');
  const pg = new PGlite(), db = drizzle(pg), keyId = randomUUID();
  const { privateKey, publicKey } = generateKeyPairSync('rsa',{modulusLength:2048});
  const schema = { ...await compile('../../../../lib/db/src/schema/user_data.ts'), ...await compile('../../../../lib/db/src/schema/items.ts') };
  await pg.exec(`CREATE TABLE user_data(id serial PRIMARY KEY,user_id text NOT NULL,key text NOT NULL,value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,key));
    CREATE TABLE items(id text PRIMARY KEY,name text NOT NULL,category text NOT NULL,cost double precision NOT NULL,asset_url text NOT NULL,
      pos_x double precision DEFAULT 0,pos_y double precision DEFAULT 0,scale double precision DEFAULT 1,is_active boolean DEFAULT true,created_at timestamptz DEFAULT now());
    CREATE TABLE user_item_inventory(user_id text NOT NULL,item_id text REFERENCES items(id),created_at timestamptz DEFAULT now(),PRIMARY KEY(user_id,item_id));
    CREATE TABLE user_item_equipment(user_id text NOT NULL,category text NOT NULL,item_id text REFERENCES items(id),updated_at timestamptz DEFAULT now(),PRIMARY KEY(user_id,category));`);
  const configured = { NODE_ENV:'production', LOG_LEVEL:'silent', CLERK_TELEMETRY_DISABLED:'true',
    CLERK_PUBLISHABLE_KEY:'pk_test_'+Buffer.from('yoki-local.clerk.accounts.dev$').toString('base64'),
    CLERK_SECRET_KEY:'sk_test_local_integration_only', CLERK_JWT_KEY:publicKey.export({type:'spki',format:'pem'}) };
  const priorEnv = Object.fromEntries(Object.keys(configured).map(k=>[k,process.env[k]]));
  Object.assign(process.env,configured);
  const originalFetch = globalThis.fetch, outbound = [], aiCalls = [];
  globalThis.fetch = async (url,...args) => {
    const target = new URL(typeof url==='string'||url instanceof URL ? url : url.url);
    if (!['127.0.0.1','localhost'].includes(target.hostname)) { outbound.push(target.origin); throw Error('External network is disabled in local integration'); }
    return originalFetch(url,...args);
  };
  const ai = { reply: JSON.stringify({insights:[{title:'記録を残した一歩',body:'検証用のAI応答です。実サービスは呼んでいません。'}]}), hold: null };
  const fixture = {db,...schema,openai:{chat:{completions:{create:async input=>{
    aiCalls.push(input);
    if (ai.hold) await ai.hold;
    return {choices:[{message:{content:ai.reply}}]};
  }}}}};
  globalThis.__yokiAuthenticatedFixture = fixture;
  let server;
  const close = async () => {
    if(server)await new Promise(r=>server.close(r));
    await pg.close();globalThis.fetch=originalFetch;
    for(const [key,value] of Object.entries(priorEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
    delete globalThis.__yokiAuthenticatedFixture;
  };
  try {
    const app = (await compile('../../src/app.ts',[{name:'isolated-db-ai-only',setup(build){
      build.onResolve({filter:/^@workspace\/db$/},()=>({path:'db',namespace:'fixture'}));
      build.onResolve({filter:/^@workspace\/integrations-openai-ai-server$/},()=>({path:'ai',namespace:'fixture'}));
      build.onResolve({filter:/^@workspace\/api-zod$/},()=>({path:fileURLToPath(new URL('../../../../lib/api-zod/src/index.ts',import.meta.url))}));
      build.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'js',contents:path==='db'
        ?'export const {db,userData,items,userItemEquipment,userItemInventory}=globalThis.__yokiAuthenticatedFixture;'
        :'export const {openai}=globalThis.__yokiAuthenticatedFixture;'}));
    }}])).default;
    server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    const origin='http://127.0.0.1:'+server.address().port;
    const token = (userId,claims={},signer=privateKey) => {
      const now=Math.floor(Date.now()/1000);
      return jwt.sign({sub:userId,sid:'sess_'+userId,iss:'https://yoki-local.clerk.accounts.dev',iat:now,nbf:now-1,exp:now+600,azp:origin,...claims},signer,
        {algorithm:'RS256',keyid:keyId});
    };
    const request=(path,method='GET',bearer,body)=>fetch(origin+'/api'+path,{method,headers:{'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {origin,token,request,pg,ai,aiCalls,outbound,close};
  } catch(error){await close();throw error;}
}
