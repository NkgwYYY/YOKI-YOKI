import type { DailyRecord, FeedState, RecordExtras, UnlockedBadge, UserProgress } from '../contexts/AppContext';
import type { StorageEntry } from './recoverableStorage';
import { calculateLevel, calculateMentalMuscle, XP_FOR_MOOD_RECORD } from './gameLogic';
import { applyElapsedEnergy, applyEnergyGain, resolveLightEnergyState, GAIN_MOOD_RECORD, GAIN_DIARY } from './lightEnergy';

export const RECORD_KEYS = {
  records: '@mentore/records_v2', progress: '@mentore/progress_v2',
  feed: '@mentore/feed_state_v1', energy: '@mentore/light_energy_v1',
  badges: '@mentore/badges_v2', checked: '@mentore/checked_state_v2',
} as const;

/** The persisted date is the receipt: recovery/retry cannot credit the same day twice. */
export function prepareDailyRecord(
  values: Record<string, string | null>,
  input: { today: string; yesterday: string; mood: number; sleep: number; behaviors: string[]; notes: string; extras?: RecordExtras },
  defaults: { progress: UserProgress; feed: FeedState },
  foodPoints: number,
  now = new Date(),
) {
  const parse = <T,>(key: string, fallback: T): T => values[key] == null ? fallback : JSON.parse(values[key]!);
  const records = parse<DailyRecord[]>(RECORD_KEYS.records, []);
  const progress = parse<UserProgress>(RECORD_KEYS.progress, defaults.progress);
  const feed = parse<FeedState>(RECORD_KEYS.feed, defaults.feed);
  const badges = parse<UnlockedBadge[]>(RECORD_KEYS.badges, []);
  if (!Array.isArray(records) || records.some(r => !r || typeof r.date !== 'string')
    || !progress || ![progress.experience, progress.streak, progress.totalDays].every(n => Number.isFinite(n) && n >= 0)
    || !feed || !Number.isFinite(feed.points) || feed.points < 0
    || !Array.isArray(badges) || badges.some(b => !b || typeof b.id !== 'string')) {
    throw new Error('保存済みの記録を確認できません。データは変更していません。');
  }
  if (!Number.isInteger(input.mood) || input.mood < 1 || input.mood > 5
    || !Number.isFinite(input.sleep) || input.sleep < 0 || input.sleep > 12
    || !Number.isFinite(foodPoints) || foodPoints < 0) throw new Error('記録内容を確認できません');
  const index = records.findIndex(r => r.date === input.today);
  const isNew = index === -1;
  const record: DailyRecord = {
    id: (isNew ? undefined : records[index].id) ?? `r_${now.getTime()}`,
    date: input.today, mood: input.mood, sleep: input.sleep,
    sleepRecorded: input.extras?.sleepRecorded ?? true,
    behaviors: input.behaviors, notes: input.notes,
    exercise: input.extras?.exercise, meal: input.extras?.meal, social: input.extras?.social,
    win: input.extras?.win?.trim() || undefined, activities: input.extras?.activities,
  };
  const nextRecords = isNew ? [...records, record] : records.map((r, i) => i === index ? record : r);
  const experience = progress.experience + (isNew ? XP_FOR_MOOD_RECORD : 0);
  const nextProgress = isNew ? {
    ...progress, experience, level: calculateLevel(experience), mentalMuscle: calculateMentalMuscle(experience),
    streak: progress.lastRecordDate === input.yesterday ? progress.streak + 1 : progress.lastRecordDate === input.today ? progress.streak : 1,
    totalDays: progress.totalDays + 1, lastRecordDate: input.today,
  } : progress;
  const nextFeed = { ...feed, points: feed.points + (isNew ? foodPoints : 0) };
  const settled = applyElapsedEnergy(resolveLightEnergyState(parse(RECORD_KEYS.energy, null), input.today), input.today, now);
  let energy = applyEnergyGain(settled, GAIN_MOOD_RECORD, input.today, 'mood');
  if (input.notes.trim() || input.extras?.win?.trim()) energy = applyEnergyGain(energy, GAIN_DIARY, input.today, 'diary');
  const checked = parse<{ date: string; items: { checked: boolean }[] } | null>(RECORD_KEYS.checked, null);
  const allChecked = checked?.date === input.today && !!checked.items?.length && checked.items.every(i => i.checked);
  const nextBadges = [...badges];
  let newestBadge: string | null = null;
  const unlock = (id: string, condition: boolean) => {
    if (condition && !nextBadges.some(b => b.id === id)) {
      nextBadges.push({ id, unlockedAt: now.toISOString() }); newestBadge = id;
    }
  };
  unlock('firstStep', nextRecords.length >= 1);
  unlock('streak3', nextProgress.streak >= 3);
  unlock('streak7', nextProgress.streak >= 7);
  unlock('streak30', nextProgress.streak >= 30);
  unlock('moodLogger7', nextRecords.length >= 7);
  unlock('levelUp5', nextProgress.level >= 5);
  unlock('checkMaster', !!allChecked);
  const entries: StorageEntry[] = [
    [RECORD_KEYS.records, JSON.stringify(nextRecords)], [RECORD_KEYS.progress, JSON.stringify(nextProgress)],
    [RECORD_KEYS.feed, JSON.stringify(nextFeed)], [RECORD_KEYS.energy, JSON.stringify(energy)],
    [RECORD_KEYS.badges, JSON.stringify(nextBadges)],
  ];
  return {
    entries: entries.filter(([key, value]) => values[key] !== value),
    result: { records: nextRecords, progress: nextProgress, feed: nextFeed, energy, badges: nextBadges,
      newestBadge, gainedEnergy: energy.totalEnergy - settled.totalEnergy },
  };
}
