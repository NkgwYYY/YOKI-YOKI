import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const base=path.resolve(import.meta.dirname,'../utils'),cache=new Map();
function load(name){const file=path.resolve(base,name.endsWith('.ts')?name:name+'.ts');if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',js)(p=>load(path.resolve(path.dirname(file),p)),mod,mod.exports);return mod.exports;}

const shop=load('unifiedShop'),room=load('roomBoutique'),wardrobe=load('wardrobe');
test('one catalog exposes costumes, original furniture, flowers, room themes and matching sets',()=>{
 assert.equal(new Set(shop.SHOP_PRODUCTS.map(p=>p.key)).size,shop.SHOP_PRODUCTS.length);
 for(const key of ['costume-panda','panda-set','rain-cafe','furniture-sofa','flower-pink'])assert.ok(shop.SHOP_PRODUCTS.some(p=>p.key===key),key);
 assert.equal(shop.SHOP_PRODUCTS.filter(p=>shop.inShopCategory(p,'costumes')).length,5);
 assert.equal(shop.SHOP_PRODUCTS.filter(p=>shop.inShopCategory(p,'sets')).length,5);
});
test('matching cash checkout selects only a missing entitlement for either partially owned bundle',()=>{
 for(const id of ['panda','rabbit']){
  const p=shop.findShopProduct(id+'-set'),empty=room.readRoomCollection(null),w=wardrobe.readWardrobe(null);
  assert.equal(shop.cashShopProduct(p,empty,w).key,id+'-set');
  assert.equal(shop.cashShopProduct(p,empty,{...w,owned:[id]}).key,id+'-furniture');
  const furnished={...empty,pointOwned:[id+'-furniture']};
  assert.equal(shop.cashShopProduct(p,furnished,w).key,'costume-'+id);
  assert.equal(room.roomPointQuote(p.key,furnished,{...w,owned:[id]}),0);
 }
 assert.equal(shop.cashShopProduct(null,room.readRoomCollection(null),wardrobe.readWardrobe(null)),null);
});
