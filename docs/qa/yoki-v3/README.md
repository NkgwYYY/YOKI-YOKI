# YOKI YOKI 3.0 — local QA evidence

All screenshots use synthetic local data and original app character artwork. They contain no signed-in account or real diary data. `before/` records the previous implementation; `home/` records the first validated 3.0 HOME checkpoint; `final/` records the final garden/book pass. Browser viewport emulation is not a native device test.

## Repeat after installing the repository's locked dependencies

From the repository root, using the existing binaries:

```sh
node artifacts/mobile/node_modules/typescript/bin/tsc -p artifacts/mobile/tsconfig.json --noEmit
node --test artifacts/mobile/tests/*.test.mjs
```

From `artifacts/mobile`, export the application:

```sh
CI=1 node node_modules/expo/bin/cli export --platform all --output-dir /tmp/yoki-v3-export
```

Install Playwright/Chromium in a separate QA environment and set the following variables to its actual module/browser locations. A normal installed browser does not need `YOKI_QA_CHROMIUM_BUNDLE`.

```sh
export YOKI_QA_PLAYWRIGHT=/absolute/path/to/node_modules/playwright
export YOKI_QA_BROWSER=/absolute/path/to/chromium
export YOKI_QA_EXPORT=/tmp/yoki-v3-export
export YOKI_QA_SCREENSHOTS=/tmp/yoki-v3-screenshots
node artifacts/mobile/tests/world.browser.cjs
node artifacts/mobile/tests/worldJourney.browser.cjs
node artifacts/mobile/tests/feedAccessibility.browser.cjs
node artifacts/mobile/tests/residentGestures.browser.cjs
```

Run those browser commands from the repository root. Each starts and closes its own local static server and browser; fixtures seed local storage. Use a Japanese-capable system font to inspect typography. The optional `YOKI_QA_CHROMIUM_BUNDLE` points to the `@sparticuz/chromium` module when that environment requires its launch arguments; no app dependency is added.

## Verified on 2026-10-05

- 264 unit/regression tests, mobile/workspace typechecks, API bundle and Web/iOS/Android exports passed.
- HOME gestures, bed/meal staging, record feedback, one food debit, same-day behavior, reduced motion and saved reload passed.
- Browser touchscreen food/chat-sheet/record operations passed at phone, small phone, tablet and landscape sizes.
- Tank values 0/50/100/250, one reward receipt, restart preservation and motion cleanup passed.
- Book uses only encountered characters and saved excerpts; disclosure, character details, report link and source-record preservation passed.
- Food journal-write failure leaves the balance unchanged; retry debits once; disabled controls and keyboard operation passed.

Remaining: actual native device/runtime checks (including the previously reported iPad interaction issue), VoiceOver/TalkBack, native keyboard/safe areas/gestures/performance, real authenticated synchronization and the existing signed-release pipeline. Chat tests do not certify production AI behavior. Earlier 2.0 rhythm-entry browser scripts describe retired navigation and are not the 3.0 entry-point regression suite. Archived rhythm source/data remain preserved.

## Interruption follow-up — 2026-10-06

The fresh Web build initially could not resolve `babel-preset-expo` from the mobile Babel config. It is now a direct dev dependency using the already-locked version, with no transitive upgrades. A fresh Web/iOS/Android export passed after the dependency declaration and resident fix.

`residentGestures.browser.cjs` reproduced a real interaction defect: grabbing again before a landing finished restarted autonomous walking during the new hold. The fixed component invalidates superseded landing callbacks, stops the old motion and ignores release events after background cleanup. The browser touch-event regression verifies stationary long holds after immediate re-grab, touch cancellation, background/return and usable record/chat controls. It also captures the resulting screen when `YOKI_QA_SCREENSHOTS` is set. This is additional browser evidence, not native OS gesture certification.

## Synchronization follow-up — 2026-10-06

`cloudSync.test.mjs` covers HTTP/envelope/ack failures, hung token/request/body deadlines, cancellation, stale sessions, latest-snapshot retry, ordered uploads, guest-backup acknowledgement and journal recovery. The 288 mobile tests passed. `cloudSync.browser.cjs` bundles the real AppProvider, journal, status component and record operation with explicit synthetic auth/storage adapters; it operates retry by browser touch. It never invokes Clerk or a production API. `final/sync-upload-retry.jpg` shows that local harness and is labeled accordingly. The full exported HOME/record/garden/book flow also passed at four viewports after these changes.

