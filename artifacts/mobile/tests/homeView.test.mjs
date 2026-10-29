import {homeArtPoint,homeDropPoint} from '../utils/homeGeometry.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readHomeView,homeViewKey,fitHomeOverview,closeHomeCamera,homeResidentSize,homeCamera,homeWallObjects} from '../utils/homeView.ts';
test('first visits and invalid stored values use overview; every explicit choice round-trips',()=>{
 for(const v of [null,undefined,'',false,'false','true','invalid',{},'overview'])assert.equal(readHomeView(v),'overview');
 for(const v of ['overview','close','eye'])assert.equal(readHomeView(v),v);
 assert.notEqual(homeViewKey('guest'),homeViewKey('user-1'));
 assert.notEqual(homeViewKey('a/b'),homeViewKey('a%2Fb'));
 assert.ok(homeViewKey('user-1').startsWith('@mentore/'),'account deletion removes the preference too');
});
test('room and close views fill every edge without shrinking the room into a box',()=>{
 for(const [width,height] of [[320,568],[390,844],[844,390],[1363,936],[820,1180]]){
  const f=fitHomeOverview(width,height);
  assert.ok(f.top<=0&&f.top+f.height>=height-.001,'floor fills the foreground');
  assert.ok(Math.abs(f.width/f.height-(width>height?7/4:4/7))<.001,'room retains its original projection');
  for(const foot of [{x:.5,y:.57},{x:.35,y:.45},{x:.62,y:.69},{x:.74,y:.47}]){
   const c=closeHomeCamera(f,{width,height},foot);
   const left=f.left+f.width/2+c.panX-f.width*c.zoom/2,top=f.top+f.height/2+c.panY-f.height*c.zoom/2;
   assert.ok(left<=.001&&top<=.001&&left+f.width*c.zoom>=width-.001&&top+f.height*c.zoom>=height-.001);
   const x=left+foot.x*f.width*c.zoom,y=top+foot.y*f.height*c.zoom;
   assert.ok(x>=0&&x<=width&&y>=0&&y<=height,'the resident stays on screen');
  }
  const size=homeResidentSize(f,height,1);
  assert.ok(size<=height*.18&&size>0,'overview leaves room around the resident');
 }
});

test('eye level explicitly clears the previous camera after every mode and resident movement',()=>{
 const frame=fitHomeOverview(390,844),viewport={width:390,height:844};
 for(const foot of [{x:.5,y:.57},{x:.74,y:.47},{x:.35,y:.69}]){
  const previous=closeHomeCamera(frame,viewport,foot);
  assert.deepEqual(homeCamera('eye',frame,viewport,foot,previous),{zoom:1,panX:0,panY:0});
  const room=homeCamera('overview',frame,viewport,foot,{zoom:1,panX:0,panY:0});
  assert.equal(room.zoom,1);assert.equal(room.panY,0);assert.ok(Math.abs(room.panX)<=Math.abs(frame.left));
 }
});
test('calendar is attached to the back wall, never repositioned onto the rug',()=>{
 for(const [w,h] of [[320,568],[390,844],[844,390],[1363,936]]){
  const f=fitHomeOverview(w,h),o=homeWallObjects(f.width,f.height,w>h);
  for(const p of Object.values(o)){
   assert.ok(p.width>=44&&p.height>=44);
   assert.ok(p.top>=f.height*.28&&p.top+p.height<f.height*.56,'calendar hangs above the floor');
   assert.ok(f.left+p.left>=0&&f.left+p.left+p.width<=w,'calendar remains visible without panning');
  }
 }
});

test('wide room keeps the resident clear of the single dock from its first measured frame',()=>{
 const viewport={width:844,height:390},frame=fitHomeOverview(viewport.width,viewport.height);
 for(let x=0;x<=1;x+=.1)for(let y=0;y<=1;y+=.1){
  const foot=homeArtPoint(homeDropPoint({x,y}),true),c=homeCamera('overview',frame,viewport,foot,{zoom:1,panX:0,panY:0});
  const bottom=frame.top+c.panY+foot.y*frame.height+homeResidentSize(frame,viewport.height,1)*.08;
  assert.ok(bottom<viewport.height-94,'resident cannot touch the dock, even before async camera following');
 }
});
