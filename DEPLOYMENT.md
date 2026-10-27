# 公開と運用

## 公開構成

公開URL：https://asobi-yokocho.pages.dev/ （実URL・全公開ファイルを検証済み）

- ソース管理：GitHub `dai32320888-ship-it/asobi-yokocho`
- 公開先：Cloudflare Pages Free、静的ファイルのみ
- ビルド：`node scripts/build-site.mjs`
- 公開ディレクトリー：`dist`
- バックエンド、広告、解析タグ、課金機能：なし

Cloudflare側のGit連携は別のGitHubアカウントに接続されているため、今回はDirect Uploadを使用します。ソースの変更はGitHubへ保存し、検証済みの `dist/` をZIPにしてPagesへアップロードする手順です。新たなAPIトークンや権限付与は不要です。

Direct UploadのPagesプロジェクトを後からGit連携へ変更することはできません。Git自動公開を希望する時点で、所有者本人が対象リポジトリのみにCloudflare GitHub Appを許可し、別のPagesプロジェクトへ移行できます。

## 更新手順

1. 現在公開中のソースから、ゲーム追加・翻訳・修正を実施。
2. `node scripts/build-site.mjs` と `node scripts/build-single.mjs` を実行。
3. `node tests/regression.cjs` とスマホ/PCの表示確認。
4. 検証したソースをGitHubへ保存。
5. `dist/` の中身をZIP化し、Cloudflare Pagesの新しいProduction deploymentへアップロード。
6. 公開URLと6ゲームのファイルがHTTP 200で読めること、ブラウザでトップとゲームが動くことを確認。
7. 公開URL確認後にX用の縦動画・投稿文・リプ用URLを更新。投稿はオーナー本人が担当。

## 費用（2026年10月27日の公式資料を確認）

静的Pagesは無料枠内で月額0米ドル。静的リクエストは無料・無制限。Freeの主な上限は月500ビルド、20,000ファイル、1ファイル25 MiBです。独自ドメイン購入は不要で、Pagesのサブドメインを利用できます。有料プランや追加サービスは申し込んでいません。

- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/get-started/direct-upload/

## 共通ランキングは未実装

現在のランキングは「運営のおすすめ順」「このブラウザのプレイ回数順」「ゲーム別の端末内スコア」です。全利用者の順位や同期を装う表示はありません。ブラウザ内データは変更・削除できるため公式競技記録ではありません。

導入する場合はPages Functions/WorkersとD1を別途設計します。秘密情報はサーバー側のみとし、ゲームID・スコア範囲・ニックネームの検証、SQLパラメーター化、投稿回数制限、短命のプレイID、重複送信防止、保存期間、削除方法、監視と障害時の停止機能を備えます。

Turnstile等を使う場合はサーバー検証を必須化。ブラウザからスコアの数値を受け取るだけでは改ざん防止になりません。ゲームごとのプレイ検証やサーバー側再計算が必要です。不要な個人情報は集めず、ニックネームの公開範囲と不正記録の取扱いも明示します。

無料枠の目安：Workers API合計10万リクエスト/日、D1は読取500万行/日・書込10万行/日・保存5 GB。無料プランを維持して上限超過時はAPI停止とする構成が可能です。有料化する場合はWorkers月額5米ドルから＋従量料金で、導入前に運営者へ費用と上限を提示します。ランキング機能は今回作成・接続していません。

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
