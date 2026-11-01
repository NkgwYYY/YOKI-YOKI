export interface ConversationStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
}
const ownerPart = (owner: string) => {
  if (!owner.trim()) throw new Error('会話の保存先を確認できませんでした。');
  return encodeURIComponent(owner);
};
export const chatHistoryKey = (owner: string) => `@mentore/chat_history_v2/${ownerPart(owner)}`;
export const homeCommentCacheKey = (owner: string) => `@mentore/home_comment_v2/${ownerPart(owner)}`;

/** Legacy v1 history has no owner metadata and may contain multiple accounts.
 * Keep those bytes intact; never assign them to whoever signs in next. */
export function createConversationStorage(storage: ConversationStorage) {
  const queues = new Map<string, Promise<unknown>>();
  const ordered = <T>(owner: string, action: (key: string) => Promise<T>) => {
    const key = chatHistoryKey(owner);
    const result = (queues.get(key) ?? Promise.resolve()).then(() => action(key));
    const tail = result.catch(() => {}); queues.set(key, tail);
    void tail.then(() => { if (queues.get(key) === tail) queues.delete(key); });
    return result;
  };
  return {
    read: (owner: string) => ordered(owner, key => storage.getItem(key)),
    write: (owner: string, value: string) => ordered(owner, key => storage.setItem(key, value)),
    clear: (owner: string) => ordered(owner, key => storage.removeItem(key)),
    clearAll: (owner: string) => ordered(owner, async key => {
      const results = await Promise.allSettled([storage.removeItem(key), storage.removeItem(homeCommentCacheKey(owner))]);
      const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failure) throw failure.reason;
    }),
  };
}
