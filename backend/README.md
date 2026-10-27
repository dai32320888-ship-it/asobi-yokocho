# もぐらパニック 共通ランキング API

Cloudflare Pages の Advanced mode Worker と D1 で動作する。`worker.mjs` をビルド時に `dist/_worker.js` へコピーする。D1 のバインド名は **RANKING_DB**。`schema.sql` を一度適用する。繰り返し適用しても既存データ・秘密鍵は変更しない。追加の外部キー・有料サービスは不要。

静的アセットは `env.ASSETS.fetch(request)` へ渡す。`_routes.json` で Worker の対象を `/api/*` だけに限定する。D1 が未接続・上限到達・障害のときは API を503で閉じ、フロントは端末ローカルの練習として遊べる。練習スコアを共通ランキングに送信してはいけない。

## プロトコル

POST は同一オリジンの `Origin` ヘッダーと `Content-Type: application/json` が必須。本文は2048バイト以下。未知のフィールドは400。`score` やクライアント時刻を送っても受理しない。

1. **POST `/api/mole/session`** — `{nickname}`。表示名はNFC・前後空白除去・16コードポイント以内。空欄は「ゲスト」。制御文字・双方向制御文字・`<>&` は拒否。返却例：

```json
{
  "sessionId": "256-bit random hex bearer secret",
  "serverNow": 1793156400000,
  "startAt": 1793156401200,
  "endAt": 1793156426200,
  "targets": [
    {"id":"128-bit random hex", "hole":0, "kind":"normal", "openAt":1793156401200, "closeAt":1793156401780}
  ],
  "rules": {"durationMs":25000,"slotMs":625,"normalPoints":1,"goldPoints":3,"bombPenalty":3,"comboEvery":5,"maxCombo":3}
}
```

40個のターゲットを625ms間隔で発行。受付時間は各580ms。`startAt` は作成要求のサーバー到着時刻+1200ms。`sessionId` はそのラウンドの書込権限を持つ秘密値であり、メモリだけで扱い、公開・動画表示・ログ・URL・共有しない。DBにはそのSHA-256だけを保存する。

2. **POST `/api/mole/hit`** — `{sessionId,targetId,hole}`。成功時 `{accepted:true,score,hits,streak,combo,serverNow}`。サーバー到着時刻、発行ターゲット、穴番号、重複ビット、未終了状態を照合。DBのバージョン比較とビットマスクを一回の条件付きUPDATEで更新する。並行・再送でも同じターゲットは1回だけ。穴が違う／別セッションのターゲットは422。受付前後は422。重複は409。DB処理待ち中に次の画面へ進んでも受付時刻にクライアント値を使わない。

   通常1点、金3点。連続命中の1〜5回目は×1、6〜10回目は×2、11回目以降は×3。通常・金を見逃すと連続数はリセット。爆弾を避けても連続数は維持。爆弾への命中は3点減（最低0点）・連続数リセット。`hits` は通常・金への有効命中数。

3. **POST `/api/mole/finish`** — `{sessionId}`。`endAt` 以降だけ受付。結果はサーバーの保存済みスコアから作成し、セッションごとに1行だけ公開。繰り返しても重複掲載なし。`{score,hits,streak,combo,rank,period:'week',week,serverNow}`。`rank` は上位20内なら1〜20、それ以外はnull。再呼出時の順位は新しい他人の結果で変わりうる。

4. **GET `/api/mole/leaderboard?period=week`** — `{period:'week',week,entries:[{rank,nickname,score,hits,finishedAt}],serverNow}`。週はUTC月曜00:00（日本時間・月曜09:00）開始。スコア降順、同点は終了時刻が早い順、最終タイは内部ID順。上位20の**ラウンド**であり、ユーザー認証や同名別人の区別は行わない。30秒キャッシュ。秘密のセッション値・IPハッシュは公開しない。

エラーは `{error,serverNow,retryAfterMs?}`。主なコード：

| HTTP | コード | 処理 |
| --- | --- | --- |
| 429 | rate_limited | 同一IPの10分枠で10回まで。指定時間後に再試行、練習は可能 |
| 429 | daily_limit | サイト全体でUTC1日250ラウンド。翌UTC日まで練習 |
| 422 | round_not_finished | `retryAfterMs` 後に終了要求を再試行 |
| 422 | target_closed / target_mismatch | 命中不成立。ローカル点を共通点へ足さない |
| 409 | duplicate_hit / state_changed / session_finished | 点を二重加算しない |
| 410 | session_expired | ラウンド開始から1時間超。再公開不可 |
| 503 | ranking_unavailable / service_unavailable | 共通機能を使わず練習として続行 |

## 予算とデータ

初期設定は**サイト全体250ラウンド/UTC日**。1ラウンド40ターゲット以上は更新できない。毎回全40個命中でも約10,000回の命中UPDATE/日。セッション・レート予約・公開・索引・清掃を含め、保守的な見積りでも約50,000行書込/日以内を狙う。D1の実際の索引書込は管理画面の `rows_written` を監視する。これは請求上限機能ではなくアプリ側利用枠である。必ず Workers/D1 **Freeプランを維持**し、有料移行は別判断にする。Free上限ではAPIはエラーとなり、ゲームの練習は続行できる。静的ファイルをFunctionsへ通さないこと。

無料枠の現行目安：Workers API100,000リクエスト/日、D1読取500万行/日・書込10万行/日・保存5GB。共通250ラウンド×最大42要求なら約10,500ゲーム要求/日+ランキング閲覧。ランキングのキャッシュはCloudflareの拠点ごとであり、悪意ある大量アクセスを完全に防ぐものではない。他のプロジェクトも同一アカウントの無料枠を共有する。

保存データ：公開表示名、共通スコア・命中数・終了時刻・週。秘密のラウンド状態は1時間で期限切れ。IP制限はCloudflareが渡すIPをDB内秘密鍵による日替わりHMACへ変換し、ハッシュ化したレート枠を24時間保持。生IPはDB・ログに書かない。公開ランキングは90日、レート枠とセッションは期限後に、**新しいラウンド作成時の件数制限付き清掃**で削除する。無アクセス中は削除実行されず、アクセス再開後も古い件数によって削除が遅れる。厳密な時刻削除が必要なら別途定期清掃を追加する。

**完全な不正対策ではない。** スコアの自由な申告、過去ターゲット再送、未来の一括命中、25秒未満の終了は拒否するが、公開されたスケジュールを人の代わりに自動操作するボットは防げない。人間のみ・公認記録・完全なチート防止とは宣伝しない。金8個・爆弾5個の出現順はすべての共通ラウンドで同一とし、最大得点は132点。穴位置とターゲットIDだけをランダム化する。必要に応じて後からTurnstile、より強いサーバー進行配信、異常値監査を加える。

## テスト

`node --test tests/backend.test.mjs`（Node24以上）。組み込みSQLiteのメモリDBで本番SQLを実行。早すぎる終了、別ラウンド・別穴・期限外の命中、重複・並行再送、任意点数の申告、連続ボーナス、制限枠、公開情報の分離、壊れた本文・オリジン・保存期間・障害時の閉鎖を検証する。

公式仕様：

- https://developers.cloudflare.com/pages/functions/advanced-mode/
- https://developers.cloudflare.com/d1/worker-api/d1-database/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/platform/pricing/

