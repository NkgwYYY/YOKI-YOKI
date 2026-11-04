import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const base=path.resolve(import.meta.dirname,'../utils'),cache=new Map();
function load(name){const file=path.resolve(base,name.endsWith('.ts')?name:name+'.ts');if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',js)(p=>load(path.resolve(path.dirname(file),p)),mod,mod.exports);return mod.exports;}
const {reconcileCostumePurchases:restore,deliverCostumeSnapshot:deliver,COSTUME_PRODUCTS:ids}=load('costumePurchases');
const {changeCostume,mergeWardrobes,readWardrobe}=load('wardrobe');
const initial=()=>({points:1000,unrelated:{keep:true},wardrobe:{version:1,owned:['dog'],equipped:'dog',changedAt:100}});
test('build43 ownership survives empty restore and later App Store refunds',()=>{
 let feed=restore(initial(),[ids.panda]);
 assert.equal(feed.points,1000);assert.deepEqual(feed.wardrobe.pointOwned,['dog']);
 feed=changeCostume(feed,{kind:'equip',id:'panda'},200);
 feed=restore(JSON.parse(JSON.stringify(feed)),[],300);
 assert.deepEqual(feed.wardrobe.owned,['dog']);assert.equal(feed.wardrobe.equipped,null);assert.equal(feed.wardrobe.changedAt,300);
 assert.deepEqual(feed.unrelated,{keep:true});
});
test('both purchase paths deduplicate without charging points for a store-owned item',()=>{
 let feed=restore(initial(),[ids.panda,ids.panda]);
 feed=changeCostume(feed,{kind:'buy',id:'panda'});assert.equal(feed.points,1000);
 feed=changeCostume(feed,{kind:'buy',id:'rabbit'});assert.equal(feed.points,500);
 feed=changeCostume(feed,{kind:'buy',id:'rabbit'});assert.equal(feed.points,500);
 feed=restore(feed,[]);assert.deepEqual(new Set(feed.wardrobe.owned),new Set(['dog','rabbit']));
});
test('restoring an item also bought with points never revokes that point ownership',()=>{
 let feed=restore(initial(),[ids.dog]);feed=restore(feed,[]);
 assert.deepEqual(feed.wardrobe.owned,['dog']);assert.equal(feed.wardrobe.equipped,'dog');
});
test('cloud merge retains purchase sources and legacy ownership',()=>{
 const local=restore(initial(),[ids.panda]).wardrobe;
 const cloud={version:1,owned:['cat'],equipped:'cat',changedAt:400};
 const merged=mergeWardrobes(local,cloud);assert.equal(merged.equipped,'cat');
 assert.deepEqual(new Set(restore({wardrobe:merged},[]).wardrobe.owned),new Set(['dog','cat']));
 assert.doesNotThrow(()=>readWardrobe(JSON.parse(JSON.stringify(merged))));
});
test('unknown products and corrupt ownership fail without modifying data',()=>{
 const feed=initial();assert.throws(()=>restore(feed,['not-a-costume']));assert.deepEqual(feed,initial());
 assert.throws(()=>readWardrobe({...feed.wardrobe,storeOwned:['panda']}));
});
test('disk failure never finishes a verified purchase; retry saves before finish',async()=>{
 const snapshot={products:[ids.panda],finishable:['10001']};const order=[];let feed=initial();
 await assert.rejects(deliver(snapshot,()=>true,async()=>{throw Error('disk full');},async()=>order.push('finish')));assert.deepEqual(order,[]);
 await deliver(snapshot,()=>true,async products=>{feed=restore(feed,products);order.push('save');},async()=>order.push('finish'));
 assert.deepEqual(order,['save','finish']);assert.ok(feed.wardrobe.owned.includes('panda'));assert.equal(feed.points,1000);
});
test('account changes before or after persistence leave unfinished transactions recoverable',async()=>{
 let writes=0,finishes=0,current=true;const snapshot={products:[ids.cat],finishable:['10002','10003']};
 await assert.rejects(deliver(snapshot,()=>false,async()=>writes++,async()=>finishes++));
 assert.equal(writes,0);assert.equal(finishes,0);
 await assert.rejects(deliver(snapshot,()=>current,async()=>{writes++;current=false;},async()=>finishes++));
 assert.equal(writes,1);assert.equal(finishes,0);
});
