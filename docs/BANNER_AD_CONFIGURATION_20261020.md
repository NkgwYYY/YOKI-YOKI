# Banner configuration — 2026-10-20

## Public identifiers

| Placement | Provider | Unit |
| --- | --- | --- |
| iOS HOME / street banner | AdMob | `ca-app-pub-7462386033661667/1745376179` |
| Public browser introduction / article detail | AdSense | client `ca-pub-7462386033661667`, slot `1013828566` |

The existing iOS app ID and rewarded unit are unchanged. Android has no production banner configured and stays disabled. Environment overrides remain supported.

## Browser behavior

- One manual, non-personalized banner on the public introduction and each existing article detail. No AdSense script on app onboarding, private records, chat, support, article index or error pages.
- Blocked or unfilled ads disappear. No automatic refresh, ad-click reward, or profile/diary/chat data in ad-request fields.
- New visitors at `/` enter `/landing/`; the app CTA `/?app=1` remembers app entry in a secure functional cookie. Native manifest headers and application deep links remain supported. Non-root deployments keep their existing routing.
- The introduction and five articles have readable static HTML. Root `ads.txt` authorizes this publisher; `robots.txt` links the public sitemap.
- The privacy policy describes advertising and the functional cookie.
- A Google European-regulations consent message was published for this site, with consent, reject and manage-options choices; automatic consent optimization is off. Google serves the message through the AdSense tag in its target regions.

## Verification and release limits

- Local focused advertising/routing tests: 10 passed.
- Mobile and landing TypeScript checks passed; landing production build passed.
- The existing CI workflow now includes landing checks/build and the new ad tests.
- Google website review and iOS app approval/store linkage still govern real ad serving. A configured identifier is not evidence that production impressions or revenue are available.
- Native signed-build/device ad rendering and rewarded server callbacks are separate validation steps. No Replit Agent was used.
