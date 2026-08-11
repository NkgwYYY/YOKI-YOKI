/** 音ゲー共通の型定義 */

export type RhythmMode = 'tap' | 'jump' | 'swipe' | 'copy' | 'relax';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Judgment = 'perfect' | 'great' | 'good' | 'miss';

export interface Song {
  id: string;
  title: string;
  /** require() されたオーディオアセット */
  audio: number;
  /** 実測BPM */
  bpm: number;
  /** 最初の拍のオフセット (秒) */
  firstBeat: number;
  /** 曲の長さ (秒) */
  duration: number;
  /** 曲の雰囲気ラベル */
  mood: string;
  emoji: string;
  /** カードのグラデーション色 */
  gradient: readonly [string, string];
}

export interface Note {
  /** 曲頭からの時間 (秒) */
  time: number;
  /** ノーツ種別 (tap/hold/flick など将来拡張用) */
  type: 'tap';
  /** レーン 0-3 */
  lane: number;
  /** hold用 (秒) */
  duration?: number;
  /** swipe用 */
  direction?: 'left' | 'right' | 'up' | 'down';
}

export interface Chart {
  songId: string;
  mode: RhythmMode;
  difficulty: Difficulty;
  notes: Note[];
}

export interface PlayResult {
  perfect: number;
  great: number;
  good: number;
  miss: number;
  maxCombo: number;
  score: number;
  totalNotes: number;
  /** プレイ時間 (秒) */
  playTime: number;
}

/* 判定ウィンドウ (ms) — 優しめ設定 */
export const JUDGE_PERFECT_MS = 100;
export const JUDGE_GREAT_MS = 190;
export const JUDGE_GOOD_MS = 300;

export const SCORE_PER: Record<Exclude<Judgment, 'miss'>, number> = {
  perfect: 100,
  great: 70,
  good: 40,
};

/** 精度 (0-1) → ★1〜5 */
export function starRating(r: PlayResult): number {
  if (r.totalNotes === 0) return 3;
  const acc = (r.perfect + r.great * 0.7 + r.good * 0.4) / r.totalNotes;
  if (acc >= 0.92) return 5;
  if (acc >= 0.75) return 4;
  if (acc >= 0.55) return 3;
  if (acc >= 0.35) return 2;
  return 1;
}
