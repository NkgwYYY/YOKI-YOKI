import assert from 'node:assert/strict';
import test from 'node:test';
import { fitRoom, safeRoomPoint, ROOM_STOPS } from '../utils/roomGeometry.ts';
import { mergeEncounterHistory } from '../utils/mergeEncounters.ts';
import { resolveLightEnergyState } from '../utils/lightEnergy.ts';

test('room and hotspots remain inside compact, tall and landscape viewports', () => {
  for (const [width,height] of [[320,375],[390,620],[430,730],[844,210]]) {
    const room=fitRoom(width,height);
    assert.ok(room.width<=width && room.height<=height);
    assert.equal(room.height,room.width*1.5);
    for (const point of ROOM_STOPS) assert.deepEqual(safeRoomPoint(point),point);
  }
});
test('drops cannot leave the room or land inside foreground furniture', () => {
  assert.deepEqual(safeRoomPoint({x:-10,y:-3}),{x:0.22,y:0.54});
  assert.deepEqual(safeRoomPoint({x:0.24,y:0.83}),{x:0.52,y:0.83});
  assert.deepEqual(safeRoomPoint({x:8,y:9}),{x:0.52,y:0.86});
});
test('guest synchronization retains discovered characters and earliest meeting dates', () => {
  const cloud={list:[{charKey:'egg',metDate:'2026-09-02'},{charKey:'odango',metDate:'2026-09-03'}]};
  const local={list:[{charKey:'egg',metDate:'2026-09-01'},{charKey:'happa',metDate:'2026-09-04'}]};
  const merged=mergeEncounterHistory(cloud,local);
  assert.equal(merged.list.length,3);
  assert.equal(merged.list[0].metDate,'2026-09-01');
  assert.equal(cloud.list[0].metDate,'2026-09-02');
  assert.deepEqual(mergeEncounterHistory(null,local),local);
});
test('legacy energy balance survives day rollover without absence penalties', () => {
  const state=resolveLightEnergyState({date:'2026-09-01',storedEnergy:42,totalEnergy:100,genki:90,lightPower:70},'2026-09-28');
  assert.equal(state.storedEnergy,42);
  assert.equal(state.totalEnergy,100);
  assert.equal(state.flags.mood,false);
});

test('equipped glasses retain the Character Lab offset instead of sitting above the head', async () => {
  const { roomWearableFrame } = await import('../utils/roomWearable.ts');
  const frame=roomWearableFrame('catalog-wear-round-glasses','egg',100,{x:0,y:0,scale:1});
  assert.ok(frame.top>0 && frame.top<50);
  const shifted=roomWearableFrame('catalog-wear-round-glasses','egg',100,{x:51.2,y:0,scale:1});
  assert.ok(Math.abs(shifted.left-frame.left-10)<0.001);
});