The API suite uses the real Express sync route and Drizzle schema against isolated PGlite, with a test authentication adapter. A late database constraint failure leaves the entire earlier snapshot intact; concurrent first writes, retries and account separation pass. This does not certify live Clerk middleware or hosted Postgres connectivity.

```sh
# Temporary QA tooling only; no app dependency or production database required.
npm install --prefix /tmp/yoki-qa --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.3.14
NODE_PATH=/tmp/yoki-qa/node_modules YOKI_QA_PGLITE=/tmp/yoki-qa/node_modules/@electric-sql/pglite/dist/index.js node --test artifacts/api-server/tests/sync.test.mjs
# Use the browser variables above; this harness builds itself with the repo's esbuild.
node artifacts/mobile/tests/cloudSync.browser.cjs
```

The subsequent restart scenario initially failed: a cloud pull replaced an unacknowledged record after reload. The account-scoped local outbox fixes this; the same browser scenario now passes after reloading and visiting a different account before returning. Pending data is sent before a pull, and an older acknowledgement cannot erase a newer staged snapshot. Outbox corruption/write failure, offline restart and queued edits are covered by unit tests. Four tests execute the actual tab gate and verify that cached profiles cannot bypass failed initial sync. Total: 303 mobile tests plus the 7 isolated API checks above.

These tests certify synthetic failure/retry/restart behavior, not live identity-provider integration or a new multi-device conflict policy. Native/device/account release gates above remain open.

## Account-operation follow-up — 2026-10-06

The new actual-provider tests first reproduced 8 failures before the fix. Logout errors now remain visible; deletion requires a valid server acknowledgement, clears the recovery journal through the shared storage queue and retains the identity for retry if local cleanup fails. Concurrent delete calls share one operation. A failed app reopen after successful deletion retries only reopening.

All 318 mobile tests, mobile typecheck and fresh Web/iOS/Android exports passed. The 7 preceding isolated API checks remain applicable because the server did not change. `accountLifecycle.browser.cjs` runs the actual AuthProvider, GrowthScreen account dialogs and storage/transport code with explicit synthetic Clerk, network, router, reload and storage adapters; unrelated album/chart rendering is stubbed. No production account or server is contacted. At 320×480, browser touch verified logout failure/retry, pending deletion controls, invalid acknowledgement, cleanup failure and successful-deletion/reopen retry without duplicate deletion. There were no page errors.

```sh
# Use the browser variables above; no app export is required for this harness.
node artifacts/mobile/tests/accountLifecycle.browser.cjs
```

`final/account-logout-retry.jpg` and `final/account-reopen-retry.jpg` show the inspected local harness with synthetic account data. They demonstrate readable retry feedback, not production authentication or native screen-reader behavior. Deletion spans backend, local storage and Clerk; the tests do not certify a distributed transaction, in-flight server mutations or real identity-provider transitions. Shared local-cache isolation across accounts also remains unverified. Live-account/native/release gates remain open.

The final full export also passed `worldJourney.browser.cjs` at 320×568, 390×844, 820×1180 and 844×390: actual tank values, one reward receipt and reload, HOME return, encountered-only album, unchanged records and report navigation, with no page errors.

## Account snapshot follow-up — 2026-10-06

`cloudSync.browser.cjs` initially failed when switching directly to a signed-in account with only a profile in its cloud snapshot: the preceding account's record remained in memory/storage. Hydration now replaces every managed app key, including removal of absent keys, and loadAll restores defaults for absent state. The local recovery journal accepts a version 2 format for removals; existing version 1 balance transactions remain unchanged and readable. Other accounts' outboxes and unrelated storage keys are excluded.

The extended browser flow passes after an injected removal failure and retry, verifies zero records/points and default name/progress, and confirms the next upload contains no previous records or inventory. The inspected `final/sync-account-switch.jpg` shows the synthetic local harness. All 328 mobile tests, mobile typecheck and fresh Web/iOS/Android exports pass. Ten new storage checks cover complete/empty replacement, interruption at each persistence step, stale identity and invalid keys/values/journals.

