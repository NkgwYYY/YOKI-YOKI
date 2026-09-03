/**
 * 光エネルギー基盤システム
 *
 * 世界観: 「自分を整える → キャラが元気になる → 光が生まれる → 太陽を照らす →
 * 太陽光発電所に蓄えられる」の循環の土台となるデータ層。
 * 現実の電力とは一切関係のない、アプリ内の架空のシステム。
 *
 * 設計方針:
 * - 既存の FP / XP / Level / Growth とは完全に独立して共存する
 * - ノルマ圧なし: できなかった日もマイナスにならない(新しい日は基準値から再スタート)
 * - 獲得ルールはこのファイルに集約する(記録・気分・日記・ミニゲーム/音ゲー)
 */

/** 新しい日の「元気」の基準値(0-100)。前日できなくても半分からスタート */
export const BASE_GENKI = 50;
/** 元気・光の力の上限 */
export const MAX_GENKI = 100;
export const MAX_LIGHT_POWER = 100;
/** 発電の最低出力。行動していない時間も、太陽の光が少しずつ蓄電される */
export const PASSIVE_ENERGY_PER_HOUR = 1;
/** 光の力が100のときに加わる、1時間あたりの追加出力 */
export const MAX_LIGHT_POWER_BONUS_PER_HOUR = 1;
/** 一度に精算する留守中の上限。長期未利用で数値だけが過度に増えるのを防ぐ */
export const MAX_PASSIVE_GENERATION_HOURS = 72;

export interface LightEnergyState {
  /** 今日の日付 (YYYY-MM-DD)。変わったら日次値をリセット */
  date: string;
  /** 元気 (0-100)。今日の行動で上がる。翌日は BASE_GENKI から */
  genki: number;
  /** 光の力 (0-100)。今日キャラが生み出している光の強さ */
  lightPower: number;
  /** 今日生まれた光エネルギー */
  todayEnergy: number;
  /** 蓄電量(発電所に貯まっているエネルギー。売電タスクで消費される) */
  storedEnergy: number;
  /** 累計光エネルギー */
  totalEnergy: number;
  /** 時間経過による発電を最後に精算した時刻 */
  lastGeneratedAt: string;
  /** 今日すでに付与済みの1日1回ソース(二重付与防止) */
  flags: {
    /** 気分記録(初回のみ) */
    mood: boolean;
    /** 日記・メモ(初回のみ) */
    diary: boolean;
  };
}

export function createLightEnergyState(today: string): LightEnergyState {
  return {
    date: today,
    genki: BASE_GENKI,
    lightPower: 0,
    todayEnergy: 0,
    storedEnergy: 0,
    totalEnergy: 0,
    lastGeneratedAt: new Date().toISOString(),
    flags: { mood: false, diary: false },
  };
}

/** 保存データを安全に読み込む(欠損フィールドは補完) */
export function resolveLightEnergyState(raw: unknown, today: string): LightEnergyState {
  const base = createLightEnergyState(today);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<LightEnergyState>;
  const state: LightEnergyState = {
    date: typeof r.date === 'string' ? r.date : today,
    genki: clamp(num(r.genki, BASE_GENKI), 0, MAX_GENKI),
    lightPower: clamp(num(r.lightPower, 0), 0, MAX_LIGHT_POWER),
    todayEnergy: Math.max(0, num(r.todayEnergy, 0)),
    storedEnergy: Math.max(0, num(r.storedEnergy, 0)),
    totalEnergy: Math.max(0, num(r.totalEnergy, 0)),
    // 旧データはこの時点から発電を開始する。過去分を一括で付与しないため、
    // バージョン更新だけで大きな蓄電量が発生することはない。
    lastGeneratedAt: validTimestamp(r.lastGeneratedAt) ? r.lastGeneratedAt! : new Date().toISOString(),
    flags: {
      mood: r.flags?.mood === true,
      diary: r.flags?.diary === true,
    },
  };
  return rolloverLightEnergy(state, today);
}

