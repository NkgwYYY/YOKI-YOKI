type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
};
export type StorageEntry = [string, string];

/** Single-process write-ahead journal. After preparation, recovery rolls forward
 * the exact saved values, never re-applies a points delta. The journal stays local. */
export function createRecoverableStorage(storage: Storage, journalKey: string, allowedKeys: readonly string[]) {
  let tail: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(work: () => Promise<T>): Promise<T> => {
    const next = tail.then(work, work);
    tail = next.catch(() => {});
    return next;
  };
  const validate = (entries: unknown): StorageEntry[] => {
    if (!Array.isArray(entries) || !entries.length || entries.length > allowedKeys.length
      || entries.some(e => !Array.isArray(e) || e.length !== 2 || !allowedKeys.includes(e[0]) || typeof e[1] !== 'string')
      || new Set(entries.map(e => e[0])).size !== entries.length) {
      throw new Error('保存途中のデータを確認できません。データは削除していません。');
    }
    return entries;
  };
  const apply = async (entries: StorageEntry[]) => {
    for (const [key, value] of entries) await storage.setItem(key, value);
    await storage.removeItem(journalKey);
  };
  const recover = async () => {
    const raw = await storage.getItem(journalKey);
    if (raw === null) return;
    const journal = JSON.parse(raw);
    if (journal?.version !== 1) throw new Error('保存途中のデータ形式を確認できません。');
    await apply(validate(journal.entries));
  };
  const run = <T>(work: () => Promise<T>) => exclusive(async () => { await recover(); return work(); });
  return {
    getItem: (key: string) => run(() => storage.getItem(key)),
    setItem: (key: string, value: string) => run(() => storage.setItem(key, value)),
    removeItem: (key: string) => run(() => storage.removeItem(key)),
    recover: () => exclusive(recover),
    transaction: <T>(build: (values: Record<string, string | null>) => { entries: StorageEntry[]; result: T }) => run(async () => {
      const values = Object.fromEntries(await Promise.all(allowedKeys.map(async key => [key, await storage.getItem(key)])));
      const { entries, result } = build(values);
      if (!entries.length) return result;
      validate(entries);
      // No balance is touched unless this complete recovery record is durable.
      await storage.setItem(journalKey, JSON.stringify({ version: 1, entries }));
      await apply(entries);
      return result;
    }),
  };
}
