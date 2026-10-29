import test from 'node:test';
import assert from 'node:assert/strict';
import {HOME_IDLE,HOME_WINDOW,HOME_BED,homeRoute,homeDropPoint,homeMovePoint,isHomeGround,homeArtPoint,homeLogicalPoint} from '../utils/homeGeometry.ts';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const points=[HOME_IDLE,HOME_WINDOW,HOME_BED,...Array.from({length:36},(_,i)=>homeDropPoint({x:(i%6)/5,y:Math.floor(i/6)/5}))];
test('all floor drops are connected by a route that stays out of walls and furniture',()=>{
 for(const a of points)for(const b of points){
  const route=homeRoute(a,b);let at=a;
  assert.ok(distance(a,b)<.0001||route.length,'every reachable target has a route');
  for(const next of route){for(let i=0;i<=80;i++){const t=i/80;assert.ok(isHomeGround({x:at.x+(next.x-at.x)*t,y:at.y+(next.y-at.y)*t}),'whole segment stays on the furnished floor');}at=next;}
  assert.ok(distance(at,b)<.0001,'the route actually reaches its destination');
 }
});
test('bed is approached from its foot and invalid old upper-floor locations land on the new floor',()=>{
 const route=homeRoute(HOME_IDLE,HOME_BED);
 assert.ok(route.some(p=>distance(p,{x:.64,y:.445})<.0001),'bed approach avoids walking through the quilt side');
 for(const p of [{x:.43,y:.265},{x:.1,y:.2},{x:NaN,y:Infinity},{x:-9,y:99}])assert.ok(isHomeGround(homeDropPoint(p)));
 assert.ok(homeDropPoint({x:.43,y:.265}).y>.4,'there is no invisible upstairs surface');
 assert.equal(isHomeGround({x:.46,y:.34}),false,'bookcase is not floor');
 assert.equal(isHomeGround({x:.25,y:.53}),false,'chair/table are not floor');
});
test('small manual movements remain on the floor and cannot cut across the chair',()=>{
 for(const p of points)for(const d of [{x:.008,y:.006},{x:-.01,y:-.008},{x:.01,y:-.01}]){
  const next=homeMovePoint(p,{x:p.x+d.x,y:p.y+d.y});assert.ok(isHomeGround(next));
  assert.ok(distance(p,next)<=distance({x:0,y:0},d)*1.9,'no sudden teleport');
 }
 const from={x:.16,y:.78},to=HOME_WINDOW,next=homeMovePoint(from,to);
 assert.ok(distance(next,to)>.05,'manual input stops before the chair');
});
test('portrait and landscape drag coordinates round trip, including bed and rug',()=>{
 for(const p of points)for(const wide of [true,false])assert.ok(distance(homeLogicalPoint(homeArtPoint(p,wide),wide),p)<.00001);
 assert.ok(homeArtPoint(HOME_BED,true).x>.68&&homeArtPoint(HOME_BED,true).y>.44);
});
