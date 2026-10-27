/* shop — standalone mini-game. The loader invokes this on demand. */
(function() {
  'use strict';
  const registry = window.AsobiGameRunners || (window.AsobiGameRunners = Object.create(null));
registry['shop']=function shopGame(root){
 root.innerHTML=`<div class="game-wrap"><div class="shop-summary"><div><div class="eyebrow">${tr('yourCafe')}</div><div class="coin-num" id="shop-coins">🪙 0</div></div><div class="shop-persec" id="shop-speed">毎秒 +0</div></div><div class="shop-scene"><span class="shop-tap">${tr('tapSell')}</span><button class="big-cookie" type="button" id="shop-click" aria-label="コーヒーを販売">☕</button></div><div class="shop-upgrades" id="shop-upgrades"></div><div class="game-status" id="shop-status">${tr('shopReady')}</div><div class="game-actions"><button class="game-button secondary" type="button" id="shop-reset">${tr('resetShop')}</button></div></div>`;
 let state=getStored('asobi:shop',{coins:0,total:0,levels:[0,0,0]});
 const limit=Number.MAX_SAFE_INTEGER;
 if(!state||typeof state!=='object'||!Number.isFinite(state.coins)||state.coins<0||state.coins>limit||!Number.isFinite(state.total)||state.total<state.coins||state.total>limit||!Array.isArray(state.levels)||state.levels.length!==3||!state.levels.every(level=>Number.isSafeInteger(level)&&level>=0&&level<=1000))state={coins:0,total:0,levels:[0,0,0]};
 const upgrades=[{name:'recipe',desc:'recipeDesc',base:15,growth:1.6},{name:'staff',desc:'staffDesc',base:80,growth:1.65},{name:'kitchen',desc:'kitchenDesc',base:560,growth:1.75}];
 const price=i=>Math.min(limit,Math.floor(upgrades[i].base*Math.pow(upgrades[i].growth,state.levels[i])));
 const rate=()=>state.levels[1]*2+state.levels[2]*15;
 const fmt=n=>Math.floor(n).toLocaleString(document.documentElement.lang||'ja');
 const grid=$('shop-upgrades');grid.innerHTML=upgrades.map((u,i)=>`<button type="button" class="shop-upgrade" data-upgrade="${i}"><span><strong><span class="upgrade-name"></span> <span class="upgrade-level" style="color:#d6fe7b"></span></strong><small></small></span><span class="price"></span></button>`).join('');const buttons=[...grid.children];
 function persist(){putStored('asobi:shop',state);saveRecord('shop',Math.floor(state.total));}
 function render(){ $('shop-coins').textContent='🪙 '+fmt(state.coins);$('shop-speed').textContent=tr('perSecond',{score:fmt(rate())});upgrades.forEach((u,i)=>{const btn=buttons[i];btn.setAttribute('aria-disabled',String(state.coins<price(i)||state.levels[i]>=1000));btn.querySelector('.upgrade-name').textContent=tr(u.name);btn.querySelector('.upgrade-level').textContent=tr('level',{number:fmt(state.levels[i])});btn.querySelector('small').textContent=tr(u.desc);btn.querySelector('.price').textContent='🪙 '+fmt(price(i));});}
 function translate(){root.querySelector('.shop-summary .eyebrow').textContent=tr('yourCafe');root.querySelector('.shop-tap').textContent=tr('tapSell');$('shop-click').setAttribute('aria-label',tr('sellCoffee'));$('shop-status').textContent=tr('shopReady');$('shop-reset').textContent=tr('resetShop');render();}
 function earn(amount){state.coins=Math.min(limit,state.coins+amount);state.total=Math.min(limit,state.total+amount);persist();render();}
 $('shop-click').addEventListener('click',()=>earn(1+state.levels[0]));
 $('shop-upgrades').addEventListener('click',e=>{const el=e.target.closest('[data-upgrade]');if(!el)return;const i=Number(el.dataset.upgrade);if(!Number.isInteger(i)||i<0||i>=upgrades.length||state.levels[i]>=1000||state.coins<price(i))return;state.coins-=price(i);state.levels[i]++;persist();render();toast(tr('upgradeDone'));});
 $('shop-reset').addEventListener('click',()=>{if(!window.confirm(tr('resetConfirm')))return;state={coins:0,total:0,levels:[0,0,0]};persist();render()});
 const interval=setInterval(()=>{const amount=rate();if(amount)earn(amount)},1000);$('shop-status').setAttribute('role','status');const cleanup=()=>{clearInterval(interval);persist();};cleanup.retranslate=translate;persist();translate();return cleanup;
};
})();
