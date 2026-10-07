import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorldTime } from '../utils/worldTime.ts';
import { fitWorld, safeWorldPoint, WORLD_PLACES, worldResidentSteps, worldGroundPoint, isWorldGround, WORLD_TRAIL, worldWalkingRoute, worldResidentScale, worldCameraOffset } from '../utils/worldGeometry.ts';

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
    const f=fitWorld(w,h);
    for(const p of [...Object.values(WORLD_PLACES),{x:.268,y:.454},{x:.765,y:.602},{x:.53,y:.275}]) {
      const x=f.left+f.width*p.x,y=f.top+f.height*p.y;
      assert.ok(x>=24 && x<=w-24 && y>=24 && y<h-72,`${w}x${h}: ${x},${y}`);
    }
  }
  assert.equal(fitWorld(0,0).width,0);
});
test('drops stay on clear floor; bed exit walks around the foot before a meal', () => {
  for(const p of [{x:-1,y:-1},{x:3,y:3},WORLD_PLACES.bed]) {
    const drop=safeWorldPoint(p);
    assert.ok(drop.x>=.34 && drop.x<=.72 && drop.y>=.43 && drop.y<=.71);
    if(drop.y<.51) assert.ok(drop.x>=.40 && drop.x<=.62);
  }
  const steps=worldResidentSteps('meal',WORLD_PLACES.bed,false);
  assert.ok(steps[0].point.x<WORLD_PLACES.bed.x && steps[0].point.y>WORLD_PLACES.bed.y);
  assert.deepEqual(steps.at(-2).point,WORLD_PLACES.meal);
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

test('exploration routes between room, terrace and path stay on connected clear ground', () => {
  const points = [...Object.values(WORLD_TRAIL).map(p => p.point), {x: .40, y: .48}, {x: .65, y: .64}, {x: .44, y: .78}];
  for (const from of points) for (const to of points) {
    let at = from;
    for (const next of worldWalkingRoute(from, to)) {
      for (let t = 0; t <= 1; t += .025) assert.ok(isWorldGround({x: at.x + (next.x - at.x) * t, y: at.y + (next.y - at.y) * t}));
      at = next;
    }
    assert.deepEqual(at, to);
  }
  assert.deepEqual(worldWalkingRoute(WORLD_PLACES.bed, WORLD_TRAIL.garden.point)[0], {x: .60, y: .435});
  for (const point of [{x:-2,y:3}, {x:5,y:0}, {x:.2,y:.7}, {x:.8,y:.6}]) assert.ok(isWorldGround(worldGroundPoint(point)));
  assert.equal(isWorldGround({x:.2,y:.7}), false, 'stream cannot be selected as ground');
  assert.equal(isWorldGround(WORLD_PLACES.bed), false, 'mattress requires the explicit rest action');
});

test('perspective is bounded and camera keeps the path clear of the bottom controls', () => {
  assert.equal(worldResidentScale(-1), .82);
  assert.equal(worldResidentScale(2), 1.20);
  assert.ok(worldResidentScale(.375) < worldResidentScale(.755));
  for (const [w,h] of [[320,568],[390,844],[820,1180],[844,390]]) {
    const f = fitWorld(w,h);
    for (const stop of Object.values(WORLD_TRAIL)) {
      const y = f.top + f.height * stop.point.y + worldCameraOffset(stop.point.y,f.height,h,f.top);
      assert.ok(y > 120 && y < h - 130, `${w}x${h}: destination remains visible at ${y}`);
    }
  }
});
