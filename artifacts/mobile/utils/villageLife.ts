import { mapGroundPoint, type WorldMapId } from "./worldMaps";
export type Point = { x: number; y: number };
export type VillageExperience = "bath" | "wheel";
export const VILLAGE_LINKS: Record<WorldMapId, WorldMapId[]> = {
  home: ["market", "forest"],
  market: ["home", "village", "lake", "ramen"],
  ramen: ["market"],
  forest: ["home", "onsen"],
  onsen: ["forest", "village"],
  village: ["market", "onsen"],
  lake: ["market"],
};
export function mapPortals(map: WorldMapId) {
  return VILLAGE_LINKS[map].map((to, i) => ({
    to,
    point: mapGroundPoint(
      map,
      map === "home"
        ? { x: i ? 0.62 : 0.46, y: 0.755 }
        : {
            // Keep the return sign to the right of the fixed left-thumb pad.
            x: i === 0 ? 0.43 : i === 1 ? 0.73 : i === 2 ? 0.5 : 0.73,
            y: i === 3 ? 0.53 : i === 2 ? 0.77 : 0.69,
          },
    ),
  }));
}
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
