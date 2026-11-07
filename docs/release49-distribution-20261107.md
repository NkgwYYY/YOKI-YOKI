# Release 1.2.5 (49) — 2026-11-07

The user authorized server publication and continued application distribution.

## Source and validation

- Application source: `985a25aa1d9ebbdb35d6ac82eed7e2edc753ce7c`, branch `release/runtime49-appstore-20261107`.
- Feature PR: https://github.com/NkgwYYY/YOKI-YOKI/pull/14
- Feature validation passed in run `42369477971`: type checking, 254 relevant tests, iOS/web exports and browser journeys.
- Distribution run `42372639242`: type checking and 228 relevant tests passed on macOS ARM. Native archive and export succeeded; signature, exact 1.2.5/49 version and production advertisement configuration validated. Apple upload completed successfully at 12:53:10 UTC (UPLOAD SUCCEEDED with no errors). Distribution artifact 13574970958 contains the signed IPA and diagnostics.
- The first macOS attempt found a nonportable golden hash in the geometry test. The corrected test compares byte-for-byte against frozen original production geometry on the same runtime, retaining exact shape verification across ARM/macOS and Linux. No geometry math was changed for this correction.
- No paid EAS build was used. Existing GitHub signing secrets were used only in an ephemeral runner and are never included in source/log artifacts.

## Apple release state

- Apple app: `6808389457`; bundle `app.replit.yokiyoki--`.
- Live previous release: 1.2.4 (48).
- Prepared version 1.2.5 ID: `cf77efbc-8e9e-4ac6-b61a-b965510296c0`.
- Japanese and English release notes and updated review notes saved through the authenticated App Store Connect UI. Existing contact/reviewer fields retained.
- Three screenshots inherited for each of Japanese and English, verified in read-only API inspection run `42373897743`.
- Release setting: `AFTER_APPROVAL`.
- Existing internal TestFlight group: `255b6676-7deb-484a-898e-1ac35e613b5e` / Team (Expo). No new testers or invites should be created.
- Existing ASC key can read and upload but POST /appStoreVersions returned 403. Do not retry that operation with this key or broaden its permissions. App Store version creation and metadata edits were completed in the authenticated UI instead.

## Server dependency

- Replit application: `8b4577e3-38af-444f-b14f-422f2a925e4e`.
- Saved backend change: `2cf123d`, daily10 policy.
- Publication deployment ID: `b7cba70d-e06f-42d8-9eca-5afefd65978b`. This ID alone does not prove which revision is live.
- Publication completed successfully. Earlier inspection was stale while deployment was in progress; live endpoint verification below is authoritative.
- Verified live GET /api/community/config?rewardPolicy=daily10: rewardPolicy daily10, bonusPoints 10, dailyLimit 3. Legacy GET without policy: rewardPolicy legacy30, bonusPoints 30, dailyLimit 3. Both also returned passBonusPoints 30 and supportedRewardPolicies legacy30/daily10.
- The required production server gate is now satisfied. The client safely disables the new entry if the server lacks the contract.

## Remaining verification

Confirm signed IPA upload, Apple processing VALID, TestFlight group linkage, live server daily10, selected build 49 on version 1.2.5, and submitted review state. Real iPhone startup timing and a real rewarded-ad/SSV transaction have not been measured during this session.
