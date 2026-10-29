import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const script=new URL('../scripts/inject-meta.js',import.meta.url);
for(const legacy of [false,true])test(`logo boot injection is repeatable with ${legacy?'legacy':'fresh'} HTML`,()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'yoki-boot-')),file=path.join(folder,'index.html');
 try{
  fs.writeFileSync(file,`<html lang="en"><head><title>app</title>${legacy?'<style id="yoki-boot-style">old rules</style>':''}</head><body><div id="root"></div>${legacy?'<div id="yoki-boot" role="status"><strong>old logo</strong><div class="nest"><img src="mascot.webp"/></div><p>old copy</p></div>':''}</body></html>`);
  execFileSync(process.execPath,[script.pathname,file]);const once=fs.readFileSync(file,'utf8');
  execFileSync(process.execPath,[script.pathname,file]);assert.equal(fs.readFileSync(file,'utf8'),once);
  assert.equal((once.match(/id="yoki-boot"/g)||[]).length,1);assert.equal((once.match(/id="yoki-boot-style"/g)||[]).length,1);
  assert.match(once,/aria-label="YOKIYOKI"/);assert.match(once,/prefers-reduced-motion/);assert.match(once,/google-adsense-account/);assert.match(once,/og:title/);
  assert.doesNotMatch(once,/mascot.webp|old rules|old copy/);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});

test('full release pipeline writes the logo before JavaScript without changing existing metadata',async()=>{
 const {EventEmitter}=await import('node:events');const vm=await import('node:vm');const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url),{inject}=require('../scripts/boot-markup.cjs');
 const source=fs.readFileSync(new URL('../scripts/build.js',import.meta.url),'utf8');
 const implementation=source.slice(source.indexOf('async function buildWeb('),source.indexOf('\nasync function main('));
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'yoki-release-')),web=path.join(folder,'web');
 try{
  const context={fs,path,staticBuild:folder,projectRoot:folder,process:{env:{}},console:{log(){},warn(){},error(){}},injectBootMarkup:inject,spawn(_cmd,args){
   const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();
   queueMicrotask(()=>{const out=args[args.indexOf('--output-dir')+1];fs.writeFileSync(path.join(out,'index.html'),'<html><head><meta name="google-site-verification" content="existing"/><title>Existing title</title></head><body><div id="root"></div><script src="app.js"></script></body></html>');child.emit('close',0);});return child;
  }};
  const build=vm.runInNewContext(implementation+'\nbuildWeb',context);await build('example.test');
  const html=fs.readFileSync(path.join(web,'index.html'),'utf8');assert.match(html,/id="yoki-boot"/);assert.match(html,/aria-label="YOKIYOKI"/);assert.match(html,/#211137/);assert.match(html,/<title>Existing title<\/title>/);assert.match(html,/content="existing"/);assert.match(html,/<script src="app.js"><\/script>/);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
