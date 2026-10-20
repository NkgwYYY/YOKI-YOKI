export interface Insight { title: string; body: string }

/** Guest reflection uses stored activity counts only; no health inference or network. */
export function guestInsights(input: { dates: string[]; checkedToday: number; streak: number; badges: number }): Insight[] {
  const days = new Set(input.dates.filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))).size;
  if (!days) return [];
  const count = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const result = [{ title: `${days}日分の記録を残したね`, body: 'その日の気持ちを書き留めたことが、振り返れる記録になっています。' }];
  if (count(input.checkedToday)) result.push({title: `今日のチェックは${count(input.checkedToday)}個`, body: '今日できたことに、自分で印をつけられました。小さなことも、あなたの一歩です。'});
  else if (count(input.streak) > 1) result.push({title: `${count(input.streak)}日、記録が続いているね`, body: 'これまで残してきた記録があります。これからも、自分のペースで大丈夫です。'});
  if (count(input.badges)) result.push({title: `${count(input.badges)}個のバッジが集まったね`, body: 'アプリで続けてきた活動が、バッジとして残っています。'});
  return result;
}

export const insightCacheKey = (owner: string) => `@mentore/insight_v2/${encodeURIComponent(owner)}`;

/** Reject malformed cache/API data before it reaches React text children. */
export function readInsights(value: unknown): Insight[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every(item => item !== null && typeof item === 'object'
    && typeof item.title === 'string' && item.title.trim().length > 0
    && typeof item.body === 'string' && item.body.trim().length > 0)) return null;
  return value.map(({ title, body }) => ({ title, body }));
}
