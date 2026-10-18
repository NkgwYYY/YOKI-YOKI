# Native ad lifecycle follow-up — 2026-10-18

## Saved implementation

Code commit: `bd165982bd56b89d274eab66688a87c3d51c573b`.
Parent: `a8666c130479bcf46e42527e80c273626e20d46c`.

The native rewarded-ad adapter and a new deterministic regression suite were changed. No runtime dependencies, production credentials, advertisement IDs, reward values, quota limits, database schema, purchase configuration or deployment settings were changed.

- Native listener registration and `load()` synchronous exceptions now use the same cleanup path as asynchronous SDK errors. All previously registered listeners are detached and a queued late LOADED event cannot open the failed advertisement.
- Synchronous `show()` exceptions and rejected show promises settle and release the operation rather than escaping an SDK callback.
- Repeated LOADED notifications are ignored after the first presentation starts.
- Analytics and estimated-revenue observers are isolated from playback and settlement, including both thrown exceptions and rejected observer promises.
- Earned and paid events outside the live presentation are ignored. SDK completion still does not itself grant any points; the existing server verification and idempotent collection remain authoritative.

## Reproduction and local checks

The original native source was copied from the inspected commit and its Git blob SHA was verified as `17b8c253480a25fdab722508e5eefb77cbe17d0c` before testing.

The initial 14-case regression suite reproduced **7 failures** against that unchanged source (7 passed, 0 skipped/cancelled). After the fix, all 14 passed. Six additional cases then covered individual telemetry stages, asynchronous observer failures, rejected show promises and queued callbacks after close. The final **20 cases passed**, with zero failures, skips or cancellations.

The production adapter is executed with a deterministic native-SDK/event fixture. These tests do not contact AdMob, display real creatives, exercise physical devices or generate production rewards or revenue.

The saved blobs were compared with the locally tested files:

- `commerce.native.ts`: `f7efbec7c06650aeaf4d56119bf4401acbad8285`
- `nativeRewardedLifecycle.test.mjs`: `cbaa63e4fbcc6640b3b47233283d142901ddbcbe`

## Clean CI

GitHub Actions run: `39122831793` (Daily ad verification, run 6), code commit `bd165982bd56b89d274eab66688a87c3d51c573b`.

At this report's first write, frozen workspace installation, focused ad/account/server tests, disposable PostgreSQL integration, shared/mobile/API typechecks, API build, the complete existing Node regression command including the new suite, and Expo Web export had succeeded. The iOS/Android JavaScript/Hermes export was still running; see the run's final status rather than treating that step as already passed. Expo export is not an Xcode/Gradle build or a signed native release.

Previous run `39089672003` on the parent commit had completed successfully after the egg-input fixture was updated for the shared music hook and the bonus-busy input/audio guards. This supersedes older PR descriptions that still reported those two fixture failures or an unexecuted PostgreSQL integration test.

## Replit and release status

The existing YOKI YOKI project was resolved through the Replit connection and update/resume requests were accepted. Subsequent inspection calls repeatedly returned `phase: paused` and an empty response. No reason, successful synchronization report, updated source identity or completed preview operation report was returned. This is an observed limitation of the current operation, not proof of a missing credential or a particular Replit plan limitation.

The existing deployment was reported as `success` by Replit's publication-status tool. That confirms the existing published deployment status, **not publication of this commit**. No new publication was requested, no GitHub main merge was performed and no App Store submission was made.

Remaining release gates are the latest Replit source synchronization, actual preview/device operation checks, confirmation of current banner-specific IDs and consent configuration, and the authorized native build/distribution and republish steps. Previously configured rewarded-ad/SSV/database settings must be preserved; banner identifiers must not be invented or replaced by rewarded-ad identifiers.
