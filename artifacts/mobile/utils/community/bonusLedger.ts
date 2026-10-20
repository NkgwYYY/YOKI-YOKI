export type VerifiedBonus = { id: string; receipt_id: string; amount: number };
const KEY = '@mentore/feed_state_v1';
/** The ID and balance delta are persisted together by the existing write-ahead journal. */
export function prepareVerifiedBonus<T extends { points: number; communityBonuses?: string[] }>(values: Record<string, string | null>, claim: VerifiedBonus, fallback: T) {
  if (!/^[\da-f-]{36}$/i.test(claim.id) || claim.amount !== 30) throw Error('追加報酬を確認できません。');
  const feed: T = values[KEY] ? JSON.parse(values[KEY]!) : fallback;
  const receipts = Array.isArray(feed.communityBonuses) ? feed.communityBonuses : [];
  if (receipts.includes(claim.id)) return { entries: [] as [string, string][], result: { feed, gained: 0 } };
  const next = { ...feed, points: Math.max(0, Number(feed.points) || 0) + claim.amount, communityBonuses: [...receipts, claim.id] };
  return { entries: [[KEY, JSON.stringify(next)]] as [string, string][], result: { feed: next, gained: claim.amount } };
}
