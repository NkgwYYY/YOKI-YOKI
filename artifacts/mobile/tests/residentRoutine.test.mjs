import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResidentSteps, chooseResidentActivity, residentSteps, RESIDENT_PLACES } from '../utils/residentRoutine.ts';
import { safeRoomPoint } from '../utils/roomGeometry.ts';

test('successful meals take priority over resting; completed meals do not repeat', () => {
  assert.equal(chooseResidentActivity({meal: 1, rest: 1}, {meal: 0, rest: 0}, true, 0), 'meal');
  assert.equal(chooseResidentActivity({meal: 1, rest: 1}, {meal: 1, rest: 0}, false, 0), 'bed');
  assert.equal(chooseResidentActivity({meal: 1, rest: 1}, {meal: 1, rest: 1}, false, 0), 'window');
  assert.equal(chooseResidentActivity({meal: 0, rest: 0}, {meal: 0, rest: 0}, true, 3), 'bed');
});
test('bed-to-meal travel leaves the mattress before entering the clear aisle', () => {
  const steps = buildResidentSteps('meal', RESIDENT_PLACES.bed);
  assert.deepEqual(steps[0].point, {x: 0.60, y: 0.47});
  assert.deepEqual(steps[1].point, {x: 0.50, y: 0.55});
  assert.deepEqual(steps.at(-2).point, RESIDENT_PLACES.meal);
  assert.equal(steps.at(-1).pose, 'eating');
  for (const step of steps.filter(s => s.point?.y >= 0.54)) {
    assert.deepEqual(safeRoomPoint(step.point), step.point);
  }
});
test('resting at the bed stays still rather than pacing away and back', () => {
  assert.deepEqual(buildResidentSteps('bed', RESIDENT_PLACES.bed), [{pose: 'sleeping', duration: 12000}]);
});
test('reduced motion keeps expressions and meal/rest timing without travel', () => {
  for (const activity of ['meal', 'bed', 'window', 'idle']) {
    const steps = residentSteps(activity, RESIDENT_PLACES.idle, true);
    assert.equal(steps.length, 1);
    assert.equal(steps[0].point, undefined);
    assert.notEqual(steps[0].pose, 'walking');
  }
});