This covers direct signed-in snapshot hydration, not account → guest → account ownership, all other local caches, live Clerk transitions or native execution. Those remain release gates; no production account or database was used.

The final exported `world.browser.cjs` also passed HOME interactions, meal debit, record/light/garden flow, same-day update, reduced motion and four-viewport touch/reload checks including night, with no page errors. The final HOME and small-phone record sheet were visually inspected after these storage changes.

## Guest ownership follow-up — 2026-10-06

The browser regression initially failed because account records survived logout and were treated as guest data. A local owner marker now travels with the recoverable managed snapshot. Logout/session expiry preserves a detached account copy and opens a fresh guest; that copy is not automatically uploaded/merged. Genuine guest data is preserved in the account outbox before transfer, including when the account already has an unacknowledged upload. Account deletion clears only its own detached copy.

All 344 mobile tests and mobile typecheck passed. New checks cover legacy-data retention, ownership corruption, stale callers, each detach persistence interruption, pending account plus new guest data, unresolved signed-in identity and detached-cache deletion. The actual-provider browser flow verifies failed detachment blocks editing until retry, logout/restart, guest-only transfer, transfer upload failure/restart, merging the returning account's pending data and rejection of cloud ownership metadata. No production identity or database is used.

Legacy unmarked data is preserved under its first resolved identity; tests cannot prove its earlier ownership. These checks cover the managed AppContext cache, not all auxiliary caches or live authentication. Native/device/live-service and release gates remain open.

Fresh Web/iOS/Android exports, the actual account-dialog regression and final exported `world.browser.cjs` passed after these changes. HOME gestures, meal debit, record/light/garden, same-day update, four-viewport touch/reload and night checks produced no page errors. HOME, landscape record and `final/sync-guest-owned.jpg` were visually inspected; the last image explicitly shows the synthetic local harness.


## Deletion concurrency follow-up — 2026-10-06

The new `api-server/tests/accountDeletion.test.mjs` reproduced delayed authenticated sync/equipment writes recreating content after deletion. Server routes now share an account-row lock and retain a reserved, non-synchronized deletion fence. Client snapshots cannot overwrite the fence. Deleted accounts receive 410 / ACCOUNT_DELETED; repeated DELETE remains valid for cleanup retry. Record/profile content, inventory and equipment are removed atomically. The account confirmation, guide and privacy page disclose the retained deleted-ID metadata.

`mobile/tests/accountDeletion.browser.cjs` runs the actual AuthProvider, AppProvider, sync/storage code and AccountDeletionGate with synthetic SDK, network, local storage and reload adapters. It verifies pending push/pull cancellation, no late hydration after cleanup, terminal state after identity-service failure, failed DELETE recovery, lost acknowledgement followed by server 410, deleted-account restart and retry/reopen actions at 320×480 and 844×390. Browser heading enlargement is only a layout stress check. No live account, production API or production DB is used.

```sh
NODE_PATH=/tmp/yoki-v3/qa/node_modules \
YOKI_QA_PGLITE=/tmp/yoki-v3/qa/node_modules/@electric-sql/pglite/dist/index.js \
node --test artifacts/api-server/tests/*.test.mjs
# Use the browser variables above; no export is required for these harnesses.
node artifacts/mobile/tests/accountDeletion.browser.cjs
node artifacts/mobile/tests/accountLifecycle.browser.cjs
node artifacts/mobile/tests/cloudSync.browser.cjs
```

All 353 mobile tests and 15 isolated API tests passed. Mobile/shared/API/landing typechecks, API build and final Web/iOS/Android exports passed. Existing account-dialog and cloud ownership/restart browser checks passed. Full exported world.browser.cjs passed the four-viewport HOME/record/garden flows and reload, with no page errors. Inspected HOME/landscape record and the small-screen account UI; `final/account-delete-confirm.jpg` and `final/account-deletion-complete-retry.jpg` show the actual dialogs in a local synthetic harness. The second screen is reached only after confirmed server deletion.

