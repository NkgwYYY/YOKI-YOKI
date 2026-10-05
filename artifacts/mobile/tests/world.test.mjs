import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorldTime } from '../utils/worldTime.ts';
import { fitWorld, safeWorldPoint, WORLD_PLACES, worldResidentSteps } from '../utils/worldGeometry.ts';

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
