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

/** ミニゲーム・音ゲー1プレイ(★の数 0-5 に応じて。がんばれなくても最低保証あり) */
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

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
