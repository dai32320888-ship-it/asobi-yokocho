/* ttt — standalone mini-game. The loader invokes this on demand. */
(function() {
  'use strict';
  const registry = window.AsobiGameRunners || (window.AsobiGameRunners = Object.create(null));
registry['ttt']=function tttGame(root){
 root.innerHTML=`<div class="game-wrap"><div class="game-header"><div class="game-stat"><small>${tr('wins')}</small><strong id="ttt-wins">0</strong></div><div class="game-stat"><small>${tr('draws')}</small><strong id="ttt-draws">0</strong></div></div><div class="ttt-grid" id="ttt-grid" aria-label="マルバツゲーム"></div><div class="game-status" id="ttt-status">${tr('tttStart')}</div><div class="game-actions"><button class="game-button secondary" id="ttt-restart" type="button">${tr('newMatch')}</button></div></div>`;
 let board,turn,done,aiTimer=null,statusKey='tttStart';const storedWins=getStored('asobi:ttt-wins',0),storedDraws=getStored('asobi:ttt-draws',0);let wins=Number.isSafeInteger(storedWins)&&storedWins>=0?storedWins:0,draws=Number.isSafeInteger(storedDraws)&&storedDraws>=0?storedDraws:0;
 const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
 function outcome(b){for(const [a,c,d] of lines)if(b[a]&&b[a]===b[c]&&b[c]===b[d])return b[a];return b.every(Boolean)?'tie':null;}
 const grid=$('ttt-grid');grid.innerHTML=Array.from({length:9},(_,i)=>`<button type="button" data-ttt-index="${i}" class="ttt-cell"></button>`).join('');const buttons=[...grid.children];
 function render(){board.forEach((v,i)=>{const btn=buttons[i];btn.className='ttt-cell '+(v==='O'?'o':'');btn.setAttribute('aria-disabled',String(Boolean(v||done||!turn)));btn.setAttribute('aria-label',tr('tttCell',{number:i+1,value:v||tr('emptyCell')}));btn.textContent=v==='X'?'×':v==='O'?'○':'';});$('ttt-wins').textContent=wins;$('ttt-draws').textContent=draws;}
 function translate(){root.querySelectorAll('.game-stat small').forEach((el,i)=>el.textContent=tr(i?'draws':'wins'));grid.setAttribute('aria-label',tr('tttBoard'));$('ttt-restart').textContent=tr('newMatch');$('ttt-status').textContent=tr(statusKey);render();}
 function minimax(b,ai){const win=outcome(b);if(win==='O')return {score:10};if(win==='X')return {score:-10};if(win==='tie')return {score:0};let best={score:ai?-Infinity:Infinity,index:null};for(let i=0;i<9;i++){if(b[i])continue;b[i]=ai?'O':'X';const score=minimax(b,!ai).score;b[i]='';if(ai?score>best.score:score<best.score)best={score,index:i};}return best;}
 function finish(){const result=outcome(board);if(!result)return false;done=true;clearTimeout(aiTimer);if(result==='X'){wins++;putStored('asobi:ttt-wins',wins);saveRecord('ttt',wins);statusKey='youWin';toast(tr('victory'));}else if(result==='O')statusKey='aiWin';else{draws++;putStored('asobi:ttt-draws',draws);statusKey='tie';}translate();return true;}
 function aiMove(){if(done)return;const free=board.map((v,i)=>v?null:i).filter(v=>v!==null);if(!free.length)return;const pos=Math.random()<.62?minimax([...board],true).index:free[Math.floor(Math.random()*free.length)];board[pos]='O';turn=true;if(!finish()){statusKey='yourTurn';translate();}}
 function playerMove(i){if(done||!turn||!Number.isInteger(i)||i<0||i>8||board[i])return;board[i]='X';turn=false;render();if(!finish()){statusKey='thinking';translate();aiTimer=setTimeout(aiMove,380);}}
 function reset(){clearTimeout(aiTimer);board=Array(9).fill('');done=false;turn=true;statusKey='tttStart';translate();}
 grid.addEventListener('click',e=>{const el=e.target.closest('[data-ttt-index]');if(el)playerMove(Number(el.dataset.tttIndex))});$('ttt-restart').addEventListener('click',reset);$('ttt-status').setAttribute('role','status');const cleanup=()=>clearTimeout(aiTimer);cleanup.retranslate=translate;reset();return cleanup;
};
})();
