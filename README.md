# あそび横丁 v5.1.1

公開サイト：https://asobi-yokocho.pages.dev/
ソース：https://github.com/dai32320888-ship-it/asobi-yokocho

全7ゲーム。「マッスル育成ジム」の体形比較、効果音、食事と日々の案内を改良しました。トップから即プレイ、日本語・英語・韓国語・中国語・スペイン語、スマホ・キーボード、ゲーム別お気に入りに対応しています。

v5.1.1では、タッチ時の音声開始を再試行できるよう修正しました。「音を開始」「音をためす」で確認でき、音ON表示は音声時計の実際の進行を確認してから表示します。効果音の音量も聞き取りやすく調整しました。

- マッスル育成ジム：8種目の反復ミニゲーム、7部位の体形変化と比較、12種の効果音、役割で選ぶ食事、休養、7日ごとの大会とリーグ昇格。育成と大会の自己ベストはこのブラウザだけに自動保存。
- もぐら：25秒、金もぐら、爆弾、連続命中、検証付きの共通週間ランキング。
- スネーク：果樹園、滑らかなヘビ、3コース、岩、金リンゴ、速度変化。
- 2048：立体タイルと移動・合体演出、1ラウンド1回の取り消し。
- メモリー：オリジナル絵柄、3難易度、制限時間、のぞき見、連続正解。
- マルバツ：木製盤、CPU3段階、2勝先取、交互先手、勝利ライン。
- カフェ：60秒の注文対応、3種のレシピ、待ち時間、連続提供、強化と翌日進行。

## 開発

Node.js22以上。公開ビルドには追加パッケージ不要。

```sh
node scripts/build-site.mjs
node scripts/build-single.mjs
```

公開対象はdist/。単体HTML試遊版にはサーバーがなく、共通ランキングは利用できません。試遊版の記録を公開ランキングへ後から送ることはしません。

## 試験

```sh
node --test tests/backend.test.mjs
node tests/v4-regression.cjs
node tests/bodybuilder-regression.cjs
node --test tests/bodybuilder-audio.test.mjs
node tests/bodybuilder-audio-render.cjs
```

ブラウザ試験はPlaywright＋Chromium/Edgeが必要です。通常利用のブラウザプロフィールを使わず、実際のWorkerとSQLiteで検証します。公開後の照合はnode scripts/verify-live.mjs https://asobi-yokocho.pages.dev/。

## ゲーム追加

AGENTS.mdとgames/EXAMPLE.jsを参照。catalog.js、i18n.js、games/<id>.jsを追加し、cleanupとcleanup.retranslateで後処理・進行を保つ翻訳に対応します。ゲームは選択時に遅延読み込みします。描画などの依存モジュールはcatalogのscripts配列で宣言し、ゲーム本体より先に読み込みます。

## 運用

Cloudflare Pages＋D1の無料枠を使用。共通ランキングの仕様・制限・個人情報の扱いはbackend/README.mdとprivacy.html、公開手順はDEPLOYMENT.md、試験結果はTEST-REPORT.mdに記載しています。効果音は端末内で合成し、外部の音素材・マイク権限を使いません。広告、解析タグ、課金、X投稿は行いません。X投稿はオーナー本人が担当します。
