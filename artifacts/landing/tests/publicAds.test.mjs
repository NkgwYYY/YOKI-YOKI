import test from 'node:test';
import assert from 'node:assert/strict';

let sequence = 0;
async function fixture(t, pathname = '/landing/') {
  const previous = { window: globalThis.window, document: globalThis.document };
  const scripts = [];
  globalThis.window = { location: { pathname }, setTimeout: () => 1, clearTimeout() {} };
  globalThis.document = { createElement: () => ({ setAttribute(name, value) { this[name] = value; } }), head: { appendChild(script) { scripts.push(script); } } };
  t.after(() => Object.assign(globalThis, previous));
  const ads = await import(`../src/lib/publicAds.ts?test=${sequence++}`);
  return { ...ads, scripts, element: { isConnected: true } };
}

test('only public content can load ads; app, privacy and error pages never load them', async t => {
  const { requestPublicBanner, isPublicAdPage, scripts, element } = await fixture(t, '/chat');
  for (const pathname of ['/', '/onboarding', '/chat', '/diary', '/landing/privacy/', '/landing/support/', '/landing/articles/', '/landing/missing/']) {
    window.location.pathname = pathname;
    assert.equal(isPublicAdPage(pathname), false);
    await requestPublicBanner(element);
  }
  assert.equal(scripts.length, 0);
  assert.equal(window.adsbygoogle, undefined);
});

test('one script and one request per connected banner, with personalization disabled', async t => {
  const { requestPublicBanner, scripts, element, ADSENSE_CLIENT } = await fixture(t);
  const first = requestPublicBanner(element), repeated = requestPublicBanner(element);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`);
  assert.equal(window.adsbygoogle.requestNonPersonalizedAds, 1);
  assert.equal(scripts[0]['data-privacy-treatments'], 'disablePersonalization');
  scripts[0].onload();
  await Promise.all([first, repeated]);
  await requestPublicBanner(element);
  assert.deepEqual([...window.adsbygoogle], [{}]);
  const detached = { isConnected: false };
  await requestPublicBanner(detached);
  assert.equal(window.adsbygoogle.length, 1);
});

test('unmounted or navigated-away banners cannot issue a delayed request', async t => {
  const { requestPublicBanner, scripts, element } = await fixture(t, '/landing/articles/small-steps/');
  const pending = requestPublicBanner(element);
  element.isConnected = false;
  window.location.pathname = '/chat';
  scripts[0].onload();
  await pending;
  assert.equal(window.adsbygoogle.length, 0);
});

test('blocked ad scripts fail without retry loops or ad requests', async t => {
  const { requestPublicBanner, scripts, element } = await fixture(t);
  const pending = requestPublicBanner(element);
  scripts[0].onerror();
  await assert.rejects(pending, /unavailable/);
  await assert.rejects(requestPublicBanner(element), /unavailable/);
  assert.equal(scripts.length, 1);
  assert.equal(window.adsbygoogle.length, 0);
});
