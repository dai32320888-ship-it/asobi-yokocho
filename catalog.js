'use strict';
const GAMES = [
  {id:'snake',name:'ネオンスネーク',category:'アクション',icon:'🐍',desc:'リンゴを食べて、どこまでも長く！',duration:'1〜3分',hint:'PCは矢印キー／WASD、スマホはスワイプか方向ボタンで操作。',unit:'点',kind:'max'},
  {id:'2048',name:'2048パズル',category:'パズル',icon:'🔢',desc:'同じ数字を合わせて2048を目指そう。',duration:'3〜8分',hint:'PCは矢印キー／WASD、スマホはスワイプか方向ボタンで操作。',unit:'点',kind:'max'},
  {id:'memory',name:'えあわせメモリー',category:'脳トレ',icon:'🃏',desc:'16枚のカードから同じ絵を探そう。',duration:'1〜3分',hint:'カードを2枚選んで同じ絵柄をそろえよう。少ない手数ほど高記録！',unit:'手',kind:'min'},
  {id:'mole',name:'もぐらパニック',category:'カジュアル',icon:'🔨',desc:'出てきたもぐらをタップで退治！',duration:'25秒',hint:'25秒で何匹タップできるかな？ スマホもマウスも対応。',unit:'匹',kind:'max'},
  {id:'ttt',name:'マルバツ勝負',category:'対戦',icon:'⭕',desc:'コンピューターと3×3の真剣勝負。',duration:'1分',hint:'あなたは×。縦・横・ななめに先に3つ並べたら勝利。',unit:'勝',kind:'max'},
  {id:'shop',name:'カフェ大繁盛',category:'経営',icon:'☕',desc:'コーヒーを売ってお店を大きくしよう。',duration:'じっくり',hint:'コーヒーをタップして売上アップ。貯めたコインでお店を強化しよう。',unit:'枚',kind:'max'}
];
const CATEGORIES=[['すべて','🎮'],['パズル','🧩'],['アクション','⚡'],['脳トレ','🧠'],['カジュアル','🎯'],['経営','🏪'],['対戦','⚔️']];
const EDITOR_PICKS=['mole','2048','snake','memory','shop','ttt'];
