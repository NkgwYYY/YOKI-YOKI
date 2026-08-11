import { Chart, CopyPhrase, Difficulty, Note, RhythmMode } from '../types';
import { getSong } from '../songs';
import { buildNotes, SectionDef } from './builder';
import { grittyBoogieSections } from './grittyBoogie';
import { nightBarometerSections } from './nightBarometer';
import { rollingDaysSections } from './rollingDays';
import { bouncyAwaySections } from './bouncyAway';
import { SWIPE_SECTIONS, RELAX_SECTIONS, COPY_PHRASES } from './extraModes';

/** TAP 譜面レジストリ: songId → difficulty → sections */
const TAP_SECTIONS: Record<string, Record<Difficulty, SectionDef[]>> = {
  gritty_boogie: grittyBoogieSections,
  night_barometer: nightBarometerSections,
  rolling_days: rollingDaysSections,
  bouncy_away: bouncyAwaySections,
};

/** SWIPE: lane → 方向 */
const LANE_TO_DIRECTION: Record<number, 'left' | 'up' | 'down' | 'right'> = {
  0: 'left', 1: 'up', 2: 'down', 3: 'right',
};

/** JUMP: TAP譜面を1本レーンに集約し、近すぎるノーツ(<0.35s)を間引く */
function toJumpNotes(notes: Note[]): Note[] {
  const out: Note[] = [];
  for (const n of notes) {
    if (out.length > 0 && n.time - out[out.length - 1].time < 0.35) continue;
    out.push({ ...n, lane: 0 });
  }
  return out;
}

export function getChart(songId: string, mode: RhythmMode, difficulty: Difficulty): Chart | null {
  const song = getSong(songId);
  if (!song) return null;

  if (mode === 'tap' || mode === 'jump') {
    const sections = TAP_SECTIONS[songId]?.[difficulty];
    if (!sections) return null;
    const notes = buildNotes(song, sections);
    return { songId, mode, difficulty, notes: mode === 'jump' ? toJumpNotes(notes) : notes };
  }
  if (mode === 'swipe') {
    const sections = SWIPE_SECTIONS[songId]?.[difficulty];
    if (!sections) return null;
    const notes = buildNotes(song, sections).map(n => ({ ...n, direction: LANE_TO_DIRECTION[n.lane] }));
    return { songId, mode, difficulty, notes };
  }
  if (mode === 'relax') {
    const sections = RELAX_SECTIONS[songId]?.[difficulty];
    if (!sections) return null;
    return { songId, mode, difficulty, notes: buildNotes(song, sections) };
  }
  if (mode === 'copy') {
    // COPY はフレーズ形式。Chart.notes には再現枠の期待タップ時刻を展開して入れる
    const phrases = COPY_PHRASES[songId]?.[difficulty];
    if (!phrases) return null;
    const spb = 60 / song.bpm;
    const notes: Note[] = [];
    for (const ph of phrases) {
      const respStart = song.firstBeat + (ph.start + ph.len) * 4 * spb;
      for (const b of ph.beats) notes.push({ time: respStart + b * spb, type: 'tap', lane: 0 });
    }
    notes.sort((a, b) => a.time - b.time);
    return { songId, mode, difficulty, notes };
  }
  return null;
}

/** COPY 用フレーズ定義 (提示演出のスケジュールに使用) */
export function getCopyPhrases(songId: string, difficulty: Difficulty): CopyPhrase[] | null {
  return COPY_PHRASES[songId]?.[difficulty] ?? null;
}
