export const BONUS_POINTS = 30;
export const BONUS_DAILY_LIMIT = 3;
export const GREETINGS = ['遊びにきたよ！', 'お部屋、すてきだね。', 'また一緒にのんびりしよう。', '今日もおつかれさま。'] as const;
export const STAGES = ['egg', 'odango', 'stage3', 'stage4'] as const;
export function japanDay(now = Date.now()): string {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function safeHome(input: unknown) {
  const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const choice = (key: string, allowed: string[], fallback: string) => typeof value[key] === 'string' && allowed.includes(value[key] as string) ? value[key] as string : fallback;
  // Only an avatar and furnishings leave the device. Never spread profile/feed/diary data.
  return {
    stage: choice('stage', [...STAGES], 'egg'),
    furniture: choice('furniture', ['none', 'sofa', 'vanity', 'bookshelf'], 'none'),
    flower: choice('flower', ['none', 'pink', 'violet', 'rainbow'], 'none'),
    robot: value.robot === true,
  };
}
export function validReceipt(id: unknown): id is string {
  return typeof id === 'string' && (/^egg-\d{13}-[a-z0-9]{4,20}$/.test(id) ||
    /^daily-(home|street|meal)-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
}
export function activeEntitlement(body: unknown, entitlement: string, now: number, allowSandbox: boolean): boolean {
  const subscriber = (body as any)?.subscriber;
  const entry = subscriber?.entitlements?.[entitlement];
  if (!entry || !entry.product_identifier) return false;
  const subscription = subscriber.subscriptions?.[entry.product_identifier];
  if (!subscription || (!allowSandbox && subscription.is_sandbox === true)) return false;
  const expiry = Date.parse(entry.expires_date);
  const grace = Date.parse(entry.grace_period_expires_date);
  return (Number.isFinite(expiry) && expiry > now) || (Number.isFinite(grace) && grace > now);
}
export const METRICS = ['bonus_offer', 'ad_request', 'ad_loaded', 'ad_closed', 'ad_error', 'bonus_granted', 'pass_opened', 'pass_purchased', 'pass_restored', 'visit_opened', 'visit_sent', 'feature_error'] as const;
