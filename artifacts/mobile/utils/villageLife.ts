import { mapGroundPoint, type WorldMapId } from "./worldMaps";
export type Point = { x: number; y: number };
export type VillageExperience = "bath" | "wheel" | "smoke";
export const VILLAGE_LINKS: Record<WorldMapId, WorldMapId[]> = {
  home: ["market", "forest"],
  market: ["home", "village", "lake", "ramen", "bowling", "tobacco", "homewares", "diner", "workshop", "fortune"],
  fortune: ["market"],
  tobacco: ["market"],
  homewares: ["market"],
  diner: ["market"],
  workshop: ["market"],
  bowling: ["market"],
  ramen: ["market"],
  forest: ["home", "onsen"],
  onsen: ["forest", "village"],
  village: ["market", "onsen"],
  lake: ["market"],
};
// A gate is both the visible sign and the actual walking trigger.
const GATES: Record<WorldMapId, Point[]> = {
  home: [{x:.51,y:.785},{x:.655,y:.70}],
  market: [{x:.25,y:.78},{x:.38,y:.47},{x:.62,y:.47},{x:.76,y:.54},{x:.50,y:.80},{x:.76,y:.75},{x:.24,y:.53},{x:.76,y:.64},{x:.25,y:.65},{x:.50,y:.46}],
  fortune: [{x:.50,y:.80}],
  tobacco: [{x:.50,y:.80}],
  homewares: [{x:.50,y:.80}],
  diner: [{x:.50,y:.80}],
  workshop: [{x:.50,y:.80}],
  bowling: [{x:.70,y:.765}],
  ramen: [{x:.50,y:.69}],
  forest: [{x:.51,y:.80},{x:.51,y:.445}],
  onsen: [{x:.42,y:.80},{x:.76,y:.60}],
  village: [{x:.50,y:.80},{x:.23,y:.60}],
  lake: [{x:.52,y:.81}],
};
export function mapPortals(map: WorldMapId) {
  return VILLAGE_LINKS[map].map((to, i) => ({to, point:mapGroundPoint(map,GATES[map][i])}));
}
export function nearbyPortalIndex(point: Point, portals: {point:Point}[], direction?:Point) {
  'worklet';
  return portals.findIndex(portal=>Math.hypot(point.x-portal.point.x,(point.y-portal.point.y)*1.5)<.038&&(!direction||(portal.point.x-point.x)*direction.x+(portal.point.y-point.y)*direction.y>=0));
}
export const MAP_COORDS: Record<WorldMapId, Point> = {
 fortune:{x:.82,y:.25},onsen:{x:.19,y:.10},forest:{x:.21,y:.29},village:{x:.55,y:.22},lake:{x:.82,y:.10},
 homewares:{x:.21,y:.47},market:{x:.51,y:.46},ramen:{x:.81,y:.40},diner:{x:.73,y:.59},
 home:{x:.21,y:.71},workshop:{x:.50,y:.69},bowling:{x:.41,y:.89},tobacco:{x:.82,y:.85},
};
/** Fixed scene coordinates keep velocity stable through camera zoom and viewport changes. */
export function steerStep(
  map: WorldMapId,
  at: Point,
  input: Point,
  dt: number,
  aspect = 1.5,
): Point {
  "worklet";
  const length = Math.hypot(input.x, input.y);
  if (!length || !Number.isFinite(length)) return at;
  const speed = (0.2 * Math.min(0.05, Math.max(0, dt))) / Math.max(1, length);
  return mapGroundPoint(map, {
    x: at.x + input.x * speed,
    y: at.y + (input.y * speed) / aspect,
  });
}
export const VILLAGERS = [
  {
    id: "suzu",
    stage: "egg",
    color: "#B6CBB5",
    x: 0.32,
    y: 0.52,
    intro: "おかえり。ここは、急がなくていい村だよ。",
    choices: [
      {
        label: "今日はどんな日？",
        reply: "窓を開けて、風の音を聞いてたの。それだけでも、いい朝だったよ。",
      },
      {
        label: "少し疲れたな",
        reply: "そっか。話さなくても大丈夫。ここで一緒に、ぼーっとしよう。",
      },
    ],
  },
  {
    id: "kohaku",
    stage: "odango",
    color: "#DCC094",
    x: 0.7,
    y: 0.55,
    intro: "こんにちは。さっき、いい形の雲を見つけたんだ。",
    choices: [
      {
        label: "どんな雲？",
        reply: "ふかふかのパンみたいな雲。見てたら、おなかがすいちゃった。",
      },
      {
        label: "また遊びに来るね",
        reply: "うん。来たいときに、いつでも。今日は会えてうれしかったよ。",
      },
    ],
  },
  {
    id: "nagi",
    stage: "stage3",
    color: "#B6A7D0",
    x: 0.36,
    y: 0.61,
    intro: "今日は、どこまでおさんぽする？",
    choices: [
      {
        label: "温泉が気になる",
        reply: "森の奥のお湯、ぽかぽかだよ。休むのも、大事な予定だね。",
      },
      {
        label: "今日はここで休む",
        reply: "じゃあ、となりにいるね。何もしない時間も、一緒だといいね。",
      },
    ],
  },
  {
    id: "iroha", stage: "stage4", color: "#D7A9C9", x: 0.68, y: 0.64,
    intro: "きょうのお花、いろんな色でかわいいね。どの色が好き？",
    choices: [
      { label: "むらさきが好き", reply: "わたしも。夕方の空みたいで、ほっとするね。" },
      { label: "みんなでごはんに行こう", reply: "もふもふさんのラーメン屋へ行こうよ。湯気まで、ふわふわなんだ。" },
    ],
  },
] as const;
export type VillagerId = (typeof VILLAGERS)[number]["id"];
