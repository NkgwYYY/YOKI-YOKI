# Rewarded points: daily10 client

New opt-in rewarded video grants 10 YOKI points with the existing shared three-per-day server allowance. A daily mood record remains 5 points. Login/visit behavior and normal battle rewards are unchanged. Existing 30-point pending claims and pass benefits are preserved.

Home's point balance is labelled “＋ポイント”; the menu also opens “広告でポイントを受け取る”. The point sheet explains the amount/limit and optional viewing. Unavailable ads, browser usage, pending profile age verification, and data loading have explicit explanations rather than silently disappearing. Retry refreshes configuration and claim status. Existing age 20+ eligibility is retained.

## Backend contract

- `GET /api/community/config?rewardPolicy=daily10`: existing fields plus `rewardPolicy:"daily10"`, `bonusPoints:10`, `dailyLimit:3`. Legacy requests must still get their former 30-point contract.
- `POST /api/community/bonus/reserve`: existing `{receipt,mode}` plus `rewardPolicy:"daily10"`. New ad reservations persist amount 10. Existing idempotent reservations retain their saved amount; pass claims retain 30.
- `GET /api/community/bonus?rewardPolicy=daily10` recovers both new 10-point and older 30-point claims. Unversioned status requests can omit new claims for compatibility; the new client must always send its policy. Claim acknowledgements keep the existing ID-scoped `POST /bonus/:id/ack` endpoint.
- Reservation responses and pending recovery entries include `amount` (10 or 30). `/bonus` claims already carry their actual saved `amount`.
- SSV uses the saved reservation amount, never an arbitrary client-supplied amount, and shares the original daily allowance across policies.
- New mobile requests fail closed before video playback if the server does not acknowledge the policy or reservation amount. Deploy the backwards-compatible backend before distributing the new binary.

The client does not grant points on a local SDK signal. Existing AdMob server-side verification, claim acknowledgement, recoverable storage transaction, duplicate receipt prevention, fullscreen lock and account-change checks remain authoritative. The ledger accepts only verified 10/30-point claims. Success copy reports the actual claim amount. Incomplete viewing, no-fill, errors, and pending verification do not fabricate a grant.

The existing configured rewarded unit is `ca-app-pub-7462386033661667/5206949357`; no new unit is invented and interstitials are not used as rewarded video. Real AdMob delivery and its SSV callback configuration need a native-device acceptance check after backend deployment and app distribution.

SDK reference: https://docs.page/invertase/react-native-google-mobile-ads/displaying-ads (rewarded `EARNED_REWARD` versus server-side verification).
