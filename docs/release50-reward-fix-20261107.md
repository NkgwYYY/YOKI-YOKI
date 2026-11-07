# YOKI YOKI 1.2.5 (50)

## Native changes

- Distinguish rewarded-ad reservation and connectivity failures from privacy,
  no-fill, timeout and native presentation failures using fixed categories.
- Keep server verification pending after completed playback if connectivity is
  interrupted. Do not request another viewing or grant points locally.
- Preserve production ad configuration and the existing 10pt reward policy.

Local TypeScript check and 130 related tests passed. The distribution workflow
runs the additional mobile regression checks before archive and upload.

Source: `45bc9920ae57e8c80a3ece22538be2bc38bfd912`
Branch: `release/runtime50-appstore-20261107`
Build: https://github.com/NkgwYYY/YOKI-YOKI/actions/runs/42377097372

The distribution build is in progress. Upload and review completion have not yet
been confirmed. Automated adapter tests do not verify real-device ad playback.
