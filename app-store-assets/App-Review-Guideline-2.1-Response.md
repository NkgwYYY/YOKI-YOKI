# YOKI YOKI — App Review Guideline 2.1 Response Package

## 1. 提出前に必要な手作業

以下の2点だけは、開発者本人がApp Store Connectで行う必要があります。

1. 最新iOSを搭載した実機iPhoneで画面収録を撮影し、App Reviewが閲覧できるURLへアップロードする
2. 審査用アカウントを用意し、メールアドレスとパスワードをApp Store Connectの「App Review Information > Sign-in Information」に入力する

認証情報は返信本文やチャットへ書かず、App Store Connectの専用欄へ入力してください。

## 2. 実機画面収録の台本

目安は3〜5分です。動画は編集でつなげず、アプリ起動から一続きで撮影してください。

1. iPhoneのホーム画面からYOKI YOKIを起動する
2. 初回画面で「ログインせずに始める」を選ぶ
3. ニックネームなど最低限のプロフィールを入力して開始する
4. ホームでキャラクターと主な操作を見せる
5. 「きろく」から今日の気分、睡眠時間、メモを保存する
6. 「チャット」でメッセージを送り、AIから返信が届くところまで見せる
7. 「成長」で気分の記録、成長、バッジを見せる
8. ショップを開き、商品が現金販売ではなく、アプリ内で獲得するYOKIポイントとの交換であることを見せる
9. アカウント画面から新規登録または審査用アカウントへログインする
10. 成長タブ右上の人型アイコンを開く
11. 「アカウントを削除」を押し、削除確認画面を見せる
12. 削除を実行し、初期状態へ戻るところまで見せる

撮影時に、端末の「設定 > 一般 > 情報」も最初か最後に映し、端末名と最新iOSであることが分かるようにすると審査員が確認しやすくなります。

## 3. App Reviewへの返信文（英語）

角括弧の2か所を実際の情報に置き換えて、そのまま返信してください。

---

Hello App Review Team,

Thank you for your message and for the opportunity to provide additional information about YOKI YOKI.

We have completed another quality-assurance review of the app and added an in-app self-service account deletion flow. The latest submitted build allows a signed-in user to delete the account and all associated app data from:

Growth tab > person icon in the upper-right corner > Account > Delete Account

The deletion flow includes a destructive confirmation and permanently removes the user's cloud-synced records, progress, inventory/equipment data, authentication account, and local app data.

### 1. Physical-device screen recording

Screen recording URL: https://youtube.com/shorts/j0v60OzOEIk?si=P2aNPIIvTP_w-tOO

The recording was captured on [IPHONE MODEL] running [IOS VERSION]. It begins with launching the app and demonstrates the typical user flow, including onboarding, mood and sleep recording, AI chat, growth/history, the YOKI Points shop, account registration/login, and in-app account deletion.

### 2. App purpose and target audience

YOKI YOKI is a Japanese-language wellness and self-reflection app for people who want an approachable way to record their daily mood, sleep, activities, and thoughts. A companion character grows as the user continues recording, helping make daily self-reflection easier to continue. The app also provides supportive AI conversation based on the user's own entries.

The app is intended for general wellness and self-reflection. It does not diagnose, treat, or replace professional medical or mental-health care. When appropriate, the app encourages users to seek help from qualified professionals or trusted people.

### 3. Access and setup instructions

No login, subscription, payment, or sample file is required to access the app's main features.

1. Launch YOKI YOKI.
2. Select "ログインせずに始める" (Continue without logging in).
3. Complete the short profile setup.
4. Use the bottom navigation to access Home, Record, Chat, Growth, and Energy Charge.
5. The shop uses only YOKI Points earned through in-app activities. There is no real-money purchase or paid digital content in the submitted build.

An optional demo account for reviewing login, cloud backup, and account deletion is provided in the App Review Information > Sign-in Information fields in App Store Connect.

Account deletion path:
Growth tab > person icon in the upper-right corner > "アカウントを削除" (Delete Account) > "完全に削除する" (Permanently Delete)

### 4. External services and platforms

- Clerk (Replit-managed): optional account registration, authentication, and session management
- OpenAI through Replit AI Integrations: generation of the companion character's AI chat responses and personalized supportive text
- Replit Cloud services: API hosting and delivery of the app's server functionality
- Replit PostgreSQL database: cloud storage of signed-in users' synchronized app records, progress, and inventory

The app does not contain public user-generated content or user-to-user communication. Notes, mood records, profile information, and AI conversations are private to the individual user and are not published to or shared with other users. Therefore, user reporting and blocking mechanisms are not applicable.

### 5. Regional differences

The app functions consistently in all regions where it is available. There are no region-specific features, content, pricing, or access restrictions. The current user interface and AI responses are provided in Japanese.

### 6. Regulated services and protected third-party material

YOKI YOKI is a general wellness and self-reflection product, not a medical service or regulated healthcare product. It does not provide diagnosis, treatment, emergency services, financial services, or other regulated professional services. The app does not require authorization to distribute protected third-party content as part of its core functionality.

We have also added this information to the Notes field in the App Review Information section for reference in future submissions.

Please let us know if any additional information is required.

Best regards,
YOKI YOKI Development Team

---

## 4. App Review Information > Notes 用の短縮版

YOKI YOKI is a Japanese-language wellness and self-reflection app. Login is optional; reviewers can select "ログインせずに始める" and access the main Home, Record, Chat, Growth, Energy Charge, mini-game, and YOKI Points shop features. There is no subscription, real-money purchase, or paid digital content in this build.

The shop uses only YOKI Points earned through in-app activities.

Optional account deletion path:
Growth tab > person icon in the upper-right corner > "アカウントを削除" > "完全に削除する".
This permanently deletes the user's cloud records, progress, inventory/equipment data, Clerk authentication account, and local app data.

Private notes, records, and AI chat are not public and are not shared with other users. There is no user-to-user content, so reporting/blocking is not applicable.

External services: Clerk (authentication), OpenAI via Replit AI Integrations (AI responses), Replit Cloud/API hosting, and Replit PostgreSQL (optional cloud synchronization).

Features are consistent across all regions; the UI and AI responses are in Japanese. The app is for general wellness and self-reflection and is not a medical diagnosis or treatment service.

Physical-device recording: https://youtube.com/shorts/j0v60OzOEIk?si=P2aNPIIvTP_w-tOO