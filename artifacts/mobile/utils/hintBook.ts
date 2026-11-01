export type HintSource = 'conversation' | 'insight';
export interface HintInput { id: string; title: string; body: string; source: HintSource; evidence?: string; citations?: { title: string; url: string }[] }
export interface SavedHint extends HintInput { savedAt: string }
export interface HintStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
}

export const hintBookKey = (owner: string) => {
  if (!owner.trim()) throw new Error('保存先を確認できませんでした。');
  return `@mentore/hints_v1/${encodeURIComponent(owner)}`;
};

function isHint(value: unknown): value is HintInput {
  if (!value || typeof value !== 'object') return false;
  const v = value as HintInput;
  return typeof v.id === 'string' && v.id.length > 0 && v.id.length <= 250
    && typeof v.title === 'string' && v.title.trim().length > 0 && v.title.length <= 160
    && typeof v.body === 'string' && v.body.trim().length > 0 && v.body.length <= 20000
    && (v.source === 'conversation' || v.source === 'insight')
    && (v.evidence === undefined || (typeof v.evidence === 'string' && v.evidence.length <= 3000))
    && (v.citations === undefined || (Array.isArray(v.citations) && v.citations.length <= 10 && v.citations.every(c =>
      c && typeof c.title === 'string' && c.title.length <= 300 && typeof c.url === 'string' && c.url.startsWith('https://www.mhlw.go.jp/'))));
}

/** Never replace an unreadable notebook with an empty one. */
export function parseHintBook(raw: string | null): SavedHint[] {
  if (raw === null) return [];
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('ヒント帳を読み込めませんでした。保存済みの言葉は変更していません。'); }
  if (!Array.isArray(value) || value.some(v => !isHint(v) || typeof (v as SavedHint).savedAt !== 'string' || !Number.isFinite(Date.parse((v as SavedHint).savedAt)))) {
    throw new Error('ヒント帳を読み込めませんでした。保存済みの言葉は変更していません。');
  }
  return value as SavedHint[];
}

/** One ordered queue per owner prevents simultaneous saves from losing a hint. */
export function createHintBook(storage: HintStorage) {
  const queues = new Map<string, Promise<unknown>>();
  const ordered = <T>(owner: string, work: (key: string) => Promise<T>): Promise<T> => {
    const key = hintBookKey(owner);
    const result = (queues.get(key) ?? Promise.resolve()).then(() => work(key));
    const tail = result.catch(() => {});
    queues.set(key, tail);
    void tail.then(() => { if (queues.get(key) === tail) queues.delete(key); });
    return result;
  };
  return {
    read: (owner: string) => ordered(owner, async key => parseHintBook(await storage.getItem(key))),
    save: (owner: string, input: HintInput, now = new Date()): Promise<SavedHint> => ordered(owner, async key => {
      if (!isHint(input)) throw new Error('この言葉を保存できませんでした。内容を確認してね。');
      const hints = parseHintBook(await storage.getItem(key));
      const existing = hints.find(h => h.id === input.id);
      if (existing) return existing; // Saved words remain exactly as first received.
      if (hints.length >= 500) throw new Error('ヒント帳がいっぱいです。不要な言葉を外してから、もう一度保存してね。');
      const hint: SavedHint = { id: input.id, title: input.title, body: input.body, source: input.source,
        ...(input.evidence !== undefined ? { evidence: input.evidence } : {}),
        ...(input.citations !== undefined ? { citations: input.citations.map(c => ({ title: c.title, url: c.url })) } : {}), savedAt: now.toISOString() };
      await storage.setItem(key, JSON.stringify([hint, ...hints]));
      return hint;
    }),
    remove: (owner: string, id: string) => ordered(owner, async key => {
      const hints = parseHintBook(await storage.getItem(key));
      await storage.setItem(key, JSON.stringify(hints.filter(h => h.id !== id)));
    }),
    clear: (owner: string) => ordered(owner, key => storage.removeItem(key)),
  };
}
