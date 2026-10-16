# Daily ad placement extension

## Status

This change adds reusable placement components and tests. **It is not yet wired into the application screens or the existing production ad service.** It does not activate ads, change rewards, deploy the app, or install a second SDK.

The source base inspected is `b2d12fade2e77dda03a856289cd1ba74e2ada170` on `codex/monetization-visits-20261015`. That snapshot does not include the subsequent production ad implementation. This is an additive extension: no existing application files are replaced. Do not reset a newer working tree to this base, and do not replace the existing SSV/claim implementation with a new local reward counter.

## Intended placement

| Surface | Passive banner | Optional reward |
| --- | --- | --- |
| HOME | One separate, labelled 320 x 50 banner rail | Available from the daily-care/points surface |
| Street | The same rail as HOME, not an extra overlapping ad | Available from the shared points surface |
| Food sheet | None next to purchase or feed controls | A separate “広告を見て＋30pt” action |
| Egg job | No new passive ad | Reuse the existing shared reward flow |
| Diary, conversation, other screens | No new ad | No new ad |

The shared reward amount remains 30pt, with at most three claims per day across all placements. No per-screen counter is introduced. Ordinary feeding, travel and play do not require an ad. An ad-free entitlement removes passive ads; the existing service can also hide optional rewards by setting `rewardedAvailable=false` according to its actual pass policy.

## Integration contract

Mount `DailyAdProvider` once using an adapter to the **existing** ad service. All placement consumers must use that same service.

- `getSnapshot()` returns a cached, referentially stable snapshot. `subscribe(listener)` invalidates it only when state changes. Keep the adapter identity stable.
- `sessionKey` changes on login/logout/account switch, including returning to the same user after logout. It must not be a reusable user ID alone. Do not send it to ad targeting or analytics.
- `revision` identifies the server/provider quota period. `remaining` is null until the existing authoritative common allowance is loaded; do not assume three views on startup or when a request fails.
- `ready` requires the existing consent, account, entitlement and configuration checks to have finished. Set availability false in unsupported builds, browser previews without a web provider, or on no-fill.
- `watchRewarded(placement)` is the existing opt-in ad flow. It must resolve `verified` only after existing SSV and the idempotent reward claim have succeeded and the shared wallet/quota have been synchronized. A client SDK earned callback alone is not verification. Preserve existing server transaction IDs and retry/recovery behavior.
- Cancellation resolves `closed`; SDK/no-fill failure resolves `unavailable` or `error`; slow server verification resolves `pending`. Do not re-watch just to recover a pending reward. Existing service retry/reconciliation remains authoritative.
- `renderBanner()` returns a real SDK element at exactly 320 x 50. It must not invoke hooks directly. A failed request/no-fill must remove the element, not keep refreshing or record a fake impression. No mock creatives in a production adapter.
- No diary, mood, MBTI, blood type or health information is added to any ad call. The placement name is the only argument from this extension to `watchRewarded`.

The wrapper guards cross-placement double taps. Its 120-second UI deadline returns `pending` without releasing the SDK lock: a still-active ad must not permit a second concurrent video. The underlying service must still settle on native close/error and publish any late verified result. This deadline does not cancel a native video or grant a reward.

## Screen integration still required

Read the latest working source first, then connect the adapter and mount the new components.

1. HOME and street: render `DailyAdRail` in a reserved flex-column sibling outside the map/gesture surface. Do not overlay it on the character, joystick, exit, or navigation. The current `WorldDock` has absolute positioning; its bottom inset and the map's measured height must be reconciled with the reserved rail before enabling it. Merely adding a banner to the HOME footer is insufficient.
2. Meal: put `DailyAdRewardButton` in the food sheet separately from existing purchase/feed/back buttons. The sheet itself is the visible placement, not an obscuring modal. Set `obscured` for another layer that covers it. Retain normal feeding without any ad condition.
3. Egg job: use the same binding and gate rather than adding a separate service or daily allowance.
4. Update the environment from real screen focus, app foreground state, modal/transition state, keyboard state, movement and measured size. Do not hard-code `foreground=true` or `interacting=false`.
5. Reserve the rail for a stable interaction-safe scene interval. If an active SDK creative temporarily needs to be hidden, do not remount/request it on every joystick press; retain/dismiss it through the existing service until a safe scene boundary. These components are placement primitives, not an ad refresh scheduler.

Banners are suppressed in landscape, short views below 640 logical pixels and widths below 352 logical pixels. The rail reserves 88 logical pixels with an advertising label and separation from interaction controls; the native creative is not clipped or scaled. These thresholds are conservative placement rules, not proof of full-screen layout safety.

## Verification performed for this change

- 63 focused Node tests passed, including cap sharing, malformed states/results, same/cross-screen taps, account changes, closed/no-fill/pending handling, deadlines and late rejection.
- Strict TypeScript check of the pure placement/gate module passed (local TypeScript 5.8.3, Node 22.16.0).
- TSX syntax/transpilation check passed for the component module.
- No native SDK import, wallet mutation, storage write, network call or automatic ad presentation is added by the UI extension.

Reproduce in the repository's installed mobile workspace:

```sh
pnpm --filter @workspace/mobile exec node --test tests/dailyAdPlacements.test.mjs
```

Not performed: full application typecheck/build/test suite, React Native rendering, real iPhone/iPad/Android interaction, production ad/consent/SSV tests, revenue/impression validation, current workspace integration, main merge or deployment. The component tests include source/transpilation contracts; they are not a browser/native rendering test.
