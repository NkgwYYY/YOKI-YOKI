# Daily ad placement extension

## Status

This change adds reusable placement components, an error-isolated shared store and tests. **It is not yet wired into the application screens or the production ad service.** It does not activate ads, deploy the app or install a second SDK.

The inspected source base is `b2d12fade2e77dda03a856289cd1ba74e2ada170` on `codex/monetization-visits-20261015`. A later Replit ad implementation was reported in the previous conversation, but it is not present in that GitHub snapshot. This is an additive extension: no pre-existing application files are replaced. Do not reset a newer Replit working tree to this base or replace its SSV/claim implementation with a local counter.

## Intended placement

| Surface | Passive banner | Optional reward |
| --- | --- | --- |
| HOME | One separate, labelled 320 x 50 banner rail | Daily-care/points surface |
| Street | The same rail as HOME, not an overlapping second ad | Shared points surface |
| Food sheet | None next to purchase/feed controls | Separate ad-for-30pt action |
| Egg job | No new passive ad | Existing shared reward flow |
| Diary, conversation, other screens | No new ad | No new ad |

The extension retains the agreed 30pt reward and a shared three-claim daily limit. No per-screen allowance or wallet is introduced. Normal feeding, travel and play must remain usable without an ad. The adapter may suppress optional rewards independently of passive-ad removal, according to the actual pass policy.

## Integration contract

Mount `DailyAdProvider` once with a stable adapter to the **existing** ad service.

- `getSnapshot()` publishes account/session, readiness, current authoritative quota, entitlement, availability and phase. Unknown quota is null, not an invented three-view allowance. The wrapper caches immutable copies so mutable or newly allocated service objects cannot cause stale-account notices or React external-store loops.
- `subscribe(listener)` returns an unsubscribe function. The wrapper shares one upstream subscription across placements. Read/subscribe/cleanup exceptions fail closed for ads; late callbacks after cleanup are ignored. A subscription failure may retry on a subsequent subscription lifecycle, not on an automatic polling loop.
- `sessionKey` changes on login/logout/account switch, including returning to the same user after logout. It is not merely a reusable user ID. `revision` identifies the authoritative quota period. Do not send either value to advertising targeting.
- `ready` means the existing consent, account, entitlement and configuration checks have finished. Unsupported builds or unavailable providers must publish unavailable state.
- `watchRewarded(placement)` resolves `verified` only after existing SSV and the idempotent claim succeed, and the shared wallet/quota have synchronized. An SDK earned callback alone is not verification. Preserve existing server transaction IDs and retry/recovery behavior.
- Cancel returns `closed`; no-fill/failure returns `unavailable` or `error`; slow verification returns `pending`. Do not require another video to recover a pending reward. The existing service owns reconciliation, native cancellation and timeouts.
- `renderBanner()` returns a real SDK element at exactly 320 x 50; it must not invoke hooks directly. Its child is inside an ad-only React error boundary, which removes the ad subtree if rendering throws. SDK asynchronous failures still require handling in the adapter. No-fill must remove availability rather than record an impression or create a refresh loop.
- The placement name is the only argument this extension sends to `watchRewarded`. It does not read diary text, mood, MBTI, blood type or health data, and it does not add targeting or analytics calls.

The shared reward gate prevents cross-placement double starts. Its 120-second caller deadline returns `pending` **without releasing the SDK lock**. The underlying service must still settle on native close/error and publish late verified results. This timeout does not cancel an SDK video or grant a reward.

## Screen integration still required

Read the latest Replit source first, then connect the adapter and mount the components.

1. HOME/street: put `DailyAdRail` in a reserved flex-column sibling outside the map/gesture surface, not on top of characters, controls or navigation. Reconcile the existing absolutely positioned `WorldDock` and measured map height with the rail before enabling it. Adding the rail to the old HOME footer alone is insufficient.
2. Food sheet: put `DailyAdRewardButton` separately from purchase/feed/back controls. Its own sheet is the visible placement; `obscured` means another layer covers it. Ordinary feeding must not depend on watching an ad.
3. Egg job: reuse the same service and shared gate. The extension does not independently enforce the limit for an older egg-job button that has not been connected to this gate.
4. Derive screen focus, app foreground, modal/transition, keyboard, movement and measured size from the real application. Do not hard-code foreground or interaction state.
5. Integrate at stable scene boundaries. These are placement primitives, not a refresh scheduler: do not let every joystick press remount/request a banner. The existing service must manage creative lifetime and no-fill/backoff before the rail is enabled.

Passive banners are suppressed in landscape, views below 640 logical pixels high, and widths below 352. The rail reserves 88 logical pixels including its label and spacing; the native creative is not clipped or scaled. These conservative thresholds are not proof of full-screen layout safety.

## Verification actually performed

- The original 63 focused tests were executed locally and all passed; the three original code/test blobs matched the GitHub contents by Git blob SHA.
- After adding fault isolation and immutable snapshots, **94 focused Node tests passed, with zero failures, cancellations or skips**.
- Strict TypeScript checks passed for both pure modules: `dailyAdPlacements.ts` and `dailyAdStore.ts`.
- TSX syntax/transpilation and source-boundary assertions passed for the React component. Those checks are not React/native rendering tests.
- Regressions cover shared caps, malformed states/results, rapid taps, mutable account changes, cancellation, pending verification, deadlines, late rejection, stable snapshots, shared subscriptions and failing cleanup.
- Environment: Node 22.16.0 and TypeScript 5.8.3. No new runtime dependency was added.

Run in an installed mobile workspace:

```sh
pnpm --filter @workspace/mobile exec node --test tests/dailyAdPlacements.test.mjs tests/dailyAdStore.test.mjs
```

Not performed: full application typecheck/build/test suite, React/native rendering, iPhone/iPad/Android interaction, production consent/ad/SSV checks, impression/revenue validation, latest Replit integration, main merge or deployment.
