import assert from 'node:assert/strict';
import test from 'node:test';
import {readCatalogCache,readLocalInventory} from '../utils/itemCache.ts';
const item={id:'catalog-wear-round-glasses',name:'めがね',category:'accessory',cost:40,assetUrl:'/items/glasses.png',posX:0,posY:0,scale:1,isActive:true,createdAt:''};
test('cached catalog accepts displayable equipment and retains inactive owned art metadata',()=>{
  const cached=readCatalogCache(JSON.stringify({version:1,items:[item,{...item,id:'retired',isActive:false},{...item,id:'legacy-food',category:'food'}]}));
  assert.deepEqual(cached.map(x=>x.id),['catalog-wear-round-glasses','retired']);
});
test('bad or unsupported cache cannot inject malformed catalog values',()=>{
  for(const raw of [null,'{','null','[]','{"version":2,"items":[]}'])assert.deepEqual(readCatalogCache(raw),[]);
  assert.deepEqual(readCatalogCache(JSON.stringify({version:1,items:[null,{...item,cost:-3},{...item,assetUrl:null},{...item,scale:'big'}]})),[]);
});
test('inventory recovery retains old IDs and accessory slot independently of catalog contents',()=>{
  const raw=JSON.stringify({inventory:['legacy-item','catalog-wear-round-glasses'],equipped:{accessory:'legacy-item'},placements:{'legacy-item':{x:20,y:-8,scale:1.1}}});
  const restored=readLocalInventory(raw);
  assert.deepEqual(restored.inventory,['legacy-item','catalog-wear-round-glasses']);
  assert.equal(restored.equipped.accessory,'legacy-item');
  assert.equal(restored.placements['legacy-item'].x,20);
});
test('invalid local inventory data is tolerated without altering its stored source',()=>{
  for(const raw of ['null','{','{"inventory":null}'])assert.deepEqual(readLocalInventory(raw),{inventory:[],equipped:{},placements:{}});
});
