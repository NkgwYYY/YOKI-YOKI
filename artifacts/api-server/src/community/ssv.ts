import { verify } from 'node:crypto';

/** Match Google's Tink verifier: URI.getQuery() decodes percent escapes once,
 * preserving parameter order and literal plus signs. Never reserialize signed content.
 * https://github.com/tink-crypto/tink-java-apps/blob/main/rewardedads/src/main/java/com/google/crypto/tink/apps/rewardedads/RewardedAdsVerifier.java
 */
export function parseSsv(query: string) {
  if (query.length > 8192 || /[\r\n]/.test(query)) throw Error('Invalid callback');
  const match = /^(.*)&signature=([^&]+)&key_id=(\d+)$/.exec(query);
  if (!match) throw Error('Invalid callback');
  const params = new URLSearchParams();
  for (const part of query.split('&')) {
    const equals = part.indexOf('='), key = part.slice(0, equals);
    // Canonical keys and no encoded separators keep signed bytes and parsed fields unambiguous.
    if (equals < 1 || !/^[a-z_]+$/.test(key)) throw Error('Invalid callback');
    if (params.has(key)) throw Error('Duplicate parameter');
    let value: string;
    try { value = decodeURIComponent(part.slice(equals + 1)); }
    catch { throw Error('Invalid callback'); }
    if (value.includes('&')) throw Error('Invalid callback');
    params.append(key, value);
  }
  if (!/^[\w-]{1,256}$/.test(params.get('transaction_id') ?? '')) throw Error('Invalid transaction');
  return { content: decodeURIComponent(match[1]), signature: Buffer.from(decodeURIComponent(match[2]), 'base64url'), keyId: match[3], params };
}
export function checkSsvSignature(query: string, publicKey: string) {
  const parsed = parseSsv(query);
  if (!verify('sha256', Buffer.from(parsed.content), publicKey, parsed.signature)) throw Error('Invalid signature');
  return parsed.params;
}
let cached: { at: number; keys: Map<string, string> } | undefined;
let refresh: Promise<Map<string, string>> | undefined;
async function keys() {
  if (cached && Date.now() - cached.at < 60 * 60 * 1000) return cached.keys;
  if (!refresh) refresh = (async () => {
    const response = await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Error('Key service unavailable');
    const body = await response.json() as { keys: { keyId: number; pem: string }[] };
    const result = new Map(body.keys.map(key => [String(key.keyId), key.pem]));
    if (!result.size) throw Error('No signing keys');
    cached = { at: Date.now(), keys: result }; return result;
  })().finally(() => { refresh = undefined; });
  return refresh;
}
export async function verifyGoogleSsv(query: string) {
  const parsed = parseSsv(query);
  let known = await keys();
  if (!known.has(parsed.keyId) && cached && Date.now() - cached.at > 60_000) { cached = undefined; known = await keys(); }
  const pem = known.get(parsed.keyId);
  if (!pem) throw Error('Unknown signing key');
  return checkSsvSignature(query, pem);
}
