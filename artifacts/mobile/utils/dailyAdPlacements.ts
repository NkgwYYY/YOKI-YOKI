/** Placement-only extension. The existing ad service owns consent, SSV and rewards. */
export const DAILY_AD_POINTS = 30;
export const DAILY_AD_LIMIT = 3;
export const BANNER_WIDTH = 320;
export const BANNER_HEIGHT = 50;
export const BANNER_RAIL_HEIGHT = 88;
export const BANNER_MIN_VIEWPORT_HEIGHT = 640;

export type DailyAdPlacement = 'home' | 'street' | 'meal' | 'egg-job';
export type DailyAdPhase = 'idle' | 'loading' | 'playing' | 'verifying';
export type DailyAdSnapshot = Readonly<{
  /** Opaque session key; change on login, logout, or a different signed-in user. */
  sessionKey: string;
  /** Date/entitlement revision provided by the shared service, not by this UI. */
  revision: string;
  ready: boolean;
  /** Null until the authoritative shared quota has loaded. */
  remaining: number | null;
  rewardedAvailable: boolean;
  bannerAvailable: boolean;
  /** An ad-free pass removes passive ads, not optional user-requested rewards. */
  removePassiveAds: boolean;
  phase: DailyAdPhase;
}>;

export type DailyAdEnvironment = Readonly<{
  screenActive: boolean;
  foreground: boolean;
  /** True when ANOTHER overlay covers this placement, or during a transition.
   * For meal, its own food sheet is the surface, not an obscuring overlay. */
  obscured: boolean;
  /** True during gesture movement, gameplay or feeding animation. */
  interacting: boolean;
  keyboardOpen: boolean;
  width: number;
  height: number;
}>;

export const DISCONNECTED_DAILY_ADS: DailyAdSnapshot = Object.freeze({
  sessionKey: '', revision: '', ready: false, remaining: null,
  rewardedAvailable: false, bannerAvailable: false,
  removePassiveAds: false, phase: 'idle',
});

export function isDailyAdPlacement(value: unknown): value is DailyAdPlacement {
  return value === 'home' || value === 'street' || value === 'meal' || value === 'egg-job';
}

/** Untrusted/mutable service snapshots are copied at the boundary. In particular,
 * an account switch must not mutate the "before" identity of an in-flight request. */
export function readDailyAdSnapshot(raw: unknown): DailyAdSnapshot {
  try {
    if (!raw || typeof raw !== 'object') return DISCONNECTED_DAILY_ADS;
    const {sessionKey, revision, ready, remaining, rewardedAvailable, bannerAvailable,
      removePassiveAds, phase} = raw as Partial<DailyAdSnapshot>;
    if (typeof sessionKey !== 'string' || typeof revision !== 'string' ||
      typeof ready !== 'boolean' || typeof rewardedAvailable !== 'boolean' ||
      typeof bannerAvailable !== 'boolean' || typeof removePassiveAds !== 'boolean' ||
      !['idle', 'loading', 'playing', 'verifying'].includes(phase ?? '') ||
      !(remaining === null || (typeof remaining === 'number' && Number.isInteger(remaining) &&
        remaining >= 0 && remaining <= DAILY_AD_LIMIT)) ||
      (ready && (!sessionKey.trim() || !revision.trim()))) return DISCONNECTED_DAILY_ADS;
    return Object.freeze({sessionKey, revision, ready, remaining, rewardedAvailable,
      bannerAvailable, removePassiveAds, phase: phase as DailyAdPhase});
  } catch {
    // A broken SDK adapter/getter must not take down the care screen.
    return DISCONNECTED_DAILY_ADS;
  }
}

/** Invalid/missing counts fail closed. Never invent a fresh local quota. */
export function sharedAdRemaining(snapshot: DailyAdSnapshot): number | null {
  snapshot = readDailyAdSnapshot(snapshot);
  const count = snapshot.remaining;
  return snapshot.ready === true && typeof snapshot.sessionKey === 'string' && snapshot.sessionKey.length > 0 &&
    typeof snapshot.revision === 'string' && snapshot.revision.length > 0 &&
    typeof count === 'number' && Number.isInteger(count) && count >= 0 && count <= DAILY_AD_LIMIT
    ? count : null;
}

export function canWatchDailyAd(snapshot: DailyAdSnapshot): boolean {
  snapshot = readDailyAdSnapshot(snapshot);
  const remaining = sharedAdRemaining(snapshot);
  return remaining !== null && remaining > 0 && snapshot.rewardedAvailable && snapshot.phase === 'idle';
}

