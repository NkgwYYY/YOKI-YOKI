import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

const code=ts.transpileModule(fs.readFileSync(new URL('../utils/useReducedMotion.ts',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
function fixture(){
 const pending=[],events=new Set();let subscribe,getSnapshot,added=0,removed=0;
 const exports={};
 new Function('require','exports',code)(name=>name==='react'?{useSyncExternalStore:(s,g)=>{subscribe=s;getSnapshot=g;return g();}}:{AccessibilityInfo:{
  addEventListener:(_,listener)=>{added++;events.add(listener);return {remove:()=>{removed++;events.delete(listener);}};},
  isReduceMotionEnabled:()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),
 }},exports);
 exports.useReducedMotion();
 return {subscribe:fn=>subscribe(fn),read:()=>getSnapshot(),change:value=>events.forEach(fn=>fn(value)),pending,counts:()=>({added,removed})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('one motion listener serves concurrent consumers and stale initial reads cannot override changes',async()=>{
 const f=fixture();let notifications=0;
 const offA=f.subscribe(()=>notifications++),offB=f.subscribe(()=>notifications++);
 assert.deepEqual(f.counts(),{added:1,removed:0});assert.equal(f.read(),true);
 f.change(false);f.change(true);f.pending[0].resolve(false);await flush();
 assert.equal(f.read(),true);assert.equal(notifications,4);
 offA();assert.equal(f.counts().removed,0);offB();assert.equal(f.counts().removed,1);
});
test('unmount and resubscribe invalidate the previous preference request',async()=>{
 const f=fixture();const off=f.subscribe(()=>{});off();const offNew=f.subscribe(()=>{});
 f.pending[1].resolve(false);await flush();assert.equal(f.read(),false);
 f.pending[0].resolve(true);await flush();assert.equal(f.read(),false);
 offNew();assert.deepEqual(f.counts(),{added:2,removed:2});assert.equal(f.read(),true);
});
test('preference read failures keep safe initial state while live events still work',async()=>{
 const f=fixture();const off=f.subscribe(()=>{});f.pending[0].reject(Error('unavailable'));await flush();
 assert.equal(f.read(),true);f.change(false);assert.equal(f.read(),false);off();
});
