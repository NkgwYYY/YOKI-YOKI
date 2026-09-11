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

## 3. App Reviewへの返信文（6項目への明示回答）

以下をそのまま返信できます。

---

Hello App Review Team,

Thank you for reviewing YOKI YOKI. We are providing all requested information below and have also added the same information to the Notes field in App Review Information.

1. Physical-device screen recordings

Main app walkthrough:
https://youtube.com/shorts/j0v60OzOEIk?si=P2aNPIIvTP_w-tOO

Account deletion demonstration:
https://youtube.com/shorts/xu5axJt2tJ8?si=-_eUjo7yjLtRx75d

The recordings were captured on a physical iPhone 11 Pro running iOS 26.6.1. They demonstrate launching the app, onboarding, the typical user flow, the main features, and the complete account deletion flow.

The app does not contain public user-generated content, user-to-user communication, paid content, subscriptions, or real-money purchases. Therefore, content reporting/blocking and paid-content access flows are not applicable.

2. Purpose, target audience, problem, and value

YOKI YOKI is a Japanese-language general wellness and self-reflection app for adults who want a gentle way to build a daily reflection habit. Users can privately record their mood, sleep, activities, and thoughts. A companion character grows as the user continues recording, and the app provides supportive AI conversation based on the user's entries.

The app helps users who find conventional journaling difficult by making reflection approachable through short entries, visual progress, and a companion character. It is for general wellness only and does not diagnose, treat, or replace professional medical or mental-health care.

3. Setup and access instructions

No account or sample file is required to access the main features:

- Launch the app.
- Select "ログインせずに始める" (Continue without logging in).
- Complete the short profile setup.
- Use the bottom navigation to access Home, Record, Chat, Growth, Energy Charge, mini-games, and the YOKI Points shop.

An optional review account for testing login, cloud synchronization, and account deletion is provided in App Review Information > Sign-in Information.

Account deletion for a signed-in user is available at:
Growth tab > person icon in the upper-right corner > "アカウントを削除" > "完全に削除する"

This deletes the user's cloud records, progress, inventory and equipment data, authentication account, and local app data.

The shop uses only YOKI Points earned through in-app activities. There are no subscriptions, real-money purchases, or paid digital content.

4. External services, tools, and platforms

- Clerk: optional account authentication
- OpenAI through Replit AI Integrations: private AI chat responses
- Replit hosting and API services: application hosting and backend APIs
- Replit PostgreSQL: optional cloud synchronization for signed-in users

5. Regional differences

The app functions consistently across all regions. There are no region-specific features, restrictions, prices, or content differences. The user interface and AI responses are in Japanese.

6. Regulated industry and protected third-party material

The app does not operate in a highly regulated industry. It is a general wellness and self-reflection app and does not provide medical diagnosis or treatment. The app does not include protected third-party material that requires authorization. Therefore, no regulatory license, authorization document, or third-party credential is required.

Private notes, mood records, profile information, and AI conversations are not public and are not shared with other users.

Please let us know if any additional information is required.

Best regards,
YOKI YOKI Development Team

---

## 4. App Review Information > Notes

Appleは6項目すべてをNotesにも記載するよう求めています。短縮せず、上記「3. App Reviewへの返信文」の本文をそのままNotesへ貼り付けてください。

Notesの文字数制限で全文を貼れない場合でも、1〜6の番号、動画URL、ゲスト利用手順、審査用アカウントの所在、外部サービス、地域差なし、規制業界・保護素材に非該当という回答は削除しないでください。

## 5. 再提出時の確認

- Resolution Centerの返信欄へ、上記3の全文を貼る
- App Review Information > Notesへ、同じ全文を貼る
- App Review Information > Sign-in Informationに有効な審査用アカウントを設定する
- 2本のYouTube動画をログイン不要・限定公開または公開で閲覧できる状態にする
- 可能であれば、2本を1本の連続した実機録画へまとめ、アプリ起動から登録・ログイン・主要機能・削除までを見せる