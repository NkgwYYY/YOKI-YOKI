# HOME・街・ごはんの共通広告接続

## 現在の状態

PR #4の共通部品を、最新Replit側のCommunity広告処理と実アプリの画面へ接続しました。元のGitHub基点は `b2d12fade2e77dda03a856289cd1ba74e2ada170`、照合したReplit HEADは `4e459e547ca47df7ab3b862476e72ff5994a6a4f` です。

GitHubに欠けていたCommunity実装を取り込み、既存のSSV署名検証、設定確認用コールバック、確認済み報酬の保存、BGM停止、友だち機能、健康情報を送信しないAnalytics設定を維持しています。最新Replitソースとの照合に基づく差分だけを適用し、古いGitHub全体でReplitを上書きしていません。

2026-10-17にReplitへ27ファイルの差分を適用し、適用直後の全対象ファイルのSHA-256一致を確認しました。その後ブラウザー接続がタイムアウトしたため、Replitで開始した統合テストの結果取得、実画面の操作確認、再公開は未完了です。接続断の後に加えた「中止済み予約の期限切れ後の再試行」修正と追加テストは、このPRに保存した最新版です。Replitへの最終同期は未確認です。

## 画面と動作

| 画面 | 配置・動作 |
| --- | --- |
| HOME | ポイント表示を押すと受け取りシート。任意の「広告を見て＋30pt」。対応サイズではマップの外側にバナー領域を確保 |
| 街（market） | HOMEと同じバナーを利用。別の広告を重ねない。ポイント表示から同じ特典を利用 |
| ごはん・ラーメン | 注文・ごはんカードから分離した任意の特典ボタン。広告なしでも通常操作可能 |
| たまごバイト | 既存の特典を同じ実行制御とサーバー残数に接続。パスの広告なし特典も維持 |
| 日記・会話・その他のマップ | 新しいバナーを表示しない |

- 30pt、全画面共通で日本時間の1日3回。残数は `/community/bonus` の値だけを使い、未取得時は不明扱い。
- `ConnectedDailyAds` を一度だけ登録。HOME・ごはん・たまごバイトと、アカウント切替・再マウントをまたぐ動画の二重起動を防止。
- Googleの署名付きSSVと既存の重複防止付きポイント保存を通過した、該当claim IDだけを受け取り成功とする。SDKの視聴完了イベントや、別の報酬の回収だけでは成功にしない。
- 確認中の報酬は再視聴せず回収を再試行。復帰時・30秒間隔の照合で反映。サーバー予約は既存仕様どおり30分で失効し、中止直後には残数へ含まれる。
- Communityの回収Promiseはアカウントセッション別。切替後に古い結果を返したり、新しいアカウントへackしたりしない。保存処理の前後とトランザクション準備時にもセッションを検査。
- 成人の年齢帯が明示され、既存設定で広告が有効なネイティブビルドだけが広告対象。Web/Expo Goでは広告や仮の報酬を表示しない。
- バナーは320×50、ラベル込み88px。ナビゲーションの高さを別に確保し、マップ実測サイズと操作ボタンの下余白を調整。横画面・高さ640未満・幅352未満では非表示。
- 移動・ドラッグ・メニュー・キーボード表示中はバナーを隠す。操作のたびに広告を再マウントせず、予約領域を維持して画面の跳ねを防ぐ。SDKエラー・no-fillではそのセッションのバナーを停止。
- 健康情報・日記内容・プロフィールは広告SDKへ送らない。バナー・動画とも非パーソナライズ設定。

## サーバーと依存関係

既存のegg注文IDに加えて `daily-(home|street|meal)-<UUID v4>` を広告予約に許可しました。daily IDをパス特典へ流用することは拒否します。3回上限のトランザクション、署名検証、報酬額、SSVの冪等性は既存処理を使用します。予約レスポンスにはサーバー側の有効期限を追加しています。

既存Replitで使用中の `react-native-google-mobile-ads@16.3.4` と `react-native-purchases@10.13.0` をGitHubのmanifestにも固定。lockfileは既存の全package/snapshotを変更せず、必要な103行のみ追加しました。pnpm 10.11.0によるfrozen lockfile検証が成功しています。

## 確認済みの検証

- 関連Nodeテスト **122件成功、失敗・中断・スキップ0**。既存94件に加え、Community保存、SSVポリシー、接続処理を検証。
- 検証対象: 全画面共通上限、たまごとの同時起動、予約中/再生中のアカウント切替、別claimの誤認防止、遅延SSV、中止・SDK例外、パス、日付切替、no-fill、不正残数、回収の重複排除、保存失敗時の未ack、期限切れ予約の再試行。
- 共有ライブラリ、モバイルアプリ全体、API全体のTypeScriptチェック成功。
- APIのesbuildビルド成功。
- Expo Web、およびiOS・AndroidのJavaScript/Hermes書き出し成功。これはXcode/Gradleのネイティブビルドや実機動作確認ではありません。
- Replitへの27ファイル適用直後のハッシュ一致を確認。

```sh
node --test artifacts/mobile/tests/dailyAdPlacements.test.mjs artifacts/mobile/tests/dailyAdStore.test.mjs artifacts/mobile/tests/dailyAdsIntegration.test.mjs artifacts/mobile/tests/communityBonus.test.mjs artifacts/api-server/tests/communityPolicy.test.mjs
pnpm exec tsc --build
pnpm --filter @workspace/mobile typecheck
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/mobile exec expo export --platform web
pnpm --filter @workspace/mobile exec expo export --platform ios --platform android
```

