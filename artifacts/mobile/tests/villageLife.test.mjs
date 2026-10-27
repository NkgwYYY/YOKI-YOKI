import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as maps from "../utils/worldMaps.ts";
import { mealSample, MEAL_DURATION } from "../utils/residentMeal.ts";
import { projectEgg } from "../utils/residentVolume.ts";
const mod = { exports: {} };
new Function(
  "require",
  "module",
  "exports",
  ts.transpileModule(
    fs.readFileSync(
      new URL("../utils/villageLife.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
)(() => maps, mod, mod.exports);
const { steerStep, mapPortals, nearbyPortalIndex, VILLAGE_LINKS, VILLAGERS, MAP_COORDS } = mod.exports;
test("every destination connects back home and every gate is on walkable ground", () => {
  for (const m of maps.WORLD_MAPS.filter(m=>maps.isMapAvailable(m.id,'web'))) {
    const seen = new Set(),
      queue = [m.id];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push(...VILLAGE_LINKS[id].filter(id=>maps.isMapAvailable(id,'web')));
    }
    assert.equal(seen.size, maps.WORLD_MAPS.filter(m=>maps.isMapAvailable(m.id,'web')).length);
    for (const gate of mapPortals(m.id,true)) {
      assert.ok(maps.isMapGround(m.id, gate.point));
      assert.ok(VILLAGE_LINKS[gate.to].includes(m.id));
    }
  }
});

test('each visible gate can be reached by control movement and does not trigger at spawn',()=>{
  for(const map of maps.WORLD_MAPS){
    const portals=mapPortals(map.id),start=maps.mapStart(map.id);
    assert.equal(nearbyPortalIndex(start,portals),-1,map.id);
    assert.ok(MAP_COORDS[map.id]);
    for(const gate of portals){
      let at=start;
      for(const target of maps.mapRoute(map.id,start,gate.point)){
        for(let i=0;i<3000&&Math.hypot(at.x-target.x,(at.y-target.y)*1.5)>.004;i++){
          const dx=target.x-at.x,dy=(target.y-at.y)*1.5,length=Math.hypot(dx,dy);
          at=steerStep(map.id,at,{x:dx/length,y:dy/length},1/60);
        }
      }
      const hit=nearbyPortalIndex(at,portals);
      assert.equal(portals[hit]?.to,gate.to,`${map.id} -> ${gate.to}`);
    }
  }
  assert.equal(maps.canVisitMap('tobacco',{version:1,unlocked:[]}),true);
});
test("steering supports eight directions, normalizes diagonals, and respects water/room boundaries", () => {
  for (const m of maps.WORLD_MAPS)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      let p = maps.mapStart(m.id);
      for (let i = 0; i < 500; i++) {
        p = steerStep(m.id, p, { x: dx, y: dy }, 1 / 60);
        assert.ok(maps.isMapGround(m.id, p));
      }
    }
  const start = { x: 0.5, y: 0.6 },
    a = steerStep("market", start, { x: 1, y: 0 }, 0.02),
    b = steerStep("market", start, { x: 1, y: 1 }, 0.02);
  assert.ok(
    Math.abs(
      Math.hypot(a.x - start.x, (a.y - start.y) * 1.5) -
        Math.hypot(b.x - start.x, (b.y - start.y) * 1.5),
    ) < 1e-10,
  );
  assert.deepEqual(steerStep("market", start, { x: 0, y: 0 }, 0.02), start);
  assert.deepEqual(steerStep("market", start, { x: NaN, y: 0 }, 0.02), start);
});
test("movement speed is stable across 30, 60 and 120fps; stalled frames are bounded", () => {
  for (const fps of [30, 60, 120]) {
    let at = { x: 0.4, y: 0.6 };
    for (let i = 0; i < fps; i++)
      at = steerStep("market", at, { x: 1, y: 0 }, 1 / fps);
    assert.ok(Math.abs(at.x - 0.6) < 1e-10);
  }
  const p = steerStep("market", { x: 0.4, y: 0.6 }, { x: 1, y: 0 }, 20);
  assert.ok(p.x <= 0.411);
});
test("meal visibly takes exactly three portions before swallow and satisfaction", () => {
  let taken = 0,
    opens = 0,
    chews = 0;
  for (let i = 0; i <= 1000; i++) {
    const m = mealSample(i / 1000);
    assert.ok(m.taken >= taken && m.taken <= 3);
    taken = m.taken;
    opens += m.open > 0.2;
    chews += m.chew > 0.2;
    for (const n of [m.reach, m.open, m.chew, m.swallow, m.flight])
      assert.ok(n >= 0 && n <= 1.00001);
  }
  assert.equal(taken, 3);
  assert.ok(opens > 10 && chews > 10);
  assert.ok(mealSample(0.78).swallow > 0);
  assert.equal(mealSample(1).happy, true);
  assert.equal(mealSample(1).morsel, 0);
  assert.ok(MEAL_DURATION > 5000);
});
test("mouth and cheeks deform on the 3D surface and disappear on the back", () => {
  const rest = projectEgg(0, 0, 0),
    bite = projectEgg(0, 0, 0, 0, true, false, 1, 1);
  assert.ok(bite.openMouth);
  assert.equal(rest.openMouth, "");
  assert.notEqual(rest.leftCheek, bite.leftCheek);
  assert.equal(rest.body, bite.body);
  assert.equal(projectEgg(0, Math.PI, 0, 0, true, false, 1, 1).openMouth, "");
});

test("ramen is reachable at level one and residents use all four approved forms", () => {
  assert.equal(maps.canVisitMap('ramen',{version:1,unlocked:[]}), true);
  assert.ok(VILLAGE_LINKS.market.includes('ramen'));
  assert.deepEqual([...new Set(VILLAGERS.map(v => v.stage))].sort(), ['egg','odango','stage3','stage4']);
  assert.ok(maps.isMapGround('ramen', maps.mapStart('ramen')));
});


test('walking away from a nearby gate does not retrigger travel',()=>{
  const gates=mapPortals('home');
  const onsen=gates.find(g=>g.to==='onsen').point;
  const near={x:onsen.x-.01,y:onsen.y};
  assert.equal(nearbyPortalIndex(near,gates,{x:-1,y:0}),-1);
  assert.notEqual(nearbyPortalIndex(near,gates,{x:1,y:0}),-1);
});

test('the direct onsen exit stays outside the home rug and resting area',()=>{
 const onsen=mapPortals('home').find(g=>g.to==='onsen').point;
 assert.ok(onsen.x>.62&&onsen.y>.67);
 assert.ok(maps.isMapGround('home',onsen));
});

test('iOS cannot reach the tobacco scene from its map, walking gates, or an old route', () => {
  assert.equal(maps.isMapAvailable('tobacco','ios'),false);
  assert.equal(maps.canVisitMap('tobacco',{version:1,unlocked:[]},true,'ios'),false);
  assert.equal(maps.initialReleasedMap('tobacco','ios'),'home');
  assert.equal(maps.initialReleasedMap('workshop','ios'),'workshop');
  for(const map of maps.WORLD_MAPS.filter(m=>maps.isMapAvailable(m.id,'ios'))){
    assert.ok(mapPortals(map.id,true,'ios').every(g=>g.to!=='tobacco'));
  }
  assert.ok(mapPortals('market',true,'ios').some(g=>g.to==='workshop'));
  assert.ok(mapPortals('market',true,'web').some(g=>g.to==='tobacco'));
});
