'use strict';
/* Catalog entries can declare small, validated renderer dependencies. */
const loadedRunners = new Map(), loadedGameScripts = new Map();
let routeSerial = 0;
function loadGameScript(id){
 if(!/^[a-z0-9-]+$/.test(id))return Promise.reject(new Error('Invalid game dependency'));
 if(loadedGameScripts.has(id))return loadedGameScripts.get(id);
 const promise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='games/'+encodeURIComponent(id)+'.js';
  script.onload=()=>resolve();script.onerror=()=>{script.remove();reject(new Error('Game script not found: '+id));};
  document.head.append(script);
 });
 loadedGameScripts.set(id,promise);promise.catch(()=>loadedGameScripts.delete(id));return promise;
}
function loadGameRunner(id) {
 const game=GAMES.find(game=>game.id===id);if(!game)return Promise.reject(new Error('Unknown game: '+id));
 const present=window.AsobiGameRunners?.[id];if(typeof present==='function')return Promise.resolve(present);
 if(loadedRunners.has(id))return loadedRunners.get(id);
 const promise=(async()=>{
  for(const dependency of game.scripts||[])await loadGameScript(dependency);
  await loadGameScript(id);
  const runner=window.AsobiGameRunners?.[id];
  if(typeof runner!=='function'){loadedGameScripts.delete(id);throw new Error('Game registration missing: '+id);}
  return runner;
 })();
 loadedRunners.set(id,promise);promise.catch(()=>loadedRunners.delete(id));return promise;
}
const $=id=>document.getElementById(id);
const getStored=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)}catch{return fallback}};
const putStored=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{/* private or restricted mode */}};
// Treat saved browser data as input: older versions, extensions or interrupted
// writes can leave valid JSON with an unexpected shape.
const isDataObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>0&&value<=Number.MAX_SAFE_INTEGER;
const cleanName=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,16):'';
function storedGameNumbers(key,predicate){
 const raw=getStored(key,{}),result=Object.create(null);
 if(isDataObject(raw))for(const game of GAMES)if(Object.hasOwn(raw,game.id)&&predicate(raw[game.id]))result[game.id]=raw[game.id];
 return result;
}
const records=storedGameNumbers('asobi:records',validScore);
const rawFavorites=getStored('asobi:favorites',[]);
const favorites=new Set(Array.isArray(rawFavorites)?rawFavorites.filter(id=>typeof id==='string'&&GAMES.some(game=>game.id===id)):[]);
const playCounts=storedGameNumbers('asobi:plays',value=>Number.isSafeInteger(value)&&value>=0);
function storedScores(){
 const raw=getStored('asobi:leaderboard',{}),result=Object.create(null);
 if(!isDataObject(raw))return result;
 for(const game of GAMES){
  if(!Object.hasOwn(raw,game.id)||!Array.isArray(raw[game.id]))continue;
  const byName=new Map();
  for(const entry of raw[game.id]){
   if(!isDataObject(entry)||!validScore(entry.score))continue;
   const name=cleanName(entry.name);if(!name)continue;
   const prior=byName.get(name);
   if(prior===undefined||(game.kind==='min'?entry.score<prior:entry.score>prior))byName.set(name,entry.score);
  }
  result[game.id]=[...byName].map(([name,score])=>({name,score})).sort((a,b)=>game.kind==='min'?a.score-b.score:b.score-a.score).slice(0,20);
 }
 return result;
}
const scores=storedScores();
const savedLang=getStored('asobi:lang','ja');
let currentLang=typeof savedLang==='string'&&Object.hasOwn(I18N,savedLang)?savedLang:'ja';
let nickname=cleanName(getStored('asobi:nickname','ゲスト'))||'ゲスト';
let currentCategory='すべて',showFavorites=false,currentGameId=null,gameCleanup=()=>{},toastTimer,rankTab='top';
const tr=(key,vars={})=>{
 let phrase=(I18N[currentLang]&&I18N[currentLang][key])??I18N.ja[key]??key;
 return Object.entries(vars).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',v),phrase);
};
const categoryLabel=(name)=>tr(CATKEYS[name]||'catAll');
const gameLabel=(game,field)=>{let ix=['name','desc','hint','duration'].indexOf(field);return ix>=0?(GAME_I18N[currentLang]?.[game.id]?.[ix]||game[field]):game[field]};
const clean=(text)=>String(text).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const nfmt=n=>Number(n).toLocaleString(currentLang==='zh'?'zh-CN':currentLang==='ko'?'ko-KR':currentLang==='es'?'es-ES':currentLang==='en'?'en-US':'ja-JP');
const scoreText=(g,value)=>nfmt(value)+(currentLang==='ja'?g.unit:'');
const recordText=(game)=>records[game.id]===undefined?tr('bestNone'):scoreText(game,records[game.id]);
const scoreIsBetter=(game,a,b)=>b===undefined||(game.kind==='min'?a<b:a>b);
function saveRecord(id,value){
 const game=GAMES.find(g=>g.id===id);if(!game||!validScore(value))return;
 const old=records[id];
 if(scoreIsBetter(game,value,old)){records[id]=value;putStored('asobi:records',records);if(currentGameId===id)$('best-display').textContent=recordText(game)}
 if(!Array.isArray(scores[id]))scores[id]=[];
 const entry=scores[id].find(e=>e.name===nickname);
 if(!entry){scores[id].push({name:nickname,score:value})}
 else if(scoreIsBetter(game,value,entry.score))entry.score=value;
 scores[id].sort((a,b)=>game.kind==='min'?a.score-b.score:b.score-a.score);
 scores[id]=scores[id].slice(0,20);
 putStored('asobi:leaderboard',scores);
 if(currentGameId===id)renderGameLeaderboard(game);
}
function resetLocalGame(id,progressKey,progress){
 const game=GAMES.find(g=>g.id===id);if(!game)return false;
 const nextRecords={...records},nextScores={...scores};delete nextRecords[id];delete nextScores[id];
 const updates=[['asobi:records',JSON.stringify(nextRecords)],['asobi:leaderboard',JSON.stringify(nextScores)],[progressKey,JSON.stringify(progress)]];
 let previous=[],written=0;
 try{
  previous=updates.map(([key])=>localStorage.getItem(key));
  for(const [key,value]of updates){localStorage.setItem(key,value);written++;}
 }catch{
  // Each individual storage write is atomic. Restore completed writes before
  // reporting failure; the visible run and its in-memory records stay intact.
  for(let index=written-1;index>=0;index--){try{const key=updates[index][0];if(previous[index]===null)localStorage.removeItem(key);else localStorage.setItem(key,previous[index]);}catch{/* The browser may have disabled all storage. */}}
  return false;
 }
 delete records[id];delete scores[id];
 if(currentGameId===id){$('best-display').textContent=recordText(game);renderGameLeaderboard(game);}
 renderGallery();renderRecommended();
 return true;
}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),1800)}
function navButton(category,emoji){return `<button type="button" class="${currentCategory===category?'active':''}" data-category="${category}" aria-pressed="${currentCategory===category}"><span class="nav-icon">${emoji}</span><span>${categoryLabel(category)}</span></button>`}
function renderNav(){
 $('side-nav').innerHTML=CATEGORIES.map(([label,emoji])=>navButton(label,emoji)).join('');
 $('category-tabs').innerHTML=CATEGORIES.map(([label,emoji])=>`<button type="button" class="${currentCategory===label?'active':''}" data-category="${label}" aria-pressed="${currentCategory===label}">${emoji} ${categoryLabel(label)}</button>`).join('');
 $('genre-grid').innerHTML=CATEGORIES.filter(([c])=>c!=='すべて').map(([c,emoji])=>`<button type="button" class="genre-card ${currentCategory===c?'active':''}" data-category="${c}" aria-pressed="${currentCategory===c}"><span class="genre-emoji">${emoji}</span><span>${categoryLabel(c)}</span></button>`).join('');
}
function favoriteButton(game){const active=favorites.has(game.id);return `<button class="favorite-btn ${active?'active':''}" type="button" data-favorite="${game.id}" aria-label="${gameLabel(game,'name')} — ${tr(active?'favRemove':'favAdd')}" aria-pressed="${active}">${active?'♥':'♡'}</button>`}
function cardMarkup(game){
 return `<article class="game-card"><div class="card-cover cover-${game.id}"><span class="cover-tag">${categoryLabel(game.category)}</span><span class="cover-icon" aria-hidden="true"><img src="assets/game-${game.id}.svg" alt="" loading="lazy"></span></div>${favoriteButton(game)}<div class="card-text"><h3>${gameLabel(game,'name')}</h3><p>${gameLabel(game,'desc')}</p><div class="card-bottom"><span>⏱ ${gameLabel(game,'duration')}</span><span class="play-label">${tr('play')}</span></div></div><button type="button" class="card-open" data-open="${game.id}" aria-label="${gameLabel(game,'name')} — ${tr('play')}">${tr('play')}</button></article>`;
}
function recommendedMarkup(game,i){const small=i>0;return `<article class="recommend-card ${small?'recommend-small':'recommend-main'} cover-${game.id}">
  <div class="recommend-glow" aria-hidden="true"><img src="assets/game-${game.id}.svg" alt=""></div>
  <div class="recommend-copy"><span class="recommend-pill">${i===0?'🔥 #1':i===1?'⚡ #2':'✨ #3'}</span><h3>${gameLabel(game,'name')}</h3><p>${gameLabel(game,'desc')}</p><button type="button" class="recommend-play" data-open="${game.id}">${tr('playNow')}</button></div>
  ${favoriteButton(game)}<button class="recommend-hit" type="button" data-open="${game.id}" aria-label="${gameLabel(game,'name')} — ${tr('play')}">${tr('play')}</button></article>`;}
