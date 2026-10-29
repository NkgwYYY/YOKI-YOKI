const { isIP } = require('node:net');

// A syntactic guard, not proof that a host is deployed or owned by this project.
function getReleaseDomain(env) {
  const value = [env.NATIVE_BUNDLE_PUBLIC_DOMAIN, env.REPLIT_INTERNAL_APP_DOMAIN, env.EXPO_PUBLIC_DOMAIN]
    .find(value => typeof value === 'string' && value.trim());
  if (!value) throw new Error('Set NATIVE_BUNDLE_PUBLIC_DOMAIN to the verified public production host.');
  let url;
  try { url = new URL(value.includes('://') ? value.trim() : `https://${value.trim()}`); }
  catch { throw new Error('The native release domain must be a valid HTTPS production host.'); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash || !host.includes('.') ||
      host.endsWith('.') || isIP(host) || host.startsWith('[') ||
      /(^|\.)(localhost|local|internal|test|invalid|example|replit\.dev|repl\.co|replit\.internal)$/.test(host)) {
    throw new Error('Native release builds require a public HTTPS production host without credentials, port, path, query or fragment; local/development hosts are not allowed.');
  }
  return host;
}

module.exports = { getReleaseDomain };
