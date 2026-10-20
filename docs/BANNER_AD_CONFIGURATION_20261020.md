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

## Published verification

Source `7bc4fde7aca075f3446618cb43dd360748c6212f` was synchronized to Replit and published successfully on 2026-10-19 UTC (2026-10-20 JST). The 22 changed files matched GitHub; Replit HEAD/index and unrelated working files were preserved.

Production checks confirmed: `/` → 302 `/landing/`, explicit app entry sets its cookie, remembered app entry returns 200, the public guide and publisher metadata exist in static HTML, `ads.txt` returns 200 with the exact publisher line and `text/plain`, iOS manifest contains the new banner unit, and `/api/healthz` returns 200. The app document has no AdSense script. Browser inspection confirmed the public banner's real client/slot attributes and that the app opens its onboarding screen. No production ad was clicked.

After these checks, AdSense accepted the site's review request and displayed **審査待ち** (pending review). This is not advertising approval. The new GitHub Actions run was queued at release verification; local checks above passed. Real native ad rendering/revenue remains unverified.

## Real-serving follow-up

The refreshed AdSense dashboard now recognizes `ads.txt` as **承認済み**. Site approval remains **準備中 / 審査待ち**, with the review requested on 2026-10-20 at 01:11 JST. File authorization and site approval are separate requirements.

The AdMob app remains **要審査**, has no App Store listing linked, and reports zero requests and impressions over the displayed last-seven-days period. A root `app-ads.txt` file now authorizes the same publisher for native ads. It is copied by the existing web-extras build step. This file does not itself approve the app or create a signed iOS build.

For the existing iOS listing, set the App Store marketing URL to `https://yoki-yoki.replit.app/landing/`, link the actual store listing in AdMob, and complete app verification after Google's crawler discovers `https://yoki-yoki.replit.app/app-ads.txt`. Native ad delivery still requires an approved app and an installed signed build containing the configured SDK and production units.

Additional account checks on 2026-10-20 JST:

- AdSense home confirms the payment profile, advertising setup and site linkage are complete. No remaining account-activation task was shown; the site review remains pending.
- Published the AdMob European-regulations message `YOKI YOKI iOS 広告のプライバシー設定` for the existing YOKIYOKI iOS app. It uses the existing public privacy policy, English default text, EEA/UK/Switzerland targeting, consent/reject/manage choices, rejection enabled for all listed regions, and no logo. The dashboard confirms **公開済み**. Existing native UMP integration and the privacy-options entry point are retained; device rendering is still unverified.
- The rewarded unit already has `https://yoki-yoki.replit.app/api/community/admob/ssv` configured. This check confirms the saved URL, not a real rewarded-ad transaction.
- AdMob's store search for `YOKIYOKI` and all 23 results for `YOKI YOKI` did not identify this app. No unrelated listing was linked. The existing App Store / App Store Connect URL or Apple numeric app ID is still needed to identify it accurately.
- Replit's **Start publishing to the App Store** flow returned **予期しない問題が発生しました** after preparing. No successful signed build, TestFlight upload or App Store submission was confirmed. Web publishing is a separate operation.
- The previously queued verification run [39281902357](https://github.com/NkgwYYY/YOKI-YOKI/actions/runs/39281902357) completed successfully.

Source `19a5bb9f3966efb3766827cbe5ce3458aecf93d8` was safely synchronized and republished without Replit Agent. The provider returned `success`. Production checks then confirmed `/app-ads.txt` and `/ads.txt` both return HTTP 200, `text/plain; charset=utf-8`, and the exact publisher authorization line; `/api/healthz` returns 200. No production ad was clicked or synthetic ad impression generated. These checks establish publication and reachability, not Google approval or live ad revenue.
