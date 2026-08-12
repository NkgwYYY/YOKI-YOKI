/**
 * 発電所・売電・街の発展システム
 *
 * 世界観: キャラの光で貯まった蓄電エネルギーを「売電」してエコポイントに変え、
 * エコポイントで街を段階的に発展させる。現実の電力とは一切関係のない架空のシステム。
 *
 * - 蓄電量そのものは lightEnergy.ts(LIGHT_ENERGY キー)が持つ
 * - このファイルは売電の成果(エコポイント・売電履歴)と街の発展段階を持つ
 */

export interface PowerPlantState {
  /** 現在持っているエコポイント */
  ecoPoints: number;
  /** これまでに売電したエネルギーの合計 */
  totalSold: number;
  /** 売電した回数 */
  sellCount: number;
  /** 建設済みの街アイテム数(TOWN_ITEMS の先頭から順に建つ) */
  townBuilt: number;
}

export function createPowerPlantState(): PowerPlantState {
  return { ecoPoints: 0, totalSold: 0, sellCount: 0, townBuilt: 0 };
}

/** 保存データを安全に読み込む(欠損フィールドは補完) */
export function resolvePowerPlantState(raw: unknown): PowerPlantState {
  const base = createPowerPlantState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<PowerPlantState>;
  return {
    ecoPoints: nonNeg(r.ecoPoints),
    totalSold: nonNeg(r.totalSold),
    sellCount: nonNeg(r.sellCount),
    townBuilt: Math.min(nonNeg(r.townBuilt), TOWN_ITEMS.length),
  };
}

/** 売電レート: 蓄電エネルギー1 → エコポイント1(少量でも売れる優しい設計) */
export const ECO_POINTS_PER_ENERGY = 1;

/* ── 発電所レベル(累計エネルギーで自動的に育つ) ── */
export const PLANT_LEVEL_THRESHOLDS = [0, 60, 150, 300, 500, 800];

/** 累計光エネルギーから発電所レベル(1始まり)を求める */
export function plantLevelFor(totalEnergy: number): number {
  let lv = 1;
  for (let i = 1; i < PLANT_LEVEL_THRESHOLDS.length; i++) {
    if (totalEnergy >= PLANT_LEVEL_THRESHOLDS[i]) lv = i + 1;
  }
  return lv;
}

/** 次のレベルまでの進捗(0-1)。最大レベルなら 1 */
export function plantLevelProgress(totalEnergy: number): number {
  const lv = plantLevelFor(totalEnergy);
  if (lv >= PLANT_LEVEL_THRESHOLDS.length) return 1;
  const cur = PLANT_LEVEL_THRESHOLDS[lv - 1];
  const next = PLANT_LEVEL_THRESHOLDS[lv];
  return Math.min(1, Math.max(0, (totalEnergy - cur) / (next - cur)));
}

export const MAX_PLANT_LEVEL = PLANT_LEVEL_THRESHOLDS.length;

/* ── 街の発展 ── */
export interface TownItem {
  key: string;
  name: string;
  emoji: string;
  cost: number;
  /** 建った瞬間に見せるひとこと */
  flavor: string;
}

export const TOWN_ITEMS: TownItem[] = [
  { key: 'flowerbed', name: '花壇',   emoji: '🌷', cost: 15,  flavor: '街に花が咲いたよ!' },
  { key: 'bench',     name: 'ベンチ', emoji: '🪑', cost: 30,  flavor: 'ひとやすみできる場所ができた!' },
  { key: 'lamp',      name: '街灯',   emoji: '🏮', cost: 50,  flavor: '夜道が明るくなったよ!' },
  { key: 'park',      name: '公園',   emoji: '🌳', cost: 80,  flavor: 'みんなの遊び場ができた!' },
  { key: 'cafe',      name: 'カフェ', emoji: '☕', cost: 120, flavor: 'いい香りがしてきた…!' },
  { key: 'library',   name: '図書館', emoji: '📚', cost: 170, flavor: '物語のつまった場所ができた!' },
  { key: 'fountain',  name: '噴水',   emoji: '⛲', cost: 230, flavor: '水しぶきがきらきら光ってる!' },
  { key: 'wheel',     name: '観覧車', emoji: '🎡', cost: 300, flavor: '街いちばんの名物ができた!' },
];

/** 次に建てられるアイテム(全部建った場合は undefined) */
export function nextTownItem(state: PowerPlantState): TownItem | undefined {
  return TOWN_ITEMS[state.townBuilt];
}

function nonNeg(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}
