import test from 'node:test';
import assert from 'node:assert/strict';
import {residentTrackingPose,placeResidentSpeech} from '../utils/residentSpeech.ts';
import {welcomeSample,WELCOME_DURATION} from '../utils/residentWelcome.ts';
import {homeArtPoint,homeDropPoint} from '../utils/homeGeometry.ts';
import {fitHomeOverview,homeCamera,homeResidentSize} from '../utils/homeView.ts';
import {worldResidentScale,worldCameraOffset} from '../utils/worldGeometry.ts';

test('welcome hops and figure-eight never move speech or the following camera',()=>{
 for(const [width,height] of [[320,568],[390,844],[844,390],[820,1180]])for(const mode of ['overview','close','eye'])for(const from of [{x:.52,y:.71},{x:.37,y:.47},{x:.76,y:.37}]){
  const frame=fitHomeOverview(width,height),size=homeResidentSize(frame,height,1),to=homeDropPoint(from);
  let baseline;
  for(let tick=48;tick<=Math.ceil(WELCOME_DURATION*120);tick++){
   const joy=welcomeSample(tick/120),raw=homeDropPoint({x:to.x+joy.dx,y:to.y+joy.dy});
   const tracked=residentTrackingPose(raw,-size*joy.jump,false,{from,to,progress:1});
   assert.deepEqual(tracked,{...to,lift:0});
   const foot=homeArtPoint(tracked,width>height),scale=worldResidentScale(tracked.y);
   const camera=homeCamera(mode,frame,{width,height},foot,{zoom:1,panX:0,panY:worldCameraOffset(foot.y,frame.height,height,frame.top)});
   const projectY=y=>frame.top+frame.height/2+camera.panY+(y-frame.height/2)*camera.zoom;
   const anchor={x:frame.left+frame.width/2+camera.panX+(foot.x*frame.width-frame.width/2)*camera.zoom,
    top:projectY(foot.y*frame.height-size*scale*.86),bottom:projectY(foot.y*frame.height),width:size*scale*.85*camera.zoom};
   const placement=placeResidentSpeech(anchor,{width:Math.min(230,width-32),height:68},{left:12,top:168,width:width-24,height:Math.max(68,height-280)});
   const sample={camera,placement};
   if(!baseline)baseline=sample;
   assert.deepEqual(sample,baseline,`${width}x${height} ${mode} frame ${tick}`);
  }
 }
});
test('the brief move to safe ground is continuous without following dance offsets',()=>{
 const from={x:.5,y:.2},to=homeDropPoint(from);
 for(const progress of [0,.25,.5,.75,1]){
  const actual=residentTrackingPose({x:.9,y:.9},-80,false,{from,to,progress});
  assert.equal(actual.x,from.x+(to.x-from.x)*progress);
  assert.equal(actual.y,from.y+(to.y-from.y)*progress);
  assert.equal(actual.lift,0);
 }
});
test('ordinary walking and intentional carrying still follow the resident',()=>{
 for(const position of [{x:.2,y:.4},{x:.6,y:.7},{x:.8,y:.9}]){
  assert.deepEqual(residentTrackingPose(position,-40,false),{...position,lift:0});
  for(const lift of [-60,-30,0])assert.deepEqual(residentTrackingPose(position,lift,true),{...position,lift});
 }
});
test('interruption and reduced motion do not leave a frozen welcome anchor',()=>{
 const from={x:.52,y:.71},position={x:.58,y:.75};
 assert.deepEqual(residentTrackingPose(position,0,false,{from,to:from,progress:0}),{...from,lift:0});
 assert.deepEqual(residentTrackingPose(position,0,false),{...position,lift:0});
});
