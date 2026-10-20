// Public publisher identifiers, issued for this site's display banner.
export const ADSENSE_CLIENT = 'ca-pub-7462386033661667';
export const ADSENSE_BANNER_SLOT = '1013828566';
type AdQueue = Array<Record<string, never>> & { requestNonPersonalizedAds?: number };
declare global { interface Window { adsbygoogle?: AdQueue } }

let loading: Promise<void> | undefined;
const requested = new WeakSet<HTMLElement>();

export function isPublicAdPage(pathname: string) {
  return /^\/landing\/?$/.test(pathname) || /^\/landing\/articles\/[^/]+\/?$/.test(pathname);
}

export function requestPublicBanner(element: HTMLElement): Promise<void> {
  if (!isPublicAdPage(window.location.pathname) || !element.isConnected) return Promise.resolve();
  if (!loading) {
    const queue = window.adsbygoogle ??= [] as AdQueue;
    queue.requestNonPersonalizedAds = 1;
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-privacy-treatments', 'disablePersonalization');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      const timer = window.setTimeout(() => reject(new Error('Advertising unavailable')), 15_000);
      script.onload = () => { window.clearTimeout(timer); resolve(); };
      script.onerror = () => { window.clearTimeout(timer); reject(new Error('Advertising unavailable')); };
      document.head.appendChild(script);
    });
  }
  return loading.then(() => {
    if (!element.isConnected || requested.has(element) || !isPublicAdPage(window.location.pathname)) return;
    requested.add(element);
    (window.adsbygoogle ??= [] as AdQueue).push({});
  });
}
