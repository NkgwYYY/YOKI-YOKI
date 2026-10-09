import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyVillageVisits, visitorsAt, visitorReply, VISITOR_SPOTS} from '../utils/villageVisitors.ts';
import {isMapGround, mapStart} from '../utils/worldMaps.ts';

test('a date has one stable itinerary, with no duplicate villagers or occupied spots', () => {
  for (let day = 0; day < 90; day++) {
    const visits = dailyVillageVisits(day);
    assert.deepEqual(dailyVillageVisits(day), visits);
    assert.equal(new Set(visits.map(v => v.visitor.id)).size, visits.length);
    assert.equal(new Set(visits.map(v => `${v.place}:${v.point.x}:${v.point.y}`)).size, visits.length);
    for (const place of Object.keys(VISITOR_SPOTS)) {
      assert.deepEqual(visitorsAt(place, day), visits.filter(v => v.place === place));
      assert.ok(visitorsAt(place, day).length <= 2);
    }
  }
});
test('every venue has visitors and quiet days, with egg and fluffy guests across dates', () => {
  for (const place of Object.keys(VISITOR_SPOTS)) {
    const days = Array.from({length: 90}, (_, day) => visitorsAt(place, day));
    assert.ok(days.some(v => v.length === 0), place);
    assert.ok(days.some(v => v.some(n => n.visitor.stage === 'egg')), place);
    assert.ok(days.some(v => v.some(n => n.visitor.stage === 'odango')), place);
  }
  for (const map of ['home', 'fortune', 'tobacco', 'village']) assert.deepEqual(visitorsAt(map, 15), []);
});
test('visitors stand on usable ground away from the player spawn, and replies rotate', () => {
  for (let day = 0; day < 90; day++) for (const visit of dailyVillageVisits(day)) {
    assert.ok(isMapGround(visit.place, visit.point), visit.place);
    const spawn = mapStart(visit.place);
    assert.ok(Math.hypot(visit.point.x - spawn.x, 1.5 * (visit.point.y - spawn.y)) > .12);
    const replies = [0, 1, 2].map(turn => visitorReply(visit, turn));
    assert.equal(new Set(replies).size, 3);
    assert.equal(visitorReply(visit, 3), replies[0]);
    if (visit.place === 'ramen') for (const reply of replies) assert.match(reply, /ラーメン/);
  }
});
