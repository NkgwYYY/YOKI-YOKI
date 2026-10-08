import test from 'node:test';
import assert from 'node:assert/strict';
import {BATH_WATER,BATH_REST,isBathDrop,bathDrop} from '../utils/bathInteraction.ts';
test('only the water ellipse accepts a lifted resident, including a far-side drop',()=>{
 assert.equal(isBathDrop(BATH_WATER),true);
 assert.equal(isBathDrop({x:.75,y:.33}),true);
 assert.equal(isBathDrop({x:.86,y:.39}),false);
 assert.equal(isBathDrop({x:.51,y:.45}),false);
 assert.equal(isBathDrop(BATH_REST),false);
 assert.deepEqual(bathDrop({x:.75,y:.33}),{bathing:true,point:{x:.72,y:.331}});
});
test('drops outside water return to safe floor and invalid coordinates never create NaN',()=>{
 for(const x of [-5,.3,.8,20,NaN,Infinity]){
  const drop=bathDrop({x,y:1});assert.equal(drop.bathing,false);assert.equal(drop.point.y,BATH_REST.y);assert.ok(drop.point.x>=.28&&drop.point.x<=.72);
 }
});