export function dailyAdPresentation(
  placement: DailyAdPlacement,
  snapshot: DailyAdSnapshot,
  environment: DailyAdEnvironment,
) {
  snapshot = readDailyAdSnapshot(snapshot);
  const visible = isDailyAdPlacement(placement) && environment.screenActive &&
    environment.foreground && !environment.obscured && !environment.keyboardOpen;
  const idle = visible && !environment.interacting;
  const remaining = sharedAdRemaining(snapshot);
  const supportedBannerSize = Number.isFinite(environment.width) &&
    Number.isFinite(environment.height) && environment.width >= BANNER_WIDTH + 32 &&
    environment.height >= BANNER_MIN_VIEWPORT_HEIGHT && environment.height > environment.width;
  // No passive banners while choosing food, writing, conversing, or playing a job.
  // Home and street use ONE reserved rail, outside the map's gesture surface.
  const banner = idle && snapshot.ready && snapshot.phase === 'idle' && snapshot.bannerAvailable &&
    !snapshot.removePassiveAds && supportedBannerSize && (placement === 'home' || placement === 'street');
  const reward = idle && remaining !== null && snapshot.rewardedAvailable;
  return {
    banner,
    reward,
    canWatch: reward && canWatchDailyAd(snapshot),
    remaining,
    rewardLabel: remaining === 0 ? '今日の広告特典は受け取り済み' : `広告を見て＋${DAILY_AD_POINTS}pt`,
    rewardDetail: `1日${DAILY_AD_LIMIT}回・全画面で共通${remaining === null ? '' : `　あと${remaining}回`}`,
    railHeight: banner ? BANNER_RAIL_HEIGHT : 0,
  };
}

export type DailyAdResult =
  | {status: 'verified'; receiptId: string; points: typeof DAILY_AD_POINTS}
  | {status: 'closed' | 'unavailable' | 'pending' | 'busy' | 'session-changed' | 'error'};

export interface DailyRewardBinding {
  /** Must be the same authoritative source used by the existing egg-job ad. */
  getSnapshot(): DailyAdSnapshot;
  /** Resolve verified ONLY after SSV + the existing idempotent claim has succeeded.
   * This UI must NEVER grant points or debit quota itself. The adapter must settle
   * on ad close/error; slow SSV returns pending, not a fabricated verified result. */
  watchRewarded(placement: DailyAdPlacement): Promise<DailyAdResult>;
}

/** One gate for ALL placements, including a provider remount or account change.
 * The existing SDK/session service still owns cancellation and timeouts. */
export function createDailyRewardGate(waitMs = 120_000) {
  const timeoutMs = Number.isFinite(waitMs) && waitMs > 0 ? waitMs : 120_000;
  let inFlight = false;
  return {
    isBusy: () => inFlight,
    async watch(binding: DailyRewardBinding, placement: DailyAdPlacement): Promise<DailyAdResult> {
      if (inFlight) return {status: 'busy'};
      let before: DailyAdSnapshot;
      try { before = readDailyAdSnapshot(binding.getSnapshot()); } catch { return {status: 'error'}; }
      if (!isDailyAdPlacement(placement) || !canWatchDailyAd(before)) return {status: 'unavailable'};
      inFlight = true;
      // A deadline releases the caller, NOT the SDK lock. Otherwise a slow/late
      // completion could allow two videos at once. The shared service publishes
      // any late verified reward; no second view or optimistic grant is needed.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const operation = (async (): Promise<DailyAdResult> => {
        try {
          const result = await binding.watchRewarded(placement);
          if (readDailyAdSnapshot(binding.getSnapshot()).sessionKey !== before.sessionKey) return {status: 'session-changed'};
          if (!result || typeof result !== 'object') return {status: 'error'};
          if (result.status === 'verified') {
            if (result.points !== DAILY_AD_POINTS || typeof result.receiptId !== 'string' ||
                result.receiptId.trim().length === 0 || result.receiptId.length > 512) return {status: 'error'};
            return result;
          }
          return ['closed', 'unavailable', 'pending', 'busy', 'session-changed', 'error'].includes(result.status)
            ? result : {status: 'error'};
        } catch {
          try {
            return {status: readDailyAdSnapshot(binding.getSnapshot()).sessionKey === before.sessionKey ? 'error' : 'session-changed'};
          } catch {
            return {status: 'error'};
          }
        } finally {
          inFlight = false;
          clearTimeout(timer);
        }
      })();
      const deadline = new Promise<DailyAdResult>(resolve => {
        timer = setTimeout(() => resolve({status: 'pending'}), timeoutMs);
      });
      try {
        return await Promise.race([operation, deadline]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export function dailyAdResultMessage(result: DailyAdResult): string {
  switch (result.status) {
    case 'verified': return `＋${DAILY_AD_POINTS}ptを受け取りました。`;
    case 'closed': return '視聴は中止しました。広告なしでも、そのまま遊べます。';
    case 'unavailable': return 'いまは広告を用意できません。そのまま遊べます。';
    case 'pending': return '受け取りを確認中です。もう一度広告を見る必要はありません。';
    case 'busy': return 'ほかの画面で広告の処理中です。';
    case 'session-changed': return '';
    case 'error': return '広告の処理を確認できませんでした。通常の操作は続けられます。';
  }
}
