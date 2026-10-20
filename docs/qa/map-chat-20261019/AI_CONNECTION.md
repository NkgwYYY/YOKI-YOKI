# AI接続の復旧準備（2026-10-19）

## 確認した原因

既存のReplit管理AI中継に対し、モデル・会話を含めない空JSONで認証段階だけを確認したところ、HTTP 401と `ApiKey not approved` が返りました。アプリの会話ロジックに入る前の認証拒否です。キーは設定済みで、Bearer接頭辞の二重指定、空白、引用符、環境変数名の誤入力はありませんでした。GET modelsは405のため、モデル一覧確認には使えません。

秘密のキーと実ユーザーの会話は表示・保存していません。生成リクエスト、Agent起動、購入、資格情報変更、公開は行っていません。課金不足表示はありますが、未承認になった理由とは断定しません。

## 用意した変更

`YOKI_AI_PROVIDER` で接続先を明示的に選べます。

| 設定 | 接続先と必要な設定 |
| --- | --- |
| 未設定、または `replit` | 既存の `AI_INTEGRATIONS_OPENAI_BASE_URL` と `AI_INTEGRATIONS_OPENAI_API_KEY` |
| `openai` | `OPENAI_API_KEY` を使い、`https://api.openai.com/v1` に直接接続 |

独自キーが存在するだけでは切り替えません。401を受けても別のキー・別の接続先へ自動で送信しません。直接接続のURLは固定で、Replit中継や `OPENAI_BASE_URL` に独自キーを送らないようにしています。文字列の前後の空白だけは除去します。テキスト・音声・画像で同じクライアントを使います。モデルと会話内容の処理は変更しません。

## 有効化に必要な本人操作

独自OpenAI APIを使うか、Replit管理AIの承認復旧を待つかは、利用者が選択します。直接接続のコードを用意したことは、切替や実会話の復旧完了を意味しません。OpenAI APIの利用料金はOpenAI側で発生します。

独自キーで進める場合:

1. 利用者本人がReplitのYOKI YOKIのSecretsに `OPENAI_API_KEY` を追加します。値をチャットやGitHubに貼らず、既存のReplit管理キーを上書きしません。
2. キー追加後に、構成変数 `YOKI_AI_PROVIDER` を `openai` に設定します。
3. 開発APIをビルド・再起動し、合成の短い挨拶1件で実際の応答を確認します。会話の個人データは使いません。公開版への反映は別です。

管理AIを維持する場合は、Replit側で当該キーの承認状態を復旧する必要があります。こちらでキーを偽造したり承認制御を回避したりはしません。

## 検証

ローカルの接続先・資格情報分離テスト9件と既存チャットテスト15件（合計24件）が成功。実SDKを使い、HTTPだけを模擬したテストで送り先とAuthorizationヘッダーを確認しています。共有ライブラリ・APIの型チェックとAPIビルドも成功。実APIによる直接接続はキー設定前のため未確認です。

公式資料:

- https://developers.openai.com/api/reference/overview
- https://docs.replit.com/features/integrations/replit-ai-integrations
