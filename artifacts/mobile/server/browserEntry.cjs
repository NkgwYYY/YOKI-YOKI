// The application URL opens the app even on a first visit or with cookies blocked.
// Keep older LP/bookmark links working without making startup depend on a cookie.
// Native manifest requests are handled before this helper in serve.js.
function browserEntry(req, pathname) {
  if (pathname !== '/') return null;
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.searchParams.get('app') !== '1') return null;

  // Only remove the legacy entry flag; preserve auth callbacks and campaign data.
  url.searchParams.delete('app');
  return { location: '/' + url.search };
}
module.exports = { browserEntry };
