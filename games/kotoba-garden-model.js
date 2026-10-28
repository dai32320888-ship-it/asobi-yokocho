/* Kotoba Yokocho: original 2 + 3 + 4 word-tile puzzle. No DOM or timers. */
(function(){
'use strict';
const LENGTHS=[2,3,4],DECK_SIZE=42,MAX_HINTS=3;
const RECIPES=[
 ['ねこ','さくら','ひこうき'],['いぬ','すいか','にんじん'],['うみ','ばなな','ひまわり'],
 ['そら','りんご','たんぽぽ'],['くも','いちご','くつした'],['はな','うさぎ','てぶくろ'],
 ['やま','たぬき','にわとり'],['かさ','からす','おにぎり'],['ほし','きつね','きゅうり'],
 ['かに','かえる','たまねぎ'],['くり','とまと','えんぴつ'],['ゆき','めだか','でんしゃ'],
 ['まめ','こあら','らいおん'],['もも','ぱんだ','ぺんぎん'],['みみ','つくえ','はんかち'],
 ['えき','でんわ','くれよん'],['うし','つばめ','こすもす'],['はる','わかば','どんぐり']
];
const dictionary=()=>window.AsobiKotobaWords;
const clone=value=>JSON.parse(JSON.stringify(value));
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const charOK=char=>typeof char==='string'&&Array.from(char).length===1&&/^[ぁ-ゖー]$/u.test(char)&&char===char.normalize('NFC');
const countChars=chars=>{const map=new Map();for(const char of chars)map.set(char,(map.get(char)||0)+1);return map;};
const subtract=(counts,word)=>{const copy=new Map(counts);for(const char of Array.from(word)){const n=copy.get(char)||0;if(!n)return null;copy.set(char,n-1);}return copy;};
const emptySlots=()=>LENGTHS.map(length=>({length,word:null,tiles:[]}));
const emptyStats=()=>({wins:0,played:0,best:0,practiceStars:Array(RECIPES.length).fill(0)});
const ACTION_KEYS=new Set(['ready','drawn','select','cleared','placed','unlocked','discarded','cpuDiscarded','won','lost','draw','hint','sorted','newRound']);

class AsobiKotobaModel{
 constructor(saved){
  if(!dictionary()||!Array.isArray(dictionary().entries))throw Error('Kotoba word book must load before the model');
  this._seed=((Date.now()^Math.floor(Math.random()*4294967295))>>>0)||1;this._nextId=0;this._qualityCache=new Map();
  if(!this._restore(saved))this._deal({kind:'duel',difficulty:'normal',round:1,practiceIndex:0,stats:emptyStats()});
 }
 _random(){let seed=this._seed;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;this._seed=(seed>>>0)||1;return this._seed/4294967296;}
 _shuffle(items){for(let i=items.length-1;i>0;i--){const j=Math.floor(this._random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
 _tile(char){return{id:++this._nextId,char};}
 _recipe(index){return RECIPES[((index%RECIPES.length)+RECIPES.length)%RECIPES.length].map((reading,i)=>dictionary().lookup(reading)?.reading||dictionary().entries.find(entry=>Array.from(entry.reading).length===LENGTHS[i]).reading);}
 _randomRecipe(){return LENGTHS.map(length=>{const choices=dictionary().entries.filter(entry=>Array.from(entry.reading).length===length);return choices[Math.floor(this._random()*choices.length)].reading;});}
 _deal({kind,difficulty,round,practiceIndex,stats}){
  this._nextId=0;this._qualityCache.clear();
  const recipe=this._recipe(kind==='practice'?practiceIndex:(round-1)%RECIPES.length),chars=Array.from(recipe.join(''));
  const introduction=kind==='practice'?practiceIndex===0:stats.played===0;
  const missingCount=introduction?1:kind==='practice'?2+Number(practiceIndex>=8):2;
  this._shuffle(chars);const missing=chars.splice(0,missingCount),handChars=chars;
  const pool=Array.from(this._randomRecipe().join(''));
  while(handChars.length<8)handChars.push(pool[Math.floor(this._random()*pool.length)]);
  const cpuRecipe=this._randomRecipe(),cpuChars=Array.from(cpuRecipe.join(''));this._shuffle(cpuChars);const cpuMissing=cpuChars.splice(0,3);
  while(cpuChars.length<8)cpuChars.push(pool[Math.floor(this._random()*pool.length)]);
  const hand=this._shuffle(handChars).map(char=>this._tile(char)),cpu=kind==='duel'?this._shuffle(cpuChars).map(char=>this._tile(char)):[];
  const deckChars=[];while(deckChars.length<DECK_SIZE)deckChars.push(...Array.from(this._randomRecipe().join('')));deckChars.length=DECK_SIZE;this._shuffle(deckChars);
  // A practice has a reachable intended route; CPU decisions still read only
  // its own tiles and the face-up discard, never these future deck positions.
  for(let i=0;i<missing.length;i++)deckChars[kind==='duel'?i*2:i]=missing[i];
  if(kind==='duel')for(let i=0;i<cpuMissing.length;i++)deckChars[1+i*4]=cpuMissing[i];
  this.state={version:1,kind,difficulty,mode:'playing',phase:'draw',round,turn:1,hand,slots:emptySlots(),cpu,cpuWords:[],deck:deckChars.map(char=>this._tile(char)),discards:[],selected:[],hintsUsed:0,score:0,stars:0,practiceIndex,stats:clone(stats),lastAction:{key:'ready'}};
 }
 _restore(saved){
  try{
   if(!isObject(saved)||saved.version!==1||!['duel','practice'].includes(saved.kind)||!['easy','normal','hard'].includes(saved.difficulty)||!['playing','won','lost','draw'].includes(saved.mode)||!['draw','arrange','cpu'].includes(saved.phase))return false;
   if(!integer(saved.round,1,1000000)||!integer(saved.turn,1,100000)||!integer(saved.hintsUsed,0,MAX_HINTS)||!integer(saved.practiceIndex,0,RECIPES.length-1)||!integer(saved.score,0,10000000)||!integer(saved.stars,0,3))return false;
   const stats=saved.stats;if(!isObject(stats)||!integer(stats.played,0,1000000)||!integer(stats.wins,0,stats.played)||!integer(stats.best,0,10000000)||!Array.isArray(stats.practiceStars)||stats.practiceStars.length!==RECIPES.length||!stats.practiceStars.every(value=>integer(value,0,3)))return false;
   if(!Array.isArray(saved.hand)||saved.hand.length>9||!Array.isArray(saved.cpu)||saved.cpu.length>9||!Array.isArray(saved.deck)||saved.deck.length>DECK_SIZE||!Array.isArray(saved.discards)||saved.discards.length>80||!Array.isArray(saved.slots)||saved.slots.length!==3||!Array.isArray(saved.selected)||saved.selected.length>4||!Array.isArray(saved.cpuWords)||saved.cpuWords.length>3)return false;
   const seen=new Set();const checkTile=tile=>{if(!isObject(tile)||!integer(tile.id,1,1000000)||!charOK(tile.char)||seen.has(tile.id))return false;seen.add(tile.id);return true;};
   if(!saved.hand.every(checkTile)||!saved.cpu.every(checkTile)||!saved.deck.every(checkTile))return false;
   const readings=new Set();let locked=0;
   for(let i=0;i<3;i++){
    const slot=saved.slots[i];if(!isObject(slot)||slot.length!==LENGTHS[i]||!Array.isArray(slot.tiles))return false;
    if(slot.word===null){if(slot.tiles.length!==0)return false;}
    else{if(typeof slot.word!=='string'||!dictionary().lookup(slot.word)||Array.from(slot.word).length!==slot.length||slot.tiles.length!==slot.length||!slot.tiles.every(checkTile)||slot.tiles.map(tile=>tile.char).join('')!==slot.word||readings.has(slot.word))return false;locked+=slot.length;readings.add(slot.word);}
   }
   if(!saved.discards.every(entry=>isObject(entry)&&['player','cpu'].includes(entry.by)&&checkTile(entry.tile)))return false;
   const expected=8+(saved.phase==='arrange'?1:0);if(saved.hand.length+locked!==expected)return false;
   if(saved.kind==='duel'&&saved.cpu.length!==(saved.mode==='lost'?9:8)||saved.kind==='practice'&&saved.cpu.length!==0)return false;
   if(seen.size!==DECK_SIZE+8+(saved.kind==='duel'?8:0))return false;
   if(new Set(saved.selected).size!==saved.selected.length||!saved.selected.every(id=>integer(id,1,1000000)&&saved.hand.some(tile=>tile.id===id)))return false;
   if(saved.mode==='won'&&(locked!==9||saved.hand.length!==0||saved.phase!=='arrange'))return false;
   if(saved.mode==='lost'&&(saved.kind!=='duel'||saved.phase!=='cpu'||saved.cpuWords.length!==3||!this._validWordsForTiles(saved.cpuWords,saved.cpu)))return false;
   if(saved.mode!=='lost'&&saved.cpuWords.length!==0)return false;
   if(saved.mode==='draw'&&saved.phase!=='draw')return false;
   if(saved.mode==='playing'&&saved.phase==='cpu'&&saved.kind==='duel'&&saved.discards.at(-1)?.by!=='player')return false;
   if(!integer(saved.rng,1,4294967295)||!integer(saved.nextId,Math.max(...seen),1000000))return false;
   this._seed=saved.rng;this._nextId=saved.nextId;
   this.state={version:1,kind:saved.kind,difficulty:saved.difficulty,mode:saved.mode,phase:saved.phase,round:saved.round,turn:saved.turn,hand:saved.hand.map(tile=>({id:tile.id,char:tile.char})),slots:saved.slots.map(slot=>({length:slot.length,word:slot.word,tiles:slot.tiles.map(tile=>({id:tile.id,char:tile.char}))})),cpu:saved.cpu.map(tile=>({id:tile.id,char:tile.char})),cpuWords:[...saved.cpuWords],deck:saved.deck.map(tile=>({id:tile.id,char:tile.char})),discards:saved.discards.map(entry=>({tile:{id:entry.tile.id,char:entry.tile.char},by:entry.by})),selected:[...saved.selected],hintsUsed:saved.hintsUsed,score:saved.score,stars:saved.stars,practiceIndex:saved.practiceIndex,stats:clone(stats),lastAction:this._safeAction(saved.lastAction)};
   return true;
  }catch{return false;}
 }
 _safeAction(action){
  if(!isObject(action)||!ACTION_KEYS.has(action.key))return{key:'ready'};const result={key:action.key};
  if(typeof action.word==='string'&&dictionary().lookup(action.word))result.word=action.word;if(charOK(action.char))result.char=action.char;
  if(integer(action.tileId,1,1000000))result.tileId=action.tileId;
  if(Array.isArray(action.tiles)&&action.tiles.length<=4&&new Set(action.tiles).size===action.tiles.length&&action.tiles.every(id=>integer(id,1,1000000)))result.tiles=[...action.tiles];
  if(Array.isArray(action.words)&&action.words.length<=3&&action.words.every(word=>typeof word==='string'&&dictionary().lookup(word)))result.words=[...action.words];
  if(integer(action.remaining,0,MAX_HINTS))result.remaining=action.remaining;return result;
 }
 _ok(key,extra={}){this.state.lastAction={key,...extra};return{ok:true,key,...extra};}
 _fail(key,extra={}){return{ok:false,key,...extra};}
 _player(){return this.state.mode==='playing'&&['draw','arrange'].includes(this.state.phase);}
 _chars(tiles){return tiles.map(tile=>tile.char);}
 _validWordsForTiles(words,tiles){if(words.length!==3||new Set(words).size!==3||!words.every((word,i)=>dictionary().lookup(word)&&Array.from(word).length===LENGTHS[i]))return false;const left=subtract(countChars(this._chars(tiles)),words.join(''));return !!left&&[...left.values()].every(value=>value===0);}
 _findCompletion(tiles,slots=this.state.slots){
  const lengths=slots.filter(slot=>!slot.word).map(slot=>slot.length),used=new Set(slots.filter(slot=>slot.word).map(slot=>slot.word)),chars=this._chars(tiles);
  if(chars.length!==lengths.reduce((sum,length)=>sum+length,0))return null;
  const options=dictionary().findWords(chars).filter(entry=>!used.has(entry.reading)),counts=countChars(chars);
  function search(index,left,words){if(index===lengths.length)return words;for(const entry of options){if(Array.from(entry.reading).length!==lengths[index]||words.includes(entry.reading))continue;const remaining=subtract(left,entry.reading);if(remaining){const result=search(index+1,remaining,[...words,entry.reading]);if(result)return result;}}return null;}
  return search(0,counts,[]);
 }
 _quality(tiles){
  const chars=this._chars(tiles),signature=chars.slice().sort().join('');if(this._qualityCache.has(signature))return this._qualityCache.get(signature);
  const partial=typeof dictionary().partial==='function'?dictionary().partial(chars):dictionary().findWords(chars).slice(0,1);
  let value=partial.reduce((sum,entry)=>sum+Array.from(entry.reading).length,0)*100+partial.length*15;
  // This proximity score is based on public dictionary words, not future draws.
  const counts=countChars(chars);for(const length of LENGTHS){let nearest=0;for(const entry of dictionary().entries){if(Array.from(entry.reading).length!==length)continue;const copy=new Map(counts);let matches=0;for(const char of Array.from(entry.reading)){const count=copy.get(char)||0;if(count){matches++;copy.set(char,count-1);}}nearest=Math.max(nearest,matches/length);}value+=nearest*8;}
  if(this._qualityCache.size>300)this._qualityCache.clear();this._qualityCache.set(signature,value);return value;
 }
 getCpuProgress(){if(this.state.mode==='lost')return 3;const chars=this._chars(this.state.cpu);return typeof dictionary().partial==='function'?dictionary().partial(chars).length:Math.min(2,dictionary().findWords(chars).length);}
 draw(source='deck'){
  const s=this.state;if(!this._player())return this._fail('notYourTurn');if(s.phase!=='draw')return this._fail('alreadyDrawn');
  let tile;if(source==='discard'){const last=s.discards.at(-1);if(!last||last.by!=='cpu')return this._fail('noDiscard');tile=s.discards.pop().tile;}
  else if(source==='deck'){if(!s.deck.length){if(s.discards.at(-1)?.by==='cpu')return this._fail('emptyDeck');return this._end('draw');}tile=s.deck.shift();}
  else return this._fail('source');
  s.hand.push(tile);s.selected=[];s.phase='arrange';return this._ok('drawn',{char:tile.char,tileId:tile.id});
 }
 select(id){const s=this.state;if(!this._player())return this._fail('notYourTurn');if(!integer(id,1,1000000)||!s.hand.some(tile=>tile.id===id))return this._fail('tile');const at=s.selected.indexOf(id);if(at>=0)s.selected.splice(at,1);else{if(s.selected.length>=4)return this._fail('tooMany');s.selected.push(id);}return this._ok('select');}
 clearSelection(){if(!this._player())return this._fail('notYourTurn');this.state.selected=[];return this._ok('cleared');}
 sortHand(){if(!this._player())return this._fail('notYourTurn');this.state.hand.sort((a,b)=>a.char.localeCompare(b.char,'ja')||a.id-b.id);return this._ok('sorted');}
 placeSelected(){
  const s=this.state;if(!this._player())return this._fail('notYourTurn');if(s.phase!=='arrange')return this._fail('needDraw');
  const selected=s.selected.map(id=>s.hand.find(tile=>tile.id===id));if(selected.some(tile=>!tile))return this._fail('tile');const word=selected.map(tile=>tile.char).join(''),length=selected.length;
  if(!LENGTHS.includes(length))return this._fail('length');if(!dictionary().lookup(word))return this._fail('unknownWord',{word});if(s.slots.some(slot=>slot.word===word))return this._fail('duplicateWord');
  const slot=s.slots.find(slot=>slot.length===length&&!slot.word);if(!slot)return this._fail('slotFilled');slot.word=word;slot.tiles=selected;s.hand=s.hand.filter(tile=>!s.selected.includes(tile.id));s.selected=[];return this._ok('placed',{word});
 }
 unlock(index){const s=this.state;if(!this._player())return this._fail('notYourTurn');if(!integer(index,0,2))return this._fail('slot');const slot=s.slots[index];if(!slot.word)return this._fail('emptySlot');const word=slot.word;s.hand.push(...slot.tiles);slot.word=null;slot.tiles=[];s.selected=[];return this._ok('unlocked',{word});}
 discardSelected(){
  const s=this.state;if(!this._player())return this._fail('notYourTurn');if(s.phase!=='arrange')return this._fail('needDraw');if(s.selected.length!==1)return this._fail('needOne');const index=s.hand.findIndex(tile=>tile.id===s.selected[0]);if(index<0)return this._fail('tile');const tile=s.hand.splice(index,1)[0];s.discards.push({tile,by:'player'});s.selected=[];s.phase='cpu';return this._ok('discarded',{char:tile.char});
 }
 finish(){const s=this.state;if(!this._player())return this._fail('notYourTurn');if(s.phase!=='arrange')return this._fail('needDraw');if(!s.slots.every(slot=>slot.word)||s.hand.length)return this._fail('incomplete');return this._end('won');}
 hint(){
  const s=this.state;if(!this._player())return this._fail('notYourTurn');if(s.phase!=='arrange')return this._fail('needDraw');if(s.hintsUsed>=MAX_HINTS)return this._fail('noHint',{reason:'limit'});
  const free=new Set(s.slots.filter(slot=>!slot.word).map(slot=>slot.length)),used=new Set(s.slots.filter(slot=>slot.word).map(slot=>slot.word));if(!free.size)return this._fail('noHint',{reason:'complete'});
  const full=this._findCompletion(s.hand),candidates=dictionary().findWords(this._chars(s.hand)).filter(entry=>free.has(Array.from(entry.reading).length)&&!used.has(entry.reading));const word=full?.[0]||candidates.sort((a,b)=>b.reading.length-a.reading.length||a.reading.localeCompare(b.reading,'ja'))[0]?.reading;
  if(!word)return this._fail('noHint',{reason:'none'});const available=[...s.hand],ids=[];for(const char of Array.from(word)){const index=available.findIndex(tile=>tile.char===char);if(index<0)return this._fail('noHint',{reason:'none'});ids.push(available.splice(index,1)[0].id);}s.hintsUsed++;s.selected=ids;return this._ok('hint',{word,tiles:ids,remaining:MAX_HINTS-s.hintsUsed});
 }
 cpuStep(){
  const s=this.state;if(s.mode!=='playing'||s.phase!=='cpu')return this._fail('notCpuTurn');
  if(s.kind==='practice'){s.turn++;s.phase='draw';return this._checkExhausted()||this._ok('cpuDiscarded');}
  const top=s.discards.at(-1),canTake=top?.by==='player';let take=false;
  if(canTake){const own=this._quality(s.cpu),withDiscard=[...s.cpu,top.tile];take=!!this._findCompletion(withDiscard,emptySlots())||s.difficulty!=='easy'&&this._quality(withDiscard)>own+80;}
  let tile;if(take||!s.deck.length&&canTake)tile=s.discards.pop().tile;else if(s.deck.length)tile=s.deck.shift();else return this._end('draw');s.cpu.push(tile);
  const solution=this._findCompletion(s.cpu,emptySlots());if(solution){s.cpuWords=solution;return this._end('lost');}
  let choices=this._shuffle(s.cpu.map((_,index)=>index));if(s.difficulty==='normal')choices=choices.slice(0,6);if(s.difficulty==='easy')choices=choices.slice(0,3);
  let best=choices[0],quality=-Infinity;for(const index of choices){const candidate=this._quality(s.cpu.filter((_,i)=>i!==index));if(candidate>quality){quality=candidate;best=index;}}
  const discarded=s.cpu.splice(best,1)[0];s.discards.push({tile:discarded,by:'cpu'});s.phase='draw';s.turn++;return this._checkExhausted()||this._ok('cpuDiscarded',{char:discarded.char});
 }
 _checkExhausted(){const s=this.state;if(s.deck.length)return null;const top=s.discards.at(-1);if(top?.by==='cpu'&&this._findCompletion([...s.hand,top.tile]))return null;return this._end('draw');}
 _end(mode){
  const s=this.state;if(s.mode!=='playing')return this._fail('finished');s.mode=mode;s.selected=[];s.stats.played=Math.min(1000000,s.stats.played+1);
  if(mode==='won'){s.score=Math.max(60,600-(s.turn-1)*25-s.hintsUsed*40+(s.kind==='duel'?s.difficulty==='hard'?120:s.difficulty==='normal'?60:0:0));s.stars=s.turn<=4&&s.hintsUsed===0?3:s.turn<=9&&s.hintsUsed<=1?2:1;s.stats.wins=Math.min(s.stats.played,s.stats.wins+1);s.stats.best=Math.max(s.stats.best,s.score);if(s.kind==='practice')s.stats.practiceStars[s.practiceIndex]=Math.max(s.stats.practiceStars[s.practiceIndex],s.stars);return this._ok('won',{words:s.slots.map(slot=>slot.word)});}
  if(mode==='draw')s.phase='draw';return this._ok(mode,{words:mode==='lost'?[...s.cpuWords]:[]});
 }
 newRound(kind=this.state.kind,difficulty=this.state.difficulty){
  if(!['duel','practice'].includes(kind)||!['easy','normal','hard'].includes(difficulty))return this._fail('settings');const old=this.state;let index=old.practiceIndex;
  if(kind==='practice'){if(old.kind==='practice'&&old.mode==='won')index=(index+1)%RECIPES.length;else if(old.kind!=='practice'){const first=old.stats.practiceStars.findIndex(stars=>stars===0);index=first<0?index:first;}}
  this._deal({kind,difficulty,round:Math.min(1000000,old.round+1),practiceIndex:index,stats:old.stats});return this._ok('newRound');
 }
 snapshot(){return{...clone(this.state),rng:this._seed,nextId:this._nextId};}
}
window.AsobiKotobaData=Object.freeze({lengths:Object.freeze([...LENGTHS]),practiceCount:RECIPES.length,practiceRecipes:Object.freeze(RECIPES.map(recipe=>Object.freeze([...recipe]))),deckSize:DECK_SIZE,maxHints:MAX_HINTS});
window.AsobiKotobaModel=AsobiKotobaModel;
})();
