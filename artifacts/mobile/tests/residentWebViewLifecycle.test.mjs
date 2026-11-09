import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../utils/residentWebViewLifecycle.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('module','exports',code)(mod,mod.exports);
const {createResidentWebViewLifecycle, residentWebViewTimeout}=mod.exports;
test('cold process startup has a separate budget from the first textured paint',()=>{
 let time=0;const life=createResidentWebViewLifecycle('odango',()=>time),id=life.snapshot().token;
 assert.equal(residentWebViewTimeout(life.snapshot().phase),20000);
 time=7000;assert.equal(life.loaded(id).phase,'painting');
 assert.equal(residentWebViewTimeout(life.snapshot().phase),5000);
 assert.equal(life.timeout(id,'document'),null,'a queued load watchdog cannot kill a loaded document');
 time=7200;assert.equal(life.ready(id).phase,'ready');
 assert.equal(life.timeout(id,'painting'),null);
});
test('old errors, load events and ready events cannot consume or complete a replacement attempt',()=>{
 const life=createResidentWebViewLifecycle('odango'),old=life.snapshot().token;
 const replacement=life.timeout(old,'document');assert.equal(replacement.phase,'document');
 assert.equal(life.error(old,'cancelled-old-navigation'),null);
 assert.equal(life.loaded(old),null);assert.equal(life.ready(old),null);
 assert.equal(life.loaded(replacement.token).phase,'painting');
 assert.equal(life.ready(replacement.token).phase,'ready');
});
test('unresponsive views stop after one recovery and can recover on foregrounding',()=>{
 const life=createResidentWebViewLifecycle('odango');
 const second=life.timeout(life.snapshot().token,'document');
 const failure=life.timeout(second.token,'document');assert.equal(failure.phase,'failed');
 assert.equal(life.ready(second.token),null,'a fallback must not report ready');
 const resumed=life.resume();assert.equal(resumed.phase,'document');assert.notEqual(resumed.token,second.token);
 assert.equal(life.ready(resumed.token).phase,'ready');
});
test('successful recovery restores recovery capacity for a later process termination',()=>{
 const life=createResidentWebViewLifecycle('stage3');
 const second=life.error(life.snapshot().token,'process-terminated');life.ready(second.token);
 assert.equal(life.error(second.token,'process-terminated').phase,'document');
});
test('evolution ignores events from the previous character view',()=>{
 const life=createResidentWebViewLifecycle('odango'),old=life.snapshot().token;
 const next=life.reset('stage4');assert.equal(next.phase,'document');
 assert.equal(life.error(old,'old-stage'),null);assert.equal(life.ready(old),null);
 assert.equal(life.ready(next.token).phase,'ready');assert.equal(life.reset('stage4'),null);
});
