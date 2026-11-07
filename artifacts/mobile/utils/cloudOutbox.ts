import type { CloudData } from './cloudSync';

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
};
export type PendingCloudUpload = { data: CloudData; receipt: string };
export const cloudOutboxKey = (accountId: string) => `@yoki/cloud_outbox_v1/${encodeURIComponent(accountId)}`;

/** Local-only, account-scoped snapshots. Never include these keys in cloud data. */
export function createCloudOutbox(storage: Storage) {
  let tail: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(work: () => Promise<T>) => {
    const next = tail.then(work, work);
    tail = next.catch(() => {});
    return next;
  };
  return {
    stage: (accountId: string, readSnapshot: () => Promise<CloudData>) => exclusive(async () => {
      const data = await readSnapshot();
      await storage.setItem(cloudOutboxKey(accountId), JSON.stringify({ version: 1, accountId, data }));
    }),
    read: (accountId: string): Promise<PendingCloudUpload | null> => exclusive(async () => {
      const receipt = await storage.getItem(cloudOutboxKey(accountId));
      if (receipt === null) return null;
      const saved = JSON.parse(receipt);
      if (saved?.version !== 1 || saved.accountId !== accountId || !saved.data
        || typeof saved.data !== 'object' || Array.isArray(saved.data)) {
        throw new Error('Pending cloud data could not be read');
      }
      return { data: saved.data, receipt };
    }),
    acknowledge: (accountId: string, receipt: string) => exclusive(async () => {
      const key = cloudOutboxKey(accountId);
      // A newer local edit may have been staged while this request was running.
      if (await storage.getItem(key) === receipt) await storage.removeItem(key);
    }),
  };
}
