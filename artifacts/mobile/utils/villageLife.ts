import { mapGroundPoint, type WorldMapId } from "./worldMaps";
export type Point = { x: number; y: number };
export type VillageExperience = "bath" | "wheel" | "smoke";
export const VILLAGE_LINKS: Record<WorldMapId, WorldMapId[]> = {
  home: ["market", "forest"],
  market: ["home", "village", "lake", "ramen", "bowling", "tobacco"],
  tobacco: ["market"],
  bowling: ["market"],
  ramen: ["market"],
  forest: ["home", "onsen"],
  onsen: ["forest", "village"],
  village: ["market", "onsen"],
  lake: ["market"],
};
// A gate is both the visible sign and the actual walking trigger.
const GATES: Record<WorldMapId, Point[]> = {
  home: [{x:.51,y:.785},{x:.50,y:.435}],
  market: [{x:.24,y:.72},{x:.42,y:.49},{x:.60,y:.49},{x:.77,y:.56},{x:.53,y:.80},{x:.77,y:.72}],
  tobacco: [{x:.23,y:.67}],
  bowling: [{x:.70,y:.765}],
  ramen: [{x:.35,y:.58}],
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
  onsen:{x:.17,y:.09}, village:{x:.5,y:.09}, lake:{x:.83,y:.09},
  forest:{x:.17,y:.35}, market:{x:.5,y:.45}, ramen:{x:.83,y:.35},
  home:{x:.17,y:.70}, tobacco:{x:.83,y:.70}, bowling:{x:.5,y:.90},
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
    name: "すず",
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
    name: "こはく",
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
    name: "なぎ",
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
    id: "iroha", name: "いろは", stage: "stage4", color: "#D7A9C9", x: 0.68, y: 0.64,
    intro: "きょうのお花、いろんな色でかわいいね。どの色が好き？",
    choices: [
      { label: "むらさきが好き", reply: "わたしも。夕方の空みたいで、ほっとするね。" },
      { label: "みんなでごはんに行こう", reply: "もふもふさんのラーメン屋へ行こうよ。湯気まで、ふわふわなんだ。" },
    ],
  },
] as const;
export type VillagerId = (typeof VILLAGERS)[number]["id"];
