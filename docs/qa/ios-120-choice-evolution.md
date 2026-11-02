# YOKI YOKI 1.2.0 — TestFlight candidate

## Scope

- A warm oak room with matching day/night, portrait/landscape, eye-level and furniture-removal layers; original footless character and movement retained.
- Home shows the user's mood, physical fatigue and worries separately from companion care. Missing answers remain unrecorded. Trends remain available.
- Three-step check-in supports mood-only recording and optional fatigue/worry answers without replacing the diary.
- The diary tab opens a shared-memory album using actual saved pages and attendance; illustrations are labelled as illustrations.
- Existing users keep their current appearance. Attendance unlocks a choice, never an automatic form change.
- Free evolution advances exactly one stage after confirmation. Leaving, closing, or choosing “あとで決める” preserves the offer. Explicitly confirming “この姿のまま” forfeits only that stage's free evolution.
- Evolution/regression stones are informational **近日公開予定** cards. No price, purchasing, receipt handling or stone-use action is enabled in this release. The decline confirmation explains that evolution is unavailable until stones launch.
- Future stone rules are represented in the pure state model: one stone per adjacent stage, no multi-stage jump. AppContext rejects both stone actions until launch.
- Account-specific, recoverable storage transactions preserve chosen forms across restart. Cloud merge preserves explicit decisions and previously visited forms.

## Verification

Run TypeScript, focused state/recording/account/room/ads tests, native resident parity, iOS export and the `iOS review smoke` workflow. The new native journey checks the three-step record, home values, memory album, deferred evolution, cancelled confirmation, one-stage evolution, explicit decline, unavailable purchases and restart persistence on iPhone and iPad compatibility mode. The fresh-egg journey captures failure evidence and verifies onboarding.

## Distribution

Run `.eas/workflows/testflight-ios-120.yml` from the release branch only after validation. It builds and uploads to App Store Connect; it does not submit a public App Review version. Keep 1.1.1 (34), already waiting for review, unchanged. Add the processed 1.2.0 build to the existing internal TestFlight group. Stone products, prices and public release remain deferred.
