import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const base=path.resolve(import.meta.dirname,'../utils'),cache=new Map();
function load(name){const file=path.resolve(base,name.endsWith('.ts')?name:name+'.ts');if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',js)(p=>load(path.resolve(path.dirname(file),p)),mod,mod.exports);return mod.exports;}

const geometry=load('costumeGeometry');
test('sewn eyes and inner ears are visible from the front and hidden behind the hood in every form',()=>{
 for(const form of ['egg','odango','stage3','stage4'])for(const [id,material]of [['frog',3],['cat',1],['rabbit',1]]){
  const features=(rx,ry)=>geometry.projectCostume(form,id,rx,ry,0).slice(material*16,(material+1)*16).some(layer=>layer.d.length>0);
  assert.ok(features(0,0),form+' '+id+' has front details');
  assert.equal(features(0,Math.PI),false,form+' '+id+' rear hides front details');
  assert.equal(features(Math.PI,0),false,form+' '+id+' backward roll hides front details');
  assert.ok(geometry.projectCostume(form,id,0,Math.PI,0).slice(0,16).some(layer=>layer.d.length>0),'hood remains visible');
 }
});
