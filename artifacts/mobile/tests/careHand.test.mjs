import test from 'node:test';
import assert from 'node:assert/strict';
import {mealHandSample} from '../utils/careHand.ts';
import {mealSample} from '../utils/residentMeal.ts';

test('caretaker enters, delivers all three bites and leaves before the meal completes',()=>{
 assert.equal(mealHandSample(0).presence,0);
 assert.equal(mealHandSample(.1).presence,1);
 for(let bite=0;bite<3;bite++){
  const t=.1+bite*.21+.45*.21;
  assert.ok(Math.abs(mealHandSample(t).x-.62)<1e-9);
  assert.ok(Math.abs(mealHandSample(t).y-.68)<1e-9);
  assert.equal(mealSample(t+1e-6).taken,bite+1);
 }
 assert.equal(mealHandSample(.94).presence,0);
 assert.equal(mealHandSample(1).presence,0);
});
test('hand has continuous bounded contact motion, including between bites',()=>{
 let previous=mealHandSample(0);
 for(let i=1;i<=10000;i++){
  const next=mealHandSample(i/10000);
  for(const key of ['x','y','presence','approach']){
   assert.ok(Number.isFinite(next[key])&&next[key]>=0&&next[key]<=1);
   assert.ok(Math.abs(next[key]-previous[key])<.006,'no jump at bite boundary: '+key);
  }
  previous=next;
 }
 for(const bad of [NaN,Infinity,-Infinity])assert.deepEqual(mealHandSample(bad),mealHandSample(0));
});
