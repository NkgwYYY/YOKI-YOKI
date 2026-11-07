# YOKI YOKI 1.2.5 (50)

## Native changes

- Distinguish rewarded-ad reservation and connectivity failures from privacy,
  no-fill, timeout and native presentation failures using fixed categories.
- Keep server verification pending after completed playback if connectivity is
  interrupted. Do not request another viewing or grant points locally.
- Preserve production ad configuration and the existing 10pt reward policy.

Local TypeScript check and 130 related tests passed. The macOS distribution
workflow passed TypeScript checks and all 302 selected mobile tests, verified
the production ad configuration, archived and exported the signed IPA.

Source: `45bc9920ae57e8c80a3ece22538be2bc38bfd912`
Branch: `release/runtime50-appstore-20261107`
Build: https://github.com/NkgwYYY/YOKI-YOKI/actions/runs/42377097372

Apple upload succeeded without errors on 2026-11-07 at 13:50 UTC. Processing,
TestFlight availability and App Store resubmission still need confirmation.
Automated adapter tests do not verify real-device ad playback.
