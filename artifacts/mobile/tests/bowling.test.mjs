import test from "node:test";
import assert from "node:assert/strict";
import {
  simulateBowling,
  prepareBowlingPlay,
  readBowlingState,
  bowlingPlayedToday,
  BOWLING_KEY,
  groundRollStep,
  canStartWorldBowling,
  dailyBowlingMission,
  missionPinPositions,
  BOWLING_MISSIONS,
} from "../utils/bowling.ts";
import { createRecoverableStorage } from "../utils/recoverableStorage.ts";
import fs from "node:fs";
import ts from "typescript";
const foodModule = { exports: {} };
new Function(
  "require",
  "module",
  "exports",
  ts.transpileModule(
    fs.readFileSync(new URL("../data/foodItems.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
)(() => ({ rarityPalette: {} }), foodModule, foodModule.exports);
const { foodsForVenue, canServeFood } = foodModule.exports;
const feedKey = "@mentore/feed_state_v1";
const feed = {
  points: 23,
  satietyAtFeed: 42,
  lastFeedTime: "2026-10-08T01:00:00Z",
};
const today = "2026-10-08",
  input = { aim: 0, power: 0.8 };
const worldShot=(vx=0,vy=-.9)=>({...input,world:{x:.505,y:.49,vx,vy,aspect:1.5,radius:.045,layout:'garden'}});
const longShot=(vx=.2,vy=-1.1)=>({...input,world:{x:.455,y:.715,vx,vy,aspect:1.5,radius:.045,layout:'garden-long'}});
const missionShot=(mission,vx=0,vy=-.55)=>({...longShot(vx,vy),rulesVersion:2,mission});
test('missions change each calendar day, stay stable on reload, and use distinct target racks',()=>{
  const dates=['2026-10-09','2026-10-10','2026-10-11'];
  assert.equal(new Set(dates.map(dailyBowlingMission)).size,3);
  for(const date of dates){
    const id=dailyBowlingMission(date),pins=missionPinPositions(id).filter(p=>!p.hidden);
    assert.equal(dailyBowlingMission(date),id);
    assert.equal(pins.length,BOWLING_MISSIONS[id].pins);
    if(id==='split')assert.ok(Math.abs(pins[0].x-pins[1].x)>.06);
  }
  assert.notEqual(dailyBowlingMission('2026-12-31'),dailyBowlingMission('2027-01-01'));
});
test('larger mission pins and assistance make a modest forward swipe reachable, without rescuing every direction',()=>{
  assert.equal(simulateBowling(longShot(0,-.55)).pins,0);
  for(const mission of ['strike','split','spare']){
    const result=simulateBowling(missionShot(mission));
    assert.equal(result.pins,BOWLING_MISSIONS[mission].pins);
    assert.equal(result.missionComplete,true);
    assert.equal(result.earned,result.pins*5+BOWLING_MISSIONS[mission].bonus);
    assert.equal(result.pins,result.frames.at(-1).pins.filter(p=>!p.hidden&&p.down).length);
    assert.equal(simulateBowling(missionShot(mission,-.6,-.55)).pins,0);
    assert.equal(simulateBowling(missionShot(mission,0,.55)).pins,0);
  }
  const partial=simulateBowling(missionShot('split',.3,-.8));
  assert.equal(partial.pins,1);assert.equal(partial.earned,5);assert.equal(partial.missionComplete,false);
});
test('the stored date chooses the mission and reload replays exactly the paid result',()=>{
  for(const date of ['2026-10-09','2026-10-10','2026-10-11']){
    const first=prepareBowlingPlay({[feedKey]:JSON.stringify(feed)},'daily-'+date,missionShot('strike'),date,feed);
    const values=Object.fromEntries(first.entries),receipt=readBowlingState(JSON.parse(values[BOWLING_KEY])).plays[date];
    assert.equal(receipt.mission,dailyBowlingMission(date));
    assert.equal(receipt.rulesVersion,2);assert.equal(receipt.missionComplete,true);
    assert.equal(receipt.earned,simulateBowling(receipt).earned);
    assert.equal(JSON.parse(values[feedKey]).points,feed.points+receipt.earned);
    assert.deepEqual(prepareBowlingPlay(values,receipt.id,missionShot('spare'),date,feed).entries,[]);
    assert.equal(prepareBowlingPlay(values,'second',missionShot('spare'),date,feed).result.accepted,false);
  }
});
test('old long-lane receipts keep their original rules, result, wallet and used day',()=>{
  const shot=longShot(),result=simulateBowling(shot);
  const legacy={...shot,id:'legacy',date:today,pins:result.pins,earned:result.earned};
  const values={[BOWLING_KEY]:JSON.stringify({plays:{[today]:legacy}}),[feedKey]:JSON.stringify({...feed,points:73})};
  assert.deepEqual(readBowlingState(JSON.parse(values[BOWLING_KEY])).plays[today],legacy);
  assert.equal(simulateBowling(legacy).earned,50);
  assert.deepEqual(prepareBowlingPlay(values,'again',missionShot('split'),today,feed).entries,[]);
  const invalid={...legacy,rulesVersion:2,mission:dailyBowlingMission(today),missionComplete:true,earned:999};
  assert.throws(()=>readBowlingState({plays:{[today]:invalid}}));
});
test('mission bonus is credited once across interrupted writes, retries and simultaneous calls',async()=>{
  for(const failAt of [1,2,3,4]){
    const f=fixture(failAt),shot=missionShot('strike');
    await assert.rejects(play(f.open(),'mission',today,shot));
    const reloaded=f.open();await reloaded.recover();
    const [retry,other]=await Promise.all([play(reloaded,'mission',today,shot),play(reloaded,'new-id',today,shot)]);
    assert.equal(retry.receipt.missionComplete,true);assert.equal(other.accepted,false);
    assert.equal(JSON.parse(f.data.get(feedKey)).points,feed.points+retry.receipt.earned);
    assert.equal(Object.keys(JSON.parse(f.data.get(BOWLING_KEY)).plays).length,1);
  }
});
test('long lane needs both aim and speed; a weak throw stops short and an off-angle throw gutters',()=>{
  const old=simulateBowling(worldShot()),long=simulateBowling(longShot());
  const distance=frame=>Math.hypot(frame.x-frame.pins[0].x,(frame.y-frame.pins[0].y)*1.5);
  assert.ok(distance(long.frames[0])>distance(old.frames[0])*2.5);
  assert.equal(long.pins,10);
  assert.equal(simulateBowling(longShot(.11,-.6)).pins,0);
  assert.equal(simulateBowling(longShot(0,-1.1)).pins,0);
  assert.equal(simulateBowling(longShot(.45,-1.1)).pins,0);
  const partial=simulateBowling(longShot(.15,-.85));
  assert.ok(partial.pins>0&&partial.pins<10);
  for(const result of [long,partial]){
    assert.equal(result.earned,result.frames.at(-1).pins.filter(p=>p.down).length*5);
  }
});
test('walking or carrying closer to the pins cannot bypass the long-lane start line or spend a throw',()=>{
  for(const point of [{x:.55,y:.36},{x:.5,y:.64},{x:.8,y:.72}]){
    assert.equal(canStartWorldBowling(point),false);
    assert.throws(()=>prepareBowlingPlay({[feedKey]:JSON.stringify(feed)},'too-close',{...longShot(),world:{...longShot().world,...point}},today,feed));
  }
  assert.equal(canStartWorldBowling(longShot().world),true);
});
test('long-lane receipts remain replayable and keep the same daily grant across reload',()=>{
  const first=prepareBowlingPlay({[feedKey]:JSON.stringify(feed)},'long',longShot(),today,feed);
  const values=Object.fromEntries(first.entries),saved=readBowlingState(JSON.parse(values[BOWLING_KEY])).plays[today];
  assert.equal(saved.world.layout,'garden-long');
  assert.equal(saved.pins,simulateBowling(saved).pins);
  assert.equal(saved.earned,simulateBowling(saved).earned);
  assert.equal(prepareBowlingPlay(values,'long-again',longShot(),today,feed).result.accepted,false);
  assert.deepEqual(prepareBowlingPlay(values,'long',longShot(),today,feed).entries,[]);
});
test('world flick keeps the home trajectory until physical pin contact',()=>{
  const shot=worldShot(),result=simulateBowling(shot);
  let body=shot.world;
  for(let i=1;i<=8;i++){
    body=groundRollStep(body,1/60,1.5,{minX:.42,maxX:.66,minY:.305,maxY:.79});
    assert.equal(result.frames[i].x,body.x);assert.equal(result.frames[i].y,body.y);
  }
  assert.equal(result.pins,10);
  for(const shot of [worldShot(.7),worldShot(0,.6),worldShot(0,-.2)])assert.equal(simulateBowling(shot).pins,0);
  for(const vx of [-.7,-.3,0,.1,.2,.3,.7]){
    const result=simulateBowling(worldShot(vx));
    assert.equal(result.pins,result.frames.at(-1).pins.filter(p=>p.down).length);
    assert.equal(result.earned,result.pins*5);
    assert.deepEqual(simulateBowling(worldShot(vx)),result);
  }
});
test('world receipts survive reload, preserve the actual flick, and share the existing daily limit',()=>{
  const first=prepareBowlingPlay({[feedKey]:JSON.stringify(feed)},'world',worldShot(),today,feed);
  const values=Object.fromEntries(first.entries);
  const restored=readBowlingState(JSON.parse(values[BOWLING_KEY]));
  assert.deepEqual(restored.plays[today].world,worldShot().world);
  const again=prepareBowlingPlay(values,'new-flick',worldShot(.7),today,feed);
  assert.equal(again.result.accepted,false);assert.deepEqual(again.entries,[]);
  assert.equal(again.result.feed.points,feed.points+50);
  for(const invalid of [{vx:Infinity},{y:-1},{radius:1},{aspect:0}])assert.throws(()=>simulateBowling({...worldShot(),world:{...worldShot().world,...invalid}}));
});
function fixture(failAt = Infinity) {
  const data = new Map([[feedKey, JSON.stringify(feed)]]);
  let writes = 0;
  const storage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      if (++writes === failAt) throw Error("disk full");
      data.set(k, v);
    },
    removeItem: async (k) => {
      if (++writes === failAt) throw Error("disk full");
      data.delete(k);
    },
  };
  return {
    data,
    open: () =>
      createRecoverableStorage(storage, "bowling-journal", [
        BOWLING_KEY,
        feedKey,
      ]),
  };
}
const play = (store, id = "first", date = today, shot = input) =>
  store.transaction((values) =>
    prepareBowlingPlay(values, id, shot, date, feed),
  );
test("visible collision results exactly match reward, with strike, partial hit and gutter", () => {
  for (const aim of [-1, -0.5, 0, 0.5, 1]) {
    const r = simulateBowling({ aim, power: 0.8 });
    assert.equal(r.pins, r.frames.at(-1).pins.filter((p) => p.down).length);
    assert.equal(r.earned, r.pins * 5);
    assert.equal(r.frames[0].pins.filter((p) => p.down).length, 0);
    assert.deepEqual(r, simulateBowling({ aim, power: 0.8 }));
  }
  assert.equal(simulateBowling(input).pins, 10);
  assert.equal(simulateBowling({ aim: 1, power: 0.8 }).pins, 0);
  assert.ok(
    simulateBowling({ aim: 0.5, power: 0.8 }).pins > 0 &&
      simulateBowling({ aim: 0.5, power: 0.8 }).pins < 10,
  );
});
test("double click, different request and reload cannot add another reward today", async () => {
  const f = fixture(),
    store = f.open();
  const [a, b] = await Promise.all([play(store), play(store, "second")]);
  assert.equal(a.newlyGranted, true);
  assert.equal(b.accepted, false);
  const retry = await play(f.open());
  assert.equal(retry.accepted, true);
  assert.equal(retry.newlyGranted, false);
  assert.deepEqual(JSON.parse(f.data.get(feedKey)), { ...feed, points: 73 });
  assert.equal((await play(f.open(), "third")).accepted, false);
});
for (const failAt of [1, 2, 3, 4])
  test(`interrupted bowling write ${failAt} recovers the same result exactly once`, async () => {
    const f = fixture(failAt);
    await assert.rejects(play(f.open()), /disk full/);
    const reloaded = f.open();
    await reloaded.recover();
    const r = await play(reloaded);
    assert.equal(r.receipt.earned, 50);
    assert.equal(JSON.parse(f.data.get(feedKey)).points, 73);
    assert.equal(
      Object.keys(JSON.parse(f.data.get(BOWLING_KEY)).plays).length,
      1,
    );
    assert.equal((await play(reloaded)).newlyGranted, false);
    assert.equal(f.data.has("bowling-journal"), false);
  });
test("a gutter consumes today; next calendar day unlocks; rolling the clock back does not", async () => {
  const f = fixture(),
    store = f.open();
  assert.equal(
    (await play(store, "gutter", today, { aim: 1, power: 0.8 })).receipt.earned,
    0,
  );
  assert.equal((await play(store, "again")).accepted, false);
  assert.equal(
    (await play(store, "tomorrow", "2026-10-09")).newlyGranted,
    true,
  );
  assert.equal((await play(store, "clock-back", today)).accepted, false);
  assert.equal(JSON.parse(f.data.get(feedKey)).points, 73);
  assert.equal(
    bowlingPlayedToday(
      readBowlingState(JSON.parse(f.data.get(BOWLING_KEY))),
      today,
    ),
    true,
  );
});
test("malformed input or balance cannot create a reward", () => {
  for (const bad of [
    { aim: NaN, power: 0.8 },
    { aim: 0, power: Infinity },
    { aim: 2, power: 0.8 },
    { aim: 0, power: 0 },
  ])
    assert.throws(() => simulateBowling(bad));
  assert.throws(() =>
    prepareBowlingPlay(
      { [feedKey]: '{"points":-1}' },
      "bad",
      input,
      today,
      feed,
    ),
  );
  assert.throws(() =>
    readBowlingState({
      plays: {
        [today]: {
          id: "x",
          date: today,
          aim: 0,
          power: 0.8,
          pins: 11,
          earned: 55,
        },
      },
    }),
  );
});
test("home food is everyday food; ramen requires the restaurant; rich legacy foods cannot be served", () => {
  assert.deepEqual(
    foodsForVenue().map((f) => f.id),
    ["berry", "apple", "candy"],
  );
  assert.deepEqual(
    foodsForVenue("ramen").map((f) => f.id),
    ["ramen"],
  );
  assert.equal(canServeFood("ramen", "home"), false);
  assert.equal(canServeFood("ramen", "ramen"), true);
  for (const id of ["cake", "special"])
    for (const venue of ["home", "ramen"])
      assert.equal(canServeFood(id, venue), false);
});
test("independent browser stores share a Web Lock and grant only one daily reward", async () => {
  const old = Object.getOwnPropertyDescriptor(navigator, "locks");
  let queue = Promise.resolve();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: (_key, work) => {
        const next = queue.then(work, work);
        queue = next.catch(() => {});
        return next;
      },
    },
  });
  try {
    const f = fixture();
    const results = await Promise.all([
      play(f.open(), "tab-a"),
      play(f.open(), "tab-b"),
    ]);
    assert.equal(results.filter((r) => r.newlyGranted).length, 1);
    assert.equal(JSON.parse(f.data.get(feedKey)).points, 73);
  } finally {
    if (old) Object.defineProperty(navigator, "locks", old);
    else delete navigator.locks;
  }
});
