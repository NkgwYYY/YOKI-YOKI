import { Note, Song } from '../types';

/** [小節内の拍 (0〜3.5, 0.5刻み), レーン 0-3] */
export type Pat = [number, number];

export interface SectionDef {
  /** 開始小節 (0始まり, inclusive) */
  from: number;
  /** 終了小節 (exclusive) */
  to: number;
  /** 小節ごとに順番に繰り返すパターン群 (手作業配置) */
  patterns: Pat[][];
}

/**
 * 手作業で配置したセクション定義から Note[] を生成する。
 * time = firstBeat + (小節*4 + 拍) * (60/bpm)
 */
export function buildNotes(song: Song, sections: SectionDef[]): Note[] {
  const spb = 60 / song.bpm;
  const notes: Note[] = [];
  const cutoff = song.duration - 1.2; // 曲末は判定しない
  for (const sec of sections) {
    for (let m = sec.from; m < sec.to; m++) {
      const pat = sec.patterns[(m - sec.from) % sec.patterns.length];
      for (const [beat, lane] of pat) {
        const time = song.firstBeat + (m * 4 + beat) * spb;
        if (time < 1.5 || time > cutoff) continue;
        notes.push({ time, type: 'tap', lane });
      }
    }
  }
  notes.sort((a, b) => a.time - b.time);
  return notes;
}
