// Local-only AI/chat data. None of these keys belong in a cloud snapshot.
export const PRIVATE_CACHE_KEYS = {
  CHAT: '@mentore/chat_history_v1',
  INSIGHT: '@mentore/insight_v1',
  HOME_COMMENT: '@mentore/home_comment_v1',
} as const;
export type PrivateCacheKey = typeof PRIVATE_CACHE_KEYS[keyof typeof PRIVATE_CACHE_KEYS];
export const PRIVATE_CACHE_MIGRATION_KEY = '@yoki/private_cache_migration_v1';
export const privateCacheKey = (accountId: string | null) =>
  `@yoki/private_cache_v1/${accountId === null ? 'guest' : `account/${encodeURIComponent(accountId)}`}`;

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
};
type Data = Partial<Record<PrivateCacheKey, string>>;
type Envelope = { version: 1; accountId: string | null; data: Data; deleted?: true };
export type PrivateCache = {
  /** Unique for this resolved identity lifetime, including A -> loading -> A. */
  id: number;
  isCurrent(): boolean;
  getItem(key: PrivateCacheKey): Promise<string | null>;
  setItem(key: PrivateCacheKey, value: string): Promise<void>;
  removeItem(key: PrivateCacheKey): Promise<void>;
};

const keys: readonly string[] = Object.values(PRIVATE_CACHE_KEYS);
const validOwner = (id: unknown): id is string | null => id === null || (typeof id === 'string' && id.length > 0);
const readEnvelope = (raw: string, accountId?: string | null): Envelope => {
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !validOwner(value.accountId)
    || (accountId !== undefined && value.accountId !== accountId)
    || !value.data || typeof value.data !== 'object' || Array.isArray(value.data)
    || Object.entries(value.data).some(([key, content]) => !keys.includes(key) || typeof content !== 'string')
    || (value.deleted !== undefined && value.deleted !== true)
    || (value.deleted && Object.keys(value.data).length)) throw new Error('Private cache could not be read');
  return value;
};

/** One queue covers migration, reads, writes and deletion. A complete envelope
 * is written atomically; the migration journal retains legacy bytes until every
 * removal has succeeded. Guest conversations stay on this device as a separate
 * guest history and are never silently assigned to the next signed-in user. */
export function createPrivateCacheStore(storage: Storage, ownerKey: string) {
  let tail: Promise<unknown> = Promise.resolve();
  let nextId = 0;
  const revoked = new Set<string>();
  const exclusive = <T>(work: () => Promise<T>): Promise<T> => {
    const result = tail.then(work, work);
    tail = result.catch(() => {});
    return result;
  };
  const assertCurrent = (current: () => boolean) => { if (!current()) throw new Error('Account changed'); };
  const migrate = async (fallback: string | null, current: () => boolean) => {
    assertCurrent(current);
    const saved = await storage.getItem(PRIVATE_CACHE_MIGRATION_KEY);
    let journal: Envelope;
    if (saved !== null) {
      const value = JSON.parse(saved);
      if (value?.version === 1 && value.complete === true) return;
      journal = readEnvelope(saved);
    } else {
      const entries = await Promise.all(keys.map(async key => [key, await storage.getItem(key)] as const));
      const data = Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry[1] !== null));
      const rawOwner = await storage.getItem(ownerKey);
      const owner = rawOwner === null ? { version: 1, accountId: fallback } : JSON.parse(rawOwner);
      if (owner?.version !== 1 || !validOwner(owner.accountId)) throw new Error('Local ownership could not be read');
      journal = { version: 1, accountId: owner.accountId, data };
      assertCurrent(current);
      if (entries.every(([, value]) => value === null)) {
        await storage.setItem(PRIVATE_CACHE_MIGRATION_KEY, JSON.stringify({ version: 1, complete: true }));
        return;
      }
      const existing = await storage.getItem(privateCacheKey(journal.accountId));
      if (existing !== null) {
        const target = readEnvelope(existing, journal.accountId);
        if (target.deleted) journal = target;
        else {
          if (Object.entries(data).some(([key, value]) => target.data[key as PrivateCacheKey] !== undefined
            && target.data[key as PrivateCacheKey] !== value)) throw new Error('Conflicting private caches were preserved');
          journal.data = { ...data, ...target.data };
        }
      }
      assertCurrent(current);
      await storage.setItem(PRIVATE_CACHE_MIGRATION_KEY, JSON.stringify(journal));
    }
    // Once durable, finish the exact recorded owner's migration even if the
    // active identity changes. No subsequent lease is opened for the stale caller.
    await storage.setItem(privateCacheKey(journal.accountId), JSON.stringify(journal));
    for (const key of keys) await storage.removeItem(key);
    await storage.setItem(PRIVATE_CACHE_MIGRATION_KEY, JSON.stringify({ version: 1, complete: true }));
  };
  return {
    open: (accountId: string | null, current: () => boolean): Promise<PrivateCache> => exclusive(async () => {
      await migrate(accountId, current);
      assertCurrent(current);
      const isCurrent = () => current() && !(accountId !== null && revoked.has(accountId));
      const access = <T>(key: PrivateCacheKey, work: (value: Envelope) => Promise<T>) => exclusive(async () => {
        assertCurrent(isCurrent);
        if (!keys.includes(key)) throw new Error('Invalid private cache key');
        const raw = await storage.getItem(privateCacheKey(accountId));
        const value: Envelope = raw === null ? { version: 1, accountId, data: {} } : readEnvelope(raw, accountId);
        if (value.deleted) throw new Error('Account was deleted');
        assertCurrent(isCurrent);
        const result = await work(value);
        assertCurrent(isCurrent);
        return result;
      });
      return {
        id: ++nextId, isCurrent,
        getItem: key => access(key, async value => value.data[key] ?? null),
        setItem: (key, content) => access(key, async value => {
          if (typeof content !== 'string') throw new Error('Invalid private cache value');
          value.data[key] = content;
          await storage.setItem(privateCacheKey(accountId), JSON.stringify(value));
        }),
        removeItem: key => access(key, async value => {
          delete value.data[key];
          await storage.setItem(privateCacheKey(accountId), JSON.stringify(value));
        }),
      };
    }),
    /** Called only after the server acknowledges deletion. Keep a content-free
     * tombstone so even a restart cannot reopen or recreate the deleted cache. */
    deleteAccount: (accountId: string, current: () => boolean) => exclusive(async () => {
      await migrate(accountId, current);
      assertCurrent(current);
      revoked.add(accountId);
      await storage.setItem(privateCacheKey(accountId), JSON.stringify({ version: 1, accountId, data: {}, deleted: true }));
    }),
  };
}
