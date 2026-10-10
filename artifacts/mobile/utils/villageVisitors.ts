import type {MascotStage} from './mascotUtils';
import type {WorldMapId} from './worldMaps';

// These villagers live elsewhere; the four neighbours in the village stay at home.
export const VISITORS: ReadonlyArray<{id: string; stage: MascotStage; color: string}> = [
  {id: 'maru', stage: 'egg', color: '#C18F6B'},
  {id: 'komugi', stage: 'odango', color: '#DEB75F'},
  {id: 'nico', stage: 'egg', color: '#D99AB1'},
  {id: 'moka', stage: 'odango', color: '#7AB7B2'},
  {id: 'futaba', stage: 'stage3', color: '#D6AF6D'},
  {id: 'koharu', stage: 'stage4', color: '#B4A0D3'},
  {id: 'tamaki', stage: 'egg', color: '#98AECF'},
  {id: 'fuwa', stage: 'odango', color: '#AFC7A2'},
];
export const VISITOR_SPOTS = {
  bank: [{x:.70,y:.60}],
  ramen: [{x: .64, y: .52}, {x: .36, y: .645}],
  diner: [{x: .30, y: .61}, {x: .71, y: .67}],
  homewares: [{x: .71, y: .62}, {x: .29, y: .69}],
  workshop: [{x: .30, y: .62}, {x: .71, y: .68}],
  bowling: [{x: .31, y: .49}],
  forest: [{x: .38, y: .63}],
  lake: [{x: .29, y: .66}],
  onsen: [{x: .69, y: .71}],
  market: [{x: .68, y: .67}],
} as const;
export type VisitorPlace = keyof typeof VISITOR_SPOTS;
const CHAT: Record<VisitorPlace, readonly string[]> = {
  bank: ['新しい家具のために、少しずつ預けてるんだ。通帳を見るの、ちょっと楽しみ。', '全部は預けずに、おやつ代は手元に残しておこうかな。', '今日は銀行の調子、どうかな。たまに特別な利息がつくんだって。'],
  ramen: ['ここのラーメン、最高なんだよな。スープまで飲んじゃう。', 'あの赤い提灯を見ると、ついラーメン食べたくなるんだ。', '今日はラーメンにしようかな。きみは何を食べる？'],
  diner: ['ここの炊きたてごはん、いいにおいだね。', '今日は何のおかずにしようかな。迷うのも楽しいね。', 'あったかいごはんを食べると、ほっとするなあ。'],
  homewares: ['このお店の小物、つい眺めちゃう。お部屋に何を飾ろうかな。', '新しい家具を見に来たんだ。今日は見てるだけでも楽しいね。', 'お花をひとつ置くだけで、お部屋の感じが変わるんだね。'],
  workshop: ['工房の店長、お玉の使い方が上手なんだよ。', 'ゆでたまごって、引き上げるタイミングが大事なんだね。', 'ここのゆでたまご、つるんとしてておいしそう。'],
  bowling: ['ピンが倒れる音、気持ちいいよね。今日はどこを狙おうかな。', 'ボウリングの店員さん、いつも元気に迎えてくれるんだ。', '今日はここでボウリングを見てるんだ。応援するのも好き。'],
  forest: ['この森、葉っぱの音がよく聞こえるね。', '森でまんまるのどんぐりを見つけたよ。', '木もれびが、地面でゆらゆらしてる。しばらく見てようかな。'],
  lake: ['湖に雲が映ってる。ふたつ空があるみたい。', '湖の風、気持ちいいね。ここで少しひと休み。', 'ここの観覧車から、どこまで見えるのかなあ。'],
  onsen: ['ここの温泉、肩までぽかぽかになるんだ。', '温泉のあとに外の風にあたるの、好きなんだ。', '今日はお湯でのんびり。急がず帰ろうかな。'],
  market: ['広場に来ると、だれかに会える気がするんだ。', '広場の木の下、ちょうどいい日陰を見つけたよ。', '今日は広場でのんびり。きみはどこへ行くところ？'],
};
function hash(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return h >>> 0;
}
export type VillageVisit = {visitor: typeof VISITORS[number]; place: VisitorPlace; point: {x: number; y: number}; lineOffset: number};
/** Date-only itinerary: reopening never rerolls it, and nobody appears in two places. */
export function dailyVillageVisits(daySeed: number): VillageVisit[] {
  const slots = (Object.entries(VISITOR_SPOTS) as [VisitorPlace, readonly {x: number; y: number}[]][])
    .flatMap(([place, points]) => points.map((point, i) => ({place, point, order: hash(`${daySeed}:${place}:${i}`)})))
    .sort((a, b) => a.order - b.order);
  return [...VISITORS].sort((a, b) => hash(`${daySeed}:${a.id}`) - hash(`${daySeed}:${b.id}`))
    .filter(visitor => hash(`${daySeed}:out:${visitor.id}`) % 5 !== 0)
    .map((visitor, index) => ({visitor, place: slots[index].place, point: slots[index].point, lineOffset: hash(`${daySeed}:chat:${visitor.id}`)}));
}
export function visitorsAt(map: WorldMapId, daySeed: number): VillageVisit[] {
  return dailyVillageVisits(daySeed).filter(visit => visit.place === map);
}
export function visitorReply(visit: VillageVisit, exchange = 0) {
  const lines = CHAT[visit.place];
  return lines[(visit.lineOffset + Math.max(0, Math.floor(exchange))) % lines.length];
}
