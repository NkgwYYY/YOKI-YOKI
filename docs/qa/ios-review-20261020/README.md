# Native release verification

This public log contains technical facts from this repository and its public
GitHub Actions runs. Store account administration, private review correspondence,
credentials and agreement records do not belong in this repository.

## Scope

`.github/workflows/ios-review-smoke.yml` builds the checked-out public source in
Release configuration on a standard GitHub-hosted macOS runner. No Apple or Expo
credentials are used. This verifies a source-built simulator application, not a
signed store IPA or a physical-device installation.

The required Maestro flow covers fresh onboarding, diary saving, food, refusal
of AI consent with draft retention, map travel, a minigame, diary persistence
after restart, and local guest reflections. Synthetic test profiles use unknown
age so automated runs do not request live ads.

Both device steps use `continue-on-error` to preserve their separate evidence.
Their displayed step conclusions alone do not establish success. The final gate
requires the **actual outcome** of both iPhone and iPad journeys to be `success`.

## Public CI evidence

| Run | Result and limit |
| --- | --- |
| [39373152702](https://github.com/NkgwYYY/YOKI-YOKI/actions/runs/39373152702) | Native compilation stopped because `babel-preset-expo` was not declared directly. Fixed using the already locked SDK 54 preset. Neither device journey ran. |
| [39378757057](https://github.com/NkgwYYY/YOKI-YOKI/actions/runs/39378757057) | Release compilation succeeded; both journeys failed during onboarding. Follow-up changes add stable field IDs and avoid the iOS `hideKeyboard` command. |
| [39382828233](https://github.com/NkgwYYY/YOKI-YOKI/actions/runs/39382828233) | Release compilation succeeded; final outcomes were iPhone=failure and iPad=failure. The iPhone simulator reported data migration failure and driver startup timeout. On iPad, the nickname visibility assertion passed, then the tap failed; the screenshot shows onboarding while the captured hierarchy contains only system status bars. No core journey is established as passing. |
| [39383711159](https://github.com/NkgwYYY/YOKI-YOKI/actions/runs/39383711159) | General CI passed for commit `98340b9`: regressions, database integration, typechecks/builds, web care/navigation, chat recovery, guest reflection with external services blocked, and native JavaScript exports. These are not native touch tests. |
| [39389092325](https://github.com/NkgwYYY/YOKI-YOKI/actions/runs/39389092325) | Release compilation and fresh simulator startup succeeded. iPhone completed onboarding and opened the diary, then failed to confirm saving: a keyboard-covered mood tap added a `G` to the text and left the save button disabled. iPad still failed the initial nickname assertion; its screenshot shows onboarding but the driver hierarchy contains only status bars. Both final outcomes are failure. |

Artifact `12248930602` from run `39382828233` contains synthetic failure
screenshots, device/runtime metadata, the captured hierarchy and driver logs.

## Current verification changes

- Create fresh disposable simulators on the newest installed iOS runtime.
- Check data migration success before starting the native journey.
- Allow additional Maestro driver startup time and disable its CLI analytics.
- Compile only arm64 on the arm64 runner.
- Retain privacy manifests from the compiled app for SDK data-use inspection.
- Keep the UI assertions unchanged; do not change app behavior just for tests.
- Provide a visible native diary header action to finish multiline input before
  choosing a mood; verify the draft remains exact and the mood becomes selected.
- Compare the iPad journey using an independent XCTest runner against the same
  installed Release app, without changing its iPhone-only device-family setting.
  The iPhone journey continues to use Maestro. Both must actually pass.

These infrastructure changes require a successful run before claiming that the
underlying test failures are resolved.

## Source behavior under review

- Guests receive factual local recording counts, without calling the
  authenticated AI insight endpoint. Signed-in web caches are account-scoped.
- iOS permanently excludes tobacco gameplay for every user, with legacy smoking
  history retained but retired so withdrawal penalties do not continue.
- The map, legacy smoking and happiness regression checks passed 37 focused
  cases. Native tests must still verify the actual screen behavior.

Before release, verify native AI sending and error recovery, inspect the compiled
SDK privacy declarations, capture current native screenshots, and validate the
exact signed build. A compilation result or browser test does not complete those
checks.


Follow-up from run `39404007152` (source `cfddc298`): Release compilation
and the independent XCTest runner compiled. iPad native onboarding, diary
input/save and food selection passed, then the test stopped on an exact label
lookup for the chat input. The native hierarchy showed a TextView whose label
appended its placeholder; the chat screen itself was visible. A stable input
identifier resolves that selector. The iPhone OS bootstrap reported Data
Migration Failed before the app was installed. One bounded retry of a new
simulator is now allowed for that bootstrap failure only; application failures
are never retried away.

The next native iPad journey also requires a real response to a synthetic
(non-personal) greeting after explicit AI consent, followed by persisted consent
withdrawal. These assertions have not yet passed; no release readiness claim is
made here.

Run `39429267752` (source `8f5ce35f`) finished with both actual outcomes failed.
The iPad journey did verify a real AI reply after consent and retained the draft
after refusing consent. It then stopped at the profile menu lookup: the visible,
scrollable button's accessibility label contained decorative icon glyphs around
the text. Room menu buttons now expose their exact visible label for VoiceOver
and native automation. Consent withdrawal and subsequent map/game/restart steps
are still unverified in this run. The iPhone OS migration failed before install,
and its shutdown timed out before the intended fresh-device retry. That cleanup
timeout is now contained and logged; the two-attempt boot limit and failure gate
remain unchanged.

The app declares Japanese as its default and supported bundle language, matching
its interface. Expo SDK 54 config introspection confirms the generated Info.plist
values. The iOS happiness sheet also omits a stale sentence about the tobacco
activity that is permanently unavailable on iOS. These changes still require the
next native run; no complete native pass is claimed.