PGlite exercises real SQL/schema/routes but not separate hosted DB connections or Clerk JWT validation. The per-account lock must be used by all deployed writers; mixed old/new API workers are not certified. Deletion remains retryable coordination across separate systems, not a distributed transaction. Native/device/live identity transitions, auxiliary caches and Replit/release reconciliation remain open. No release or main merge.


## SDK identity transition follow-up — 2026-10-06

Fourteen new actual-AuthProvider regressions failed before the fix. Auth/user/session disagreement and delayed tokens are now gated; getToken uses a captured Clerk SessionResource, logout names its initiating session, and deletion checks its scope before request, after acknowledgement and inside the shared storage cleanup queue. A -> loading -> A does not revive earlier callbacks. Different accounts cannot share a pending deletion promise.

All 371 mobile tests (18 new), mobile typecheck and fresh Web/iOS/Android exports passed. Server code was not changed; the preceding 15 isolated API checks remain applicable. Existing accountDeletion.browser.cjs and accountLifecycle.browser.cjs passed with coherent synthetic session resources.

```sh
# Browser variables are listed above; this harness needs no app export.
node artifacts/mobile/tests/authTransition.browser.cjs
```

The new harness runs real AuthProvider/AppProvider and storage/sync code with synthetic Clerk hooks that change independently. It checks no requests/writes while identities disagree, correct captured-session token selection even before React receives a global SDK switch, rejection of late tokens, account B storage/ownership preservation after account A's delayed DELETE, and explicit session-specific logout. No page errors. `final/auth-transition-preserved.jpg` is inspected local/synthetic evidence, not live Clerk or production-data evidence.

These checks cover the managed AppContext snapshot. Chat, insight and home-comment raw caches remain a separate ownership task and must not be silently added to cloud sync. Live authentication/service transitions, native execution and Replit integration are still release gates.

The final exported world.browser.cjs also passed HOME gestures/meal, record→light→garden, same-day reward preservation and four-viewport touch/reload including night, with no page errors. HOME and landscape record were visually inspected after the authentication changes.


## Private local cache ownership — 2026-10-06

Chat, insight and HOME-comment caches now use local account/guest envelopes, outside the managed cloud allowlist. Migration preserves existing bytes under the recorded previous owner before AppContext changes ownership. Unmarked legacy values follow the first resolved identity; historical authorship cannot be reconstructed. An interrupted migration rolls forward its recorded owner; corrupt/conflicting caches stay intact and block loading. Guest conversations remain separate from account conversations, including after signing in and returning to guest.

A single private queue serializes writes and account deletion. Scope-bound readers/writers reject expired identities, and the actual chat/insight UI remounts per scope. Deletion writes a content-free account tombstone after server acknowledgement, preserving other accounts and guest data. The in-app guide describes device-only storage. No chat content was added to cloud sync.

```sh
node --test artifacts/mobile/tests/*.test.mjs
# Browser environment variables are listed above. No export needed for this harness:
node artifacts/mobile/tests/privateCache.browser.cjs
# Against a fresh YOKI_QA_EXPORT (actual app export):
node artifacts/mobile/tests/chatStorage.browser.cjs
node artifacts/mobile/tests/chatRecovery.browser.cjs
node artifacts/mobile/tests/chatPopulated.browser.cjs
node artifacts/mobile/tests/insight.browser.cjs
```

392 unit/regression tests, mobile typecheck and fresh Web/iOS/Android JS/assets exports passed. No API changes in this checkpoint. The new browser harness uses actual AuthProvider/AppProvider, chat, InsightCard and HOME-comment utility, with synthetic SDK/network/native-art adapters. It checks A/B/guest isolation and restart, old-identity response rejection, account deletion during a pending HOME comment, guest preservation and no private keys in a real managed upload. The synthetic chat render was visually inspected locally. Its image is excluded from publication after automatic approval review rejected the image upload (content/sensitivity and image-sharing authorization were not established). The harness can reproduce this evidence locally; it is not live account validation.

