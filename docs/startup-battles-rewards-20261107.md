# YOKI YOKI: startup, sourced battle variety, optional points

Source is based on the archived 1.2.4 (48) release, commit c43f51e218e8a056aea1af0d7240b0b4a0fbc71d. This branch is an implementation candidate; it has not been archived, uploaded to TestFlight or submitted to App Store. The marketing/build numbers remain unchanged until a distribution candidate is prepared.

## Changes

- Native resident HTML starts with the actual pose, costume, expression and display size, avoiding the initial native bridge round trip. Load-end readiness recovery prevents a lost early message from leaving the character transparent. Fur geometry creates fewer temporary allocations and produces identical vertex buffers. Actual iPhone startup latency has not been measured.
- Battles have 24 persistent scenarios across the existing six categories. New encounters and retries cycle per category; resumed encounters retain their scenario. Old encounters remain readable. Four anger scenarios cover pausing before a sharp reply, stating needs instead of expecting others to infer a mood, making specific requests, and repairing harm after a harsh response.
- Each scenario links to primary mental health sources. Wording is adapted for learning and is not represented as an expert-authored assessment or expert supervision. HP measures the game's technique selection, not emotion or character. The final turn's feedback now remains visible until the player chooses to see the result.
- The home balance and menu open an informative points sheet, including availability explanations. Optional views use a versioned 10-point reward policy, with the existing shared three-per-day allowance. Daily records remain five points. Existing 30-point claims and paid pass benefits are preserved. Only server-verified claims are credited once.

See `artifacts/mobile/docs/moyamoya-content-sources.md` for provenance and `docs/rewarded-points49-20261107.md` for the backwards-compatible reward protocol.

## Server preparation

Replit YOKI YOKI reported server commit `2cf123d`, prepared but not published. New config, reserve and status calls use `rewardPolicy=daily10`; status query is required to return 10-point claims. Existing/no-policy clients keep their original contract. The server agent reports eight related unit tests and fourteen isolated-database tests passing, including stored-amount SSV and common quotas. It also reports eleven unrelated existing chat-test failures; those were not claimed to pass. No production database or AdMob setting was changed in this task.

Deploy the compatible server before distributing the mobile candidate. Then verify real iPhone cold/warm startup, actual rewarded-ad viewing and server-side verification, cancellation/no-fill, quota and next-day recovery. No real-ad reward or iPhone timing success is asserted by the local tests.

## Validation

TypeScript, local renderer consistency, targeted storage/battle/ad regressions, and web/iOS exports passed. Browser journeys at 390×844 and 320×568 exercise check-in, save/skip/no-repeat, sourced anger battles, saved scenario resume, final feedback, victory points and the points sheet. Browser tests do not simulate successful native advertisements.
