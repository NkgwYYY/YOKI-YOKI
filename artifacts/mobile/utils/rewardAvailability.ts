export type RewardAvailability = 'ready' | 'web' | 'loading' | 'age-unknown' | 'age-ineligible' | 'unavailable';
/** Availability is explanatory only. The shared service still authorizes every view. */
export function rewardAvailability(input: {
  native: boolean; loading: boolean; age?: string; configured: boolean;
  enabled: boolean; ads: boolean; policy?: string; points?: number; serviceReady: boolean;
}): RewardAvailability {
  if (!input.native) return 'web';
  if (input.loading) return 'loading';
  if (!input.age || input.age === '回答しない') return 'age-unknown';
  if (!['20代', '30代', '40代', '50代', '60代', '70代以上'].includes(input.age)) return 'age-ineligible';
  if (!input.configured || !input.enabled || !input.ads || input.policy !== 'daily10' || input.points !== 10 || !input.serviceReady) return 'unavailable';
  return 'ready';
}
