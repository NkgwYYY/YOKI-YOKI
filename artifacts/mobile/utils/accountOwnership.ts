export const LOCAL_DATA_OWNER_KEY = '@yoki/local_data_owner_v1';
export const accountCacheKey = (accountId: string) => `@yoki/detached_account_v1/${encodeURIComponent(accountId)}`;
export const encodeDataOwner = (accountId: string | null) => JSON.stringify({ version: 1, accountId });

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  replaceSnapshot(snapshot: Record<string, string>, isCurrent: () => boolean): Promise<void>;
};

/** Ownership stays on this device and is never accepted from or sent to cloud.
 * Legacy unmarked data is retained under the first resolved identity. */
export function createAccountOwnership(storage: Storage, appKeys: readonly string[]) {
  const read = async () => {
    const raw = await storage.getItem(LOCAL_DATA_OWNER_KEY);
    if (raw === null) return null;
    const owner = JSON.parse(raw);
    if (owner?.version !== 1 || !(owner.accountId === null
      || (typeof owner.accountId === 'string' && owner.accountId.length > 0))) {
      throw new Error('Local data ownership could not be read');
    }
    return owner as { version: 1; accountId: string | null };
  };
  return {
    isGuest: async () => (await read())?.accountId === null,
    prepare: async (accountId: string | null, isCurrent: () => boolean) => {
      const assertCurrent = () => { if (!isCurrent()) throw new Error('Account changed'); };
      const owner = await read();
      assertCurrent();
      if (!owner) {
        await storage.setItem(LOCAL_DATA_OWNER_KEY, encodeDataOwner(accountId));
      } else if (accountId === null && owner.accountId !== null) {
        const entries = await Promise.all(appKeys.map(async key => [key, await storage.getItem(key)] as const));
        assertCurrent();
        const data = Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry[1] !== null));
        // Keep a local recovery copy before releasing the shared cache to a guest.
        // It is not an upload queue and must never be merged into another account.
        await storage.setItem(accountCacheKey(owner.accountId), JSON.stringify({ version: 1, accountId: owner.accountId, data }));
        await storage.replaceSnapshot({ [LOCAL_DATA_OWNER_KEY]: encodeDataOwner(null) }, isCurrent);
      }
      assertCurrent();
    },
  };
}
