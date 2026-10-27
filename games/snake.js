/* Orchard Snake: original canvas art, smooth movement and a growing harvest. */
(function () {
  'use strict';
  const COPY = {
    ja:{difficulty:'コース',easy:'のんびり',normal:'果樹園',hard:'岩場チャレンジ',score:'収穫スコア',length:'からだ',level:'スピード',best:'自己ベスト',combo:'収穫コンボ',start:'あそぶ',pause:'一時停止',resume:'つづける',retry:'はじめから',ready:'果樹園へようこそ',intro:'リンゴを食べて大きくなろう。素早く連続で食べるとコンボ！',running:'リンゴを集めよう。5個目は金のリンゴ！',paused:'ひと休み',pausedCopy:'続きはそのまま。準備ができたら再開しよう。',over:'また来てね、果樹園！',overCopy:'壁・自分のからだ・岩にぶつかると終了。次の収穫に挑戦しよう。',perfect:'果樹園を完全制覇！',perfectCopy:'すべてのマスを埋めたよ。見事な収穫！',again:'もう一度あそぶ',hint:'矢印 / WASD・スワイプ・方向ボタン。P / Spaceで一時停止。',gold:'金のリンゴ！ 急いで収穫しよう',board:'果樹園のスネークゲーム盤',up:'上',down:'下',left:'左',right:'右',points:'点',rocks:'岩なし',rocksHard:'岩あり・高得点'},
    en:{difficulty:'Trail',easy:'Easy stroll',normal:'Orchard',hard:'Rocky trail',score:'Harvest',length:'Length',level:'Speed',best:'Personal best',combo:'Harvest chain',start:'Play',pause:'Pause',resume:'Continue',retry:'Start over',ready:'Into the orchard',intro:'Grow with every apple. Collect the next one quickly to build a harvest chain!',running:'Gather apples. Every fifth apple turns golden!',paused:'Take a breather',pausedCopy:'Your orchard is waiting. Continue when you are ready.',over:'A good day in the orchard',overCopy:'Avoid the fence, your own body and the rocks. A fresh harvest is waiting.',perfect:'Orchard mastered!',perfectCopy:'You filled every space. What a harvest!',again:'Play again',hint:'Arrows / WASD, swipe or direction buttons. P / Space to pause.',gold:'Golden apple! Pick it before it fades',board:'Orchard snake game board',up:'Up',down:'Down',left:'Left',right:'Right',points:'pts',rocks:'No rocks',rocksHard:'Rocks · score bonus'},
    ko:{difficulty:'코스',easy:'느긋한 산책',normal:'과수원',hard:'바위 길',score:'수확 점수',length:'길이',level:'속도',best:'최고 기록',combo:'수확 콤보',start:'시작',pause:'일시 정지',resume:'계속',retry:'처음부터',ready:'과수원으로 출발',intro:'사과를 먹으며 자라세요. 빠르게 연속으로 먹으면 콤보가 쌓여요!',running:'사과를 모으세요. 다섯 번째는 황금 사과!',paused:'잠깐 쉬어 가요',pausedCopy:'진행 상황은 그대로예요. 준비되면 계속하세요.',over:'멋진 수확이었어요',overCopy:'울타리, 자신의 몸, 바위를 피하며 다시 도전하세요.',perfect:'과수원 정복!',perfectCopy:'모든 칸을 채웠어요. 대단한 수확이에요!',again:'다시 하기',hint:'방향키 / WASD, 스와이프 또는 화면 버튼. P / Space로 일시 정지.',gold:'황금 사과! 사라지기 전에 모으세요',board:'과수원 스네이크 게임판',up:'위',down:'아래',left:'왼쪽',right:'오른쪽',points:'점',rocks:'바위 없음',rocksHard:'바위 · 점수 보너스'},
    zh:{difficulty:'路线',easy:'悠闲散步',normal:'果园',hard:'岩石小径',score:'收获分数',length:'长度',level:'速度',best:'最佳成绩',combo:'收获连击',start:'开始',pause:'暂停',resume:'继续',retry:'重新开始',ready:'出发去果园',intro:'吃苹果让身体变长。快速连续收集，就能获得连击！',running:'收集苹果。每第五个是金苹果！',paused:'休息一下',pausedCopy:'进度已保留，准备好后继续。',over:'今天也大丰收',overCopy:'避开围栏、自己的身体和岩石，再来挑战吧。',perfect:'果园完全征服！',perfectCopy:'你填满了每一个格子，收获惊人！',again:'再玩一次',hint:'方向键 / WASD、滑动或屏幕按钮。P / 空格键暂停。',gold:'金苹果！快在它褪色前收集',board:'果园贪吃蛇游戏盘',up:'上',down:'下',left:'左',right:'右',points:'分',rocks:'无岩石',rocksHard:'有岩石 · 分数加成'},
    es:{difficulty:'Ruta',easy:'Paseo tranquilo',normal:'Huerto',hard:'Camino rocoso',score:'Cosecha',length:'Longitud',level:'Velocidad',best:'Tu récord',combo:'Cadena de cosecha',start:'Jugar',pause:'Pausa',resume:'Continuar',retry:'Empezar de nuevo',ready:'Al huerto',intro:'Crece con cada manzana. ¡Recoge la siguiente rápido para encadenar la cosecha!',running:'Recoge manzanas. ¡Cada quinta manzana es dorada!',paused:'Un pequeño descanso',pausedCopy:'Tu partida sigue aquí. Continúa cuando quieras.',over:'Una buena cosecha',overCopy:'Evita la valla, tu cuerpo y las rocas. ¡Vuelve a intentarlo!',perfect:'¡Huerto dominado!',perfectCopy:'Llenaste todas las casillas. ¡Qué cosecha!',again:'Jugar otra vez',hint:'Flechas / WASD, desliza o usa botones. P / Espacio para pausa.',gold:'¡Manzana dorada! Recógela antes de que pierda su brillo',board:'Tablero de serpiente en el huerto',up:'Arriba',down:'Abajo',left:'Izquierda',right:'Derecha',points:'pts',rocks:'Sin rocas',rocksHard:'Rocas · puntos extra'}
  };
  const registry=window.AsobiGameRunners||(window.AsobiGameRunners=Object.create(null));
  registry.snake=function orchardSnake(root) {
    const lang=()=>typeof currentLang==='string'&&COPY[currentLang]?currentLang:'ja';
    const t=key=>COPY[lang()][key]||COPY.en[key]||key;
    const leafMark='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11 34C4 17 19 5 39 8c4 20-8 35-25 28M12 37L33 16M21 29l-2-11M26 24l10-1"/></svg>';
    root.innerHTML='<div class="game-wrap ay-trio ay-orchard"><div class="ay-game-top"><span class="ay-engine-tag">ORCHARD RUN</span><label class="ay-field-label"><span data-sn-text="difficulty"></span><select id="snake-difficulty"><option value="easy" data-sn-text="easy"></option><option value="normal" data-sn-text="normal"></option><option value="hard" data-sn-text="hard"></option></select></label></div><div class="ay-hud"><div class="ay-metric featured"><span data-sn-text="score"></span><strong id="snake-score">0</strong></div><div class="ay-metric"><span data-sn-text="length"></span><strong id="snake-length">3</strong></div><div class="ay-metric"><span data-sn-text="level"></span><strong id="snake-level">1</strong></div><div class="ay-metric"><span data-sn-text="best"></span><strong id="snake-best">0</strong></div></div><div class="ay-board-shell"><canvas id="snake-canvas" width="560" height="560" aria-describedby="snake-status"></canvas><div class="ay-overlay" id="snake-overlay"><div class="ay-result-panel"><div class="ay-result-mark">'+leafMark+'</div><h2 class="ay-result-title" id="snake-overlay-title"></h2><p class="ay-result-copy" id="snake-overlay-copy"></p><div class="ay-result-score" id="snake-final" hidden></div><button type="button" class="ay-button primary" id="snake-overlay-play"></button></div></div></div><div class="ay-chain-line"><span class="ay-chain-label" data-sn-text="combo"></span><span class="ay-chain-meter"><i id="snake-chain-meter"></i></span><strong class="ay-chain-value" id="snake-combo">×1</strong></div><div class="ay-controlbar"><button class="ay-button primary" type="button" id="snake-start"></button><button class="ay-button" type="button" id="snake-retry" data-sn-text="retry"></button></div><div class="ay-direction-pad"><button type="button" class="ay-button up" data-snake-dir="up">↑</button><button type="button" class="ay-button left" data-snake-dir="left">←</button><button type="button" class="ay-button down" data-snake-dir="down">↓</button><button type="button" class="ay-button right" data-snake-dir="right">→</button></div><p class="ay-status" id="snake-status" role="status"></p><p class="ay-caption" data-sn-text="hint"></p></div>';
    const el=id=>root.querySelector('#'+id),canvas=el('snake-canvas'),ctx=canvas.getContext('2d');
    const controller=new AbortController(),signal=controller.signal;
    const on=(node,event,fn,options={})=>node.addEventListener(event,fn,{...options,signal});
    const SIZE=20,CELL=25,PAD=30,W=560;
    const modeSettings={easy:{step:200,min:100,multiplier:1},normal:{step:160,min:78,multiplier:1},hard:{step:130,min:65,multiplier:1.5}};
    const storedMode=getStored('asobi:snake-mode:v4','normal');
    let mode=modeSettings[storedMode]?storedMode:'normal';
    let snake=[],previous=[],food=null,rocks=[],direction={x:1,y:0},queue=[],phase='ready',score=0,fruitCount=0,level=1,combo=1,lastFoodAt=-10000,gameTime=0,bonusUntil=0;
    let previousFrame=0,lastStep=0,raf=0,disposed=false,particles=[],floaters=[],lastStatus='',perfect=false;
    const savedRecords=getStored('asobi:records',{});let best=Number(savedRecords&&savedRecords.snake)||0;
    if(!Number.isFinite(best)||best<0)best=0;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function stepDuration(){return Math.max(modeSettings[mode].min,modeSettings[mode].step-(level-1)*9);}
    function makeRocks(){
      if(mode!=='hard')return [];
      return [[4,4],[5,4],[4,5],[14,4],[15,4],[15,5],[4,14],[4,15],[5,15],[14,15],[15,15],[15,14],[9,4],[10,15]].map(([x,y])=>({x,y}));
    }
    function placeFood(){
      const free=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(!snake.some(p=>p.x===x&&p.y===y)&&!rocks.some(p=>p.x===x&&p.y===y))free.push({x,y});
      if(!free.length)return null;
      const item=free[Math.floor(Math.random()*free.length)];item.gold=(fruitCount+1)%5===0;
      if(item.gold)bonusUntil=gameTime+6500;
      return item;
    }
    function textContent(){
      root.querySelectorAll('[data-sn-text]').forEach(node=>{node.textContent=t(node.dataset.snText);});
      root.querySelectorAll('[data-snake-dir]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.snakeDir)));
      canvas.setAttribute('aria-label',t('board'));el('snake-difficulty').value=mode;
      el('snake-start').textContent=t(phase==='running'?'pause':phase==='paused'?'resume':phase==='ended'?'again':'start');
      const overlay=el('snake-overlay');overlay.hidden=phase==='running';
      const stateTitle=phase==='paused'?'paused':phase==='ended'?(perfect?'perfect':'over'):'ready';
      el('snake-overlay-title').textContent=t(stateTitle);
      el('snake-overlay-copy').textContent=t(phase==='paused'?'pausedCopy':phase==='ended'?(perfect?'perfectCopy':'overCopy'):'intro');
      el('snake-overlay-play').textContent=t(phase==='paused'?'resume':phase==='ended'?'again':'start');
      el('snake-final').hidden=phase!=='ended';el('snake-final').textContent=score.toLocaleString(document.documentElement.lang)+' '+t('points');
      el('snake-best').textContent=Math.floor(best).toLocaleString(document.documentElement.lang);
      updateStatus();
    }
    function updateStatus(){
      const key=phase==='running'?(food&&food.gold?'gold':'running'):phase==='paused'?'pausedCopy':phase==='ended'?(perfect?'perfectCopy':'overCopy'):'intro';
      const value=t(key);if(value!==lastStatus){el('snake-status').textContent=value;lastStatus=value;}
    }
    function syncHud(){
      el('snake-score').textContent=score;el('snake-length').textContent=snake.length;el('snake-level').textContent=level;el('snake-best').textContent=Math.floor(best).toLocaleString(document.documentElement.lang);
      el('snake-combo').textContent='×'+combo;
    }
    function reset(){
      snake=[{x:9,y:10},{x:8,y:10},{x:7,y:10}];previous=snake.map(p=>({...p}));direction={x:1,y:0};queue=[];
      rocks=makeRocks();score=0;fruitCount=0;level=1;combo=1;lastFoodAt=-10000;gameTime=0;phase='ready';particles=[];floaters=[];perfect=false;
      food=placeFood();syncHud();textContent();lastStep=performance.now();
    }
    function start(){
      if(document.hidden)return;
      if(phase==='ended')reset();
      phase='running';previous=snake.map(p=>({...p}));lastStep=performance.now();textContent();
    }
    function pause(){if(phase!=='running')return;phase='paused';previous=snake.map(p=>({...p}));textContent();}
    function toggle(){if(phase==='running')pause();else start();}
    function end(won=false){
      phase='ended';perfect=won;previous=snake.map(p=>({...p}));saveRecord('snake',score);syncHud();textContent();
    }
    function turn(name){
      if(phase==='ended')reset();
      const choices={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}},next=choices[name];
      const current=queue.length?queue[queue.length-1]:direction;
      if(!next||next.x===-current.x&&next.y===-current.y)return;
      if(next.x===current.x&&next.y===current.y){if(phase!=='running')start();return;}
      if(queue.length<2)queue.push(next);
      if(phase!=='running')start();
    }
    function harvest(){
      fruitCount++;combo=gameTime-lastFoodAt<=6500?Math.min(5,combo+1):1;lastFoodAt=gameTime;
      const gain=Math.round((food.gold?50:10)*combo*modeSettings[mode].multiplier);score+=gain;best=Math.max(best,score);level=1+Math.floor(fruitCount/4);
      const x=PAD+(food.x+.5)*CELL,y=PAD+(food.y+.5)*CELL;
      for(let i=0;i<(reduced?5:17);i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*70;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-35,life:.7+Math.random()*.4,max:1,color:food.gold?'#ffe59a':i%2?'#d4ec99':'#ef9d74'});}
      floaters.push({x,y,text:'+'+gain,life:1.2});
      saveRecord('snake',score);food=placeFood();syncHud();updateStatus();if(!food)end(true);
    }
    function step(){
      if(queue.length)direction=queue.shift();
      const head={x:snake[0].x+direction.x,y:snake[0].y+direction.y};
      const eating=food&&head.x===food.x&&head.y===food.y;
      if(head.x<0||head.y<0||head.x>=SIZE||head.y>=SIZE||rocks.some(p=>p.x===head.x&&p.y===head.y)||snake.some((p,i)=>i<snake.length-(eating?0:1)&&p.x===head.x&&p.y===head.y)){end();return;}
      previous=snake.map(p=>({...p}));snake.unshift(head);if(eating)harvest();else snake.pop();
    }
    function ellipse(x,y,rx,ry,color,rotation=0){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);ctx.fill();}
    function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
    function drawFence(){
      ctx.strokeStyle='#29452c';ctx.lineWidth=7;ctx.lineCap='round';
      [15,W-15].forEach(y=>{ctx.beginPath();ctx.moveTo(15,y);ctx.lineTo(W-15,y);ctx.stroke();});
      [15,W-15].forEach(x=>{ctx.beginPath();ctx.moveTo(x,15);ctx.lineTo(x,W-15);ctx.stroke();});
      for(let p=20;p<W-10;p+=31){
        const grad=ctx.createLinearGradient(0,0,7,0);grad.addColorStop(0,'#bd9c63');grad.addColorStop(1,'#816540');
        rounded(p-3,5,7,20,2,grad);rounded(p-3,W-25,7,20,2,grad);
        rounded(5,p-3,20,7,2,'#a78754');rounded(W-25,p-3,20,7,2,'#a78754');
        ellipse(p,10,1,1,'#e0c48b');ellipse(p,W-20,1,1,'#e0c48b');
      }
    }
    function drawGround(now){
      const outside=ctx.createLinearGradient(0,0,W,W);outside.addColorStop(0,'#42633b');outside.addColorStop(1,'#223e2d');ctx.fillStyle=outside;ctx.fillRect(0,0,W,W);
      const grass=ctx.createLinearGradient(0,PAD,0,W-PAD);grass.addColorStop(0,'#698954');grass.addColorStop(.5,'#567e4d');grass.addColorStop(1,'#416e45');rounded(PAD-3,PAD-3,506,506,8,grass);
      ctx.save();ctx.beginPath();ctx.roundRect(PAD,PAD,500,500,5);ctx.clip();
      for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
        if((x+y)%2===0){ctx.fillStyle='#e1f2a805';ctx.fillRect(PAD+x*CELL,PAD+y*CELL,CELL,CELL);}
        const seed=(x*37+y*71)%29;if(seed<6){const px=PAD+x*CELL+6+seed,py=PAD+y*CELL+17;ctx.strokeStyle=seed%2?'#a0bc6b35':'#244f3b24';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px-4,py-6,px-3,py-7);ctx.moveTo(px,py);ctx.lineTo(px+3,py-5);ctx.stroke();}
        if(seed===12){ellipse(PAD+x*CELL+18,PAD+y*CELL+6,1.5,1.1,'#e6dca144');}
      }
      const light=ctx.createRadialGradient(80,40,10,120,140,500);light.addColorStop(0,'#d9df8e12');light.addColorStop(1,'#153c3020');ctx.fillStyle=light;ctx.fillRect(PAD,PAD,500,500);
      ctx.restore();drawFence();
      if(!reduced){for(let i=0;i<4;i++){const x=PAD+((now*.009+i*137)%500),y=PAD+45+Math.sin(now*.0007+i*2)*20+i*96;ellipse(x,y,1.7,1.2,'#efeeb550');}}
    }
    function drawRock(rock){
      const x=PAD+(rock.x+.5)*CELL,y=PAD+(rock.y+.5)*CELL;
      ellipse(x+1,y+5,13,8,'#1e422b66');
      const g=ctx.createLinearGradient(x-10,y-13,x+10,y+10);g.addColorStop(0,'#aab49a');g.addColorStop(.55,'#7d8e78');g.addColorStop(1,'#536c5a');
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-12,y+4);ctx.lineTo(x-9,y-8);ctx.lineTo(x+1,y-12);ctx.lineTo(x+11,y-5);ctx.lineTo(x+13,y+7);ctx.quadraticCurveTo(x,y+14,x-12,y+4);ctx.fill();
      ctx.strokeStyle='#c1cbb43d';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-8,y-5);ctx.lineTo(x+1,y-9);ctx.lineTo(x+8,y-4);ctx.stroke();ellipse(x-5,y+8,6,2.3,'#8aa15b88');
    }
    function drawApple(item,now){
      if(!item)return;const x=PAD+(item.x+.5)*CELL,y=PAD+(item.y+.5)*CELL,scale=1+(reduced?0:Math.sin(now*.006)*.045);
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ellipse(1,9,10,4,'#163f2e65');
      if(item.gold){const glow=ctx.createRadialGradient(0,0,2,0,0,27);glow.addColorStop(0,'#ffe17c50');glow.addColorStop(1,'#ffe17c00');ctx.fillStyle=glow;ctx.fillRect(-28,-28,56,56);}
      const apple=ctx.createRadialGradient(-4,-6,1,2,2,16);apple.addColorStop(0,item.gold?'#fff0a7':'#f4bd88');apple.addColorStop(.35,item.gold?'#efca5c':'#dc755a');apple.addColorStop(1,item.gold?'#be8b36':'#a74940');
      ctx.fillStyle=apple;ctx.beginPath();ctx.moveTo(0,-7);ctx.bezierCurveTo(-13,-14,-15,-1,-9,8);ctx.bezierCurveTo(-4,15,0,10,2,10);ctx.bezierCurveTo(13,15,17,-7,7,-10);ctx.bezierCurveTo(3,-11,1,-7,0,-7);ctx.fill();
      ctx.strokeStyle='#4a4a28';ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-7);ctx.quadraticCurveTo(-1,-12,2,-15);ctx.stroke();
      ellipse(6,-11,6,2.8,'#a8c66a',-.5);ellipse(-5,-3,2.4,4,'#fff8d45c',.4);
      if(item.gold){ctx.strokeStyle='#fff3bf';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-18,-12);ctx.lineTo(-18,-18);ctx.moveTo(-21,-15);ctx.lineTo(-15,-15);ctx.stroke();}
      ctx.restore();
    }
    function drawSnake(alpha,now){
      const points=snake.map((p,i)=>{const old=previous[Math.min(i,previous.length-1)]||p;return{x:PAD+(old.x+(p.x-old.x)*alpha+.5)*CELL,y:PAD+(old.y+(p.y-old.y)*alpha+.5)*CELL};});
      if(!points.length)return;
      const path=()=>{ctx.beginPath();const tail=points[points.length-1];ctx.moveTo(tail.x,tail.y);for(let i=points.length-2;i>=0;i--)ctx.lineTo(points[i].x,points[i].y);};
      ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.translate(0,4);ctx.strokeStyle='#153d2e75';ctx.lineWidth=23;path();ctx.stroke();ctx.translate(0,-4);
      const body=ctx.createLinearGradient(points[0].x-80,points[0].y-50,points[0].x+60,points[0].y+100);body.addColorStop(0,'#d0dc8b');body.addColorStop(.3,'#a3c06f');body.addColorStop(.7,'#70a05d');body.addColorStop(1,'#54884e');
      ctx.lineWidth=21;ctx.strokeStyle='#345f3f';path();ctx.stroke();ctx.lineWidth=18;ctx.strokeStyle=body;path();ctx.stroke();
      ctx.save();ctx.translate(-1,-3);ctx.lineWidth=5;ctx.strokeStyle='#e6e6a42c';path();ctx.stroke();ctx.restore();
      for(let i=1;i<points.length;i++){if(i%2===0){const p=points[i];ellipse(p.x-2,p.y-2,2.2,1.4,'#3b754a48');ellipse(p.x+3,p.y+3,1.8,1.2,'#edf1ac24');}}
      const head=points[0],angle=Math.atan2(direction.y,direction.x);ctx.translate(head.x,head.y);ctx.rotate(angle);
      const hg=ctx.createLinearGradient(-8,-11,9,10);hg.addColorStop(0,'#d3df92');hg.addColorStop(1,'#94b86a');ellipse(1,0,13,10.7,hg);
      ellipse(4,-7.2,4.2,4.4,'#e7e9bc');ellipse(4,7.2,4.2,4.4,'#e7e9bc');ellipse(5.2,-7.2,2,2.7,'#253b30');ellipse(5.2,7.2,2,2.7,'#253b30');
      ellipse(5.5,-8, .7,.9,'#fff');ellipse(5.5,6.3,.7,.9,'#fff');ellipse(11,-2.5,.8,.7,'#4f7550');ellipse(11,2.5,.8,.7,'#4f7550');
      if(phase==='running'&&Math.sin(now*.003)>.88){ctx.strokeStyle='#d98f86';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(20,0);ctx.lineTo(23,-2);ctx.moveTo(20,0);ctx.lineTo(23,2);ctx.stroke();}
      ctx.restore();
    }
    function drawEffects(dt){
      particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=75*dt;ctx.globalAlpha=Math.max(0,p.life);ellipse(p.x,p.y,2.6,1.4,p.color,p.life*3);});ctx.globalAlpha=1;
      floaters=floaters.filter(p=>p.life>0);floaters.forEach(p=>{p.life-=dt;p.y-=25*dt;ctx.globalAlpha=Math.min(1,Math.max(0,p.life));ctx.font='900 19px system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle='#173f2b';ctx.fillText(p.text,p.x+1,p.y+2);ctx.fillStyle='#fff2ba';ctx.fillText(p.text,p.x,p.y);});ctx.globalAlpha=1;
    }
    function frame(now){
      if(disposed)return;
      const dt=Math.min(.06,(now-(previousFrame||now))/1000);previousFrame=now;
      if(phase==='running'){
        gameTime+=dt*1000;
        if(food&&food.gold&&gameTime>bonusUntil){food.gold=false;updateStatus();}
        if(combo>1&&gameTime-lastFoodAt>6500){combo=1;syncHud();}
        let catchup=0;while(phase==='running'&&now-lastStep>=stepDuration()&&catchup++<4){lastStep+=stepDuration();step();}
        if(catchup>4)lastStep=now;
      }
      const alpha=phase==='running'&&!reduced?Math.min(1,(now-lastStep)/stepDuration()):1;
      drawGround(now);rocks.forEach(drawRock);drawApple(food,now);drawSnake(alpha,now);drawEffects(dt);
      el('snake-chain-meter').style.width=(fruitCount?Math.max(0,1-(gameTime-lastFoodAt)/6500)*100:0)+'%';
      raf=requestAnimationFrame(frame);
    }
    function keyHandler(e){
      if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.isComposing||document.hidden||!root.isConnected||root.closest('.hidden'))return;
      const target=e.target instanceof Element?e.target:document.body;
      if(target.isContentEditable||target.closest('input,textarea,select,[contenteditable]')||target.closest('button,a')&&!root.contains(target))return;
      if(e.key===' '&&target.closest('button,a,[role="button"]'))return;
      const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
      if(keys[e.key]){e.preventDefault();turn(keys[e.key]);}else if(e.key===' '||e.key==='p'){e.preventDefault();toggle();}
    }
    on(document,'keydown',keyHandler);on(document,'visibilitychange',()=>{if(document.hidden)pause();});
    on(el('snake-start'),'click',toggle);on(el('snake-overlay-play'),'click',start);on(el('snake-retry'),'click',reset);
    on(el('snake-difficulty'),'change',e=>{mode=modeSettings[e.target.value]?e.target.value:'normal';putStored('asobi:snake-mode:v4',mode);reset();});
    root.querySelectorAll('[data-snake-dir]').forEach(btn=>on(btn,'click',()=>turn(btn.dataset.snakeDir)));
    let pointer=null;
    on(canvas,'pointerdown',e=>{if(e.isPrimary){pointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}},{passive:true});
    on(canvas,'pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.max(Math.abs(dx),Math.abs(dy))>18)turn(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));else if(phase!=='running')start();},{passive:true});
    on(canvas,'pointercancel',()=>{pointer=null;},{passive:true});
    const cleanup=()=>{disposed=true;cancelAnimationFrame(raf);controller.abort();};
    cleanup.retranslate=textContent;reset();raf=requestAnimationFrame(frame);return cleanup;
  };
})();

