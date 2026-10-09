import test from 'node:test';
import assert from 'node:assert/strict';
import {lanePoint3D,pinMeshPaths} from '../utils/bowlingVolume.ts';
import {projectLane,simulateBowling} from '../utils/bowling.ts';

test('3D ground projection stays aligned with the collision lane in narrow and tall views',()=>{
 for(const [w,h] of [[298,346],[368,475],[800,400]])for(const x of [-1,0,.6])for(const y of [0,9.6,12]){
  const floor=lanePoint3D(x,y,0,w,h),physics=projectLane(x,y);
  assert.equal(floor.x,physics.x*w);assert.equal(floor.y,physics.y*h);
  const top=lanePoint3D(x,y,.78,w,h);assert.ok(top.y<floor.y);
 }
 assert.ok(lanePoint3D(0,0,0,390,500).scale>lanePoint3D(0,10,0,390,500).scale);
});
test('upright and fallen pins have shaded, finite mesh geometry throughout a strike',()=>{
 const result=simulateBowling({aim:-.15,power:1,curve:0,mission:'strike',rulesVersion:4});
 let tilted=false;
 for(let index=0;index<result.frames.length;index+=20)for(const pin of result.frames[index].pins){
  if(pin.hidden)continue;
  const paths=pinMeshPaths(pin.x,pin.y,pin.rotation,368,475);
  assert.ok(paths.filter(Boolean).length>5);
  assert.ok(paths.slice(16).some(Boolean),'red bands remain on the rotating volume');
  assert.ok(paths.every(p=>!p.includes('NaN')&&!p.includes('Infinity')));
  if(pin.rotation>80){tilted=true;assert.notDeepEqual(paths,pinMeshPaths(pin.x,pin.y,0,368,475));}
 }
 assert.ok(tilted);
});
