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
const { steerStep, mapPortals, VILLAGE_LINKS, VILLAGERS } = mod.exports;
test("every destination connects back home and every gate is on walkable ground", () => {
  for (const m of maps.WORLD_MAPS) {
    const seen = new Set(),
      queue = [m.id];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push(...VILLAGE_LINKS[id]);
    }
    assert.equal(seen.size, maps.WORLD_MAPS.length);
    for (const gate of mapPortals(m.id)) {
      assert.ok(maps.isMapGround(m.id, gate.point));
      assert.ok(VILLAGE_LINKS[gate.to].includes(m.id));
    }
  }
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
  assert.equal(maps.canVisitMap('ramen', 1), true);
  assert.ok(VILLAGE_LINKS.market.includes('ramen'));
  assert.deepEqual([...new Set(VILLAGERS.map(v => v.stage))].sort(), ['egg','odango','stage3','stage4']);
  assert.ok(maps.isMapGround('ramen', maps.mapStart('ramen')));
});