/** 日付が変わっていたら日次値をリセット(蓄電・累計は維持)。変化がなければ同一参照を返す */
export function rolloverLightEnergy(state: LightEnergyState, today: string): LightEnergyState {
  if (state.date === today) return state;
  return {
    ...state,
    date: today,
    genki: BASE_GENKI,
    lightPower: 0,
    todayEnergy: 0,
    flags: { mood: false, diary: false },
  };
}

/**
 * 最終精算時刻から現在までの時間経過ぶんを蓄電する。
 * 光の力が高いほど少し発電量が上がるが、最低出力があるため毎日操作できない日も
 * 太陽光発電所にはゆっくりエネルギーが貯まる。
 */
export function applyElapsedEnergy(
  state: LightEnergyState,
  today: string,
  now = new Date(),
): LightEnergyState {
  const current = rolloverLightEnergy(state, today);
  const lastMs = Date.parse(current.lastGeneratedAt);
  const nowMs = now.getTime();
  if (!Number.isFinite(lastMs) || nowMs <= lastMs) return current;

  const elapsedHours = Math.min(
    (nowMs - lastMs) / 3_600_000,
    MAX_PASSIVE_GENERATION_HOURS,
  );
  const rate = PASSIVE_ENERGY_PER_HOUR
    + (current.lightPower / MAX_LIGHT_POWER) * MAX_LIGHT_POWER_BONUS_PER_HOUR;
  const generated = Math.floor(elapsedHours * rate);
  if (generated <= 0) return current;

  return {
    ...current,
    todayEnergy: current.todayEnergy + generated,
    storedEnergy: current.storedEnergy + generated,
    totalEnergy: current.totalEnergy + generated,
    lastGeneratedAt: now.toISOString(),
  };
}

/** 1アクションぶんの獲得量 */
export interface EnergyGain {
  genki: number;
  light: number;
  energy: number;
}

/* ── 獲得ルール(一箇所に集約) ─────────────────────────────
 * 1日の自然な利用(チェック数件 + 気分記録 + 日記 + ゲーム1〜2回)で
 * だいたい 30〜60 エネルギー貯まる想定。グラインド要素は
 * チェック項目数とゲームスロット数で自然に上限が決まる。
 */

/** チェック項目1件(初回チェックのみ) */
export const GAIN_CHECK_ITEM: EnergyGain = { genki: 3, light: 2, energy: 2 };
/** 全項目コンプリートボーナス(1日1回) */
export const GAIN_FULL_DAY_BONUS: EnergyGain = { genki: 5, light: 5, energy: 8 };
/** 気分・生活の記録(1日1回) */
export const GAIN_MOOD_RECORD: EnergyGain = { genki: 5, light: 4, energy: 5 };
/** 日記・メモを書いた(1日1回) */
export const GAIN_DIARY: EnergyGain = { genki: 3, light: 2, energy: 3 };

/** ミニゲーム・音ゲー1プレイ(星の数 0-5 に応じて。がんばれなくても最低保証あり) */
export function gainForPlay(stars: number): EnergyGain {
  const s = clamp(Math.round(stars), 0, 5);
  return { genki: 2 + s, light: 2 + s, energy: 3 + s * 2 };
}

/** 獲得を適用した新しい状態を返す(日付ロールオーバーも行う) */
export function applyEnergyGain(
  state: LightEnergyState,
  gain: EnergyGain,
  today: string,
  flag?: keyof LightEnergyState['flags'],
): LightEnergyState {
  const s = rolloverLightEnergy(state, today);
  if (flag && s.flags[flag]) return s; // 1日1回ソースの二重付与防止
  return {
    ...s,
    genki: clamp(s.genki + gain.genki, 0, MAX_GENKI),
    lightPower: clamp(s.lightPower + gain.light, 0, MAX_LIGHT_POWER),
    todayEnergy: s.todayEnergy + gain.energy,
    storedEnergy: s.storedEnergy + gain.energy,
    totalEnergy: s.totalEnergy + gain.energy,
    flags: flag ? { ...s.flags, [flag]: true } : s.flags,
  };
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function validTimestamp(v: unknown): v is string {
  return typeof v === 'string' && Number.isFinite(Date.parse(v));
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
