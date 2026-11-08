import test from 'node:test';
import assert from 'node:assert/strict';
import {changeRoomBoutique as change,readRoomCollection as read,roomPointQuote as quote,mergeRoomCollections,deliverRoomSnapshot,roomProductSku as sku,ROOM_PRODUCTS} from '../utils/roomBoutique.ts';
import {changeCostume,readWardrobe} from '../utils/wardrobe.ts';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
// Existing costume logic uses extensionless imports for Metro.
const cache=new Map();function load(name){const file=path.resolve(import.meta.dirname,'../utils',name.endsWith('.ts')?name:name+'.ts');if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(p=>load(path.resolve(path.dirname(file),p)),mod,mod.exports);return mod.exports;}
const {reconcileCostumePurchases:restoreCostumes}=load('costumePurchases');
const initial=()=>({feed:{points:10000,unrelated:'keep'},room:{furniture:'none',flower:'none',ownedFurniture:[],ownedFlowers:[],starterFurnishings:{bed:{placed:false,updatedAt:20}}}});
const run=(s,a,t=100)=>change(s.feed,s.room,a,t);
test('catalog prices are above standalone costumes and SKUs are unique',()=>{
 assert.equal(new Set(ROOM_PRODUCTS.map(p=>sku(p.id))).size,7);
 assert.ok(ROOM_PRODUCTS.every(p=>p.points>500&&p.yen>50));
 assert.ok(ROOM_PRODUCTS.filter(p=>p.kind==='room').every(p=>p.points===3500&&p.yen===500));
});
test('bundle charges once, atomically grants furniture and costume, never auto-applies',()=>{
 let s=run(initial(),{kind:'buy',id:'panda-set'});assert.equal(s.paid,1800);assert.equal(s.feed.points,8200);assert.ok(s.feed.wardrobe.owned.includes('panda'));assert.equal(s.feed.wardrobe.equipped,null);assert.deepEqual(s.room.boutique.goods,[]);
 s=run(s,{kind:'buy',id:'panda-set'});assert.equal(s.paid,0);assert.equal(s.feed.points,8200);assert.equal(s.feed.unrelated,'keep');
 s=run(s,{kind:'apply',id:'panda-set'});assert.equal(s.feed.wardrobe.equipped,'panda');assert.deepEqual(s.room.boutique.goods,['bamboo-cushion']);assert.equal(s.feed.points,8200);
});
test('existing costume or furniture reduces the point cost and full ownership disables re-purchase',()=>{
 let s=initial();s.feed=changeCostume(s.feed,{kind:'buy',id:'panda'});
 assert.equal(quote('panda-set',read(s.room.boutique),readWardrobe(s.feed.wardrobe)),1300);
 s=run(s,{kind:'buy',id:'panda-set'});assert.equal(s.feed.points,8200);
 let t=run(initial(),{kind:'buy',id:'panda-furniture'});assert.equal(quote('panda-set',t.room.boutique,readWardrobe(t.feed.wardrobe)),300);
 t=run(t,{kind:'buy',id:'panda-set'});assert.equal(t.feed.points,8200);
 assert.equal(quote('panda-furniture',t.room.boutique,readWardrobe(t.feed.wardrobe)),0);
});
test('insufficient balance and unowned apply/toggle leave both objects untouched',()=>{
 const s=initial();s.feed.points=1799;const before=structuredClone(s);
 assert.throws(()=>run(s,{kind:'buy',id:'panda-set'}));assert.throws(()=>run(s,{kind:'apply',id:'washitsu'}));assert.throws(()=>run(s,{kind:'good',id:'carrot-bed',placed:true}));assert.deepEqual(s,before);
});
test('theme changes and returning home preserve original starter settings and purchases',()=>{
 let s=run(initial(),{kind:'buy',id:'washitsu'});assert.equal(s.room.boutique.theme,null);
 s=run(s,{kind:'apply',id:'washitsu'});assert.equal(s.room.boutique.theme,'washitsu');assert.equal(s.feed.points,6500);
 s=run(s,{kind:'default'});assert.equal(s.room.boutique.theme,null);assert.deepEqual(s.room.starterFurnishings,initial().room.starterFurnishings);
 s=run(s,{kind:'apply',id:'washitsu'});assert.equal(s.feed.points,6500);
});
test('multiple matching goods can be placed independently and hidden without losing ownership',()=>{
 let s=run(initial(),{kind:'buy',id:'panda-set'});s=run(s,{kind:'buy',id:'rabbit-set'});s=run(s,{kind:'apply',id:'panda-set'});s=run(s,{kind:'apply',id:'rabbit-set'});
 assert.deepEqual(new Set(s.room.boutique.goods),new Set(['bamboo-cushion','carrot-bed']));
 s=run(s,{kind:'good',id:'bamboo-cushion',placed:false});assert.deepEqual(s.room.boutique.goods,['carrot-bed']);assert.equal(quote('panda-set',s.room.boutique,readWardrobe(s.feed.wardrobe)),0);
});
test('native restore grants without point charge and costume restoration preserves bundles',()=>{
 let s=run(initial(),{kind:'restore',products:[sku('panda-set')]});assert.equal(s.feed.points,10000);
 s=run(s,{kind:'apply',id:'panda-set'});s.feed=restoreCostumes(s.feed,[]);assert.equal(s.feed.wardrobe.equipped,'panda');assert.deepEqual(s.feed.wardrobe.pointOwned,[]);
 s=run(s,{kind:'restore',products:[]},200);assert.deepEqual(s.feed.wardrobe.owned,[]);assert.equal(s.feed.wardrobe.equipped,null);assert.deepEqual(s.room.boutique.goods,[]);
});
test('refunding a room set removes only that entitlement and preserves point purchases',()=>{
 let s=initial();s.feed=changeCostume(s.feed,{kind:'buy',id:'panda'});s=run(s,{kind:'buy',id:'panda-furniture'});s=run(s,{kind:'restore',products:[sku('panda-set'),sku('washitsu')]});
 s=run(s,{kind:'apply',id:'panda-set'});s=run(s,{kind:'apply',id:'washitsu'});s=run(s,{kind:'restore',products:[]},300);
 assert.deepEqual(s.feed.wardrobe.owned,['panda']);assert.equal(s.feed.wardrobe.equipped,'panda');assert.deepEqual(s.room.boutique.goods,['bamboo-cushion']);assert.equal(s.room.boutique.theme,null);assert.equal(s.feed.points,8000);
});
test('point-owned bundle survives later store refund of the same bundle',()=>{
 let s=run(initial(),{kind:'buy',id:'rabbit-set'});s=run(s,{kind:'restore',products:[sku('rabbit-set')]});s=run(s,{kind:'restore',products:[]},300);assert.ok(s.feed.wardrobe.owned.includes('rabbit'));assert.equal(quote('rabbit-set',s.room.boutique,readWardrobe(s.feed.wardrobe)),0);
});
test('cloud merge retains point purchases and latest layout, without resurrecting refunded store items',()=>{
 const a=run(initial(),{kind:'buy',id:'washitsu'});const b=run(initial(),{kind:'restore',products:[sku('panda-set')]},100);const c=run(b,{kind:'restore',products:[]},200);
 const merged=mergeRoomCollections(a.room.boutique,c.room.boutique);assert.deepEqual(merged.pointOwned,['washitsu']);assert.deepEqual(merged.storeOwned,[]);
 assert.deepEqual(mergeRoomCollections(b.room.boutique,c.room.boutique).storeOwned,[]);
});
test('invalid receipts and corrupt points fail closed',()=>{
 assert.throws(()=>run(initial(),{kind:'restore',products:['unknown']}));assert.throws(()=>read({...read(),pointOwned:['unknown']}));assert.throws(()=>change({points:NaN},{},{kind:'buy',id:'washitsu'}));
});
test('delivery saves first, leaves unfinished transactions on disk failure or account change',async()=>{
 const snap={products:[sku('washitsu')],finishable:['123','456']},order=[];
 await assert.rejects(deliverRoomSnapshot(snap,()=>true,async()=>{throw Error('disk full');},async()=>order.push('finish')));assert.deepEqual(order,[]);
 let current=true;await assert.rejects(deliverRoomSnapshot(snap,()=>current,async()=>{order.push('save');current=false;},async()=>order.push('finish')));assert.deepEqual(order,['save']);
 order.length=0;await deliverRoomSnapshot(snap,()=>true,async()=>order.push('save'),async id=>order.push(id));assert.deepEqual(order,['save','123','456']);
});
test('the native product allowlist and Japanese prices match the UI catalog',()=>{
 const swift=fs.readFileSync(path.resolve(import.meta.dirname,'../modules/yoki-stones/ios/RoomProductStore.swift'),'utf8');
 for(const p of ROOM_PRODUCTS)assert.ok(swift.includes('"'+p.id+'"'));assert.match(swift,/\? 500 : 200/);assert.match(swift,/product\.price != Decimal\(expected\)/);assert.match(swift,/\.nonConsumable/);
});
