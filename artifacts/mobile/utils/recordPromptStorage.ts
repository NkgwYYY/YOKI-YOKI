// Local-only record reminders, isolated from existing record/cloud storage.
export type RecordPromptStorage = {
  isCurrent(): boolean;
  getItem(): Promise<string | null>;
  setItem(value: string): Promise<void>;
};
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
export const recordPromptStorageKey = (accountId: string | null) =>
  '@yoki/record_prompt_scoped_v1/' + (accountId === null ? 'guest' : 'account/' + encodeURIComponent(accountId));
export function createRecordPromptStore(storage: Storage) {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    open(accountId: string | null, isCurrent: () => boolean): RecordPromptStorage {
      const key = recordPromptStorageKey(accountId);
      const run = <T>(work: () => Promise<T>): Promise<T> => {
        const check = () => { if (!isCurrent()) throw new Error('Account changed'); };
        const job = async () => { check(); const result = await work(); check(); return result; };
        const result = tail.then(job, job);
        tail = result.catch(() => {});
        return result;
      };
      return { isCurrent, getItem: () => run(() => storage.getItem(key)),
        setItem: value => run(async () => { await storage.setItem(key, value); }) };
    },
  };
}
