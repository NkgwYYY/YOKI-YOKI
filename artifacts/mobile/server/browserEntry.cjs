// An explicit app-opening link remembers the visitor's preferred entry point.
// No crawler/user-agent distinction; native manifest requests are handled first.
function browserEntry(req, pathname) {
  if (pathname !== '/') return null;
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.searchParams.get('app') === '1') {
    return { location: '/', cookie: 'yoki_app=1; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax' };
  }
  const prefersApp = /(?:^|;\s*)yoki_app=1(?:;|$)/.test(req.headers.cookie || '');
  return prefersApp ? null : { location: '/landing/' };
}
module.exports = { browserEntry };
