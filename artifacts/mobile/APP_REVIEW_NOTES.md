# App Review Notes — optional accounts and room customization

Use the reviewer-facing notes below for the replacement 1.0.1 build only after its release checks pass. Build 26 was withdrawn and is not the replacement.

## Notes for App Review

YOKI YOKI is a Japanese-language self-care and character-raising game with a diary, mood records, character care, room customization and mini-games. It is not a medical diagnosis or treatment service. The iPhone app also runs in iPhone compatibility mode on iPad.

The first-launch welcome offers 新規登録してはじめる (register), ログイン (sign in), and 登録せずにはじめる (continue without registering). Accounts are optional. For the core review journey, choose 登録せずにはじめる, enter a nickname, choose the optional profile answers, then choose いっしょにはじめる. Existing local users retain their room and records.

The sign-in screen uses the same account service as the web version. Existing web users can enter the same email and password. New registrations use an email verification code. Signed-in users synchronize diary, mood records, character progress and room settings with their account. Sessions are retained between launches. Guest records remain on the device. Account deletion is available in the profile/account settings; signing out does not delete cloud records.

Main controls:
- 日記: open the diary, choose あなたのページを書く, choose a mood and save with the character-name button. A mood can be saved without body text.
- ごはん: choose food using earned in-game YOKI points.
- おはなし: choose 少し、お話しする to open chat.
- メニュー → ショップ: purchase room items. メニュー → あそぶ: open the mini-games.
- 部屋の模様替え: choose owned furniture or flowers. Tap a placed item, drag it, release to save and select 完了.
- 部屋の模様替え → 初期家具: put away or restore the bed area, lounge set, bookcase, chest, round rug and window decorations. These settings cost no points and persist after relaunch. Rest remains accessible from the home menu when the bed is hidden.

This update stabilizes the speech bubble during welcome hops, makes its background translucent, uses the web character renderer and original fur artwork on iOS, and adds the native account entry and initial-furniture settings.

AI is optional. Before use, the app explains the data to be sent and its destination, and asks for consent. Data goes through the YOKI YOKI server hosted on Replit to OpenAI. Diary replies have a separate consent prompt. 今は日記の保存だけ saves without an AI reply. Consent can be withdrawn from the diary or プロフィール・話しかけ設定 → AIへの情報送信・同意設定. Records, character care and mini-games remain available without AI consent.

Friend visits are invitation-based, use fixed greetings and support blocking and deletion of friend-service data. Diaries and AI conversations are not shared with friends. Optional rewarded ads are restricted to users whose age is confirmed as 20 or older, with a shared limit of three rewards per day. This version has no paid pass, and Japan distribution does not expose tobacco content.

## Release verification record

- Runtime source: 63a4f6969d5f9f1291ad2f47551ee4c635b86cca. Changes since 2935386 affect the XCTest driver/workflow only.
- Actual iPhone simulator welcome/login images were delivered to the owner before any new App Review submission.
- Native production authentication initialization and the synthetic missing-account response were reached. No test account was created and no verification email was sent by the negative test.
- Run 41031454142 failed on both devices because iOS displayed its password-save sheet after the driver's initial wait. This is not a passing functional run.
- Run 41156957240 failed: iPhone account entry passed, but both devices could not locate the transformed renderer's nested readiness marker; iPad account entry was blocked by the password-save alert. The captured character was visible. These failures are not a completed gameplay check.
- QA source 91eef9d222d41aa3e2de643aa0872ebe763d38d8 exposes actual renderer readiness on its existing accessible owner only when EXPO_PUBLIC_RENDERER_DIAGNOSTICS=1, and handles both iPhone sheets and iPad alerts. Run 41160549243 is pending. All three journeys on both devices must pass. This QA source is separate from the uploaded build 27.
- Successful real-account sign-in, verification-email delivery and signed-in relaunch have not yet been verified. Simulator checks do not establish physical-device smoothness or signed production-IPA behavior.
- Browser guest preview: hiding the bed area and round rug, retaining both settings across reload, restoring both sets and restoring the bed action all passed. No points were charged. This is browser evidence, separate from native tests.
- Complete production-domain web, iOS and Android static packaging passed, including 181 assets and 12 higher-density variants per native platform. The production website has not been republished with this candidate.
- Production build 1.0.1 (27), EAS build 0f9292bf-4477-44d8-a76f-969609679729, succeeded from the same source. App Store Connect upload succeeded via EAS submission ed2959cf-41d4-4863-a11d-5a720ac8a46d. App Review submission has not yet occurred.
