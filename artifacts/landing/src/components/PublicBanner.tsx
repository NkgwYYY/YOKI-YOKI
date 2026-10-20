import { useEffect, useRef, useState } from 'react';
import { ADSENSE_BANNER_SLOT, ADSENSE_CLIENT, requestPublicBanner } from '@/lib/publicAds';

/** One manual banner per public document. Never mounted in the app or account pages. */
export function PublicBanner() {
  const ref = useRef<HTMLModElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let active = true;
    const observer = new MutationObserver(() => {
      if (element.getAttribute('data-ad-status') === 'unfilled' && active) setUnavailable(true);
    });
    observer.observe(element, { attributes: true, attributeFilter: ['data-ad-status'] });
    void requestPublicBanner(element).catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; observer.disconnect(); };
  }, []);
  if (unavailable) return null;
  return <aside className="public-banner" aria-label="広告">
    <span className="public-banner-label">広告</span>
    <ins ref={ref} className="adsbygoogle" style={{ display: 'block' }}
      data-ad-client={ADSENSE_CLIENT} data-ad-slot={ADSENSE_BANNER_SLOT}
      data-ad-format="horizontal" data-full-width-responsive="false" />
  </aside>;
}
