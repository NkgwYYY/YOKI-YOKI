import assert from 'node:assert/strict';
import test from 'node:test';
import {residentLocomotion,residentStridePhase} from '../utils/residentLocomotion.ts';

test('equal travel produces equal cycles at different frame rates; teleports do not add strides',()=>{
  const advance=n=>{let phase=0;for(let i=0;i<n;i++)phase=residentStridePhase(phase,43/n,100);return phase;};
  assert.ok(Math.abs(advance(30)-advance(120))<1e-10);
  assert.equal(residentStridePhase(1,0,100),1);
  assert.equal(residentStridePhase(1,120,100),1);
  assert.equal(residentStridePhase(1,NaN,100),1);
});
test('push compresses the body at contact, flight lifts it with a softer smaller shadow',()=>{
  const push=residentLocomotion(Math.PI/2,1,1),flight=residentLocomotion(Math.PI*1.5,1,1);
  assert.ok(push.scaleY<.93&&push.scaleX>1.05);
  assert.equal(push.lift,0);
  assert.ok(flight.lift>.06&&flight.shadowScale<.9&&flight.shadowOpacity<.85);
  assert.equal(flight.scaleY,1);
  assert.ok(residentLocomotion(0,1,1).roll>0);
  assert.ok(residentLocomotion(0,1,-1).roll<0);
  assert.ok(residentLocomotion(Math.PI/2,1,0).roll!==0,'vertical travel still moves the whole body');
});
test('settled motion is neutral at every phase and preserves the original silhouette',()=>{
  for(let p=0;p<Math.PI*2;p+=.07){
    const neutral=residentLocomotion(p,0,-1);
    assert.equal(neutral.scaleX,1);assert.equal(neutral.scaleY,1);assert.equal(Math.abs(neutral.roll),0);assert.equal(neutral.lift,0);
    const moving=residentLocomotion(p,1,1);
    assert.ok(moving.scaleY>=.9&&moving.scaleY<=1);
    assert.ok(moving.scaleX>.98&&moving.scaleX<1.07);
  }
});
