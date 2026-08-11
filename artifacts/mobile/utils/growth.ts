/**
 * サイズ成長(Growth Size)システム
 *
 * Level / Evolution / Emotion / Bone Physics とは完全に独立した第5のシステム。
 * - 時間ベース(lastGrowthAt からの経過時間)で少しずつ成長する
 * - アプリを開いた回数やランダムでは成長しない(日ごとの成長率は
 *   characterId+日付から決まる決定論的な値で、min〜max の範囲内)
 * - 進化してもリセットしない(マスコットは1個体として growth を持ち続ける)
 * - レベルアップでは変化しない
 */

/** 1日あたりの成長率の下限(0.001 = +0.1%/日) */
export const DAILY_GROWTH_MIN = 0.001;
/** 1日あたりの成長率の上限(0.003 = +0.3%/日) */
export const DAILY_GROWTH_MAX = 0.003;
/** 成長の上限(1.10 = 最大110%。UIからはみ出さないための内部上限) */
export const MAX_GROWTH_SCALE = 1.10;

/** キャラごとの成長率(個体差)。未指定は 1.0 */
export const GROWTH_RATES: Record<string, number> = {
  // egg: 1.0, odango: 0.9, ... 後から個体差を付けられる
};

export interface GrowthSnapshot {
  /** YYYY-MM-DD */
  date: string;
  growthSize: number;
}

export interface GrowthRecord {
  characterId: string;
  /** 1.0 = 100%(基準サイズ) */
  growthSize: number;
  /** 最後に成長を計算した日時(ISO) */
  lastGrowthAt: string;
  /** 前回ユーザーが成長表示を見たときのサイズ(控えめメッセージ用) */
  lastSeenSize: number;
  /** 比較表示用の履歴(1日1件まで) */
  history: GrowthSnapshot[];
}

export function createGrowthRecord(characterId: string, now = new Date()): GrowthRecord {
  return {
    characterId,
    growthSize: 1.0,
    lastGrowthAt: now.toISOString(),
    lastSeenSize: 1.0,
    history: [{ date: now.toISOString().slice(0, 10), growthSize: 1.0 }],
  };
}

/** characterId + 日付から決まる決定論的な擬似乱数(0〜1)。開くたびに変わらない */
function seededRandom(characterId: string, dayKey: string): number {
  const s = `${characterId}:${dayKey}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** その日の成長率(min〜max の範囲で決定論的) */
function dailyRate(characterId: string, dayKey: string): number {
  const r = seededRandom(characterId, dayKey);
  const rate = GROWTH_RATES[characterId] ?? 1.0;
  return (DAILY_GROWTH_MIN + (DAILY_GROWTH_MAX - DAILY_GROWTH_MIN) * r) * rate;
}

const DAY_MS = 86_400_000;

/**
 * 経過時間ぶんの成長を適用した新しいレコードを返す。
 * 日をまたいだ分だけでなく、日内の経過も按分して滑らかに積算する。
 * 変化がなければ元のレコードをそのまま返す。
 */
export function applyGrowth(record: GrowthRecord, now = new Date()): GrowthRecord {
  const last = new Date(record.lastGrowthAt).getTime();
  const nowMs = now.getTime();
  if (!(nowMs > last)) return record;

  let size = record.growthSize;
  // 日ごとに按分しながら積算(異常に長い放置でも高々 ~5年でループを打ち切り)
  let cursor = last;
  let guard = 0;
  while (cursor < nowMs && size < MAX_GROWTH_SCALE && guard < 2000) {
    guard++;
    const d = new Date(cursor);
    const dayKey = d.toISOString().slice(0, 10);
    // その日の終わり(UTC)
    const dayEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
    const sliceEnd = Math.min(dayEnd, nowMs);
    const fraction = (sliceEnd - cursor) / DAY_MS;
    size += dailyRate(record.characterId, dayKey) * fraction;
    cursor = sliceEnd;
  }
  size = Math.min(size, MAX_GROWTH_SCALE);

  if (size === record.growthSize) {
    // サイズは変わらなくても計算時刻は進める
    return { ...record, lastGrowthAt: now.toISOString() };
  }

  // 履歴: 1日1件まで(同日ならその日のエントリを更新)
  const today = now.toISOString().slice(0, 10);
  const history = [...record.history];
  const lastSnap = history[history.length - 1];
  if (lastSnap && lastSnap.date === today) {
    history[history.length - 1] = { date: today, growthSize: size };
  } else {
    history.push({ date: today, growthSize: size });
  }
  // 履歴は最大400件(1年強)に制限
  if (history.length > 400) history.splice(1, history.length - 400);

  return { ...record, growthSize: size, lastGrowthAt: now.toISOString(), history };
}

/** 表示用: "100.0%" 形式 */
export function formatGrowth(size: number): string {
  return `${(size * 100).toFixed(1)}%`;
}

/** 前回見たときより気づける程度(+0.5%以上)成長したか */
export function hasGrownNoticeably(record: GrowthRecord): boolean {
  return record.growthSize - record.lastSeenSize >= 0.005;
}
