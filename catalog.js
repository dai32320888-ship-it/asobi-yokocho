'use strict';
const GAMES = [
  {id:'pixel-treasure',name:'ドタバタ宝さがし',category:'アクション',icon:'💎',desc:'ドットの遺跡を大冒険。宝石を集めて30秒以内に脱出！',duration:'約10〜30秒',hint:'方向ボタン／矢印／WASDで移動。宝石8個で光る出口が開く！ ダッシュ／Spaceで敵と罠を切り抜け、カギと宝箱も狙おう。3つの遺跡、P／Escで停止。',unit:'点',kind:'max',scripts:['pixel-treasure-model','pixel-treasure-visual','pixel-treasure-audio']},
  {id:'galaxy-guard',name:'銀河防衛隊',category:'アクション',icon:'🚀',desc:'宇宙船で編隊を迎撃！ 武器を強化し、巨大母船を倒せ。',duration:'約1分／出撃',hint:'指で左右にドラッグ、または左右／A Dで移動。ショットは自動連射。ボム／Spaceで敵弾を消し、Pで武器を強化。4種の宇宙人と3編隊を突破して巨大母船へ！ P／Escで一時停止。',unit:'点',kind:'max',scripts:['galaxy-guard-model','galaxy-guard-visual','galaxy-guard-audio']},
  {id:'balloon-panic',name:'ギリギリ風船',category:'カジュアル',icon:'🎈',desc:'長押しでふくらます。割れる直前に離して高得点！',duration:'約5〜10秒',hint:'風船かボタンを長押しして、割れる前に指を離そう。震え・色・音が限界のサイン。Space／Enterでも遊べて、結果から長押しですぐ次の1回へ。',unit:'点',kind:'max',scripts:['balloon-panic-model','balloon-panic-visual','balloon-panic-audio']},
  {id:'scrap-drift',name:'ボロ車ドリフト',category:'レース',icon:'🏁',desc:'ボロ軽を改造。ドリフトとニトロで街の最速へ！',duration:'約30〜50秒／レース',hint:'自動アクセル。左右／A Dでハンドル、Spaceでドリフト、Shiftでニトロ。スマホはボタンを長押し。賞金でエンジン・タイヤ・車体を改造し、6コースのライバルを倒そう。',unit:'点',kind:'max',scripts:['scrap-drift-model','scrap-drift-visual','scrap-drift-audio']},
  {id:'kotoba-garden',name:'ことば横丁',category:'パズル',icon:'🀄',desc:'ひらがな牌で言葉づくり。2・3・4文字をそろえよう。',duration:'3〜8分',hint:'8枚の手札に1枚引き、2・3・4文字の異なる言葉を1つずつ作ろう。牌を読む順にタップして置き、いらない1枚は捨てる。CPU対戦とひとり練習、ことば帳とヒント付き。',unit:'点',kind:'max',scripts:['kotoba-garden-words','kotoba-garden-model','kotoba-garden-audio']},
  {id:'mouse-evolution',name:'ねずみビッグバン',category:'アクション',icon:'🐭',desc:'食べて戦い、子孫へ進化。小さなネズミから地球サイズへ！',duration:'数分〜',hint:'左スティック／WASDで移動。攻撃と無敵ダッシュで大物を倒そう。食べて育ち、巣で交配して能力を次の世代へ。9つの世界を越えて地球サイズへ！',unit:'点',kind:'max',scripts:['mouse-evolution-model','mouse-evolution-visual','mouse-evolution-audio']},
  {id:'bodybuilder',name:'マッスル育成ジム',category:'育成',icon:'🏋️',desc:'鍛える・食べる・休む。体を育てて大会に挑戦。',duration:'じっくり',hint:'種目を選んでタイミングよく反復。部位別に体が変化。食事と休養で育て、7日ごとの大会へ。',unit:'点',kind:'max',scripts:['bodybuilder-visual','bodybuilder-audio']},
  {id:'snake',name:'ネオンスネーク',category:'アクション',icon:'🐍',desc:'金のリンゴとコンボ。育つヘビで果樹園を冒険！',duration:'1〜3分',hint:'3コースから選択。矢印／WASD・スワイプで操作。連続収穫でコンボ、5個目は金のリンゴ。P／Spaceで一時停止。',unit:'点',kind:'max'},
  {id:'2048',name:'2048パズル',category:'パズル',icon:'🔢',desc:'立体タイルを重ねて2048へ。1回だけ巻き戻せる。',duration:'3〜8分',hint:'矢印／WASD・スワイプで同じ数字を合体。Zでもどせるのは1ゲーム1回。2048達成後も続けられる。',unit:'点',kind:'max'},
  {id:'memory',name:'えあわせメモリー',category:'脳トレ',icon:'🃏',desc:'森のイラストを記憶。時間内に全部のペアを発見！',duration:'1〜3分',hint:'3難易度・12／16／24枚。連続正解で時間ボーナス。のぞき見は1回−8秒。標準のクリア手数を記録。',unit:'手',kind:'min'},
  {id:'mole',name:'もぐらパニック',category:'カジュアル',icon:'🔨',desc:'金もぐら・爆弾・コンボ！25秒の庭園バトル。',duration:'25秒',hint:'もぐらは+1、金もぐらは+3。爆弾は−3。連続命中で最大3倍。共通ランキングは公式ラウンドで挑戦！',unit:'点',kind:'max'},
  {id:'ttt',name:'マルバツ勝負',category:'対戦',icon:'⭕',desc:'木の盤でCPUと2勝先取。3段階の相手に挑戦。',duration:'2勝先取',hint:'あなたは×。3つ並べて1勝、2勝先取で決着。難易度は3段階。タップか1〜9キーで置こう。',unit:'勝',kind:'max'},
  {id:'shop',name:'カフェ大繁盛',category:'経営',icon:'☕',desc:'注文を選び、材料を合わせて提供。60秒の店長体験。',duration:'60秒／日',hint:'注文→コーヒー→追加材料→抽出。60秒で目標杯数を目指そう。3ミスで閉店。コインで店を強化。',unit:'枚',kind:'max'}
];
const CATEGORIES=[['すべて','🎮'],['レース','🏁'],['育成','🏋️'],['パズル','🧩'],['アクション','⚡'],['脳トレ','🧠'],['カジュアル','🎯'],['経営','🏪'],['対戦','⚔️']];
const EDITOR_PICKS=['pixel-treasure','galaxy-guard','balloon-panic','scrap-drift','kotoba-garden','mouse-evolution','bodybuilder','mole','2048','snake','memory','shop','ttt'];
