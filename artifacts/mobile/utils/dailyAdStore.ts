import {
  DISCONNECTED_DAILY_ADS, readDailyAdSnapshot, type DailyAdSnapshot,
} from './dailyAdPlacements';

export interface DailyAdSnapshotSource {
  getSnapshot(): DailyAdSnapshot;
  subscribe(listener: () => void): () => void;
}

const SNAPSHOT_KEYS = Object.keys(DISCONNECTED_DAILY_ADS) as (keyof DailyAdSnapshot)[];

/** A cached, immutable React external store, shared by every placement.
 * No wallet, networking, SDK initialization, targeting or reward side effects. */
export function createDailyAdStore(source: DailyAdSnapshotSource | null) {
  let snapshot = DISCONNECTED_DAILY_ADS;
  let subscriptionFailed = false;
  let generation = 0;
  let disconnect: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const getSnapshot = (): DailyAdSnapshot => {
    let next = DISCONNECTED_DAILY_ADS;
    if (source && !subscriptionFailed) {
      try { next = readDailyAdSnapshot(source.getSnapshot()); } catch { /* fail closed */ }
    }
    if (!SNAPSHOT_KEYS.every(key => snapshot[key] === next[key])) snapshot = next;
    return snapshot;
  };

  const subscribe = (listener: () => void): (() => void) => {
    // Independent registration allows even the same callback to subscribe twice.
    const registration = () => listener();
    listeners.add(registration);
    if (listeners.size === 1 && source) {
      subscriptionFailed = false;
      const current = ++generation;
      try {
        const stop = source.subscribe(() => {
          if (current !== generation) return;
          for (const notify of [...listeners]) if (listeners.has(notify)) notify();
        });
        if (typeof stop !== 'function') throw new Error('Invalid ad subscription');
        disconnect = stop;
      } catch {
        subscriptionFailed = true;
        generation++; // Ignore late calls from a partially registered listener.
        getSnapshot();
        for (const notify of [...listeners]) if (listeners.has(notify)) notify();
      }
    }
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      listeners.delete(registration);
      if (listeners.size === 0) {
        generation++;
        const stop = disconnect;
        disconnect = null;
        try { stop?.(); } catch { /* Ad cleanup must not crash a screen transition. */ }
      }
    };
  };

  return {getSnapshot, subscribe, getServerSnapshot: () => DISCONNECTED_DAILY_ADS};
}
