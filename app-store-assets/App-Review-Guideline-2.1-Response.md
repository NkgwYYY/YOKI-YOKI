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

## 3. App Reviewへの返信文（4,000文字以内版）

以下をそのまま返信できます。

---

Hello App Review Team,

Thank you for the opportunity to provide additional information about YOKI YOKI.

We have added an in-app self-service account deletion flow. A signed-in user can permanently delete the account and associated cloud records, progress, inventory/equipment data, authentication account, and local app data from:

Growth tab > person icon in the upper-right corner > "アカウントを削除" > "完全に削除する"

Physical-device recordings:

Main app walkthrough:
https://youtube.com/shorts/j0v60OzOEIk?si=P2aNPIIvTP_w-tOO

Account deletion demonstration:
https://youtube.com/shorts/xu5axJt2tJ8?si=-_eUjo7yjLtRx75d

The recordings were captured on an iPhone 11 Pro running iOS 26.6.1. The first video demonstrates onboarding and the main features. The second video demonstrates the complete account deletion flow, including the destructive confirmation and return to the initial state.

Login is optional for the main features. To access the app without an account, select "ログインせずに始める" (Continue without logging in), complete the short profile setup, and use the bottom navigation. An optional review account for testing login, cloud synchronization, and account deletion is provided in the App Review Information > Sign-in Information fields.

YOKI YOKI is a Japanese-language wellness and self-reflection app for recording mood, sleep, activities, and thoughts. A companion character grows as the user continues recording, and the app provides supportive AI conversation based on the user's entries.

The app is intended for general wellness and self-reflection. It does not diagnose, treat, or replace professional medical or mental-health care.

The shop uses only YOKI Points earned through in-app activities. There are no subscriptions, real-money purchases, or paid digital content in the submitted build.

Private notes, mood records, profile information, and AI conversations are not public and are not shared with other users. The app does not provide user-to-user communication or public user-generated content.

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

Main physical-device walkthrough:
https://youtube.com/shorts/j0v60OzOEIk?si=P2aNPIIvTP_w-tOO

Account deletion demonstration:
https://youtube.com/shorts/xu5axJt2tJ8?si=-_eUjo7yjLtRx75d