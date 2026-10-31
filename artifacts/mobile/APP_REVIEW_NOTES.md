# App Review Notes — optional accounts and room customization

The replacement release is version 1.0.1, build 27. Build 26 was withdrawn. The Japanese and English metadata saved in App Store Connect are archived in `store/1.0.1-build27-ja-en.json`.

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

## Release verification record

- Production runtime source: 63a4f6969d5f9f1291ad2f47551ee4c635b86cca.
- Actual iPhone simulator welcome/login images were delivered to the owner before App Review submission.
- QA source b0fc1ed18242b987944792ca8a969a02b66a6f30 was compared with the uploaded runtime. The differences are XCTest/workflow fixes and renderer readiness diagnostics gated by EXPO_PUBLIC_RENDERER_DIAGNOSTICS=1; these diagnostics are inactive in production. The renderer algorithm and production animation behavior are unchanged. Web/native renderer parity SHA-256: a6cdaea34a85ae715bd0ae3327161851c7d30159e4701eb3da59d26d1daa5157.
- Native QA run: https://github.com/NkgwYYY/YOKI-YOKI/actions/runs/41168017350
- iPhone 17 Pro, iOS 26.5 simulator: 3 passed, 0 failed, 0 skipped. Actual result summary inspected. The journeys cover native account entry and negative sign-in, guest care/diary, and purchased/initial furniture placement, persistence, hiding and restoration.
- iPad (A16), iOS 26.5 simulator, iPhone compatibility mode: 3 passed, 0 failed, 0 skipped. Actual result summary inspected. Both device result gates and the final workflow completed successfully. Full evidence artifact 13031421510 SHA-256: d207a44de69d509c7987fcf895f0c6a1fc23133e8abb1aa1fb29082b38201f2f.
- Earlier failed runs were not treated as passing. The final driver fixes dismiss delayed iOS password-save prompts, read actual renderer readiness on the accessible owner, open the correct home overflow menu, and bring shop categories onscreen before interaction. No assertions were removed.
- Native production authentication initialization and the synthetic missing-account response were reached. No test account was created and no verification email was sent by the negative test.
- Successful real-account sign-in, verification-email delivery and signed-in relaunch have not been verified. Simulator checks do not establish physical-device smoothness or signed production-IPA behavior.
- Browser guest checks passed for hiding the bed and round rug, persistence across reload, restoration, and access to rest while the bed is hidden, with no point charge.
- Complete production-domain web, iOS and Android static packaging passed, including 181 assets and 12 higher-density variants per native platform.
- The integrated production website was republished on 2026-10-31. Replit reports Live; the deployed privacy policy at https://yoki-yoki.replit.app/landing/privacy/ contains the October 30 account authentication, secure session storage and cross-device synchronization disclosures.
- App privacy metadata was published with email address classified as app functionality, linked to identity and not used for tracking.
- Japanese title: メンタルケア×育成ゲーム YOKI YOKI. English title: YOKI YOKI: Self-Care Pet Game.
- Both localizations have updated descriptions, release notes and the four archived screenshot filenames. The room, welcome and night screenshots were captured from the native simulator; the existing diary image was retained.
- Production build 1.0.1 (27), EAS build 0f9292bf-4477-44d8-a76f-969609679729, succeeded from the runtime source above. App Store Connect upload succeeded via EAS submission ed2959cf-41d4-4863-a11d-5a720ac8a46d.
- Apple build UUID: 4477e14c-c206-415c-bddf-7793578c74fe.
- App Review status: Waiting for Review (審査待ち), verified in App Store Connect on 2026-10-31 at 14:10 JST. The submitted item is iOS app 1.0.1 (27).
