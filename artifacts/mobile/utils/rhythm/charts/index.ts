import { Chart, Difficulty, RhythmMode } from '../types';
import { getSong } from '../songs';
import { buildNotes, SectionDef } from './builder';
import { grittyBoogieSections } from './grittyBoogie';
import { nightBarometerSections } from './nightBarometer';
import { rollingDaysSections } from './rollingDays';
import { bouncyAwaySections } from './bouncyAway';

/** 譜面レジストリ: songId → mode → difficulty → sections */
const CHART_SECTIONS: Record<string, Partial<Record<RhythmMode, Record<Difficulty, SectionDef[]>>>> = {
  gritty_boogie: { tap: grittyBoogieSections },
  night_barometer: { tap: nightBarometerSections },
  rolling_days: { tap: rollingDaysSections },
  bouncy_away: { tap: bouncyAwaySections },
};

export function getChart(songId: string, mode: RhythmMode, difficulty: Difficulty): Chart | null {
  const song = getSong(songId);
  const sections = CHART_SECTIONS[songId]?.[mode]?.[difficulty];
  if (!song || !sections) return null;
  return { songId, mode, difficulty, notes: buildNotes(song, sections) };
}
