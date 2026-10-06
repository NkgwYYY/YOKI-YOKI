# YOKI YOKI 3.0 — 取り込み・リリースの再開地点

## 現在地

- PHASE 0〜9：実装と記録済みのローカル操作・表示確認は完了。
- PHASE 10：ローカルの保存・アカウント分離・API・認証起動・プロキシ・配信検証は完了。詳細は `docs/YOKI_YOKI_2_PROGRESS.md`。
- 統合候補：`codex/yoki-yoki-3-world`、ドラフトPR [#2](https://github.com/NkgwYYY/YOKI-YOKI/pull/2)。旧2.0用PR #1との累積差分が重複するため、独立した2件として取り込まない。
- 未確認：Replit独自コミットの内容、本番アカウントとホストDBの往復、ネイティブ実行・アクセシビリティ・性能。main統合、配備、署名付きリリースは未実施。

2026-10-06 19:33 JSTにユーザーからReplitの状態確認結果を受領した。`main`、作業ツリーはクリーン、競合・進行中操作なし、`origin/main`にないローカル履歴52件、候補との分岐はReplit側のみ5件・候補側のみ19件。postMergeは設定済みだが未実行で、merge・checkout・pushもしていないとの報告。同時点のGitHub候補は `113619b09ece26900a46f1e63bfdcd4883d53528`。以降の文書更新をfetchすると候補側の件数は増える。

19:57 JSTにReplit HEAD `73c7124bfa81f417b8e4463a7ac0086ec8392530` と独自5件のID・件名を受領した。対象は `a1578c0`、`e9910c7`、`96402b9`、`75cdd85`、`73c7124`。最新GitHubからの直接取得でも当該HEADは存在せず（Git: not our ref、API: 422）、ソースの実体はまだ読めていない。統計がないコミットも空と決めつけず、親との差分とマージ時の解決内容を確認する。

20:27 JSTに退避用ブランチへのpushがGit認証エラーで失敗したとの報告を受領。GitHubにも当該ブランチがないことを確認した。Replitの連携が検出されることとGitの認証成功は別であり、再接続成功は未確認。次は認証に依存しないファイル受け渡しを使う。

## 今回の次の操作：コミットをZIPで受け渡す

ReplitのプロジェクトのルートにあるShellで実行する。最初の行で既知のHEADに一致するか確認し、一致しなければ止まる。共有済み候補に含まれないコミットをGit bundleへまとめ、検証してZIPにする。Pythonは標準ライブラリだけを使い、パッケージのインストールは不要。

```sh
test "$(git rev-parse HEAD)" = "73c7124bfa81f417b8e4463a7ac0086ec8392530" &&
git bundle create yoki-replit-73c7124.bundle HEAD ^113619b09ece26900a46f1e63bfdcd4883d53528 &&
git bundle verify yoki-replit-73c7124.bundle &&
python3 -m zipfile -c yoki-replit-73c7124.zip yoki-replit-73c7124.bundle
```

ファイル一覧にできた `yoki-replit-73c7124.zip` をダウンロードして、この会話に添付する。コマンド結果やコミット一覧だけではソース実体は届かない。GitHub認証・ネットワーク・merge・checkout・postMerge・DB操作は不要で、ソースや履歴を変更しない。生成したbundle/ZIPだけは未追跡ファイルとして増えるため、アプリのコミットには含めない。エラー時はその結果から対応し、HEADを合わせるためのresetは行わない。

受領側では既存候補の履歴を前提にbundleを検証し、エクスポートされたHEADが `73c7124bfa81f417b8e4463a7ac0086ec8392530` と一致することを確認する。隔離した参照へ取り込み、親関係・ソース・マージ解決・生成物削除を照合してから両履歴を保った統合と検証へ進む。この経路は、同じ形の5コミット・マージ・バイナリ追加・削除を持つ実Gitの検証用リポジトリで復元確認済み。実際のReplitコードを取得・検証済みという意味ではない。

## Git認証が復旧した場合の代替：別ブランチへ保存

ReplitのShellで以下を実行し、結果を共有する。既存の確定済みコミットとその履歴を同じGitHubリポジトリの退避用ブランチへ送る操作。Replitの現在ブランチやGitHub mainへの取り込みは行わず、checkout・merge・reset・force pushもしない。ReplitのpostMergeを呼ぶ取り込み操作は含まない。

```sh
git push origin 73c7124bfa81f417b8e4463a7ac0086ec8392530:refs/heads/replit/yoki3-premerge-73c7124
```

失敗した場合はそのエラーを確認し、force pushやmainへの直接pushへ置き換えない。成功後はエージェントがこのブランチを取得してHEADの一致を確認し、5件の親関係・ソース・マージ解決・生成物削除を照合する。両方の履歴を保った隔離作業場所で統合と必要な検証を行う。現在のReplit mainを候補へ単純置換しない。同じコミット一覧の再提出は不要。

## 全体の状態を取り直す場合：ReplitのShellでGit状態を取得

既存プロジェクト `https://replit.com/@nakagawayoki/YOKI-YOKI` のShellで、次を実行する。

```sh
git fetch origin main codex/yoki-yoki-3-world &&
git show origin/codex/yoki-yoki-3-world:scripts/replit-readiness.mjs > /tmp/yoki-replit-readiness.mjs &&
node /tmp/yoki-replit-readiness.mjs
```

出力されたJSONを照合に使う。fetchはリモート追跡情報を更新するが、上記は作業ブランチやソース、DBを変更しない。確認スクリプト自体も依存パッケージ不要・読み取り専用で、checkout、merge、reset、install、ビルド、フックを実行しない。Gitインデックスの任意更新も無効にする。

出力するのはコミットID・日時・ブランチ・差分のファイルパス・Git操作の状態。ファイル本文、環境変数、リモートURL、認証情報は出力しない。作業内容を公開する処理もない。

| 出力項目 | 読み方 |
| --- | --- |
| `current` / `branch` | Replitが実際に開いているコミットとブランチ |
| `main` / `candidate` | fetch済みのGitHub mainと3.0統合候補 |
| `currentToCandidate` | leftOnly＝Replit側だけのコミット数、rightOnly＝候補側だけの数。`diverged`は双方に独自の履歴がある |
| `currentToUpstream` | 現在のブランチと追跡先の差。leftOnlyがあればその追跡先にないローカル履歴がある。追跡先不明なら未送信の有無を断定しない |
| `mainToCandidate` | 候補が最新mainを含むかを確認するための履歴差 |
| `workingTree.changes` | ステージ済み・未ステージ・未追跡・競合の区別。名前変更は元のパスも残す |
| `operations` | merge/rebase/cherry-pickなど、進行中のGit操作 |
| `shallow` / `missingRefs` | 履歴や参照が不足するときは取り込み可能と判断しない |
| `consistent` | 取得中にHEAD・主要参照・ブランチが変わっていないか。falseならGit操作終了後に取得し直す |

Git状態が整っていても、本番ログインや端末動作の検証に合格した意味にはならない。

## 照合後の順序

1. Replitの未コミット差分・独自コミット・競合を保全して候補と照合する。差分がなければ、その事実とコミットIDを進捗に記録する。未送信変更があるという推測を残し続けない。
2. 使用中のReplitビルド・配備・ネイティブ提出設定を確認する。既存のApp Store提出経路はReplitと確認済み。新しいEASプロジェクトや署名IDを推測して作らない。
3. 統合と実環境確認の対象コミットを決める。取得、統合、ビルド、配備をそれぞれ記録し、GitHubの更新だけで配備済みと扱わない。
4. 既存の環境で本番アカウント・API・DBの動作を確認する。ネイティブ実行では記録、給餌、チャット、画面遷移、再起動後の保持、タッチ、キーボード、読み上げ、性能を確認する。アカウントの切り替え・ログアウト・削除検証は既存の検証用データで行う。
5. 確認結果に基づいてPR #2の統合・リリースを進め、実際に配布したビルドを記録する。

このリポジトリの `.replit` はpostMergeフックとして `scripts/post-merge.sh` を指定し、その中で `pnpm install --frozen-lockfile` と `pnpm --filter db push` を実行する。Replitでの取り込みはDB操作を伴う可能性があるため、フックの現在の内容と実行条件も照合する。上の状態取得コマンドはフックを呼ばない。

ユーザーはiPad実機を持っていない。iPadの確認を繰り返し要求しない。現在の `ios.supportsTablet: false` を維持し、利用可能な正規のネイティブ実行環境で確認する。ブラウザーのタブレットサイズ表示をiPad実行結果に置き換えない。

## 実環境の結果に残す項目

| 対象 | 必要な記録 |
| --- | --- |
| Replit | 状態取得JSON、照合後のコミット、ビルド結果、実際の配備対象 |
| アカウント/API/DB | 対象コミット、環境、実行日時、保存→読み戻し・再起動・アカウント切り替えの結果。機密値や個人の記録本文は不要 |
| ネイティブ | アプリのバージョン/ビルド番号、機種またはシミュレーター、OS、対象コミット、操作と結果 |
| 不具合 | 再現手順、発生画面、期待した動作と実際の動作 |

## エージェントの次回再開

最新のGitと進捗を読み、まず `yoki-replit-73c7124.zip` が添付されたか、退避用ブランチ `replit/yoki3-premerge-73c7124` が取得可能になったか、または新しい実環境の結果が届いているか確認する。同じコミットで新しい証拠がなければ、完了した画面の作り直し、成功済みローカルテストの繰り返し、新たな磨き込み課題の追加を再開作業としない。現在の不足情報は特定済みReplit独自5コミットのソース実体。ID・クリーン状態・分岐件数の再提出や、認証状態が変わっていないままのpush再試行は不要。
