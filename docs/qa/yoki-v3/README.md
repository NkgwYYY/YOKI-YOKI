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
