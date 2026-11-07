import type { FeedState } from '../contexts/AppContext';
import type { GameSlot, MiniGameState } from './miniGameUtils';
import type { StorageEntry } from './recoverableStorage';

export const RHYTHM_STATE_KEY = '@mentore/mini_game_v1';
const FEED_KEY = '@mentore/feed_state_v1';
type RewardState = MiniGameState & { receipts?: Record<string, number> };

/** The play ID joins the slot count and wallet credit into one retryable operation. */
export function prepareRhythmReward(values: Record<string, string | null>, playId: string, slot: GameSlot, points: number, today: string, defaultFeed: FeedState, limit: number) {
  if (!playId || !['morning', 'noon', 'night'].includes(slot) || !Number.isInteger(points) || points < 1 || points > 3) throw new Error('報酬を確認できません');
  const raw = values[RHYTHM_STATE_KEY] ? JSON.parse(values[RHYTHM_STATE_KEY]!) : null;
  const feed: FeedState = values[FEED_KEY] ? JSON.parse(values[FEED_KEY]!) : defaultFeed;
  if (!feed || !Number.isFinite(feed.points) || feed.points < 0) throw new Error('保存済みのポイントを確認できません');
  const game: RewardState = { date: today, morning: 0, noon: 0, night: 0, receipts: raw?.receipts ?? {} };
  if (raw?.date === today) {
    for (const key of ['morning', 'noon', 'night'] as const) {
      const count = typeof raw[key] === 'boolean' ? Number(raw[key]) : raw[key] ?? 0;
      if (!Number.isInteger(count) || count < 0) throw new Error('保存済みのプレイ回数を確認できません');
      game[key] = count;
    }
  }
  if (!game.receipts || typeof game.receipts !== 'object' || Array.isArray(game.receipts)
    || Object.values(game.receipts).some(value => !Number.isInteger(value) || value < 1 || value > 3)) throw new Error('保存済みの報酬を確認できません');
  const previous = Object.prototype.hasOwnProperty.call(game.receipts, playId) ? game.receipts![playId] : 0;
  if (previous || game[slot] >= limit) return { entries: [] as StorageEntry[], result: { game, feed, earned: previous, newlyGranted: false } };
  const receipts = Object.fromEntries([...Object.entries(game.receipts!), [playId, points]].slice(-32));
  const nextGame = { ...game, [slot]: game[slot] + 1, receipts };
  const nextFeed = { ...feed, points: feed.points + points };
  const entries: StorageEntry[] = [[RHYTHM_STATE_KEY, JSON.stringify(nextGame)], [FEED_KEY, JSON.stringify(nextFeed)]];
  return { entries, result: { game: nextGame, feed: nextFeed, earned: points, newlyGranted: true } };
}
