import { Router, type Request, type Response, type NextFunction } from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { BONUS_DAILY_LIMIT, BONUS_POINTS, GREETINGS, METRICS, activeEntitlement, japanDay, safeHome, validReceipt } from '../community/policy';
import { verifyGoogleSsv } from '../community/ssv';

const router = Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const code = () => randomBytes(9).toString('base64url').toUpperCase();
const enabled = () => process.env.COMMUNITY_ENABLED === 'true' || (process.env.COMMUNITY_ENABLED !== 'false' && process.env.NODE_ENV === 'development');
const rewardedUnitIds = () => (process.env.ADMOB_REWARDED_UNIT_IDS ?? 'ca-app-pub-7462386033661667/5206949357').split(',').map(x => x.trim()).filter(Boolean).flatMap(id => /^ca-app-pub-\d+\/\d+$/.test(id) ? [id, id.split('/')[1]] : [id]);
const adsEnabled = () => process.env.YOKI_REWARDED_ADS_ENABLED === 'true' && rewardedUnitIds().length > 0;
const passEnabled = () => process.env.YOKI_PASS_SALES_ENABLED === 'true' && !!process.env.REVENUECAT_SECRET_KEY && !!process.env.REVENUECAT_ENTITLEMENT;
type Player = { id: string; invite_code: string; home: ReturnType<typeof safeHome>; visits_enabled: boolean };
type CommunityRequest = Request & { player?: Player };
class ClientError extends Error { constructor(public status: number, message: string) { super(message); } }
const wrap = (fn: (req: CommunityRequest, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  void fn(req, res).catch(error => {
    if (error instanceof ClientError) { res.status(error.status).json({ error: error.message }); return; }
    // No credentials, callback query, receipt, room contents, or provider error bodies in logs.
    next(Error('Community service unavailable'));
  });
};
const limits = new Map<string, { until: number; count: number }>();
function rate(key: string, max: number, interval = 60_000) {
  const now = Date.now();
  if (limits.size > 10_000) for (const [k, value] of limits) if (value.until < now) limits.delete(k);
  const old = limits.get(key);
  if (old && old.until > now) { if (++old.count > max) throw new ClientError(429, '少し待ってから、もう一度お試しください。'); }
  else { if (limits.size > 20_000) throw new ClientError(503, 'ただいま混み合っています。'); limits.set(key, { until: now + interval, count: 1 }); }
}
async function transaction<T>(fn: (client: Pick<typeof pool, 'query'>) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function passOwner(id: string): Promise<string | null> {
  if (!process.env.REVENUECAT_SECRET_KEY || !process.env.REVENUECAT_ENTITLEMENT) return null;
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}`, Accept: 'application/json' }, signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new ClientError(503, '購入状況を確認できませんでした。時間をおいてお試しください。');
  const body = await response.json() as any;
  if (!activeEntitlement(body, process.env.REVENUECAT_ENTITLEMENT, Date.now(), process.env.YOKI_COMMERCE_SANDBOX === 'true')) return null;
  return typeof body.subscriber.original_app_user_id === 'string' ? hash(`pass:${body.subscriber.original_app_user_id}`) : null;
}
router.get('/community/config', (_req, res) => res.json({ enabled: enabled(), ads: adsEnabled(), passSales: passEnabled(), bonusPoints: BONUS_POINTS, dailyLimit: BONUS_DAILY_LIMIT }));

// Google signs these callbacks. Never accept a client 'watched' flag as payment evidence.
router.get('/community/admob/ssv', wrap(async (req, res) => {
  let params: URLSearchParams;
  try { params = await verifyGoogleSsv(req.originalUrl.split('?')[1] ?? ''); }
  catch (error) {
    const known = ['Invalid callback', 'Duplicate parameter', 'Invalid transaction', 'Invalid signature', 'Key service unavailable', 'No signing keys', 'Unknown signing key'];
    const reason = error instanceof Error && known.includes(error.message) ? error.message : 'Verification service error';
    console.warn(JSON.stringify({ event: 'admob_ssv_rejected', stage: 'signature', reason }));
    throw new ClientError(400, 'Invalid verification');
  }
  const units = rewardedUnitIds();
  const id = params.get('custom_data') ?? '', player = params.get('user_id') ?? '';
  // A signed console probe only checks connectivity, not eligibility for a reward.
  // Reserved non-UUID markers can never identify a player or claim. Replays are harmless:
  // this branch performs no DB operations, and never issues a reward or receipt.
  if (player === 'yoki-admob-setup' && id === 'connection-check') {
    console.info(JSON.stringify({ event: 'admob_ssv_setup_verified', rewardGranted: false, adUnitMatchesConfigured: units.includes(params.get('ad_unit') ?? '') }));
    res.status(200).send('verified; no reward granted'); return;
  }
  if (!units.includes(params.get('ad_unit') ?? '')) {
    console.warn(JSON.stringify({ event: 'admob_ssv_rejected', stage: 'ad_unit', configured: units.length > 0 }));
    throw new ClientError(400, 'Invalid reward');
  }
  const timestamp = Number(params.get('timestamp'));
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60_000 || timestamp < Date.now() - 24 * 60 * 60_000) {
    console.warn(JSON.stringify({ event: 'admob_ssv_rejected', stage: 'timestamp', format: /^\d+$/.test(params.get('timestamp') ?? '') ? String(timestamp).length : 'invalid', direction: timestamp > Date.now() ? 'future' : 'past' }));
    throw new ClientError(400, 'Expired verification');
  }
  if (!adsEnabled()) throw new ClientError(503, 'Unavailable');
  if (!uuid.test(id) || !uuid.test(player)) throw new ClientError(400, 'Invalid reward');
  await transaction(async client => {
    const { rows } = await client.query('SELECT * FROM yoki_bonus_claims WHERE id=$1 AND player_id=$2 FOR UPDATE', [id, player]);
    const claim = rows[0];
    if (!claim || claim.mode !== 'ad') throw new ClientError(400, 'Unknown reward');
    if (claim.state === 'earned' || claim.state === 'expired') return;
    if (timestamp < new Date(claim.created_at).getTime() - 60_000 || timestamp > new Date(claim.expires_at).getTime()) throw new ClientError(400, 'Invalid reward time');
    await client.query("UPDATE yoki_bonus_claims SET state='earned', earned_at=now(), transaction_id=$2 WHERE id=$1", [id, params.get('transaction_id')]);
  });
  res.status(200).send('ok');
}));

router.post('/community/device', wrap(async (req, res) => {
  if (!enabled()) throw new ClientError(503, 'ただいま準備中です。');
  const token = req.get('X-Yoki-Device') ?? '';
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ClientError(400, 'Invalid device');
  const tokenHash = hash(token);
  const existing = await pool.query('SELECT id FROM yoki_community_players WHERE token_hash=$1', [tokenHash]);
  if (existing.rows[0]) { res.json(existing.rows[0]); return; }
  rate(`new:${req.ip}`, 300, 60 * 60_000);
  const result = await pool.query('INSERT INTO yoki_community_players(id, token_hash, invite_code) VALUES($1,$2,$3) ON CONFLICT(token_hash) DO UPDATE SET token_hash=EXCLUDED.token_hash RETURNING id', [randomUUID(), tokenHash, code()]);
  res.status(201).json(result.rows[0]);
}));
router.use('/community', (req: CommunityRequest, res, next) => {
  void (async () => {
    if (!enabled()) throw new ClientError(503, 'ただいま準備中です。');
    const token = req.get('X-Yoki-Device') ?? '';
    if (!/^[a-f0-9]{64}$/.test(token)) throw new ClientError(401, '友だち機能を開き直してください。');
    const { rows } = await pool.query('SELECT id, invite_code, home, visits_enabled FROM yoki_community_players WHERE token_hash=$1', [hash(token)]);
    if (!rows[0]) throw new ClientError(401, '友だち機能を開き直してください。');
    req.player = rows[0]; rate(`player:${rows[0].id}`, 120); next();
  })().catch(error => {
    if (error instanceof ClientError) res.status(error.status).json({ error: error.message });
    else next(Error('Community service unavailable'));
  });
});
router.get('/community/me', wrap(async (req, res) => {
  const id = req.player!.id;
  const [friends, visits, blocks] = await Promise.all([
    pool.query('SELECT p.id,p.home,p.visits_enabled FROM yoki_community_friends f JOIN yoki_community_players p ON p.id=f.friend_id WHERE f.player_id=$1 ORDER BY f.created_at DESC LIMIT 50', [id]),
    pool.query('SELECT v.visitor_id,v.greeting,v.created_at,p.home FROM yoki_community_visits v JOIN yoki_community_players p ON p.id=v.visitor_id WHERE v.host_id=$1 AND NOT EXISTS(SELECT 1 FROM yoki_community_blocks b WHERE (b.player_id=$1 AND b.blocked_id=v.visitor_id) OR (b.blocked_id=$1 AND b.player_id=v.visitor_id)) ORDER BY v.created_at DESC LIMIT 30', [id]),
    pool.query('SELECT blocked_id AS id FROM yoki_community_blocks WHERE player_id=$1', [id]),
  ]);
  res.json({ ...req.player, home: safeHome(req.player!.home), friends: friends.rows.map(x => ({ ...x, home: safeHome(x.visits_enabled ? x.home : {}) })), visits: visits.rows.map(x => ({ ...x, home: safeHome({stage:x.home?.stage}) })), blocks: blocks.rows });
}));
router.put('/community/home', wrap(async (req, res) => {
  if (typeof req.body?.enabled !== 'boolean') throw new ClientError(400, '公開設定を選んでください。');
  const home = safeHome(req.body.home);
  await pool.query('UPDATE yoki_community_players SET home=$2,visits_enabled=$3 WHERE id=$1', [req.player!.id, home, req.body.enabled]);
  res.json({ home, enabled: req.body.enabled });
}));
router.patch('/community/home', wrap(async (req, res) => {
  await pool.query('UPDATE yoki_community_players SET home=$2 WHERE id=$1 AND visits_enabled=true', [req.player!.id, safeHome(req.body?.home)]);
  res.json({ ok: true });
}));
router.post('/community/invite/rotate', wrap(async (req, res) => {
  const nextCode = code();
  await pool.query('UPDATE yoki_community_players SET invite_code=$2 WHERE id=$1', [req.player!.id, nextCode]);
  res.json({ code: nextCode });
}));
router.post('/community/friends', wrap(async (req, res) => {
  rate(`invite:${req.player!.id}`, 10, 60 * 60_000);
  const invitation = String(req.body?.code ?? '').replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z0-9_-]{12}$/.test(invitation)) throw new ClientError(400, '招待コードを確認してください。');
  const target = await pool.query('SELECT id FROM yoki_community_players WHERE invite_code=$1 AND visits_enabled=true AND id<>$2', [invitation, req.player!.id]);
  if (!target.rows[0]) throw new ClientError(404, 'おうちが見つかりません。コードと公開設定を確認してください。');
  const other = target.rows[0].id as string, id = req.player!.id;
  await transaction(async client => {
    await client.query('SELECT id FROM yoki_community_players WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [[id, other]]);
    const blocked = await client.query('SELECT 1 FROM yoki_community_blocks WHERE (player_id=$1 AND blocked_id=$2) OR (player_id=$2 AND blocked_id=$1)', [id, other]);
    if (blocked.rowCount) throw new ClientError(404, 'このおうちには遊びにいけません。');
    const counts = await client.query('SELECT player_id,count(*)::int AS count FROM yoki_community_friends WHERE player_id=ANY($1::uuid[]) GROUP BY player_id', [[id, other]]);
    if (counts.rows.some(x => x.count >= 50)) throw new ClientError(409, '友だちは50人まで登録できます。');
    await client.query('INSERT INTO yoki_community_friends(player_id,friend_id) VALUES($1,$2),($2,$1) ON CONFLICT DO NOTHING', [id, other]);
  });
  res.json({ id: other });
}));
router.post('/community/friends/:id/block', wrap(async (req, res) => {
  const other = String(req.params.id), id = req.player!.id;
  if (!uuid.test(other) || other === id) throw new ClientError(400, 'Invalid friend');
  await transaction(async client => {
    await client.query('SELECT id FROM yoki_community_players WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [[id, other]]);
    const relation = await client.query('SELECT 1 FROM yoki_community_friends WHERE player_id=$1 AND friend_id=$2 UNION SELECT 1 FROM yoki_community_visits WHERE host_id=$1 AND visitor_id=$2 LIMIT 1', [id, other]);
    if (!relation.rowCount) throw new ClientError(404, '相手が見つかりません。');
    await client.query('INSERT INTO yoki_community_blocks(player_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, other]);
    await client.query('DELETE FROM yoki_community_friends WHERE (player_id=$1 AND friend_id=$2) OR (player_id=$2 AND friend_id=$1)', [id, other]);
  });
  res.json({ ok: true });
}));
router.delete('/community/blocks/:id', wrap(async (req, res) => {
  if (!uuid.test(String(req.params.id))) throw new ClientError(400, 'Invalid friend');
  await pool.query('DELETE FROM yoki_community_blocks WHERE player_id=$1 AND blocked_id=$2', [req.player!.id, req.params.id]);
  res.json({ ok: true });
}));
async function visitAccess(id: string, other: string) {
  if (!uuid.test(other)) throw new ClientError(404, 'おうちが見つかりません。');
  const result = await pool.query('SELECT p.id,p.home FROM yoki_community_players p JOIN yoki_community_friends f ON f.friend_id=p.id WHERE f.player_id=$1 AND p.id=$2 AND p.visits_enabled=true AND NOT EXISTS(SELECT 1 FROM yoki_community_blocks b WHERE (b.player_id=$1 AND b.blocked_id=$2) OR (b.player_id=$2 AND b.blocked_id=$1))', [id, other]);
  if (!result.rows[0]) throw new ClientError(404, 'いまはおうちをお休みしています。');
  return { id: other, home: safeHome(result.rows[0].home) };
}
router.get('/community/homes/:id', wrap(async (req, res) => { res.json(await visitAccess(req.player!.id, String(req.params.id))); }));
router.post('/community/homes/:id/visits', wrap(async (req, res) => {
  const other = String(req.params.id), id = req.player!.id;
  await visitAccess(id, other);
  const greeting = req.body?.greeting;
  if (!Number.isInteger(greeting) || greeting < 0 || greeting >= GREETINGS.length) throw new ClientError(400, '挨拶を選んでください。');
  await pool.query('INSERT INTO yoki_community_visits(host_id,visitor_id,day,greeting) VALUES($1,$2,$3,$4) ON CONFLICT(host_id,visitor_id,day) DO UPDATE SET greeting=EXCLUDED.greeting', [other, id, japanDay(), greeting]);
  res.json({ ok: true });
}));
router.get('/community/bonus', wrap(async (req, res) => {
  const id = req.player!.id, day = japanDay();
  const [claims, count] = await Promise.all([
    pool.query("SELECT id,receipt_id,amount FROM yoki_bonus_claims WHERE player_id=$1 AND state='earned' AND acknowledged_at IS NULL ORDER BY created_at", [id]),
    pool.query("SELECT count(*)::int AS used FROM yoki_bonus_claims WHERE player_id=$1 AND day=$2 AND (state='earned' OR (state='reserved' AND expires_at>now()))", [id, day]),
  ]);
  res.json({ claims: claims.rows, remaining: Math.max(0, BONUS_DAILY_LIMIT - count.rows[0].used), day });
}));
router.get('/community/pass', wrap(async (req, res) => { res.json({ active: !!await passOwner(req.player!.id), sales: passEnabled() }); }));
router.post('/community/bonus/reserve', wrap(async (req, res) => {
  const id = req.player!.id, receipt = req.body?.receipt, mode = req.body?.mode;
  if (!validReceipt(receipt) || !['ad','pass'].includes(mode)) throw new ClientError(400, '注文の結果を確認できません。');
  if (mode === 'pass' && !receipt.startsWith('egg-')) throw new ClientError(400, 'この特典には広告の視聴が必要です。');
  if (mode === 'ad' && !adsEnabled()) throw new ClientError(503, 'いまは広告を用意できません。');
  const owner = mode === 'pass' ? await passOwner(id) : null;
  if (mode === 'pass' && !owner) throw new ClientError(403, '有効なパスを確認できません。購入を復元してください。');
  const quota = owner ?? id;
  const result = await transaction(async client => {
    await client.query('SELECT id FROM yoki_community_players WHERE id=$1 FOR UPDATE', [id]);
    if (owner) await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [owner]);
    const prior = (await client.query('SELECT * FROM yoki_bonus_claims WHERE player_id=$1 AND receipt_id=$2 FOR UPDATE', [id, receipt])).rows[0];
    if (prior && (prior.state === 'earned' || (prior.state === 'reserved' && new Date(prior.expires_at).getTime() > Date.now()))) return prior;
    await client.query("UPDATE yoki_bonus_claims SET state='expired' WHERE player_id=$1 AND state='reserved' AND expires_at<=now()", [id]);
    const count = await client.query("SELECT count(*)::int AS used FROM yoki_bonus_claims WHERE (player_id=$1 OR quota_key=$2) AND day=$3 AND (state='earned' OR (state='reserved' AND expires_at>now()))", [id, quota, japanDay()]);
    if (count.rows[0].used >= BONUS_DAILY_LIMIT) throw new ClientError(409, '今日のおまけは3回受け取りました。また明日。');
    if (prior) await client.query('DELETE FROM yoki_bonus_claims WHERE id=$1 AND state=\'expired\'', [prior.id]);
    const saved = await client.query("INSERT INTO yoki_bonus_claims(id,player_id,receipt_id,quota_key,day,mode,state,expires_at,earned_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '30 minutes',CASE WHEN $6='pass' THEN now() ELSE NULL END) RETURNING *", [randomUUID(), id, receipt, quota, japanDay(), mode, mode === 'pass' ? 'earned' : 'reserved']);
    return saved.rows[0];
  });
  res.json({ id: result.id, mode: result.mode, state: result.state, amount: result.amount, playerId: id, expiresAt: result.expires_at });
}));
router.post('/community/bonus/:id/ack', wrap(async (req, res) => {
  if (!uuid.test(String(req.params.id))) throw new ClientError(400, 'Invalid claim');
  await pool.query("UPDATE yoki_bonus_claims SET acknowledged_at=COALESCE(acknowledged_at,now()) WHERE id=$1 AND player_id=$2 AND state='earned'", [req.params.id, req.player!.id]);
  res.json({ ok: true });
}));
router.post('/community/bonus/:id/revenue', wrap(async (req, res) => {
  const { micros, currency, test } = req.body ?? {};
  if (!uuid.test(String(req.params.id)) || !Number.isSafeInteger(micros) || micros < 0 || micros > 100_000_000 || !/^[A-Z]{3}$/.test(currency ?? '') || typeof test !== 'boolean') throw new ClientError(400, 'Invalid estimate');
  // Client SDK estimates are explicitly labelled, never treated as settled revenue or rewards.
  await pool.query("UPDATE yoki_bonus_claims SET estimated_revenue_micros=$3,revenue_currency=$4,revenue_test=$5 WHERE id=$1 AND player_id=$2 AND mode='ad' AND estimated_revenue_micros IS NULL", [req.params.id, req.player!.id, micros, currency, test]);
  res.json({ ok: true });
}));
router.post('/community/metrics', wrap(async (req, res) => {
  const { id, event, durationMs } = req.body ?? {};
  if (!uuid.test(id ?? '') || !METRICS.includes(event)) throw new ClientError(400, 'Invalid metric');
  const duration = Number.isInteger(durationMs) && durationMs >= 0 && durationMs <= 300_000 ? durationMs : null;
  await pool.query('INSERT INTO yoki_feature_metrics(id,player_id,event,duration_ms) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [id, req.player!.id, event, duration]);
  res.json({ ok: true });
}));
// Deliberate in-app confirmation precedes this action. Cascades only this feature's data.
router.delete('/community/me', wrap(async (req, res) => {
  await pool.query('DELETE FROM yoki_community_players WHERE id=$1', [req.player!.id]); res.json({ ok: true });
}));
export default router;
