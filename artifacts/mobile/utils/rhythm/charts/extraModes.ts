import { CopyPhrase, Difficulty } from '../types';
import { SectionDef } from './builder';

/**
 * SWIPE / RELAX / COPY 用の手作業譜面 (4曲 × 3難易度)。
 * SWIPE: lane が方向を表す (0=← 1=↑ 2=↓ 3=→)
 * RELAX: 低密度・ゆったり (高速ノーツなし)
 * COPY: キャラが提示→ユーザーが再現するフレーズ
 */

/* ══════════ SWIPE (lane=方向) ══════════ */

export const SWIPE_SECTIONS: Record<string, Record<Difficulty, SectionDef[]>> = {
  // グリッティ・ブギ (149.8BPM, 18小節) — 速いので方向は1小節2つまで(EASY)
  gritty_boogie: {
    easy: [
      { from: 2, to: 6, patterns: [[[0, 1]], [[0, 2]]] },
      { from: 6, to: 16, patterns: [[[0, 0], [2, 3]], [[0, 1], [2, 2]], [[0, 3], [2, 0]]] },
      { from: 16, to: 18, patterns: [[[0, 1]]] },
    ],
    normal: [
      { from: 2, to: 6, patterns: [[[0, 1], [2, 2]]] },
      { from: 6, to: 16, patterns: [[[0, 0], [1, 1], [2, 3], [3, 2]], [[0, 3], [1, 2], [2, 0], [3, 1]]] },
      { from: 16, to: 18, patterns: [[[0, 1], [2, 2]]] },
    ],
    hard: [
      { from: 2, to: 6, patterns: [[[0, 1], [1, 2], [2, 1], [3, 2]]] },
      { from: 6, to: 16, patterns: [[[0, 0], [1, 3], [2, 1], [2.5, 2], [3, 0]], [[0, 3], [1, 0], [2, 2], [2.5, 1], [3, 3]]] },
      { from: 16, to: 18, patterns: [[[0, 0], [1, 1], [2, 2], [3, 3]]] },
    ],
  },
  // ナイト・バロメーター (89.1BPM, 11小節)
  night_barometer: {
    easy: [
      { from: 1, to: 4, patterns: [[[0, 1]], [[0, 2]]] },
      { from: 4, to: 10, patterns: [[[0, 0], [2, 3]], [[0, 1], [2, 2]], [[0, 3], [2, 0]]] },
      { from: 10, to: 11, patterns: [[[0, 1]]] },
    ],
    normal: [
      { from: 1, to: 4, patterns: [[[0, 1], [2, 2]]] },
      { from: 4, to: 10, patterns: [[[0, 0], [1, 1], [2, 3], [3, 2]], [[0, 3], [1, 2], [2, 0], [3, 1]]] },
      { from: 10, to: 11, patterns: [[[0, 1], [2, 2]]] },
    ],
    hard: [
      { from: 1, to: 4, patterns: [[[0, 1], [1, 2], [2, 1], [3, 2]]] },
      { from: 4, to: 10, patterns: [[[0, 0], [1, 3], [1.5, 1], [2, 2], [3, 0]], [[0, 3], [1, 0], [2, 1], [2.5, 2], [3, 3]]] },
      { from: 10, to: 11, patterns: [[[0, 0], [2, 3]]] },
    ],
  },
  // ローリング・デイズ (99.4BPM, 12小節) — 転がる=左右往復を主役に
  rolling_days: {
    easy: [
      { from: 1, to: 3, patterns: [[[0, 0]], [[0, 3]]] },
      { from: 3, to: 11, patterns: [[[0, 0], [2, 3]], [[0, 3], [2, 0]], [[0, 1], [2, 2]]] },
      { from: 11, to: 12, patterns: [[[0, 1]]] },
    ],
    normal: [
      { from: 1, to: 3, patterns: [[[0, 0], [2, 3]]] },
      { from: 3, to: 11, patterns: [[[0, 0], [1, 3], [2, 0], [3, 3]], [[0, 1], [1, 2], [2, 3], [3, 0]]] },
      { from: 11, to: 12, patterns: [[[0, 0], [2, 3]]] },
    ],
    hard: [
      { from: 1, to: 3, patterns: [[[0, 0], [1, 3], [2, 0], [3, 3]]] },
      { from: 3, to: 11, patterns: [[[0, 0], [1, 3], [1.5, 0], [2, 3], [3, 1]], [[0, 2], [1, 1], [2, 0], [2.5, 3], [3, 2]]] },
      { from: 11, to: 12, patterns: [[[0, 0], [1, 1], [2, 2], [3, 3]]] },
    ],
  },
  // バウンシー・アウェイ (77.15BPM, 9.5小節) — 上下のはずみ
  bouncy_away: {
    easy: [
      { from: 1, to: 3, patterns: [[[0, 1]], [[0, 2]]] },
      { from: 3, to: 8, patterns: [[[0, 1], [2, 2]], [[0, 2], [2, 1]], [[0, 1], [2, 0]]] },
      { from: 8, to: 9, patterns: [[[0, 1]]] },
    ],
    normal: [
      { from: 1, to: 3, patterns: [[[0, 1], [2, 2]]] },
      { from: 3, to: 8, patterns: [[[0, 1], [1, 2], [2, 1], [3, 2]], [[0, 2], [1.5, 1], [2, 0], [3.5, 3]]] },
      { from: 8, to: 9, patterns: [[[0, 1], [2, 2]]] },
    ],
    hard: [
      { from: 1, to: 3, patterns: [[[0, 1], [1, 2], [2, 1], [3, 2]]] },
      { from: 3, to: 8, patterns: [[[0, 1], [1, 2], [1.5, 0], [2, 1], [3, 3]], [[0, 2], [0.5, 1], [1, 3], [2, 0], [3, 2]]] },
      { from: 8, to: 9, patterns: [[[0, 0], [1, 1], [2, 2], [3, 3]]] },
    ],
  },
};

