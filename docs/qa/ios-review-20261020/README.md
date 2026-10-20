# iOS resubmission checks — 2026-10-20

This is an evidence log, not a claim that App Review submission is complete.
No Replit Agent or paid plan upgrade is used.

## Confirmed

- Production App Store build `1.0.0 (21)` succeeded. This proves compilation and signing, not installation or App Review acceptance.
- Matching production-profile iOS simulator build `e5b459a4-46eb-4cb4-ae46-85cd635e86b9` succeeded. It is not the signed store IPA.
- Published browser chat returned a normal Japanese response to a synthetic greeting. A new synthetic guest used unknown age and gender. Sending before AI consent opened the disclosure screen; accepting retained the unsent draft and still required Send. The prior 401 was not reproduced in this request. Consent was then withdrawn in Profile; reopening the consent screen showed the opt-in button again, confirming the saved UI state.
- Read-only published `/api/community/config` returned `enabled: true`, `ads: true`, `passSales: false`. Native AdMob identifiers are configured. Do **not** describe native advertising as disabled or claim a verified impression.
- iOS uses `GuestAuthProvider`; it ignores cached Clerk account sessions. GA4 instrumentation is web-only. Native purchase buttons require RevenueCat/product configuration.
- AI requests include messages, nickname/profile context, and recent mood/sleep/behavior records after explicit consent. Server request logs serialize request ID, method and URL path, not chat bodies. Third-party retention still needs to be represented accurately.

## Native test execution

The prepared Maestro flow covers fresh onboarding; opening and saving a diary; food; rejecting AI consent and retaining the draft; map travel; a minigame; and diary persistence after restart. It uses synthetic data only. Unknown age prevents live advertising during automation.

EAS rejected the `maestro` job because that job requires a paid plan on this account. A free CI/CD minute allowance does not establish eligibility for this job. No upgrade was accepted, and no native test ran there.

`.github/workflows/ios-review-smoke.yml` is configured to run the same simulator artifact on standard GitHub-hosted macOS runners for this **public** repository. It captures the exact device/runtime in `environment.json` and uploads failure screens and test reports. iPad compatibility mode must be checked even though `supportsTablet` is false.

GitHub run `39372705595` started the standard macOS jobs, but both stopped at the artifact download with HTTP 403 from Expo. Maestro was skipped; no native interaction test or screenshot was produced. This is an access blocker, not an observed app crash. Do not rerun unchanged or mark native verification complete. Resolve authorized artifact access (without copying Expo credentials into this public repository) or build the public source directly on the runner before continuing. The workflow file and test flow are prepared but **not yet validated end to end**.

The follow-up workflow builds the checked-out public source directly on the standard macOS runner using the production domain, Release configuration and simulator SDK. It uses no Expo or Apple credentials. One compiled app is tested sequentially on iPhone and iPad, with separate evidence and a final gate requiring both to pass. This is a source-built simulator validation, not validation of the signed EAS IPA.

Run `39373152702` reached native Release compilation but failed while bundling JavaScript: `Cannot find module 'babel-preset-expo'`. The mobile Babel configuration referenced this preset without declaring a direct dependency; pnpm's isolated dependency layout exposed the missing declaration. Both device tests were skipped, so they have not passed. The fix declares the already locked SDK 54 preset (`54.0.12`) directly without upgrading it, and checks the iOS JavaScript export before the lengthy native compilation. The next run must still pass both device journeys.

## Remaining submission gates

| Area | Required evidence / action |
| --- | --- |
| 2.1(a) HOME controls | Inspect successful native iPhone and iPad journeys; resolve failures, including overlays and touch targets. Physical-device installation remains a separate check. |
| 2.3.3 screenshots | Capture actual current native screens at Apple's accepted dimensions and replace every stale screenshot set. Browser images are not native screenshots. |
| AI | Test native sending, refusal, withdrawal, timeout and retry. Browser response alone is insufficient. |
| Privacy declaration | Reconcile health data, profile, user content, community identifiers and AdMob SDK data. Do not mark all purposes “Other” or all data “not linked” without evidence. No iOS GA4 or Clerk account collection should be claimed merely because web uses those services. |
| Age rating | Disclose the tobacco shop and smoking depictions, health/wellness topics, AI chat, advertising and applicable community/game capabilities. Evaluate simulated gambling against actual wagering mechanics, not random game outcomes alone. |
| Ads / purchases | Validate native SDK consent and ad failure handling without automated clicks or repeated live-ad impressions. In-app purchase sales currently disabled by server configuration. |
| Store metadata | Check support/privacy URLs, description, review notes, age rating and privacy settings against this binary. |
| Credentials / submission | Resolve the submission credential permission issue and App Store Connect sign-in. Upload the exact store build, wait for processing, attach it, then submit. None of these steps is implied by a successful EAS build. |

## Primary references

- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions
- https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- https://docs.expo.dev/submit/ios/

Do not publish account credentials, key identifiers, private review contact details or Apple authentication screenshots in this public repository.
