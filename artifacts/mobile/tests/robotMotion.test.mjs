import test from 'node:test';
import assert from 'node:assert/strict';
import {isHomeGround} from '../utils/homeGeometry.ts';
import {robotStep,ROBOT_ROUTE} from '../utils/robotMotion.ts';
test('robot autonomously completes its whole route at a bounded speed',()=>{
 let state={x:.43,y:.73,target:0};const seen=new Set();
 for(let frame=0;frame<60*90;frame++){
  const next=robotStep(state.x,state.y,state.target,1/60,1.5);
  assert.ok(Math.hypot(next.x-state.x,(next.y-state.y)*1.5)<=.052/60+1e-9);
  assert.ok(isHomeGround(next));
  seen.add(next.target);state=next;
 }
 assert.equal(seen.size,ROBOT_ROUTE.length);
});
test('resuming cannot jump across the room and reduced motion retains slow travel',()=>{
 const start={x:.43,y:.73,target:0};
 const resumed=robotStep(start.x,start.y,0,120,1.5);
 assert.ok(Math.hypot(resumed.x-start.x,(resumed.y-start.y)*1.5)<=.052*.05+1e-9);
 const slow=robotStep(start.x,start.y,0,1/60,1.5,true);
 assert.ok(Math.hypot(slow.x-start.x,slow.y-start.y)>0);
 assert.deepEqual(robotStep(start.x,start.y,0,0,1.5),start);
});
