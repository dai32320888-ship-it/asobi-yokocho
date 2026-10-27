/* 2048 Atelier: classic arithmetic, ceramic tiles and one deliberate second chance. */
(function () {
  'use strict';
  const COPY={
    ja:{score:'スコア',best:'自己ベスト',tile:'最大タイル',moves:'手数',newGame:'新しいゲーム',undo:'1手もどす',undoUsed:'もどす：使用済み',undoHint:'もどせるのは1ゲームに1回。',goal:'目標 2048',intro:'同じ数字を重ねて、ひとつ上の数字へ。',hint:'矢印 / WASD・スワイプ・方向ボタン。Zで1手もどす。',chain:'連続マージ ×{number}',merge:'{number}組をマージ！',moved:'すき間をつくろう。次の一手がカギ。',gain:'+{number}',won:'2048、完成。',wonCopy:'ひとつの目標を達成！ さらに大きい数字を目指せるよ。',over:'ひと休み、また挑戦。',overCopy:'動かせるマスがなくなったよ。1手もどすか、新しく始めよう。',continue:'さらに続ける',again:'もう一度',empty:'空きマス',board:'2048の陶器タイル盤',cell:'{row}行 {col}列：{value}',restored:'1手前に戻ったよ。次の道を探そう。',up:'上',down:'下',left:'左',right:'右'},
    en:{score:'Score',best:'Personal best',tile:'Top tile',moves:'Moves',newGame:'New game',undo:'Undo once',undoUsed:'Undo used',undoHint:'One undo is available in each game.',goal:'GOAL 2048',intro:'Slide equal numbers together. Build something bigger.',hint:'Arrows / WASD, swipe or direction buttons. Z to undo once.',chain:'Merge chain ×{number}',merge:'{number} pairs merged!',moved:'Make some space. Your next move matters.',gain:'+{number}',won:'2048. Beautifully made.',wonCopy:'One milestone reached. Keep building to see how far you can go.',over:'A moment to start fresh.',overCopy:'No moves remain. Use your undo or begin a new board.',continue:'Keep going',again:'Play again',empty:'Empty cell',board:'2048 ceramic tile board',cell:'Row {row}, column {col}: {value}',restored:'One move restored. Try a different direction.',up:'Up',down:'Down',left:'Left',right:'Right'},
    ko:{score:'점수',best:'최고 기록',tile:'최대 타일',moves:'이동 횟수',newGame:'새 게임',undo:'한 번 되돌리기',undoUsed:'되돌리기 사용함',undoHint:'게임당 한 번만 되돌릴 수 있어요.',goal:'목표 2048',intro:'같은 숫자를 합쳐 더 큰 숫자를 만드세요.',hint:'방향키 / WASD, 스와이프 또는 화면 버튼. Z로 한 번 되돌리기.',chain:'연속 합치기 ×{number}',merge:'{number}쌍을 합쳤어요!',moved:'빈 공간을 만드세요. 다음 한 수가 중요해요.',gain:'+{number}',won:'2048, 완성!',wonCopy:'목표를 달성했어요. 더 큰 숫자에 도전해 보세요.',over:'잠깐 쉬고 다시 도전',overCopy:'움직일 수 있는 칸이 없어요. 되돌리거나 새로 시작하세요.',continue:'계속하기',again:'다시 하기',empty:'빈 칸',board:'2048 도자기 타일판',cell:'{row}행 {col}열: {value}',restored:'한 수 전으로 돌아왔어요. 다른 길을 찾아보세요.',up:'위',down:'아래',left:'왼쪽',right:'오른쪽'},
    zh:{score:'分数',best:'最佳成绩',tile:'最大数字',moves:'步数',newGame:'新游戏',undo:'撤回一步',undoUsed:'已用撤回',undoHint:'每局可以撤回一次。',goal:'目标 2048',intro:'滑动并合并相同数字，创造更大的数字。',hint:'方向键 / WASD、滑动或屏幕按钮。Z键撤回一次。',chain:'连续合并 ×{number}',merge:'合并了{number}对！',moved:'留出空格，下一步很重要。',gain:'+{number}',won:'2048，完成。',wonCopy:'目标已经达成，还可以继续挑战更大的数字。',over:'休息一下，再挑战。',overCopy:'已经没有可移动的格子。撤回一步或重新开始吧。',continue:'继续挑战',again:'再玩一次',empty:'空格',board:'2048陶瓷数字棋盘',cell:'第{row}行，第{col}列：{value}',restored:'已回到上一步，试试另一个方向。',up:'上',down:'下',left:'左',right:'右'},
    es:{score:'Puntos',best:'Tu récord',tile:'Ficha máxima',moves:'Movimientos',newGame:'Nueva partida',undo:'Deshacer una vez',undoUsed:'Deshacer usado',undoHint:'Puedes deshacer una vez por partida.',goal:'META 2048',intro:'Une números iguales. Construye algo cada vez mayor.',hint:'Flechas / WASD, desliza o usa botones. Z para deshacer una vez.',chain:'Cadena de uniones ×{number}',merge:'¡{number} parejas unidas!',moved:'Deja espacio. Tu próximo movimiento importa.',gain:'+{number}',won:'2048. Bien construido.',wonCopy:'Una meta conseguida. Sigue creando números aún mayores.',over:'Es hora de volver a empezar.',overCopy:'No quedan movimientos. Deshaz una vez o comienza otra partida.',continue:'Seguir jugando',again:'Otra partida',empty:'Casilla vacía',board:'Tablero de fichas cerámicas 2048',cell:'Fila {row}, columna {col}: {value}',restored:'Has vuelto un movimiento atrás. Prueba otra dirección.',up:'Arriba',down:'Abajo',left:'Izquierda',right:'Derecha'}
  };
  const registry=window.AsobiGameRunners||(window.AsobiGameRunners=Object.create(null));
  registry['2048']=function atelier2048(root){
    const lang=()=>typeof currentLang==='string'&&COPY[currentLang]?currentLang:'ja';
    const t=(key,vars={})=>Object.entries(vars).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',v),COPY[lang()][key]||COPY.en[key]||key);
    const trophy='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 7h18v12c0 8-18 8-18 0ZM15 10H8v7c0 5 4 7 8 7M33 10h7v7c0 5-4 7-8 7M24 25v11M16 40h16M19 36h10"/></svg>';
    root.innerHTML='<div class="game-wrap ay-trio ay-2048"><div class="ay-game-top"><span class="ay-engine-tag">2048 ATELIER</span><span class="ay-field-label" data-pz-text="goal"></span></div><div class="ay-hud"><div class="ay-metric featured relative"><span data-pz-text="score"></span><strong id="score-2048">0</strong><strong class="ay-score-gain" id="gain-2048" aria-hidden="true"></strong></div><div class="ay-metric"><span data-pz-text="best"></span><strong id="best-2048">0</strong></div><div class="ay-metric"><span data-pz-text="tile"></span><strong id="max-2048">2</strong></div><div class="ay-metric"><span data-pz-text="moves"></span><strong id="moves-2048">0</strong></div></div><div class="ay-board-shell"><div class="board-2048" id="board-2048" role="group"></div><div class="ay-overlay" id="overlay-2048" hidden><div class="ay-result-panel"><div class="ay-result-mark">'+trophy+'</div><h2 class="ay-result-title" id="title-2048"></h2><p class="ay-result-copy" id="copy-2048"></p><div class="ay-result-score" id="final-2048"></div><div class="ay-controlbar"><button class="ay-button primary" type="button" id="continue-2048"></button><button class="ay-button" type="button" id="overlay-undo-2048"></button><button class="ay-button" type="button" id="overlay-reset-2048" data-pz-text="again"></button></div></div></div></div><div class="ay-merge-feedback" id="feedback-2048" aria-hidden="true"></div><div class="ay-controlbar"><button type="button" class="ay-button primary" id="reset-2048" data-pz-text="newGame"></button><button type="button" class="ay-button" id="undo-2048"></button></div><div class="ay-direction-pad"><button type="button" class="ay-button up" data-move="up">↑</button><button type="button" class="ay-button left" data-move="left">←</button><button type="button" class="ay-button down" data-move="down">↓</button><button type="button" class="ay-button right" data-move="right">→</button></div><p class="ay-status" id="status-2048" role="status"></p><p class="ay-caption" data-pz-text="hint"></p><p class="ay-caption" data-pz-text="undoHint"></p></div>';
    const el=id=>root.querySelector('#'+id),grid=el('board-2048');
    grid.innerHTML=Array.from({length:16},(_,i)=>'<div class="tile" data-cell="'+i+'"></div>').join('');
    const slots=[...grid.children],controller=new AbortController(),signal=controller.signal;
    const on=(node,event,fn,options={})=>node.addEventListener(event,fn,{...options,signal});
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let board=[],score=0,moves=0,chain=0,lastMergeCount=0,won=false,continued=false,ended=false,undoUsed=false,snapshot=null,busy=false,busyTimer=0,feedback='intro',overlayVisible=false,overlayReturnFocus=null;
    grid.tabIndex=0;el('overlay-2048').setAttribute('role','group');el('overlay-2048').setAttribute('aria-labelledby','title-2048');el('overlay-2048').setAttribute('aria-describedby','copy-2048');
    const stored=getStored('asobi:records',{});let best=Number(stored&&stored['2048'])||0;if(!Number.isFinite(best)||best<0)best=0;
    function spawn(){const free=[];board.forEach((n,i)=>{if(!n)free.push(i);});if(!free.length)return -1;const i=free[Math.floor(Math.random()*free.length)];board[i]=Math.random()<.9?2:4;return i;}
    function possible(){if(board.includes(0))return true;for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(x<3&&board[y*4+x]===board[y*4+x+1]||y<3&&board[y*4+x]===board[(y+1)*4+x])return true;return false;}
    function overlay(){
      const visible=ended||won&&!continued,panel=el('overlay-2048'),active=document.activeElement,wasVisible=overlayVisible;
      if(visible&&!wasVisible)overlayReturnFocus=root.contains(active)&&!panel.contains(active)?active:null;
      panel.hidden=!visible;grid.inert=visible;
      el('title-2048').textContent=t(ended?'over':'won');el('copy-2048').textContent=t(ended?'overCopy':'wonCopy');el('final-2048').textContent=score.toLocaleString(document.documentElement.lang);
      el('continue-2048').hidden=ended;el('continue-2048').textContent=t('continue');el('overlay-undo-2048').hidden=undoUsed||!snapshot;el('overlay-undo-2048').textContent=t('undo');
      overlayVisible=visible;
      if(visible&&!wasVisible&&!document.hidden&&(root.contains(active)||active===document.body))el(ended?'overlay-reset-2048':'continue-2048').focus({preventScroll:true});
      else if(!visible&&wasVisible&&panel.contains(active)){
        const target=overlayReturnFocus&&overlayReturnFocus.isConnected&&!overlayReturnFocus.disabled?overlayReturnFocus:grid;
        target.focus({preventScroll:true});overlayReturnFocus=null;
      }
    }
    function updateHud(){
      el('score-2048').textContent=score.toLocaleString(document.documentElement.lang);el('best-2048').textContent=best.toLocaleString(document.documentElement.lang);el('max-2048').textContent=Math.max(...board);el('moves-2048').textContent=moves;
      el('undo-2048').textContent=t(undoUsed?'undoUsed':'undo');el('undo-2048').disabled=undoUsed||!snapshot;
      el('status-2048').textContent=t(ended?'overCopy':won&&!continued?'wonCopy':feedback,feedback==='merge'?{number:lastMergeCount}:{});
      el('feedback-2048').textContent=chain>1?t('chain',{number:chain}):feedback==='merge'?t('merge',{number:lastMergeCount}):t('intro');
      overlay();
    }
    function render(transitions=null,spawnIndex=-1){
      const rects=slots.map(node=>node.getBoundingClientRect());
      slots.forEach((slot,i)=>{
        const value=board[i];slot.setAttribute('aria-label',t('cell',{row:Math.floor(i/4)+1,col:i%4+1,value:value||t('empty')}));
        slot.dataset.value=String(value);slot.replaceChildren();if(!value)return;
        const block=document.createElement('span');block.className='ay-number-block'+(value>=1024?' high':'');block.dataset.value=String(value);block.textContent=String(value);slot.append(block);
        if(reduced||typeof block.animate!=='function')return;
        const transition=transitions&&transitions[i];
        if(transition){
          const origin=rects[transition.from[0]],destination=rects[i],dx=origin.left-destination.left,dy=origin.top-destination.top;
          const frames=transition.merged?[{transform:'translate('+dx+'px,'+dy+'px) scale(.98)'},{transform:'translate(0,0) scale(.98)',offset:.65},{transform:'translate(0,0) scale(1.12)',offset:.82},{transform:'translate(0,0) scale(1)'}]:[{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}];
          block.animate(frames,{duration:transition.merged?240:170,easing:'cubic-bezier(.2,.75,.3,1)'});
        }else if(i===spawnIndex){block.animate([{transform:'scale(.15)',opacity:0},{transform:'scale(1.08)',opacity:1,offset:.8},{transform:'scale(1)',opacity:1}],{duration:230,delay:80,easing:'ease-out',fill:'backwards'});}
      });
    }
    function translate(){
      root.querySelectorAll('[data-pz-text]').forEach(node=>node.textContent=t(node.dataset.pzText));root.querySelectorAll('[data-move]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.move)));grid.setAttribute('aria-label',t('board'));render();updateHud();
    }
    function reset(){
      clearTimeout(busyTimer);busy=false;board=Array(16).fill(0);score=0;moves=0;chain=0;lastMergeCount=0;won=false;continued=false;ended=false;undoUsed=false;snapshot=null;feedback='intro';spawn();spawn();render();updateHud();
    }
    function directionIndices(direction,line){const indices=[];for(let j=0;j<4;j++){if(direction==='left')indices.push(line*4+j);if(direction==='right')indices.push(line*4+3-j);if(direction==='up')indices.push(j*4+line);if(direction==='down')indices.push((3-j)*4+line);}return indices;}
    function move(direction){
      if(busy||ended||won&&!continued)return;
      const next=Array(16).fill(0),transitions={},before={board:[...board],score,moves,chain,lastMergeCount,won,continued,ended,feedback};
      let gain=0,mergeCount=0;
      for(let line=0;line<4;line++){
        const indices=directionIndices(direction,line),nonempty=indices.filter(i=>board[i]).map(i=>({value:board[i],index:i}));let out=0;
        for(let p=0;p<nonempty.length;p++){
          const item=nonempty[p],same=p+1<nonempty.length&&item.value===nonempty[p+1].value,destination=indices[out++];
          const value=same?item.value*2:item.value;next[destination]=value;transitions[destination]={from:same?[item.index,nonempty[p+1].index]:[item.index],merged:same};
          if(same){gain+=value;mergeCount++;p++;}
        }
      }
      if(next.every((n,i)=>n===board[i]))return;
      snapshot=before;board=next;score+=gain;moves++;chain=mergeCount?chain+1:0;lastMergeCount=mergeCount;feedback=mergeCount?'merge':'moved';
      const newIndex=spawn();if(Math.max(...board)>=2048)won=true;ended=!possible();best=Math.max(best,score);saveRecord('2048',score);
      render(transitions,newIndex);updateHud();
      if(gain){const popup=el('gain-2048');popup.classList.remove('show');void popup.offsetWidth;popup.textContent=t('gain',{number:gain});popup.classList.add('show');}
      busy=!reduced;clearTimeout(busyTimer);busyTimer=setTimeout(()=>{busy=false;},190);
    }
    function undo(){
      if(undoUsed||!snapshot)return;
      clearTimeout(busyTimer);busy=false;
      const previous=snapshot;board=[...previous.board];score=previous.score;moves=previous.moves;chain=previous.chain;lastMergeCount=previous.lastMergeCount;won=previous.won;continued=previous.continued;ended=previous.ended;feedback='restored';undoUsed=true;snapshot=null;
      render();updateHud();
    }
    function keyHandler(e){
      if(e.defaultPrevented||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey||e.isComposing||document.hidden||!root.isConnected||root.closest('.hidden'))return;
      const target=e.target instanceof Element?e.target:document.body;if(target.isContentEditable||target.closest('input,textarea,select,[contenteditable]')||target.closest('button,a')&&!root.contains(target))return;
      const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
      if(keys[e.key]){e.preventDefault();move(keys[e.key]);}else if(e.key==='z'){e.preventDefault();undo();}
    }
    on(document,'keydown',keyHandler);on(el('reset-2048'),'click',reset);on(el('overlay-reset-2048'),'click',reset);on(el('undo-2048'),'click',undo);on(el('overlay-undo-2048'),'click',undo);
    on(el('continue-2048'),'click',()=>{continued=true;feedback='intro';updateHud();});
    root.querySelectorAll('[data-move]').forEach(btn=>on(btn,'click',()=>move(btn.dataset.move)));
    let pointer=null;
    on(grid,'pointerdown',e=>{if(e.isPrimary){pointer={x:e.clientX,y:e.clientY};grid.setPointerCapture(e.pointerId);}},{passive:true});
    on(grid,'pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.max(Math.abs(dx),Math.abs(dy))>20)move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));},{passive:true});on(grid,'pointercancel',()=>{pointer=null;},{passive:true});
    const cleanup=()=>{clearTimeout(busyTimer);slots.forEach(slot=>slot.getAnimations({subtree:true}).forEach(animation=>animation.cancel()));controller.abort();};cleanup.retranslate=translate;
    reset();translate();return cleanup;
  };
})();