Actual exported chat tests passed load failure/save retry/delete retry, HTTP/malformed reply/cancellation, and 120 legacy messages displayed as latest 60 without truncating stored history at 320×568 and 844×390. Insight cache failure retains the valid result, retries storage without another AI request, and restores on same-day reload. Existing cloudSync/authTransition/accountDeletion browser checks passed, as did the full world flow at four viewport sizes including night. Original-art HOME and landscape record were visually reviewed; no page errors. Real native runtime and live authentication/hosted DB are still unverified; no main merge, production deploy or signed release.


## Real HTTP/authentication integration — 2026-10-06

The earlier insight browser fixture incorrectly allowed guest AI calls. Actual POST /insight requires login and has a per-user daily limit. Guests now receive a clearly labeled on-device reflection from up to 30 unique saved days, with no AI transmission or personality/health inference. Signed-in AI analysis retains the existing authentication requirement. Missing tokens, expired sessions, rate limits and a 15-second deadline covering token/headers/body have explicit recovery states. The local and AI cache types are distinct, and new record counts invalidate the local summary.

A new actual-route regression failed before correcting malformed AI handling: object-shaped result collections reached an internal error, and object fields could become display strings. The server now returns 502 for invalid collections/text instead of accepting them. No authentication, rate-limit, model, schema or balance policy was changed.

```sh
node --test artifacts/mobile/tests/*.test.mjs
NODE_PATH=/tmp/yoki-v3/qa/node_modules \
YOKI_QA_PGLITE=/tmp/yoki-v3/qa/node_modules/@electric-sql/pglite/dist/index.js \
node --test artifacts/api-server/tests/*.test.mjs
# Use the browser variables above PLUS the same NODE_PATH/YOKI_QA_PGLITE:
node artifacts/mobile/tests/insightIntegration.browser.cjs
# Finish exporting before serving a fixed YOKI_QA_EXPORT directory:
node artifacts/mobile/tests/insight.browser.cjs
node artifacts/mobile/tests/world.browser.cjs
```

`api-server/tests/fixtures/authenticatedServer.mjs` boots the actual Express app and installed Clerk verifier against generated, memory-only RSA test keys, real routes and an isolated PGlite schema. AI vendor output is a deterministic substitute. It rejects missing/malformed/expired/future/wrong-signature tokens, tests subject-scoped rows against spoofed body IDs, per-user limits and the deletion fence. External fetches are prohibited and counted. No real secret or production data is needed or published.

The browser integration uses real AuthProvider/AppProvider/InsightCard and actual HTTP responses from that app. Its SDK session delivery is synthetic. It verifies guest on-device results and refreshed counts, storage retry/reload, no private payload without a token, a server-rejected expired token, malformed AI results, timeout and retry, valid AI storage retry without another generation, managed record→HTTP→SQL→readback and exclusion of private caches from sync. Small guest and landscape limit renders were visually inspected locally. The private-cache browser regression also passes with the new analysis mode.

404 mobile tests, 22 isolated API tests, mobile/API typechecks, API build and Web/iOS/Android JS/assets exports passed. These are not signed native builds. The initially running world-flow attempt lost its index.html during a simultaneous re-export; its result was discarded. The fixed-export rerun passed the complete HOME/record/light/garden touch flow, same-day rewards, four viewport sizes/reload and night, with no page errors; HOME and landscape record were visually reviewed. Serve the completed export without rewriting that directory during testing. Images remain local under the preceding publication restriction. Live Clerk/Replit proxy/AI/hosted DB, native runtime and release reconciliation remain unverified.

## Production asset delivery — 2026-10-06

The actual deployment server initially returned Web HTML (HTTP 200) for an existing Japanese/space-named image, a missing density variant and a missing native bundle. The build also guessed unsuffixed asset filenames, omitting Retina/platform variants. This was outside the earlier Expo-export helper-server coverage.

`scripts/build.js` now reads Metro's exact asset file/scale metadata. `scripts/nativeAssets.cjs` copies every runtime-selected scale into separate platform directories, preserves source bytes, rewrites bundle locations and validates missing/conflicting assets. The first actual build exposed the difference between Metro's raw query paths and Expo's encoded bundle paths; the normalization fix is covered by a regression. `server/serve.js` decodes paths and distinguishes missing resources from application routes.

