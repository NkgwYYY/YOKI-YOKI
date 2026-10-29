import assert from 'node:assert/strict';
import test from 'node:test';
import {readRoomPositions,mergeRoomPositions} from '../utils/roomPlacement.ts';
import {homeFurnishingFrame,dragHomeFurnishing} from '../utils/homeFurnishings.ts';
import {homeLogicalPoint} from '../utils/homeGeometry.ts';
import {fitHomeOverview} from '../utils/homeView.ts';

test('damaged saved positions cannot create invisible items or unknown IDs',()=>{
 const positions=readRoomPositions({'furniture:sofa':{x:-5,y:100},'flower:pink':{x:NaN,y:.7},'flower:violet':{x:.8,y:.72,updatedAt:9},'unknown':{x:.5,y:.7}});
 assert.deepEqual(Object.keys(positions),['furniture:sofa','flower:violet']);
 assert.deepEqual(positions['furniture:sofa'],{x:0,y:.96,updatedAt:0});
});
test('cloud reconciliation preserves the newest position of each different item',()=>{
 const local={'furniture:sofa':{x:.5,y:.8,updatedAt:20},'flower:pink':{x:.7,y:.7,updatedAt:10}};
 const cloud={'furniture:sofa':{x:.2,y:.8,updatedAt:15},'flower:pink':{x:.4,y:.75,updatedAt:25}};
 assert.deepEqual(mergeRoomPositions(cloud,local),{'furniture:sofa':local['furniture:sofa'],'flower:pink':cloud['flower:pink']});
});
test('normalized floor placement follows the matching artwork on rotation',()=>{
 const position={x:.5,y:.76};
 for(const [width,height]of[[390,844],[844,390],[320,568]]){
  const room=fitHomeOverview(width,height),item=homeFurnishingFrame('flower','pink',room.width,room.height,undefined,undefined,position);
  const actual=homeLogicalPoint({x:(item.left+item.width/2)/room.width,y:(item.top+item.height)/room.height},width>height);
  assert.ok(Math.abs(actual.x-position.x)<.00001&&Math.abs(actual.y-position.y)<.00001);
 }
});
test('dragging compensates zoom and keeps furniture in the viewport above the dock',()=>{
 const room={width:400,height:700,left:0,top:0},viewport={width:400,height:700},safe={left:12,right:388,bottom:610};
 const item={left:160,top:350,width:80,height:80},camera={zoom:1.85,panX:0,panY:-80};
 const move=dragHomeFurnishing(item,{x:37,y:37},room,camera,viewport,safe,168,610);
 assert.equal(move.left,item.left+20);assert.equal(move.top,item.top+20);
 for(const delta of [{x:5000,y:5000},{x:-5000,y:-5000}]){
  const p=dragHomeFurnishing(item,delta,room,camera,viewport,safe,168,610);
  const x=room.width/2+(p.left-room.width/2)*camera.zoom+camera.panX;
  const y=room.height/2+(p.top-room.height/2)*camera.zoom+camera.panY;
  assert.ok(x>=12-1e-8&&x+item.width*camera.zoom<=388+1e-8);
  assert.ok(y>=168-1e-8&&y+item.height*camera.zoom<=610+1e-8);
 }
});
