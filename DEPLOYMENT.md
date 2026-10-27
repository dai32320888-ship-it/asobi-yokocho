# v5 公開と費用

公開URL：https://asobi-yokocho.pages.dev/
GitHub：https://github.com/dai32320888-ship-it/asobi-yokocho

## 構成

v5の育成ジムはブラウザ内で完結し、育成データをサーバーへ送信しません。新たなデータベース・有料サービス・広告は追加していません。

Cloudflare Pages Direct Uploadを維持。dist/_worker.jsのAdvanced modeとD1を追加しました。_routes.jsonは/api/*だけをWorkerへ渡し、ゲームや画像の静的配信はAPIの実行枠を消費しません。

D1データベース名：asobi-yokocho-ranking
D1 ID：ebf06783-c13a-473d-b3d8-4b104f5d65f3
Pages Production binding：RANKING_DB
schema：backend/schema.sql

DB内で生成したHMAC秘密鍵をソース・ブラウザ・公開APIへ出しません。設定用の公開管理APIもありません。

## 無料枠を守る運用

有料プランや有料の追加サービスには申し込んでいません。API10万リクエスト/日、D1読取500万行/日・書込10万行/日・アカウント合計5GB、1DB最大500MBの無料枠を前提としています。枠はアカウント内の他用途と共有です。

共通ランキングは全体250ラウンド/UTC日、同一接続元10ラウンド/10分のアプリ側上限を設定。40ターゲット/ラウンドで書込を抑え、上限・障害時は受付を止めます。通常の練習と他のゲームは継続して遊べます。勝手な有料化や従量課金プランへの変更は行いません。

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/pages/get-started/direct-upload/

## 更新

1. backend/schema.sqlを必要時のみD1へ適用。再実行可能。
2. 変更・5言語・既存ゲーム回帰試験・不正系試験を実施。
3. node scripts/build-site.mjs / node scripts/build-single.mjs。
4. dist/の中身をZIPにしてPagesのProduction deploymentへアップロード。_worker.jsも含める。functions/のフォルダーを手動アップロードする方式は使用しない。
5. node scripts/verify-live.mjs https://asobi-yokocho.pages.dev/。
6. 変更したゲームを公開URLで実操作して確認。もぐらのランキング処理を変更した場合のみ、実際の25秒ラウンドと別ブラウザでの順位共有も再確認。
7. GitHubへ検証済みソースを保存し、X素材を更新。X投稿はオーナー。

wrangler.jsonは将来CLIで同じ構成を再現するための設定です。CLI公開には別途所有者のWranglerログインが必要です。現在のブラウザによる公開で新たなAPIキーは作成していません。

## 共通ランキングの範囲

もぐらパニックだけが共通週間上位20ラウンドを公開します。順位は個人認証によるものではなく、匿名のラウンド記録です。同一人物の複数回プレイやニックネームの重複があり得ます。週はUTC月曜0時（日本時間9時）に切替。端末内の過去スコアは送信しません。

サーバーが時刻・発行ターゲット・穴・二重登録を検証し、得点を計算します。全ラウンド同じ種類の出現順で理論上限132点。自由な点数の投稿は受け付けません。完全な自動操作防止を保証するものではありません。詳細な保持期間とアクセス時清掃の制約はbackend/README.md。