/* ══════════ RELAX (低密度・ゆったり) ══════════ */

export const RELAX_SECTIONS: Record<string, Record<Difficulty, SectionDef[]>> = {
  gritty_boogie: {
    easy: [{ from: 2, to: 17, patterns: [[[0, 1]], [[0, 2]]] }],
    normal: [{ from: 2, to: 17, patterns: [[[0, 1], [2, 2]], [[0, 2], [2, 1]]] }],
    hard: [{ from: 2, to: 17, patterns: [[[0, 0], [2, 3]], [[0, 1], [2, 2]], [[0, 3], [2, 0]]] }],
  },
  night_barometer: {
    easy: [{ from: 1, to: 11, patterns: [[[0, 1]], [[0, 2]]] }],
    normal: [{ from: 1, to: 11, patterns: [[[0, 1], [2, 2]], [[0, 2], [2, 1]]] }],
    hard: [{ from: 1, to: 11, patterns: [[[0, 0], [2, 3]], [[0, 2], [2, 1]], [[0, 1], [2, 0]]] }],
  },
  rolling_days: {
    easy: [{ from: 1, to: 12, patterns: [[[0, 1]], [[0, 2]]] }],
    normal: [{ from: 1, to: 12, patterns: [[[0, 0], [2, 3]], [[0, 3], [2, 0]]] }],
    hard: [{ from: 1, to: 12, patterns: [[[0, 0], [2, 2]], [[0, 1], [2, 3]], [[0, 3], [2, 1]]] }],
  },
  bouncy_away: {
    easy: [{ from: 1, to: 9, patterns: [[[0, 1]], [[0, 2]]] }],
    normal: [{ from: 1, to: 9, patterns: [[[0, 1], [2, 2]], [[0, 2], [2, 1]]] }],
    hard: [{ from: 1, to: 9, patterns: [[[0, 0], [2, 3]], [[0, 1], [2, 2]], [[0, 2], [2, 0]]] }],
  },
};

/* ══════════ COPY (キャラ提示 → ユーザー再現) ══════════ */

