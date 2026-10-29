import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import { getWorldTime } from '../utils/worldTime.ts';
const code=ts.transpileModule(fs.readFileSync(new URL('../utils/startupAssets.ts',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
function fixture(prepare){
 const exports={};
 new Function('require','exports',code)(name=>{
  if(name==='./worldArt')return{prepareWorldArt:prepare};
  if(name==='./worldTime')return{getWorldTime};
  throw Error(`Unexpected startup dependency: ${name}`);
 },exports);
 return exports.preloadStartupImages;
}
test('startup blocks only on the one HOME backdrop displayed at the current local time',async()=>{
 const calls=[],load=fixture(async(...args)=>{calls.push(args);});
 for(const hour of [5,12,19,20,1])await load(new Date(2026,9,9,hour));
 assert.deepEqual(calls,[['home',false],['home',false],['home',false],['home',true],['home',true]]);
});
test('startup shares scene preparation and allows a failed image to be retried',async()=>{
 let fail=true;const decoded=Promise.resolve();
 const load=fixture(()=>fail?Promise.reject(Error('offline')):decoded);
 await assert.rejects(load(),/offline/);
 fail=false;assert.equal(load(),decoded);await load();
});
