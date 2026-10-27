# あそび横丁

公開サイト：**https://asobi-yokocho.pages.dev/**

ソース：https://github.com/dai32320888-ship-it/asobi-yokocho

登録・インストールなしで遊べる無料ブラウザゲームセンター。元の `asobi-yokocho-v3-source.zip` を正本として引き継いだ改良版です。広告・解析・課金は導入していません。

## 遊べる6ゲーム

ネオンスネーク / 2048パズル / えあわせメモリー / もぐらパニック / マルバツ勝負 / カフェ大繁盛。

おすすめ3件からすぐプレイ。ジャンル・検索・ゲーム別お気に入り・端末内スコアランキング・5言語（日本語、英語、韓国語、中国語、スペイン語）に対応しています。スコアやお気に入りはブラウザ内保存で、全ユーザー共通ランキングではありません。

## 開発

Node.js 22以上。公開用ビルドは外部パッケージ不要です。

```sh
node scripts/build-site.mjs
node scripts/serve.mjs
```

`http://127.0.0.1:4173` で確認できます。公開するフォルダーは `dist/` です。

単体HTML試遊版を作る場合：

```sh
node scripts/build-single.mjs
```

親フォルダーに `asobi-yokocho-v3-demo.html` ができます。

## 試験

```sh
node tests/regression.cjs
```

PlaywrightとChromium/Edgeを使う独立ブラウザ試験です。通常ブラウザのプロフィールは使用しません。詳細と結果は `TEST-REPORT.md`、公開手順は `DEPLOYMENT.md` を参照してください。

## ゲームを追加する

`AGENTS.md` と `games/EXAMPLE.js` を読み、`games/<id>.js`、`catalog.js`、`i18n.js` を追加します。ゲームは選択時だけ遅延読み込みします。runnerは後片付け関数を返し、任意の `cleanup.retranslate()` で進行を保持したまま言語変更に対応します。既存6ゲームの回帰試験とタッチ操作確認を行い、`dist/` を再ビルドして公開します。

## 運用

静的ファイルをCloudflare Pages無料プランで配信します。バックエンド・データベースは利用しません。公開用ZIPに開発資料、テスト、動画素材を含めません。全ユーザー共通ランキングの導入案と費用は `DEPLOYMENT.md` を参照してください。

Xへの投稿はオーナー本人が行います。`promo/` は投稿用素材です。サイト変更のたびにスモーク試験・素材更新・デプロイ・実URL確認まで開発側が担当します。
