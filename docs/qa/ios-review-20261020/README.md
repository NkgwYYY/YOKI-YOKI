# Native release verification

This public log contains technical facts from this repository and its public
GitHub Actions runs. Store account administration, private review correspondence,
credentials and agreement records do not belong in this repository.

## Scope

`.github/workflows/ios-review-smoke.yml` builds the checked-out public source in
Release configuration on a standard GitHub-hosted macOS runner. No Apple or Expo
credentials are used. This verifies a source-built simulator application, not a
signed store IPA or a physical-device installation.

The required native XCTest journey covers fresh onboarding, diary saving, food,
AI consent refusal with draft retention, a real synthetic AI reply, persisted
consent withdrawal, map travel, a minigame, diary persistence after restart, and
local guest reflections. Synthetic test profiles use unknown
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
- Compile only arm64 on the arm64 runner.
- Retain privacy manifests from the compiled app for SDK data-use inspection.
- Keep the UI assertions unchanged; do not change app behavior just for tests.
- Provide a visible native diary header action to finish multiline input before
  choosing a mood; verify the draft remains exact and the mood becomes selected.
- Run the same native XCTest journey on iPhone and iPad against the installed
  Release app, without changing its iPhone-only device-family setting. Both must
  actually pass. The earlier Maestro flow remains for historical diagnostics.

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

Run `39438651637` (source `956dccf9`) again failed both final outcomes. Two fresh
iPhone Air devices on iOS 26.5 failed OS data migration before app installation.
The bounded bootstrap retry now selects a different installed compatible runtime
when available, and selects a device belonging to that runtime. Both actual OS
versions and failed attempts are retained; application failures are never retried.
Five synthetic bootstrap scenarios verified the runtime fallback, cleanup timeout,
first-attempt success, two-failure stop, and minimum-OS guard.

The iPad journey passed meal completion, real AI response and persisted consent
withdrawal. It then failed at the profile return button: the test's reveal helper
only scrolled towards the bottom of the page. It now uses the native element frame
to scroll towards an above-viewport control. The game test also waits for the
actual action button to finish its countdown, instead of matching the pot's
permanent accessibility label. Map/game/restart checks still need a passing run.

The run's evidence archive exceeded the connector's 512 MiB limit. Future evidence
keeps exported screenshots, accessibility text, structured summaries, privacy
manifests and logs, while omitting duplicate raw xcresult bundles and large videos.
No failure assertion or required device gate was removed.

Run `39446409295` also observed iPhone Air OS migration failure on both installed
iOS 26.5 and 26.4 runtimes before app installation. A separate, app-free bootstrap
diagnostic (`39452702333`) successfully completed OS migration on iPhone 17 Pro /
iOS 26.5 with the Simulator window open. Its optional 20-second screenshot and
migration-log captures timed out; this is only evidence of boot readiness, not
application readiness. The full journey now uses that tested device preference
and startup method. Screen capture and shutdown also have independent 30-second
limits so cleanup cannot consume the remaining iPad test time. Both actual
application journeys are still required by the final gate.

The iPad portion of `39446409295` ran on iPad mini (A17 Pro) / iOS 26.5, not the
previous Air model. It passed the profile return, consent withdrawal and map
travel, then started the egg game. Its final native screen shows a completed
TOO LATE result. The test failed before its scoop tap: XCTest spent roughly eight
seconds capturing the expectation object's debug hierarchy between checks,
missing the brief enabled-action interval. The test now polls button properties
with a predicate block and no XCUIElement expectation object, then taps directly.
The explicit readiness, result, restart/persistence and local-insight assertions
remain required. No full native pass is claimed from this failed run.

The reduced evidence archive is 29,157,172 bytes and was downloaded and verified
against SHA-256 `0a1dfc7e17f4dc567a5db682e6d16708ef02e900336a2cede33711c7c3a08888`.

Run `39455617001` (source `cfaff2f7`) passed the complete native XCTest journey
on iPad (A16) / iOS 26.5: zero failures or skips, including real AI, consent
withdrawal, map travel, an actual scoop tap and result, restart persistence and
local guest insights. The game-result screenshot shows TOO EARLY, confirming a
user-triggered scoop before automatic expiry.

The iPhone 17 Pro / iOS 26.5 boot and install also succeeded. Maestro completed
the preceding actions but failed the short-lived enabled scoop assertion; its
captured hierarchy already shows the next-order button after automatic expiry.
The final job therefore remains failed. iPhone now uses the same successful
XCTest journey, with per-device summaries and attachments preserved. The two
actual-outcome gate is unchanged. No application behavior changed for this.

Artifact `12282853687` is 70,950,198 bytes, verified against SHA-256
`9d7cb81483eb7291e13e2abd4601534f69fdda70d2d5e324942e4b56d1efc5a3`.
