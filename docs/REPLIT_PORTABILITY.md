# Replitに依存しない運用の検討

2026-10-19時点の公開情報に基づく候補と一般的な確認項目。移行・接続・公開の完了を示す文書ではない。

コードを作成するサービス、コードを保管するGitHub、公開後のアプリを実行するホスティング、AI推論はそれぞれ別の役割を持つ。開発環境を変更しても、実行基盤の利用料や上限がなくなるわけではない。一方、公開先をReplit以外に選ぶことはできる。

## 無料枠を調べる際の候補

| 役割 | 候補 | 条件 |
| --- | --- | --- |
| 静的なWeb画面 | Cloudflare Pages | 単一ファイルは25 MiBまで。最終配信物を確認する |
| PostgreSQL | Neon Free | 保存量・計算量・転送量に上限があり、超過時は停止や書き込み失敗になる |
| AI | Cloudflare Workers AI Free | 1日10,000 Neurons。無料枠超過時はエラー。一部モデルは有料設定が必要 |
| APIの試験環境 | Render Free | 15分無通信で休止し、次の起動は約1分。公式は本番用に推奨していない |

無料AIと現在使っているモデルとの品質・機能の互換性は別途検証が必要。APIサーバーをサーバーレス基盤へ移す場合も、そのまま動くとは仮定しない。継続的な無料運用の可否は、実際の利用量と必要な応答速度による。

## 切替前に確認すること

1. 公開先・API・素材のURLを環境ごとに設定できるか。
2. データベースと保存ファイルを復元し、整合性を確認できるか。
3. Webのドメイン変更で、端末内の記録を取り残さないか。
4. ログイン、広告の検証、購入済み権利、外部コールバックを維持できるか。
5. ネイティブアプリに埋め込まれた接続先の更新が必要か。
6. 無料枠の上限到達時に、意図しない従量課金へ移行しないか。
7. 新環境を検証し、復旧手段を確保してから旧環境を停止できるか。

## 公式資料

- https://docs.replit.com/features/integrations/replit-ai-integrations
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://neon.com/docs/introduction/plans
- https://render.com/docs/free
