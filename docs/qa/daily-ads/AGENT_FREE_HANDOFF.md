# YOKI YOKI — Agentを使わないソース反映

## 対象

GitHub PR #4 の反映対象: `2e12b07d2f79304062f359d124cb20b5b99deeff`。
このコミットには共通広告接続、ネイティブ広告の復旧、HOME横向き操作領域の調整、実画面テスト、同期スクリプトが含まれます。ブランチの移動する最新版ではなく、この固定コミットを指定します。

ReplitのAI Agentは呼び出しません。新しいプロジェクトも作りません。既存のYOKI YOKIのShellで実行します。開発用ソースへの反映と、公開済みアプリの更新は別です。

## 操作

ReplitでYOKI YOKIを開き、All toolsからShellを開いてください。Agentのチャット欄には入力しません。ほかの編集・Git操作を止めてから、下をまとめて実行します。

```bash
(
  set -e
  v=2e12b07d2f79304062f359d124cb20b5b99deeff
  command -v python3 >/dev/null || { echo 'STOP: python3 is not available'; exit 2; }
  cd "$(git rev-parse --show-toplevel)"
  git fetch --no-tags https://github.com/NkgwYYY/YOKI-YOKI.git "$v"
  f=$(mktemp /tmp/yoki-sync.XXXXXX.py)
  trap 'rm -f "$f"' EXIT
  git show "$v:docs/tools/safe-sync-daily-ads.py" > "$f"
  python3 "$f" --target "$v" --apply
)
```

`SYNC_OK`は開発用ソースの反映成功です。公開完了・実機確認済みを意味しません。`STOP`や競合ファイル名が出たら、無理に上書きせず結果を確認します。パスワード、APIキー、Secretsの値は共有不要です。

## 保護の範囲

スクリプトはPRの基点と指定コミットで異なるファイルだけを対象にします。現在のファイルが既知の版と一致しない場合は3者比較を行い、衝突は書込み開始前に停止します。衝突しない独立した変更は保持します。GitのHEAD・indexは変えず、reset、checkout、commit、pushは行いません。

書込み前に`.git/yoki-source-backups/`へ元ファイルとハッシュ一覧を保存します。ファイルを置き換える直前にも変更有無を調べます。書込みに失敗した場合、スクリプト自身が書いた内容が残っているものだけを元に戻し、後から別の編集が加えられた内容は上書きしません。

`.env`や秘密鍵、シンボリックリンク、対象外のルートファイル、削除変更は拒否します。DB操作、秘密情報の変更、広告IDの新規作成、公開処理、App Store提出は行いません。依存パッケージのインストールやアプリ起動も、このコマンドには含めません。

この同期処理は一時Gitリポジトリ上の18件のテストで検証しました。実際のReplit作業フォルダーへの適用はまだ実行していません。安全なテキスト結合ができても意味上の互換性まで保証されるわけではないため、反映先での依存関係・型チェック・画面確認が必要です。

## 反映後に確認すること

ソース反映後、反映先で既存のpnpm環境を使って依存関係、アプリ/APIの型チェック・ビルド、プレビューを確認します。本番の広告設定・サーバー設定を保持し、バナー専用設定が不足する場合だけ補います。動画広告のIDをバナーに流用しません。

実機の同意画面、広告中止・完了・30ptのサーバー照合、共通3回上限、復帰、BGM、アカウント切替は、署名済みネイティブアプリで別途確認します。ExpoのJavaScript/Hermes書き出しは署名済みアプリのビルドではありません。確認後に公開・配布を行います。

## 検証資料

画面テスト: `artifacts/mobile/tests/dailyCare.browser.cjs`。
同期スクリプト: `docs/tools/safe-sync-daily-ads.py`。
同期処理テスト: `docs/tools/test_safe_sync.py`（`python3 docs/tools/test_safe_sync.py`）。
指定コードの自動検証: GitHub Actions `39133586955`。その実行の最終結果と成果物を参照してください。ブラウザ試験は実際のWebアプリとローカル保存を使い、外部サービスは利用不可のテスト応答に隔離しています。実際のAdMob広告や本番DBを使った試験ではありません。

Replit公式のShell案内: https://docs.replit.com/features/workspace-tools/git-interface （Using Git commands in Shell）。
