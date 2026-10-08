/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: To manage users, enable/disable login providers
 * (Google, GitHub, etc.), change app branding, or configure OAuth credentials,
 * use the Auth pane in the workspace toolbar. There is no external Clerk
 * dashboard — all auth configuration is done through the Auth pane.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import type { ClientRequest, IncomingHttpHeaders, IncomingMessage } from 'node:http';
import type { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const CLERK_FAPI = 'https://frontend-api.clerk.dev';
export const CLERK_PROXY_PATH = '/api/__clerk';
// Bound the complete exchange, including a slowly dripping response body.
// A socket inactivity timeout alone cannot bound that case.
const CLERK_PROXY_DEADLINE_MS = 12000;

/**
 * Returns the first effective public hostname for the given request,
 * preferring x-forwarded-host over the Host header so callers behind a
 * proxy see the original client-facing host.
 *
 * x-forwarded-host can take three shapes:
 *   - undefined (no proxy involved)
 *   - a single string (one proxy hop)
 *   - a comma-delimited string when an upstream appended rather than
 *     replaced the header (Node folds duplicate headers this way), or a
 *     string[] in some Express typings
 * In the multi-value case, the leftmost value is the original client-
 * facing host. Take that one in all forms. Exported so that app.ts
 * (clerkMiddleware callback) and this proxy middleware agree on which
 * hostname is canonical — otherwise multi-domain/custom-domain flows
 * break.
 */
export function getClerkProxyHost(req: {
  headers: IncomingHttpHeaders;
}): string | undefined {
  const forwarded = req.headers['x-forwarded-host'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstHop = raw?.split(',')[0]?.trim();
  return firstHop || req.headers.host?.trim() || undefined;
}

function getClerkProxyProtocol(headers: IncomingHttpHeaders): 'http' | 'https' {
  const forwarded = headers['x-forwarded-proto'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(',')[0]?.trim().toLowerCase() === 'http' ? 'http' : 'https';
}

type ProxyFlight = {
  outgoing?: ClientRequest;
  upstream?: IncomingMessage;
  fail: (status: 502 | 504) => void;
};

export function clerkProxyMiddleware(): RequestHandler {
  // Only run proxy in production — Clerk proxying doesn't work for dev instances
  if (process.env.NODE_ENV !== 'production') {
    return (_req, _res, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req, _res, next) => next();
  }

  const flights = new WeakMap<IncomingMessage, ProxyFlight>();
  const proxy = createProxyMiddleware({
    target: CLERK_FAPI,
    changeOrigin: true,
    // Take over the response so it can be re-sent with a Content-Length (see
    // proxyRes); the deployment edge rejects chunked proxied responses.
    selfHandleResponse: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ''),
    on: {
      proxyReq: (proxyReq, req) => {
        const flight = flights.get(req);
        if (!flight) { proxyReq.destroy(); return; }
        flight.outgoing = proxyReq;
        const protocol = getClerkProxyProtocol(req.headers);
        const host = getClerkProxyHost(req) || '';
        const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

        proxyReq.setHeader('Clerk-Proxy-Url', proxyUrl);
        proxyReq.setHeader('Clerk-Secret-Key', secretKey);

        const xff = req.headers['x-forwarded-for'];
        const clientIp =
          (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim() ||
          req.socket?.remoteAddress ||
          '';
        if (clientIp) {
          proxyReq.setHeader('X-Forwarded-For', clientIp);
        }
      },
      // Clerk's dynamic Frontend API responses (/v1/environment, /v1/client,
      // JWKS, ...) arrive without a Content-Length, so relaying them would use
      // Transfer-Encoding: chunked — which the deployment edge (Cloud Run)
      // rejects, turning the app's 200 into a 500. Buffer only those so they can
      // be re-sent with a Content-Length; the body is forwarded untouched so
      // Content-Encoding is preserved. Length-known responses (e.g. /npm/*
      // assets) and body-less responses stream through without buffering.
      proxyRes: (proxyRes, req, res) => {
        const flight = flights.get(req);
        if (!flight || res.destroyed || res.writableEnded) { proxyRes.destroy(); return; }
        flight.upstream = proxyRes;
        const headers = { ...proxyRes.headers };
        // Transfer-Encoding/Connection are hop-by-hop (RFC 7230 §6.1).
        delete headers['transfer-encoding'];
        delete headers['connection'];
        delete headers['keep-alive'];

        const status = proxyRes.statusCode ?? 502;
        // Content-Length is forbidden on 1xx/204; HEAD/304 may keep theirs.
        if (status < 200 || status === 204) {
          delete headers['content-length'];
        }

        const bodyless =
          req.method === 'HEAD' ||
          status < 200 ||
          status === 204 ||
          status === 304;
        if (headers['content-length'] !== undefined || bodyless) {
          res.writeHead(status, headers);
          // Headers are already sent, so abort the response if the upstream
          // stream errors mid-pipe (e.g. ECONNRESET) rather than leaving an
          // unhandled 'error' or a hung client.
          proxyRes.on('error', () => flight.fail(502));
          proxyRes.pipe(res);
          return;
        }

        const chunks: Buffer[] = [];
        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on('end', () => {
          if (!flights.has(req) || res.destroyed || res.writableEnded) return;
          const body = Buffer.concat(chunks);
          headers['content-length'] = String(body.length);
          res.writeHead(status, headers);
          res.end(body);
        });
        proxyRes.on('error', () => flight.fail(502));
      },
      // Suppress the proxy package's default chunked text response, which also
      // reflects the request URL/query. Never append it to a partially sent body.
      error: (_error, req) => flights.get(req)?.fail(502),
    },
  });

  return (req, res, next) => {
    let finished = false;
    const flight: ProxyFlight = { fail };
    const deadline = setTimeout(() => fail(504), CLERK_PROXY_DEADLINE_MS);
    const cleanup = () => {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      flights.delete(req);
      req.off('aborted', cancel);
      res.off('close', cancel);
      res.off('finish', cleanup);
    };
    const abortUpstream = () => {
      flight.upstream?.destroy();
      flight.outgoing?.destroy();
    };
    const cancel = () => { cleanup(); abortUpstream(); };
    function fail(status: 502 | 504) {
      if (finished) return;
      cleanup();
      if (res.destroyed || res.writableEnded) { abortUpstream(); return; }
      if (res.headersSent) { res.destroy(); abortUpstream(); return; }
      // Flush the length-delimited error before closing the upstream. The
      // proxy library also destroys the downstream on an upstream stream error.
      res.once('finish', abortUpstream);
      res.once('close', abortUpstream);
      res.writeHead(status, { 'content-length': '0', 'cache-control': 'no-store' });
      res.end();
    }
    flights.set(req, flight);
    req.once('aborted', cancel);
    res.once('close', cancel);
    res.once('finish', cleanup);
    void proxy(req, res, error => {
      if (error) fail(502);
      else { cleanup(); next(); }
    }).catch(() => fail(502));
  };
}
