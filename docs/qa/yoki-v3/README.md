# YOKI YOKI 3.0 — local QA evidence

All screenshots use synthetic local guest data and original app character artwork. They contain no signed-in account or real diary data. `before/` records the previous implementation; `home/` records the first validated 3.0 HOME checkpoint; `final/` records the final garden/book pass. Browser viewport emulation is not a native device test.

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