export const COPY_PHRASES: Record<string, Record<Difficulty, CopyPhrase[]>> = {
  // 速い曲 = 2小節提示 + 2小節再現
  gritty_boogie: {
    easy: [
      { start: 2, len: 2, beats: [0, 2, 4] },          // ぽん ぽん ぽん
      { start: 6, len: 2, beats: [0, 2, 6] },
      { start: 10, len: 2, beats: [0, 4, 6] },
    ],
    normal: [
      { start: 2, len: 2, beats: [0, 2, 3, 4] },
      { start: 6, len: 2, beats: [0, 1, 4, 6] },
      { start: 10, len: 2, beats: [0, 2, 4, 5] },
      { start: 14, len: 2, beats: [0, 3, 4, 5] },
    ],
    hard: [
      { start: 2, len: 2, beats: [0, 2, 3, 4, 6] },
      { start: 6, len: 2, beats: [0, 1, 2, 4, 5] },
      { start: 10, len: 2, beats: [0, 2, 2.5, 4, 6] }, // ぽん ぽぽん…
      { start: 14, len: 2, beats: [0, 1.5, 2, 4, 5] },
    ],
  },
  // ゆったり曲 = 1小節提示 + 1小節再現
  night_barometer: {
    easy: [
      { start: 1, len: 1, beats: [0, 2] },
      { start: 3, len: 1, beats: [0, 1, 2] },
      { start: 5, len: 1, beats: [0, 2, 3] },
    ],
    normal: [
      { start: 1, len: 1, beats: [0, 1, 2] },
      { start: 3, len: 1, beats: [0, 2, 2.5, 3] },     // ぽん ぽぽん
      { start: 5, len: 1, beats: [0, 0.5, 1, 3] },
      { start: 7, len: 1, beats: [0, 1.5, 2, 3] },
    ],
    hard: [
      { start: 1, len: 1, beats: [0, 0.5, 1, 2] },
      { start: 3, len: 1, beats: [0, 1, 1.5, 2, 3] },
      { start: 5, len: 1, beats: [0, 0.5, 2, 2.5, 3] },
      { start: 7, len: 1, beats: [0, 1, 2, 2.5, 3.5] },
    ],
  },
  rolling_days: {
    easy: [
      { start: 1, len: 1, beats: [0, 2] },
      { start: 3, len: 1, beats: [0, 1, 3] },
      { start: 5, len: 1, beats: [0, 2, 3] },
      { start: 7, len: 1, beats: [0, 1, 2] },
    ],
    normal: [
      { start: 1, len: 1, beats: [0, 1, 2, 3] },
      { start: 3, len: 1, beats: [0, 1.5, 2, 3] },
      { start: 5, len: 1, beats: [0, 0.5, 1, 3] },
      { start: 7, len: 1, beats: [0, 2, 2.5, 3] },
    ],
    hard: [
      { start: 1, len: 1, beats: [0, 0.5, 1, 2, 3] },
      { start: 3, len: 1, beats: [0, 1, 1.5, 2, 3.5] },
      { start: 5, len: 1, beats: [0, 0.5, 2, 2.5, 3] },
      { start: 7, len: 1, beats: [0, 1, 2, 3, 3.5] },
    ],
  },
  bouncy_away: {
    easy: [
      { start: 1, len: 1, beats: [0, 2] },
      { start: 3, len: 1, beats: [0, 2, 3] },
      { start: 5, len: 1, beats: [0, 1, 2] },
    ],
    normal: [
      { start: 1, len: 1, beats: [0, 1, 2] },
      { start: 3, len: 1, beats: [0, 1.5, 2, 3] },
      { start: 5, len: 1, beats: [0, 0.5, 2, 3] },
    ],
    hard: [
      { start: 1, len: 1, beats: [0, 0.5, 1, 2] },
      { start: 3, len: 1, beats: [0, 1, 1.5, 2, 3] },
      { start: 5, len: 1, beats: [0, 0.5, 2, 2.5, 3.5] },
    ],
  },
};
