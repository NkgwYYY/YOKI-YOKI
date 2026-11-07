export interface Insight { title: string; body: string }

/** Reject malformed cache/API data before it reaches React text children. */
export function readInsights(value: unknown): Insight[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every(item => item !== null && typeof item === 'object'
    && typeof item.title === 'string' && item.title.trim().length > 0
    && typeof item.body === 'string' && item.body.trim().length > 0)) return null;
  return value.map(({ title, body }) => ({ title, body }));
}

/** Guest reflection uses only counted, dated entries. It does not infer health,
 * personality or causes, and never sends records to an AI service. */
export function buildLocalInsights(records: readonly { date: string; win?: string; behaviors?: string[] }[], today: string): Insight[] {
  const byDate = new Map<string, { win?: string; behaviors?: string[] }>();
  for (const record of records) {
    if (!record || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) || record.date > today) continue;
    const date = new Date(`${record.date}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== record.date) continue;
    byDate.set(record.date, record);
  }
  const recent = [...byDate].sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([, record]) => record);
  if (!recent.length) return [];
  const insights: Insight[] = [{ title: `${recent.length}日分の記録を残したね`,
    body: 'ここに残した一日ずつの記録が、あとから自分を振り返る手がかりになるよ。' }];
  const wins = recent.filter(r => typeof r.win === 'string' && r.win.trim()).length;
  const actions = recent.filter(r => Array.isArray(r.behaviors) && r.behaviors.some(b => typeof b === 'string' && b.trim())).length;
  if (wins) insights.push({ title: `${wins}日分の「できた」があるよ`, body: '小さな成功を言葉にして残しているね。その日の自分が見つけた「できた」を、また読み返せるよ。' });
  if (actions) insights.push({ title: `${actions}日、行動を記録したね`, body: 'その日にしたことを残しているね。行動の多さや気分にかかわらず、あなたの一日の記録だよ。' });
  return insights;
}

export class InsightRequestError extends Error {
  readonly kind: 'auth' | 'limit' | 'network' | 'timeout' | 'cancelled';
  constructor(kind: InsightRequestError['kind']) {
    super(kind);
    this.name = 'InsightRequestError';
    this.kind = kind;
  }
}

/** Keep token acquisition, response headers AND body inside the same deadline.
 * A missing/expired session must never send the private payload as a guest. */
export async function requestInsights(options: {
  url: string;
  payload: Record<string, unknown>;
  getToken: () => Promise<string | null>;
  isCurrent: () => boolean;
  signal: AbortSignal;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}): Promise<Insight[]> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: () => void = () => {};
  const assertCurrent = () => {
    if (options.signal.aborted || controller.signal.aborted || !options.isCurrent()) throw new InsightRequestError('cancelled');
  };
  try {
    assertCurrent();
    const interrupted = new Promise<never>((_, reject) => {
      cancel = () => { reject(new InsightRequestError('cancelled')); controller.abort(); };
      options.signal.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => { reject(new InsightRequestError('timeout')); controller.abort(); }, options.timeoutMs ?? 15000);
    });
    const work = async () => {
      const token = await options.getToken();
      assertCurrent();
      if (!token) throw new InsightRequestError('auth');
      const response = await (options.fetcher ?? fetch)(options.url, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(options.payload),
      });
      assertCurrent();
      if (response.status === 401 || response.status === 403) throw new InsightRequestError('auth');
      if (response.status === 429) throw new InsightRequestError('limit');
      if (!response.ok) throw new InsightRequestError('network');
      const data = await response.json();
      assertCurrent();
      const valid = readInsights(data?.insights);
      if (!valid) throw new InsightRequestError('network');
      return valid;
    };
    return await Promise.race([interrupted, work()]);
  } catch (error) {
    if (error instanceof InsightRequestError) throw error;
    throw new InsightRequestError('network');
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener('abort', cancel);
  }
}
