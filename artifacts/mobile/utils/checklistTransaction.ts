import type { CheckedState, DailyRecord, FeedState, UnlockedBadge, UserProgress } from '../contexts/AppContext';
import type { ChecklistItemDef } from '../data/defaultChecklist';
import type { StorageEntry } from './recoverableStorage';
import { calculateLevel, calculateMentalMuscle, XP_FOR_CHECKLIST_ITEM, XP_FULL_DAY_BONUS } from './gameLogic';
import { applyElapsedEnergy, applyEnergyGain, resolveLightEnergyState, GAIN_CHECK_ITEM, GAIN_FULL_DAY_BONUS } from './lightEnergy';

export const CHECK_KEYS = {
  items: '@mentore/checklist_items_v3', checked: '@mentore/checked_state_v2',
  progress: '@mentore/progress_v2', feed: '@mentore/feed_state_v1',
  energy: '@mentore/light_energy_v1', badges: '@mentore/badges_v2', records: '@mentore/records_v2',
} as const;
export type ChecklistOperation =
  | { kind: 'check'; id: string; checked: boolean }
  | { kind: 'add'; item: ChecklistItemDef }
  | { kind: 'remove'; id: string }
  | { kind: 'reset' };

/** Write exact target states. Earned IDs survive removal/reset until the next day. */
export function prepareChecklist(values: Record<string, string | null>, operation: ChecklistOperation, today: string,
  defaults: { items: ChecklistItemDef[]; progress: UserProgress; feed: FeedState },
  rewards: { item: number; fullDay: number }, now = new Date()) {
  const parse = <T,>(key: string, fallback: T): T => values[key] == null ? fallback : JSON.parse(values[key]!);
  let items = parse<ChecklistItemDef[]>(CHECK_KEYS.items, defaults.items);
  const raw = parse<CheckedState | null>(CHECK_KEYS.checked, null);
  const validItem = (i: ChecklistItemDef) => i && typeof i.id === 'string' && !!i.id && typeof i.text === 'string'
    && ['basics', 'body', 'mind', 'social'].includes(i.category);
  if (!Array.isArray(items) || items.some(i => !validItem(i)) || new Set(items.map(i => i.id)).size !== items.length
    || (raw !== null && (!raw || typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)
      || typeof raw.bonusEarned !== 'boolean' || !Array.isArray(raw.items)
      || raw.items.some(i => !i || typeof i.id !== 'string' || !i.id || typeof i.checked !== 'boolean' || typeof i.xpEarned !== 'boolean')
      || new Set(raw.items.map(i => i.id)).size !== raw.items.length
      || (raw.earnedItemIds !== undefined && (!Array.isArray(raw.earnedItemIds) || raw.earnedItemIds.some(id => typeof id !== 'string')))))) {
    throw new Error('保存済みのチェック項目を確認できません');
  }
  const sameDay = raw?.date === today;
  const earned = new Set(sameDay ? [...(raw.earnedItemIds ?? []), ...raw.items.filter(i => i.xpEarned).map(i => i.id)] : []);
  let checked: CheckedState = { date: today, bonusEarned: sameDay ? !!raw.bonusEarned : false,
    earnedItemIds: [...earned], items: items.map(item => ({ id: item.id,
      checked: sameDay ? raw.items.find(i => i.id === item.id)?.checked ?? false : false,
      xpEarned: earned.has(item.id) })) };
  let progress = parse<UserProgress>(CHECK_KEYS.progress, defaults.progress);
  let feed = parse<FeedState>(CHECK_KEYS.feed, defaults.feed);
  let energy = resolveLightEnergyState(parse(CHECK_KEYS.energy, null), today);
  let badges = parse<UnlockedBadge[]>(CHECK_KEYS.badges, []);
  let gainedEnergy = 0;
  let newestBadge: string | null = null;
  const entries: StorageEntry[] = [];
  if (operation.kind === 'add') {
    if (!validItem(operation.item) || !operation.item.text.trim()) throw new Error('追加する項目を確認できません');
    if (!items.some(i => i.id === operation.item.id)) {
      items = [...items, operation.item];
      checked.items = [...checked.items, { id: operation.item.id, checked: false, xpEarned: earned.has(operation.item.id) }];
    }
  } else if (operation.kind === 'remove') {
    items = items.filter(i => i.id !== operation.id);
    checked.items = checked.items.filter(i => i.id !== operation.id);
  } else if (operation.kind === 'reset') {
    items = defaults.items;
    checked.items = items.map(i => ({ id: i.id, checked: false, xpEarned: earned.has(i.id) }));
  } else {
    if (!items.some(i => i.id === operation.id)) throw new Error('このチェック項目は見つかりません');
    if (!progress || ![progress.experience, progress.streak, progress.totalDays].every(n => Number.isFinite(n) && n >= 0)
      || !feed || !Number.isFinite(feed.points) || feed.points < 0
      || !Array.isArray(badges) || badges.some(b => !b || typeof b.id !== 'string')
      || ![rewards.item, rewards.fullDay].every(n => Number.isFinite(n) && n >= 0)) throw new Error('保存済みの報酬を確認できません');
    const firstCheck = operation.checked && !earned.has(operation.id);
    if (firstCheck) earned.add(operation.id);
    checked.items = checked.items.map(i => i.id === operation.id ? { ...i, checked: operation.checked, xpEarned: earned.has(i.id) } : i);
    const allChecked = checked.items.length > 0 && checked.items.every(i => i.checked);
    const fullDay = operation.checked && allChecked && !checked.bonusEarned;
    checked.bonusEarned ||= fullDay;
    const xp = (firstCheck ? XP_FOR_CHECKLIST_ITEM : 0) + (fullDay ? XP_FULL_DAY_BONUS : 0);
    const experience = progress.experience + xp;
    progress = { ...progress, experience, level: calculateLevel(experience), mentalMuscle: calculateMentalMuscle(experience) };
    feed = { ...feed, points: feed.points + (firstCheck ? rewards.item : 0) + (fullDay ? rewards.fullDay : 0) };
    const settled = applyElapsedEnergy(energy, today, now);
    energy = firstCheck ? applyEnergyGain(settled, GAIN_CHECK_ITEM, today) : settled;
    if (fullDay) energy = applyEnergyGain(energy, GAIN_FULL_DAY_BONUS, today);
    gainedEnergy = energy.totalEnergy - settled.totalEnergy;
    const records = parse<DailyRecord[]>(CHECK_KEYS.records, []);
    if (!Array.isArray(records)) throw new Error('保存済みの記録を確認できません');
    badges = [...badges];
    const unlock = (id: string, condition: boolean) => {
      if (condition && !badges.some(b => b.id === id)) { badges.push({ id, unlockedAt: now.toISOString() }); newestBadge = id; }
    };
    unlock('firstStep', records.length >= 1);
    unlock('streak3', progress.streak >= 3); unlock('streak7', progress.streak >= 7); unlock('streak30', progress.streak >= 30);
    unlock('moodLogger7', records.length >= 7); unlock('levelUp5', progress.level >= 5); unlock('checkMaster', allChecked);
    entries.push([CHECK_KEYS.progress, JSON.stringify(progress)], [CHECK_KEYS.feed, JSON.stringify(feed)],
      [CHECK_KEYS.energy, JSON.stringify(energy)], [CHECK_KEYS.badges, JSON.stringify(badges)]);
  }
  checked.earnedItemIds = [...earned];
  entries.unshift([CHECK_KEYS.items, JSON.stringify(items)], [CHECK_KEYS.checked, JSON.stringify(checked)]);
  return { entries: entries.filter(([key, value]) => values[key] !== value),
    result: { items, checked, progress, feed, energy, badges, gainedEnergy, newestBadge } };
}