function renderRecommended(){
 const picks=EDITOR_PICKS.slice(0,3).map(id=>GAMES.find(g=>g.id===id));
 $('recommended-grid').innerHTML=picks.map(recommendedMarkup).join('');
}
function renderGallery(){
 const query=$('game-search').value.trim().toLowerCase();
 const filtered=GAMES.filter(g=>(currentCategory==='すべて'||g.category===currentCategory)&&(!showFavorites||favorites.has(g.id))&&(!query||(g.name+' '+gameLabel(g,'name')+' '+gameLabel(g,'desc')+' '+categoryLabel(g.category)).toLowerCase().includes(query)));
 $('game-grid').innerHTML=filtered.map(cardMarkup).join('');
 $('game-count').textContent=filtered.length;
 $('empty-results').classList.toggle('hidden',filtered.length>0);
 $('favorites-toggle').classList.toggle('active',showFavorites);
 $('favorites-toggle').setAttribute('aria-pressed',String(showFavorites));
 $('favorites-toggle').querySelector('span:first-child').textContent=showFavorites?'♥':'♡';
 renderNav();
}
function renderRanking(){
 const list=rankTab==='top'?EDITOR_PICKS.map(id=>GAMES.find(g=>g.id===id)):[...GAMES].filter(g=>Number(playCounts[g.id])>0).sort((a,b)=>(playCounts[b.id]||0)-(playCounts[a.id]||0));
 $('ranking-list').innerHTML=list.length?list.map((g,i)=>`<div class="ranking-row"><span class="rank-number ${i<3?'rank-top':''}">${i+1}</span><span class="rank-cover cover-${g.id}">${g.icon}</span><div class="rank-copy"><strong>${gameLabel(g,'name')}</strong><small>${rankTab==='top'?categoryLabel(g.category):`${nfmt(playCounts[g.id]||0)} ${tr('times')}`}</small></div><button type="button" class="rank-play" data-open="${g.id}">${tr('rankOpen')}</button></div>`).join(''):`<p class="no-rank">${tr('rankNoPlays')}</p>`;
 $('ranking-note').textContent=tr(rankTab==='top'?'editorNote':'personalNote');
 document.querySelectorAll('[data-rank-tab]').forEach(b=>{const active=b.dataset.rankTab===rankTab;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}
function renderGameLeaderboard(game){
 if(!game)return;const list=Array.isArray(scores[game.id])?scores[game.id]:[];
 $('game-leaderboard').innerHTML=list.length?`<ol class="score-table">${list.slice(0,10).map((entry,i)=>`<li><span class="score-position">${i+1}</span><span class="score-player">${clean(entry.name)}</span><strong>${scoreText(game,entry.score)}</strong></li>`).join('')}</ol>`:`<p class="no-rank">${tr('noScores')}</p>`;
}
function syncFavorites(){
 document.querySelectorAll('[data-favorite]').forEach(b=>{const g=GAMES.find(x=>x.id===b.dataset.favorite);if(!g)return;const yes=favorites.has(g.id);b.textContent=yes?'♥':'♡';b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));b.setAttribute('aria-label',`${gameLabel(g,'name')} — ${tr(yes?'favRemove':'favAdd')}`)});
}
function toggleFavorite(id){
 if(!GAMES.some(g=>g.id===id))return;
 let added=!favorites.has(id);if(added)favorites.add(id);else favorites.delete(id);
 putStored('asobi:favorites',[...favorites]);
 syncFavorites();
 if(currentGameId===null){renderGallery();renderRecommended()}
 toast(tr(added?'heartAdded':'heartRemoved'));
}
function translateUI(){
 document.documentElement.lang=currentLang==='zh'?'zh-CN':currentLang;
 document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=tr(el.dataset.i18n));
 $('game-search').placeholder=tr('search');$('game-search').setAttribute('aria-label',tr('search'));
 $('language-select').value=currentLang;
 $('language-select').setAttribute('aria-label',tr('language'));
 $('favorites-toggle').setAttribute('aria-label',tr('favorites'));
 // openGame sets the name; translating must preserve even an empty edit.
 renderGallery();renderRecommended();renderRanking();
 if(currentGameId){
  renderGameShell(GAMES.find(game=>game.id===currentGameId));
  const pending=$('game-pane').querySelector('[data-game-state]');
  if(pending)pending.textContent=(pending.dataset.gameState==='gameLoading'?'🎮 ':'⚠️ ')+tr(pending.dataset.gameState);
  if(typeof gameCleanup.retranslate==='function')gameCleanup.retranslate();
 }
}
function showHome(){
 ++routeSerial;gameCleanup();gameCleanup=()=>{};currentGameId=null;
 $('game-screen').classList.add('hidden');$('home-screen').classList.remove('hidden');
 renderGallery();renderRanking();document.title='あそび横丁 | FREE ARCADE';
}
function openGame(id,countPlay=true){
 ++routeSerial;const game=GAMES.find(g=>g.id===id);if(!game){location.hash='#home';return}
 if(countPlay){playCounts[id]=Math.min(Number.MAX_SAFE_INTEGER,(playCounts[id]||0)+1);putStored('asobi:plays',playCounts)}
 gameCleanup();gameCleanup=()=>{};currentGameId=game.id;
 $('home-screen').classList.add('hidden');$('game-screen').classList.remove('hidden');
 renderGameShell(game);
 $('nickname').value=nickname;
 $('game-pane').innerHTML=`<div class="game-loading" data-game-state="gameLoading" role="status" aria-live="polite">🎮 ${tr('gameLoading')}</div>`;
 const expectedRoute=routeSerial;
 loadGameRunner(id).then(runner=>{
  if(expectedRoute!==routeSerial || currentGameId!==id) return;
  $('game-pane').replaceChildren();
  gameCleanup = runner($('game-pane')) || (()=>{});
 }).catch(error=>{
  if(expectedRoute!==routeSerial || currentGameId!==id) return;
  console.error('Game failed to load:',id,error);
  $('game-pane').innerHTML=`<div class="game-loading" data-game-state="gameLoadError" role="alert">⚠️ ${tr('gameLoadError')}</div>`;
 });
 window.scrollTo({top:0,behavior:'auto'});
}
// Translates the surrounding page without reconstructing the active game.
// A runner can attach retranslate() to its cleanup function for in-game copy.
function renderGameShell(game){
 if(!game)return;
 $('game-category').textContent=categoryLabel(game.category).toUpperCase()+' / FREE GAME';
 $('game-title').textContent=game.icon+' '+gameLabel(game,'name');
 $('game-description').textContent=gameLabel(game,'desc');
 $('best-display').textContent=recordText(game);
 $('game-hint').textContent=tr('howTo')+gameLabel(game,'hint');
 $('game-favorite').dataset.favorite=game.id;
 $('more-game-grid').innerHTML=EDITOR_PICKS.filter(x=>x!==game.id).slice(0,3).map(oid=>cardMarkup(GAMES.find(g=>g.id===oid))).join('');
 syncFavorites();document.title=gameLabel(game,'name')+' | あそび横丁';
 renderGameLeaderboard(game);
}
function route(){
 let hash='';try{hash=decodeURIComponent(location.hash.replace(/^#/,''));}catch{/* A malformed shared URL falls back to the game library. */}
 if(hash.startsWith('game/')){const id=hash.slice(5);openGame(id,id!==currentGameId);}
 else{showHome();if(hash==='ranking')requestAnimationFrame(()=>$('ranking').scrollIntoView({block:'start',behavior:'smooth'}));else if(hash==='games')requestAnimationFrame(()=>$('games').scrollIntoView({block:'start',behavior:'smooth'}));else if(hash==='home')window.scrollTo({top:0,behavior:'auto'});}
}
document.addEventListener('click',e=>{
 const favorite=e.target.closest('[data-favorite]');if(favorite){toggleFavorite(favorite.dataset.favorite);return;}
 const play=e.target.closest('[data-open]');if(play){const hash='#game/'+play.dataset.open;if(location.hash===hash)openGame(play.dataset.open,true);else location.hash=hash;return;}
 const category=e.target.closest('[data-category]');if(category){currentCategory=category.dataset.category;showFavorites=false;if(currentGameId)location.hash='#games';else {renderGallery();$('games').scrollIntoView({block:'start',behavior:'smooth'});}return;}
 const rank=e.target.closest('[data-rank-tab]');if(rank){rankTab=rank.dataset.rankTab;renderRanking();return;}
});
$('game-search').addEventListener('input',()=>{if(currentGameId)location.hash='#games';renderGallery()});
function toggleFavoritesView(){showFavorites=!showFavorites;currentCategory='すべて';if(currentGameId)location.hash='#games';else{renderGallery();$('games').scrollIntoView({block:'start',behavior:'smooth'});}}
$('favorites-toggle').addEventListener('click',toggleFavoritesView);
$('side-favorites').addEventListener('click',toggleFavoritesView);
$('language-select').addEventListener('change',e=>{
 const lang=e.target.value;if(!Object.hasOwn(I18N,lang))return;currentLang=lang;putStored('asobi:lang',lang);
 translateUI();
});
$('nickname-form').addEventListener('submit',e=>{e.preventDefault();nickname=cleanName($('nickname').value)||'ゲスト';putStored('asobi:nickname',nickname);$('nickname').value=nickname;toast(tr('nameSaved'))});
window.addEventListener('hashchange',route);
translateUI();route();

