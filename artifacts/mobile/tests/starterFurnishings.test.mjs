import test from 'node:test';
import assert from 'node:assert/strict';
import {STARTER_FURNISHINGS,readStarterFurnishings,mergeStarterFurnishings,starterIsPlaced} from '../utils/starterFurnishings.ts';
import {prepareRoomOperation,ROOM_KEYS} from '../utils/roomPurchase.ts';

test('old saves keep every starter set; malformed data cannot hide furniture',()=>{
 for(const value of [undefined,null,{},'invalid',{bed:{placed:'false'}},{bed:false}]){
  const state=readStarterFurnishings(value);
  for(const {id}of STARTER_FURNISHINGS)assert.equal(starterIsPlaced(state,id),true);
 }
 assert.deepEqual(readStarterFurnishings({bed:{placed:false,updatedAt:12},unknown:{placed:false,updatedAt:99}}),{bed:{placed:false,updatedAt:12}});
});
test('different device changes merge per item and newer restoration wins',()=>{
 const cloud={bed:{placed:false,updatedAt:10},rug:{placed:false,updatedAt:30}};
 const local={bed:{placed:true,updatedAt:20},lounge:{placed:false,updatedAt:15}};
 assert.deepEqual(mergeStarterFurnishings(cloud,local),{...cloud,...local});
});
test('putting away and restoring a starter set persists without changing points or purchases',()=>{
 const room={furniture:'sofa',flower:'violet',ownedFurniture:['sofa'],ownedFlowers:['violet']};
 let values={[ROOM_KEYS.feed]:JSON.stringify({points:470}),[ROOM_KEYS.room]:JSON.stringify(room)};
 for(const placed of [false,true]){
  const op=prepareRoomOperation(values,{kind:'starter',id:'bed',placed},{points:0});
  assert.equal(op.result.success,true);
  assert.equal(op.result.newlyPurchased,false);
  assert.equal(op.entries.length,1);
  assert.equal(op.entries[0][0],ROOM_KEYS.room);
  values={...values,...Object.fromEntries(op.entries)};
  const saved=JSON.parse(values[ROOM_KEYS.room]);
  assert.equal(starterIsPlaced(readStarterFurnishings(saved.starterFurnishings),'bed'),placed);
  assert.equal(saved.furniture,'sofa');assert.deepEqual(saved.ownedFlowers,['violet']);
  assert.equal(JSON.parse(values[ROOM_KEYS.feed]).points,470);
 }
 const invalid=prepareRoomOperation(values,{kind:'starter',id:'other',placed:false},{points:0});
 assert.equal(invalid.result.success,false);assert.deepEqual(invalid.entries,[]);
});
