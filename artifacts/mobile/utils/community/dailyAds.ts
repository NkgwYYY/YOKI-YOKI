import { DISCONNECTED_DAILY_ADS, type DailyAdSnapshot, type DailyAdPlacement, type DailyAdResult } from '../dailyAdPlacements';

export type CollectedBonus = { gained: number; remaining: number; day: string; confirmedIds: string[] };
export type Reservation = { id: string; playerId: string; mode: 'ad' | 'pass'; state: string; expiresAt?: string };
type Dependencies = {
  sessionKey: string;
  current(): boolean;
  eligibility(): { ready: boolean; rewarded: boolean; banner: boolean; pass: boolean };
  collect(): Promise<CollectedBonus>;
  pass(): Promise<boolean>;
  reserve(receipt: string, mode: 'ad' | 'pass'): Promise<Reservation>;
  present(reservation: Reservation): Promise<boolean>;
  credited(id: string): boolean;
  uuid(): string;
  pause(ms: number): Promise<void>;
};

// Shared across egg-job, every daily placement, provider remounts and account changes.
let presenting = false;
export function createDailyAds(deps: Dependencies) {
  let snapshot: DailyAdSnapshot = {...DISCONNECTED_DAILY_ADS, sessionKey: deps.sessionKey};
  let pass = false, bannerFailed = false;
  let refreshTask: Promise<void> | null = null;
  let pending: { receipt: string; reservation?: Reservation; watched: boolean } | null = null;
  const listeners = new Set<() => void>();
  const current = () => deps.current();
  const assertCurrent = () => { if (!current()) throw Error('Account changed'); };
  const publish = (patch: Partial<DailyAdSnapshot>) => {
    if (!current()) return;
    snapshot = Object.freeze({...snapshot, ...patch});
    listeners.forEach(listener => { try { listener(); } catch {} });
  };
  const accept = (result: CollectedBonus) => {
    assertCurrent();
    if (!Number.isInteger(result.remaining) || result.remaining < 0 || result.remaining > 3 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(result.day)) throw Error('Invalid quota');
    publish({remaining: result.remaining, revision: result.day});
    return result;
  };
  const isConfirmed = (id: string, result: CollectedBonus) => result.confirmedIds.includes(id) || deps.credited(id);
  const refresh = (): Promise<void> => {
    if (refreshTask) return refreshTask;
    const task = (async () => {
      try {
        assertCurrent();
        const allowed = deps.eligibility();
        if (!allowed.ready || !(allowed.rewarded || allowed.banner || allowed.pass)) {
          publish({ready: false, remaining: null, rewardedAvailable: false, bannerAvailable: false}); return;
        }
        const result = accept(await deps.collect());
        pass = allowed.pass ? await deps.pass() : false;
        assertCurrent();
        publish({ready: true, rewardedAvailable: allowed.rewarded,
          bannerAvailable: allowed.banner && !bannerFailed, removePassiveAds: pass});
        if (pending?.reservation && isConfirmed(pending.reservation.id, result) && snapshot.phase === 'verifying') {
          pending = null; publish({phase: 'idle'});
        }
        if (pending?.reservation?.expiresAt && Date.parse(pending.reservation.expiresAt) <= Date.now() && (snapshot.phase === 'verifying' || snapshot.phase === 'idle')) {
          pending = null; publish({phase: 'idle'});
        }
      } catch {
        publish({ready: false, remaining: null, bannerAvailable: false, rewardedAvailable: false});
      }
    })();
    refreshTask = task;
    void task.finally(() => { if (refreshTask === task) refreshTask = null; });
    return task;
  };
  const watch = async (placement: DailyAdPlacement, eggReceipt?: string): Promise<DailyAdResult> => {
    if (!current()) return {status: 'session-changed'};
    if (presenting) return {status: 'busy'};
    const allowed = deps.eligibility();
    if (!allowed.ready || !(allowed.rewarded || (eggReceipt && allowed.pass))) return {status: 'unavailable'};
    if (placement === 'egg-job' && !/^egg-\d{13}-[a-z0-9]{4,20}$/.test(eggReceipt ?? '')) return {status: 'unavailable'};
    presenting = true;
    publish({phase: 'loading'});
    try {
      // Reconcile first: a different screen/background recovery may have received the SSV.
      let result = accept(await deps.collect());
      const receipt = eggReceipt ?? pending?.receipt ?? `daily-${placement}-${deps.uuid()}`;
      if (pending && pending.receipt !== receipt && pending.watched) return {status: 'pending'};
      if (pending && pending.receipt !== receipt) pending = null;
      if (pending?.reservation && isConfirmed(pending.reservation.id, result)) {
        const id = pending.reservation.id; pending = null;
        return {status: 'verified', receiptId: id, points: 30};
      }
      if (!pending && result.remaining === 0) return {status: 'unavailable'};
      pending ??= {receipt, watched: false};
      // Entitlements are rechecked on each egg claim; daily rewards still require an ad.
      const claimPass = !!eggReceipt && allowed.pass ? await deps.pass() : false;
      assertCurrent();
      if (!claimPass && !allowed.rewarded) return {status: 'unavailable'};
      if (!pending.reservation) {
        pending.reservation = await deps.reserve(receipt, claimPass ? 'pass' : 'ad');
        assertCurrent();
      }
      const reservation = pending.reservation;
      if (reservation.mode === 'ad' && reservation.state !== 'earned' && !pending.watched) {
        publish({phase: 'playing'});
        const completed = await deps.present(reservation);
        assertCurrent();
        if (!completed) return {status: 'closed'};
        pending.watched = true;
      }
      publish({phase: 'verifying'});
      for (let attempt = 0; attempt < 5; attempt++) {
        result = accept(await deps.collect());
        if (isConfirmed(reservation.id, result)) {
          pending = null;
          return {status: 'verified', receiptId: reservation.id, points: 30};
        }
        if (attempt < 4) { await deps.pause(1500); assertCurrent(); }
      }
      return {status: 'pending'};
    } catch {
      return {status: current() ? 'error' : 'session-changed'};
    } finally {
      presenting = false;
      if (current()) {
        publish({phase: pending?.watched ? 'verifying' : 'idle'});
        await refresh();
      }
    }
  };
  return {
    getSnapshot: () => current() ? snapshot : DISCONNECTED_DAILY_ADS,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh,
    watchRewarded: (placement: DailyAdPlacement) => watch(placement),
    watchEgg: (receipt: string) => watch('egg-job', receipt),
    hasPass: () => pass,
    bannerError: () => { bannerFailed = true; publish({bannerAvailable: false}); },
  };
}