PostgreSQL統合テスト `artifacts/api-server/tests/community.integration.mjs` に、HOME・ごはん・たまご混在時の3回上限と、daily予約の署名付きSSVを追加しました。ランダム名の専用schemaだけで動作し、そのschemaだけを終了時に削除します。Replitで実行を開始しましたが、接続断のため今回の結果は未確認です。

## 公開前に残ること

1. このPRの最終差分をReplitへ同期し、上記PostgreSQL統合テストと実画面操作を確認する。
2. バナー専用の実AdMobユニットIDを `EXPO_PUBLIC_ADMOB_BANNER_IOS` / `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` へ設定する。未設定・不正IDでは枠ごと非表示。既存のリワード広告IDをバナーへ流用しない。
3. 実機で同意画面、広告の中止、視聴完了→SSV→30pt、3回上限、バックグラウンド復帰、アカウント切替、通常のごはん・移動と重ならない配置を確認する。
4. Replit再公開、必要なネイティブビルド配布を行う。mainへのマージ、App Store提出はこの作業では行っていない。

実広告配信・収益・ネイティブ実機・公開完了を示す検証結果はありません。現時点ではドラフトPRのままです。

## 2026-10-19 Replit側の追加仕様の統合

Replit HEAD `766dee5956b621db17c6f2fd50663a23846e1e90` の対象47ファイルを照合。以下のReplit側仕様を保持し、GitHub側の横向きレイアウト・広告例外処理・チャット修正を統合する。反映と最終検証の状況は別途記録する。

### Replit側の広告配置と公開チェック

### 現行アプリへの接続

最新のReplitソースを基点にする。古いGitHub mainへの置き換え・一括再マージはしない。
`ConnectedDailyAds`をアプリ全体で1つ使用し、既存のAdMob SDK・Google SSV・
RevenueCat権利確認・ポイント保存ジャーナルへ接続する。

- HOME／市場：同じバナーインスタンスを共有。広告ラベル付き320×50。
  地図の外の専用88px領域に配置し、既存ナビゲーションの下余白を確保する。
- ポイント残高／ごはん選択：利用者が選んだ時だけ動画を開始する。
- 卵工房：同じ広告・予約・回収サービスを使う。通常の給与とは分離する。
- 日記／会話／おふろ／思い出：今回、新しい広告は置かない。
- 小さい画面・横向き・操作中・キーボード・シート・場面遷移・バックグラウンドでは
  バナーを表示しない。HOMEと市場の移動や一時的な非表示で広告を作り直さない。
- Web／Expo Goは実広告非対応。架空の広告や擬似ポイントを表示しない。

### 報酬とプライバシー

1回30pt、日本時間で1日3回。全配置と卵工房、パス特典も共通上限を使う。
予約・Google署名検証・確定済み報酬取得・アプリ保存・ackの順で処理する。
表示終了やSDKの報酬イベントだけでポイントを付けない。
予約はサーバーの状態から復元し、再起動後の確認中報酬で再視聴を求めない。
未確定の予約は30分で期限切れになる。中断直後は同じ予約を再利用し、
予約の取消しによる上限回避を作らない。

パス権利は販売フラグや購入SDKの利用可否から推測せず、サーバーで確認する。
権利確認が失敗した場合は広告を出さない。パスはバナーを消し、
日常の任意動画まで無料の報酬に置き換えない。
既存のUMP同意とプライバシー設定を使用する。日記本文、気分、健康情報、
会話内容をSDKの広告リクエストや広告イベントに渡さない。

### 公開時に確認する設定名

値・秘密情報をこの文書に記載しない。ネイティブ広告設定は署名ビルド時に必要で、
Web/APIの再公開だけでは既に配布したバイナリへSDK設定は追加されない。

| 設定 | 用途 |
| --- | --- |
| `ADMOB_IOS_APP_ID`, `ADMOB_ANDROID_APP_ID` | OS別AdMobアプリ設定 |
| `EXPO_PUBLIC_ADMOB_BANNER_IOS`, `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` | 報酬動画とは別のバナー広告ユニット |
| `EXPO_PUBLIC_ADMOB_REWARDED_IOS`, `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID` | OS別報酬動画広告ユニット |
| `COMMUNITY_ENABLED`, `YOKI_REWARDED_ADS_ENABLED` | API機能フラグ |
| `ADMOB_REWARDED_UNIT_IDS` | サーバーが受け付けるSSV広告ユニット |
| `REVENUECAT_SECRET_KEY`, `REVENUECAT_ENTITLEMENT` | 既存購入権利のサーバー検証 |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | ネイティブ購入SDK |
| `EXPO_PUBLIC_YOKI_PASS_PRODUCT_ID`, `YOKI_PASS_SALES_ENABLED` | パス商品・新規販売。販売停止でも既存権利を尊重する |

AdMobのSSVコールバックは公開ホストの`/api/community/admob/ssv`に設定する。
テスト用の署名や模擬回収は隔離テストだけで使用し、本番の付与条件を緩めない。
`EXPO_PUBLIC_ADS_TEST_MODE`はネイティブの公式テスト広告用であり、
本番公開時には有効にしない。テスト広告で本番SSV報酬が得られるとは扱わない。

### 検証区分

- ユニットテスト：状態遷移、残数共有、連打、アカウント切替、保存復旧。
- API統合テスト：専用のランダムなテストスキーマと合成署名を使用。
  実際のGoogle広告配信・課金の証明ではない。
- ブラウザー：最新アプリで通常操作を検証。広告部品の合成環境は明示して区別する。
- ネイティブ実機：UMP、広告SDK、動画中断、実際のSSV往復、ストア権利の復元を
  iOS／Androidの署名済みビルドで確認する。Web確認で代用しない。

今回の具体的な検証結果と未実施項目は`YOKI_YOKI_2_PROGRESS.md`に記録する。
