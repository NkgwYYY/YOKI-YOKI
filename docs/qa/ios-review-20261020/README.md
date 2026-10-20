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

Run `39378757057` successfully compiled the source Release app, but **both journeys failed**. iPhone Air / iOS 26.5 entered onboarding and stopped at Maestro's unreliable iOS `hideKeyboard` command. iPad Air 11-inch (M3) / iOS 26.2 displayed onboarding but did not match the nickname accessibility selector. The evidence reports source bundle version 19, not signed EAS build 21. Step conclusions appear successful because both test steps use `continue-on-error` to collect both devices' evidence; their actual `outcome` values and the final gate are failures. No HOME, diary, chat, map or game journey has passed yet.

The next candidate adds stable onboarding IDs, dismisses the keyboard when choosing profile/diary options, avoids Maestro's `hideKeyboard`, and captures test screenshots plus debug output in the uploaded evidence directory. It also fixes guest reflections: iOS guests previously called the authenticated insight API and received 401. Guests now see factual local recording counts without an AI request; signed-in web users keep the consent-gated AI feature with account-scoped caching. These changes require a **new signed build after native verification**; build 21 does not include them.

## Apple review history confirmed in App Store Connect

The account is signed in. Version 1.0 remains rejected with build 18 attached. Apple messages include launch crashes (builds 5/6), registration errors and missing verification email (builds 13/17), missing health sources / disclaimers including English localization (builds 16/17), unresponsive core buttons on iPadOS 27.0.1 (build 18), and stale 6.5-inch screenshots (build 18). The English description's optional-account claim was replaced with the current iOS guest-only behavior; Save is disabled after saving, and the persisted form value matches the corrected text.

Apple also explicitly requested a **physical-device recording on the latest OS**, typical use flows, purpose/audience, setup instructions, external services, and regional behavior. Simulator evidence does not satisfy that physical-device request. The September 8 developer reply already provided two physical-device YouTube recordings (walkthrough and account deletion), stated to be captured on iPhone 11 Pro / iOS 26.6.1. Thus the original video request was answered; do not tell the owner that no video was ever supplied. Those recordings predate the current guest-only interface and are not evidence for the current candidate. A current recording would help demonstrate the new native behavior, but Apple's latest message specifically requests button fixes and current screenshots. An updated Apple Developer Program License Agreement is pending; it has not been accepted. No new build has been uploaded or submitted for review.

## Additional release risk found

The iOS candidate exposed a repeatable smoking mechanic that grants happiness, offered cigarettes as gifts, and displayed tobacco scenes. App Store Connect answered **None** for alcohol/tobacco/drug depictions. Merely increasing the rating would not address App Review guideline 1.4.3's prohibition on encouraging tobacco consumption.

The next iOS candidate permanently removes access to that scene for **all iOS users**, regardless of account, location, or review status. The atlas and walking gates omit it; old direct routes open Home; the storage action rejects smoking operations on iOS. Existing smoking history is retained but marked retired so withdrawal penalties do not continue. Web/Android behavior is not changed. Native evidence must confirm the tobacco destination is absent, and review notes must disclose this product change. Build 21 still contains the old feature and must not be submitted.

Targeted map, happiness and legacy smoking regression tests: **37 passed**. Mobile typecheck passed. These are not a substitute for the final native journeys.

Run `39382828154` / commit `ddb6989` passed the complete existing CI suite, database integration, mobile/API/website typechecks, web/native JS exports, care/navigation browser checks, chat recovery/consent checks, and the new guest reflection browser test with all external APIs blocked. It does not include the subsequent iOS tobacco removal. Native run `39382828233` is still in progress.

The live App Privacy declaration currently lists 23 data types, including credit information, payment information, environment scans, precise location and audio; all are marked not linked to identity. This does not match the iOS code and requires correction. The iOS app has no account/email collection, no payment flow enabled, no microphone/environment/precise-location feature. AI profile/health/behavior inputs, server-backed friend/room data, pseudonymous player IDs and AdMob SDK data must still be declared accurately; guest-only does not mean no server collection. No privacy declaration has been changed yet.

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
| Credentials / submission | Resolve the submission credential permission issue and pending Apple agreement. Upload the exact store build, wait for processing, attach it, then submit. None of these steps is implied by a successful EAS build. |

## Primary references

- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions
- https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- https://docs.expo.dev/submit/ios/

Do not publish account credentials, key identifiers, private review contact details or Apple authentication screenshots in this public repository.
