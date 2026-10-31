# App Review Notes — advertising readability and recovery

The advertising fix is version 1.0.1, build 28. Build 28 has been uploaded to App Store Connect but has not yet replaced build 27 in App Review. The Japanese and English metadata prepared for build 28 are archived as a draft in `store/1.0.1-build28-ja-en.draft.json`; they have not yet been applied in App Store Connect.

## Notes for App Review

YOKI YOKI is a Japanese-language self-care and character-raising game with a diary, mood records, character care, room customization and mini-games. It is not a medical diagnosis or treatment service. The iPhone app also runs in iPhone compatibility mode on iPad.

The first-launch welcome offers 新規登録してはじめる (register), ログイン (sign in), and 登録せずにはじめる (continue without registering). Accounts are optional. For the core review journey, choose 登録せずにはじめる, enter a nickname, choose the optional profile answers, then choose いっしょにはじめる. Existing local users retain their room and records.

The sign-in screen uses the same account service as the web version. Existing web users can enter the same email and password. New registrations use an email verification code. Signed-in users synchronize diary, mood records, character progress and room settings with their account. Sessions are retained between launches. Guest records remain on the device. Account deletion is available in the profile/account settings; signing out does not delete cloud records.

Main controls:
- 日記: open the diary, choose あなたのページを書く, choose a mood and save with the character-name button. A mood can be saved without body text.
- ごはん: choose food using earned in-game YOKI points.
- おはなし: choose 少し、お話しする to open chat.
- メニュー → ショップ: purchase room items. メニュー → あそぶ: open the mini-games.
- Home upper-right … → 部屋の模様替え: choose owned furniture or flowers. Tap a placed item, drag it, release to save and select 完了.
- Home upper-right … → 部屋の模様替え → 初期家具: put away or restore the bed area, lounge set, bookcase, chest, round rug and window decorations. These settings cost no points and persist after relaunch. Rest remains accessible from the home menu when the bed is hidden.

This update stabilizes the speech bubble during welcome hops, makes its background translucent, uses the web character renderer and original fur artwork on iOS, and adds the native account entry and initial-furniture settings.

AI is optional. Before use, the app explains the data to be sent and its destination, and asks for consent. Data goes through the YOKI YOKI server hosted on Replit to OpenAI. Diary replies have a separate consent prompt. 今は日記の保存だけ saves without an AI reply. Consent can be withdrawn from the diary or プロフィール・話しかけ設定 → AIへの情報送信・同意設定. Records, character care and mini-games remain available without AI consent.

Friend visits are invitation-based, use fixed greetings and support blocking and deletion of friend-service data. Diaries and AI conversations are not shared with friends. Optional rewarded ads are restricted to users whose age is confirmed as 20 or older, with a shared limit of three rewards per day. This version has no paid pass, and Japan distribution does not expose tobacco content.

## Advertising changes in build 28

- Advertising explanations, reward buttons and egg-result messages use the current cream interface palette with legible foreground colors.
- A transient banner load failure hides the ad rail and permits a later foreground refresh after 1, 2, 4 and then at most 5 minutes. Duplicate callbacks during the wait do not extend it. A successful load resets the wait sequence.
- Reward verification, the shared three-per-day limit, 30-point reward, age eligibility, consent and ad-free entitlements are unchanged. The existing placements remain optional and do not interrupt gameplay.

## Release verification record

- Runtime and QA source: 61abe12ee8a1e37de8d8086134bea75d85e12ef8.
- Production build: 1.0.1 (28), EAS a58f627d-6dce-44d3-9af2-edab7465bef5. Build and upload workflow 01a191f2-c699-7cef-b0ee-f05a862af61c succeeded in 11m 52s. App Store Connect upload submission: 0d3c2d00-ba00-4bb6-9400-2038e137b817.
- TypeScript checks and 150 advertising unit/integration tests passed, including transient recovery, bounded retries, success reset, eligibility, pass ownership and stale-account checks.
- A separate 390px browser fixture rendered the actual advertising components on the current cream background. Synthetic interactions verified banner hiding and recovery, unchanged reward quota during a banner retry, optional reward receipt and the shared daily cap across HOME and meal placements. The fixture never connected to production data and was removed from the app before publication.
- Native QA run: https://github.com/NkgwYYY/YOKI-YOKI/actions/runs/41201417815
- iPhone 17 Pro, iOS 26.5 simulator: 3 passed, 0 failed, 0 skipped. The actual result summary was inspected. Evidence artifact 13043426887 SHA-256: c065f062682a90af52106e48ef10d80206a49d7346f495f7ef91c91cb950bd44.
- iPad (A16), iOS 26.5 simulator: 3 passed, 0 failed, 0 skipped. The actual result summary was inspected. Both device gates and the final workflow passed. Full evidence artifact 13044467420 SHA-256: af3bf50d5720898a140e2c61a962488b2b7aa51c3c6bb1c02721306af39dbda6.
- The simulator journeys cover account entry and negative sign-in, guest care/records, and room customization. Renderer readiness diagnostics are enabled only for the QA build; production leaves EXPO_PUBLIC_RENDERER_DIAGNOSTICS unset.
- Successful real-account sign-in, verification-email delivery, signed-in relaunch, physical-device smoothness, real AdMob delivery, server-side ad reward verification and advertising revenue are not established by these tests.
- Replit integrated commit: 6b112b57961e4cc93671caf616911e72bbdbcd93. Normal publication completed successfully at https://yoki-yoki.replit.app; deployment b7cba70d-e06f-42d8-9eca-5afefd65978b.
- App Review replacement submission is not complete. Build 27 was last observed Waiting for Review and was not withdrawn. Build 28 is uploaded; the next action is to select it and apply the prepared metadata after Apple access is restored. Preserve the existing screenshots, privacy disclosures and automatic release configuration.
