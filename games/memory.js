/* memory — standalone mini-game. The loader invokes this on demand. */
(function() {
  'use strict';
  const registry = window.AsobiGameRunners || (window.AsobiGameRunners = Object.create(null));
registry['memory']=function memoryGame(root){
 root.innerHTML=`<div class="game-wrap"><div class="game-header"><div class="game-stat"><small>${tr('moves')}</small><strong id="memory-moves">0</strong></div><div class="game-stat"><small>${tr('pairs')}</small><strong id="memory-pairs">0/8</strong></div></div><div class="memory-grid" id="memory-grid" aria-label="絵合わせカード"></div><div class="game-status" id="memory-status">${tr('flip')}</div><div class="game-actions"><button class="game-button secondary" type="button" id="memory-reset">${tr('shuffle')}</button></div></div>`;
 let cards,flipped=[],locked=false,moves=0,pairs=0,hideTimer=null;
 const icons=['🍋','🦄','🌈','🚀','🎧','🐸','🍕','💎'];
 const grid=$('memory-grid');grid.innerHTML=Array.from({length:16},(_,i)=>`<button type="button" class="memory-card" data-memory-index="${i}"></button>`).join('');const buttons=[...grid.children];
 function draw(){cards.forEach((c,i)=>{const btn=buttons[i];btn.className='memory-card '+(c.matched?'matched':c.open?'open':'');btn.setAttribute('aria-label',tr(c.open||c.matched?'revealedCard':'hiddenCard',{number:i+1,icon:c.icon}));btn.setAttribute('aria-disabled',String(c.matched));btn.setAttribute('aria-pressed',String(c.open||c.matched));btn.textContent=c.open||c.matched?c.icon:'✦';});$('memory-moves').textContent=moves;$('memory-pairs').textContent=pairs+'/8';}
 function translate(){root.querySelectorAll('.game-stat small').forEach((el,i)=>el.textContent=tr(i?'pairs':'moves'));grid.setAttribute('aria-label',tr('memoryBoard'));$('memory-reset').textContent=tr('shuffle');$('memory-status').textContent=tr(pairs===8?'allMatched':'flip',{moves});draw();}
 function reset(){clearTimeout(hideTimer);const shuffled=[...icons,...icons];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}cards=shuffled.map(icon=>({icon,open:false,matched:false}));flipped=[];locked=false;moves=0;pairs=0;translate();}
 function pick(i){if(locked||!cards[i]||cards[i].matched||cards[i].open)return;cards[i].open=true;flipped.push(i);draw();if(flipped.length===2){moves++;const [a,b]=flipped;if(cards[a].icon===cards[b].icon){cards[a].matched=cards[b].matched=true;flipped=[];pairs++;draw();if(pairs===8){$('memory-status').textContent=tr('allMatched',{moves});saveRecord('memory',moves);toast(tr('completed'));}}else{locked=true;draw();hideTimer=setTimeout(()=>{cards[a].open=cards[b].open=false;flipped=[];locked=false;draw()},820);}}}
 grid.addEventListener('click',e=>{const btn=e.target.closest('[data-memory-index]');if(btn)pick(Number(btn.dataset.memoryIndex))});$('memory-reset').addEventListener('click',reset);$('memory-status').setAttribute('role','status');const cleanup=()=>clearTimeout(hideTimer);cleanup.retranslate=translate;reset();return cleanup;
};
})();
