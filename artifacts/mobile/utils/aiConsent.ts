import AsyncStorage from '@react-native-async-storage/async-storage';

const VERSION = 1;
const key = (owner: string) => `@yoki/ai-sharing-v${VERSION}/${encodeURIComponent(owner)}`;
const blocked = new Set<string>();
const revisions = new Map<string, number>();
const requests = new Map<string, Set<AbortController>>();
const writes = new Map<string, Promise<void>>();

export async function hasAiConsent(owner: string): Promise<boolean> {
  if (blocked.has(owner)) return false;
  try {
    const receipt = JSON.parse(await AsyncStorage.getItem(key(owner)) ?? 'null');
    return !blocked.has(owner) && receipt?.version === VERSION && receipt?.allowed === true;
  } catch { return false; }
}

export async function setAiConsent(owner: string, allowed: boolean): Promise<void> {
  const revision = (revisions.get(owner) ?? 0) + 1;
  revisions.set(owner, revision);
  blocked.add(owner);
  for (const controller of requests.get(owner) ?? []) controller.abort();
  // Grant only after the choice is safely stored. A failed withdrawal remains
  // blocked for this session and the UI asks the user to retry saving it.
  const write = (writes.get(owner) ?? Promise.resolve()).catch(() => {}).then(() =>
    AsyncStorage.setItem(key(owner), JSON.stringify({ version: VERSION, allowed })));
  writes.set(owner, write);
  try {
    await write;
    if (allowed && revisions.get(owner) === revision) blocked.delete(owner);
  } finally { if (writes.get(owner) === write) writes.delete(owner); }
}

export async function postAiJson(
  owner: string,
  url: string,
  body: unknown,
  options: { signal?: AbortSignal; headers?: Record<string, string> } = {},
): Promise<{ ok: boolean; data: any }> {
  const revision = revisions.get(owner) ?? 0;
  if (!await hasAiConsent(owner) || revision !== (revisions.get(owner) ?? 0)) {
    throw new Error('AIへの情報送信への同意が必要です。');
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  const active = requests.get(owner) ?? new Set<AbortController>();
  requests.set(owner, active);
  active.add(controller);
  const timer = setTimeout(cancel, 30000);
  try {
    if (controller.signal.aborted) throw new Error('送信を中止しました。');
    const response = await fetch(url, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (controller.signal.aborted) throw new Error('送信を中止しました。');
    return { ok: response.ok, data };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
    active.delete(controller);
    if (!active.size) requests.delete(owner);
  }
}
