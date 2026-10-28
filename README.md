# あそび横丁 v6

公開サイト：https://asobi-yokocho.pages.dev/
ソース：https://github.com/dai32320888-ship-it/asobi-yokocho

全8ゲーム。新作「ねずみビッグバン」を追加しました。トップから即プレイ、日本語・英語・韓国語・中国語・スペイン語、スマホ・キーボード、ゲーム別お気に入りに対応しています。

ねずみビッグバンは、10cmのネズミが14種類の動物と戦い、食べて巨大化するアクションゲームです。予告された攻撃を無敵ダッシュでかわし、向きを合わせてかみつきます。巣で交配すると次の世代が誕生し、速さ・攻撃・丈夫さのどれかを引き継げます。草むら・森・海・大陸・宇宙など9世界で大物を倒し、最終的に地球の直径12,742kmのサイズへ到達します。進行と記録は端末内だけの保存です。

v5.1.1では、タッチ時の音声開始を再試行できるよう修正しました。「音を開始」「音をためす」で確認でき、音ON表示は音声時計の実際の進行を確認してから表示します。効果音の音量も聞き取りやすく調整しました。

v5.1.2では、マッスル育成ジムの上部に「はじめから」を追加しました。確認後に日数・体・コイン・食事・大会履歴と、このゲームの端末内ベスト・順位を初期化します。キャンセルでは何も消しません。他のゲーム、お気に入り、音の設定は維持します。セット中は初期化できず、保存が失敗した場合は元の進行を保持します。

- ねずみビッグバン：移動・近接攻撃・無敵ダッシュ、14動物、9世界、交配と能力継承、食事と成長、ボス、地球サイズ到達。再開・段階リトライ・確認付き初期化・効果音。
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
node tests/bodybuilder-reset.cjs
node --test tests/mouse-evolution-model.test.mjs
node tests/mouse-evolution-browser.cjs
node tests/mouse-evolution-normal-run.cjs
node --test tests/bodybuilder-audio.test.mjs
node tests/bodybuilder-audio-render.cjs
```

ブラウザ試験はPlaywright＋Chromium/Edgeが必要です。通常利用のブラウザプロフィールを使わず、実際のWorkerとSQLiteで検証します。公開後の照合はnode scripts/verify-live.mjs https://asobi-yokocho.pages.dev/。

## ゲーム追加

AGENTS.mdとgames/EXAMPLE.jsを参照。catalog.js、i18n.js、games/<id>.jsを追加し、cleanupとcleanup.retranslateで後処理・進行を保つ翻訳に対応します。ゲームは選択時に遅延読み込みします。描画などの依存モジュールはcatalogのscripts配列で宣言し、ゲーム本体より先に読み込みます。

## 運用

Cloudflare Pages＋D1の無料枠を使用。共通ランキングの仕様・制限・個人情報の扱いはbackend/README.mdとprivacy.html、公開手順はDEPLOYMENT.md、試験結果はTEST-REPORT.mdに記載しています。効果音は端末内で合成し、外部の音素材・マイク権限を使いません。広告、解析タグ、課金は行いません。

2026年10月28日以降は、オーナーがゲームのアイデアを出し、Codexが開発・試験・公開から、動画付きX投稿とリプ欄のゲーム直リンクまで担当します。投稿先は「あそび横丁」@mtrdswg。新作の公開URLを検証してから投稿し、動画・返信・リンクの到達を確認して、投稿URLを報告します。具体的な運用はAGENTS.mdを参照。
