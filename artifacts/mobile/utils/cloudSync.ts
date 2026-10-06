export type CloudData = Record<string, unknown>;
export type CloudSyncState = {
  ready: boolean;
  phase: 'idle' | 'pull' | 'push';
  error: 'pull' | 'push' | null;
};

export const INITIAL_CLOUD_SYNC_STATE: CloudSyncState = { ready: false, phase: 'idle', error: null };
export const CLOUD_SYNC_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The deadline includes token acquisition and reading the response body. */
export function createCloudSyncTransport(options: {
  url: string;
  getToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}) {
  const request = async (method: 'GET' | 'PUT' | 'DELETE', signal: AbortSignal, data?: CloudData) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel = () => {};
    const interrupted = new Promise<never>((_, reject) => {
      cancel = () => { controller.abort(); reject(new Error('Sync cancelled')); };
      signal.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => { controller.abort(); reject(new Error('Sync timed out')); }, options.timeoutMs ?? CLOUD_SYNC_TIMEOUT_MS);
      if (signal.aborted) cancel();
    });
    const work = async () => {
      const token = await options.getToken();
      if (controller.signal.aborted || !token) throw new Error('Sync authentication unavailable');
      const response = await (options.fetcher ?? fetch)(options.url, {
        method, signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}) },
        ...(method === 'PUT' ? { body: JSON.stringify({ data }) } : {}),
      });
      if (!response.ok) throw new Error('Sync request failed');
      const body: unknown = await response.json();
      if (!isRecord(body)) throw new Error('Invalid sync response');
      if (method === 'GET') {
        if (!isRecord(body.data)) throw new Error('Invalid sync data');
        return body.data;
      }
      if (body.ok !== true) throw new Error('Sync was not acknowledged');
      return {};
    };
    try { return await Promise.race([work(), interrupted]); }
    finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); }
  };
  return {
    pull: (signal: AbortSignal) => request('GET', signal),
    push: async (data: CloudData, signal: AbortSignal) => { await request('PUT', signal, data); },
    deleteAccount: async (signal: AbortSignal) => { await request('DELETE', signal); },
  };
}

/** One signed-in session. Upload retries never pull over unacknowledged local edits. */
export function createCloudSyncSession(options: {
  pull: (signal: AbortSignal) => Promise<CloudData>;
  apply: (data: CloudData, isCurrent: () => boolean, source: 'cloud' | 'outbox') => Promise<{ backup: boolean }>;
  read: () => Promise<CloudData>;
  push: (data: CloudData, signal: AbortSignal) => Promise<void>;
  onState: (state: CloudSyncState) => void;
  isCurrent: () => boolean;
  onGuestBackup?: () => void;
  pending?: {
    stage: () => Promise<void>;
    read: () => Promise<{ data: CloudData; receipt: string } | null>;
    acknowledge: (receipt: string) => Promise<void>;
  };
}) {
  let state = { ...INITIAL_CLOUD_SYNC_STATE };
  let disposed = false;
  let guestBackupPending = false;
  let tail: Promise<boolean> = Promise.resolve(false);
  let initializing: Promise<boolean> | null = null;
  const controller = new AbortController();
  const current = () => !disposed && options.isCurrent();
  const publish = (next: CloudSyncState) => {
    if (!current()) return;
    state = next;
    options.onState({ ...state });
  };
  const enqueue = (work: () => Promise<boolean>) => {
    const next = tail.then(work, work);
    tail = next;
    return next;
  };
  const upload = async (staged?: Promise<boolean>) => {
    if (!current() || !state.ready) return false;
    publish({ ...state, phase: 'push', error: null });
    try {
      if (staged && !await staged) throw new Error('Could not preserve pending upload');
      if (options.pending && !staged) await options.pending.stage();
      const pending = await options.pending?.read();
      const data = options.pending ? pending?.data : await options.read();
      if (!current()) return false;
      // An earlier queued request may already have acknowledged this snapshot.
      if (data) await options.push(data, controller.signal);
      if (!current()) return false;
      if (pending) await options.pending!.acknowledge(pending.receipt);
      if (!current()) return false;
      publish({ ...state, phase: 'idle', error: null });
      if (guestBackupPending) {
        guestBackupPending = false;
        options.onGuestBackup?.();
      }
      return true;
    } catch {
      publish({ ...state, phase: 'idle', error: 'push' });
      return false;
    }
  };
  const initialize = () => {
    if (initializing) return initializing;
    initializing = enqueue(async () => {
      if (!current() || state.ready) return false;
      publish({ ready: false, phase: 'pull', error: null });
      try {
        const pending = await options.pending?.read();
        if (!current()) return false;
        if (pending) {
          // Validate the account by uploading its unacknowledged snapshot before
          // any pull could replace it with an older cloud copy on app restart.
          await options.push(pending.data, controller.signal);
          if (!current()) return false;
          const result = await options.apply(pending.data, current, 'outbox');
          if (!current()) return false;
          await options.pending!.acknowledge(pending.receipt);
          guestBackupPending = result.backup;
          publish({ ready: true, phase: 'idle', error: null });
          return result.backup ? await upload() : true;
        }
        const data = await options.pull(controller.signal);
        if (!current()) return false;
        const result = await options.apply(data, current, 'cloud');
        if (!current()) return false;
        guestBackupPending = result.backup;
        publish({ ready: true, phase: 'idle', error: null });
        return result.backup ? await upload() : true;
      } catch {
        publish({ ready: false, phase: 'idle', error: 'pull' });
        return false;
      }
    }).finally(() => { initializing = null; });
    return initializing;
  };
  const push = () => {
    if (!current() || !state.ready) return Promise.resolve(false);
    // Persist edits without waiting for an older network request to finish.
    // Attach a rejection handler immediately even when uploads are queued.
    const staged = options.pending?.stage().then(() => true, () => false);
    return enqueue(() => upload(staged));
  };
  return {
    initialize, push,
    retry: () => state.ready ? push() : initialize(),
    dispose: () => { disposed = true; controller.abort(); },
  };
}
