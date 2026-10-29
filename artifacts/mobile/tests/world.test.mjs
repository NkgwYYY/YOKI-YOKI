import test from 'node:test';
import {homeCamera,fitHomeOverview} from '../utils/homeView.ts';
import {mapGroundPoint,mapStart} from '../utils/worldMaps.ts';
import assert from 'node:assert/strict';
import { getWorldTime } from '../utils/worldTime.ts';
import { fitWorld, fitOutdoorWorld, outdoorCameraOffset, safeWorldPoint, WORLD_PLACES, worldResidentSteps, worldGroundPoint, isWorldGround, WORLD_TRAIL, worldWalkingRoute, worldResidentScale, worldCameraOffset } from '../utils/worldGeometry.ts';

test('local day/night boundaries and daily variation never depend on rewards', () => {
  for (const [hour, period] of [[4,'night'],[5,'morning'],[10,'morning'],[11,'day'],[16,'day'],[17,'dusk'],[19,'dusk'],[20,'night']]) {
    assert.equal(getWorldTime(new Date(2026,9,5,hour)).period, period);
  }
  const morning=getWorldTime(new Date(2026,9,5,9));
  assert.equal(morning.seed, getWorldTime(new Date(2026,9,5,23)).seed);
  assert.notEqual(morning.seed, getWorldTime(new Date(2026,9,6,9)).seed);
});
test('all furniture and resident destinations stay reachable across supported viewports', () => {
  for (const [w,h] of [[320,568],[390,844],[820,1180],[844,390],[1180,820]]) {
    const f=fitHomeOverview(w,h);
    for(const p of [...Object.values(WORLD_PLACES),{x:.35,y:.575},{x:.52,y:.505}]) {
      const c=homeCamera('overview',f,{width:w,height:h},p,{zoom:1,panX:0,panY:0});
      const x=f.left+f.width*p.x+c.panX,y=f.top+f.height*p.y+worldCameraOffset(p.y,f.height,h,f.top);
      assert.ok(x>=24 && x<=w-24 && y>=24 && y<h-72,`${w}x${h}: ${x},${y}`);
    }
  }
  assert.equal(fitWorld(0,0).width,0);
});
test('drops stay on clear floor; food arrives without a walk to a fixed place', () => {
  for(const p of [{x:-1,y:-1},{x:3,y:3},WORLD_PLACES.bed]) {
    const drop=safeWorldPoint(p);
    assert.ok(isWorldGround(drop));
    assert.deepEqual(drop,mapGroundPoint('home',p));
  }
  const steps=worldResidentSteps('meal',WORLD_PLACES.bed,false);
  assert.equal(steps.length,1);
  assert.equal(steps[0].point,undefined);
  assert.equal(steps.at(-1).pose,'eating');
});
test('reduced motion retains meal/rest expressions without movement', () => {
  for(const activity of Object.keys(WORLD_PLACES)) {
    const steps=worldResidentSteps(activity,WORLD_PLACES.idle,true);
    assert.equal(steps.length,1);
    assert.equal(steps[0].point,undefined);
    assert.ok(steps[0].duration>0);
  }
});

test('walking routes between bedroom, window and rug stay on connected clear ground', () => {
  const points = [...Object.values(WORLD_TRAIL).map(p => p.point), WORLD_PLACES.window, {x: .60, y: .74}, {x: .44, y: .68}];
  for (const from of points) for (const to of points) {
    let at = from;
    for (const next of worldWalkingRoute(from, to)) {
      for (let t = 0; t <= 1; t += .025) assert.ok(isWorldGround({x: at.x + (next.x - at.x) * t, y: at.y + (next.y - at.y) * t}));
      at = next;
    }
    assert.deepEqual(at, to);
  }
  assert.ok(worldWalkingRoute(WORLD_PLACES.bed,WORLD_TRAIL.garden.point).some(p=>p.x===.64&&p.y===.445),'return from bed goes around its foot');
  for (const point of [{x:-2,y:3}, {x:5,y:0}, {x:.2,y:.7}, {x:.8,y:.6}]) assert.ok(isWorldGround(worldGroundPoint(point)));
  assert.equal(isWorldGround({x:.46,y:.34}), false, 'the bookcase cannot be selected as ground');
  assert.equal(isWorldGround(WORLD_PLACES.bed), true, 'the mattress can also receive a carried resident');
});

test('perspective is bounded and camera keeps the path clear of the bottom controls', () => {
  assert.equal(worldResidentScale(-1), .94);
  assert.equal(worldResidentScale(2), 1.10);
  assert.ok(worldResidentScale(.375) < worldResidentScale(.755));
  for (const [w,h] of [[320,568],[390,844],[820,1180],[844,390]]) {
    const f = fitHomeOverview(w,h);
    for (const stop of Object.values(WORLD_TRAIL)) {
      const y = f.top + f.height * stop.point.y + worldCameraOffset(stop.point.y,f.height,h,f.top);
      assert.ok(y > 100 && y < h - 24, `${w}x${h}: destination remains visible at ${y}`);
    }
  }
});

test('the home camera stays neutral until the first room measurement',()=>{
  assert.equal(worldCameraOffset(.48,0,0,0),0);
  assert.equal(worldCameraOffset(.48,568,0,0),0);
  for(const [w,h] of [[320,568],[390,844],[844,390],[820,1180]]){
    const f=fitHomeOverview(w,h);
    assert.equal(Math.abs(worldCameraOffset(.48,f.height,h,f.top)),0);
    const offset=worldCameraOffset(.69,f.height,h,f.top);
    assert.ok(f.top+offset<=.001&&f.top+offset+f.height>=h-.001,'following never exposes a background edge');
  }
});


test('outdoor scenery covers every edge without stretching or an inset frame',()=>{
  for(const [w,h] of [[320,568],[390,697],[390,844],[430,932],[640,800],[844,390]]){
    const f=fitOutdoorWorld(w,h);
    assert.ok(Math.abs(f.height/f.width-1.5)<.0001);
    assert.ok(f.left<=0&&f.top<=0);
    assert.ok(f.left+f.width>=w-.001&&f.top+f.height>=h-.001);
  }
});
test('outdoor following never uncovers the top or bottom of the illustration',()=>{
  for(const [w,h] of [[320,568],[390,697],[390,844],[640,800],[844,390]]){
    const f=fitOutdoorWorld(w,h);
    for(const y of [.305,.47,.61,.72,.82]){
      const offset=outdoorCameraOffset(y,f.height,h,f.top,h-200);
      assert.ok(f.top+offset<=.001);
      assert.ok(f.top+offset+f.height>=h-.001);
    }
  }
});

test('the home spawn and every direct drop stay inside the new rectangular floor',()=>{
 assert.ok(isWorldGround(mapStart('home')));
 for(let x=0;x<=1;x+=.1)for(let y=0;y<=1;y+=.1)assert.deepEqual(worldGroundPoint({x,y}),mapGroundPoint('home',{x,y}));
});