The normal production command remains `node artifacts/mobile/scripts/build.js`. For a local build check, use an isolated `STATIC_BUILD_DIR`, a syntactically valid test-only Clerk publishable key and the configured production host. This compiles public configuration into local files; it neither authenticates a real user nor deploys. Do not use a production secret or overwrite a running export. The same `STATIC_BUILD_DIR` selects the output for `server/serve.js`.

```sh
node --test artifacts/mobile/tests/*.test.mjs
# After the production build finishes, using the browser variables above:
YOKI_QA_NATIVE_BUILD=/absolute/path/to/completed-production-build \
YOKI_QA_EXPORT=/absolute/path/to/completed-local-only-web-export \
node artifacts/mobile/tests/productionDelivery.browser.cjs
```

414 mobile tests and mobile typecheck passed. The real production build completed Web/iOS/Android JS packaging in an isolated directory without modifying tracked old static outputs. Each native platform's generated manifest and bundle were fetched from the real server; all 112 files from 100 descriptors, including 12 higher-density files, matched the byte hashes used by Expo. The configured Web entry and asset headers/deep links were checked too. The offline manifest-artwork warning does not constitute a native startup pass; application asset HTTP coverage was independently verified.

The server then served the completed local-only export of the same app source for the full world interaction suite: HOME reactions/meal, one debit, record/light/garden, same-day reward preservation, small/tablet/landscape/night touch and reload. All passed with no page errors. Original-art HOME, landscape record and the light garden were visually inspected; new images remain local. Native execution, real account startup and Replit release integration are still separate gates. Read-only public-host checks returned health 200 and the older September 22 iOS manifest; no live write, deployment, signing or release was performed.

## Configured Web startup recovery — 2026-10-06

The previous production Web build reused an earlier guest export's Metro transforms: its bundle had no configured Clerk publishable key and included an undefined API-domain URL, although native bundles had the current settings. Re-exporting the unchanged source with `--clear` inlined the intended key/domain. The production build now uses that flag for Web export and native Metro startup. The test below asserts the compiled configuration before opening the app; merely setting build-process environment variables is not sufficient evidence.

That clean, configured baseline reproduced another failure with the actual installed Clerk SDK: a network failure changed its status to error, at which point both root ClerkLoading/ClerkLoaded controls disappeared and the app was blank. AuthStartupGate now keeps unresolved identity behind an explicit loading/recovery screen, with a 15-second wait limit and an operable reload button. It does not initialize the app data providers or silently become a guest. Reload failure/hang, duplicate taps, late completion and unmount are covered by six component regressions.

```sh
# Build with the synthetic clerk.yoki.invalid publishable key only. These
# commands do not contact an account or publish the resulting files.
CI=1 EXPO_OFFLINE=1 EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 NODE_ENV=production \
NATIVE_BUNDLE_PUBLIC_DOMAIN=yoki-yoki.replit.app \
CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsueW9raS5pbnZhbGlkJA== \
STATIC_BUILD_DIR=/tmp/yoki-auth-build \
node artifacts/mobile/scripts/build.js
# Use the browser tool paths described above. The test starts the real server:
YOKI_QA_NATIVE_BUILD=/tmp/yoki-auth-build \
node artifacts/mobile/tests/authStartup.browser.cjs
```

420 mobile tests, mobile typecheck and the full production bundle build pass. The browser test uses the real compiled app and installed SDK, blocks all external traffic, then tests both failed and pending SDK requests. It touches the reload button, checks portrait/landscape reachability and preserved synthetic storage, and asserts no private-data API calls, local app-data writes, guest onboarding or page errors. Small and landscape recovery screenshots were visually reviewed and remain local. Expected SDK network-error logging is not suppressed or counted as a successful identity connection. A successful live session and hosted DB round-trip are still unverified; no release or deployment is implied.

A separate fresh guest Web export also passed the full world suite through the actual production server: HOME gestures and meal, record/light/garden, same-day balance preservation, small/tablet/landscape/night touch and reload, with no page errors. Small HOME and the record sheet were visually reviewed. The current production build's native asset delivery was checked again in that same harness: all 112 files for each platform matched the runtime hashes. None of these browser viewport checks certifies a native device.
