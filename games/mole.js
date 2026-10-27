/* Garden Panic: local play plus server-verified weekly rounds. */
(function(){
'use strict';
const registry=window.AsobiGameRunners||(window.AsobiGameRunners=Object.create(null));
registry.mole=function(root){
 const COPY={
 ja:{score:'得点',time:'残り時間',combo:'コンボ',practice:'この端末であそぶ',ranked:'共通ランキングに挑戦',local:'練習・この端末',online:'共通ランキング・公式ラウンド',ready:'金もぐらを狙おう。爆弾には気をつけて！',go:'あと少しでスタート！',playing:'連続命中で最大3倍！',done:'ラウンド終了！',normal:'もぐら +1',gold:'金もぐら +3',bomb:'爆弾 −3',board:'もぐらが出る庭',hole:'穴',target:'もぐら',title:'みんなの週間ランキング',note:'ニックネームと得点が公開されます。本名・連絡先は入れないでください。',name:'公開ニックネーム',refresh:'更新',loading:'ランキングを読み込み中…',empty:'今週の一番乗りになろう！',unavailable:'共通ランキングはただいま利用できません。練習は遊べます。',network:'通信が途切れました。このラウンドは端末内の記録になります。',registering:'サーバーで記録を確認しています…',registered:'共通ランキングに登録しました：',rank:'位',points:'点',quota:'本日の受付上限、または連続プレイの制限に達しました。練習は遊べます。',startError:'ランキングに接続できませんでした。練習から遊べます。',privacy:'25秒のプレイ中に命中をサーバーで検証します。自動操作の完全な排除を保証するものではありません。',weekly:'毎週月曜 9:00（日本時間）に切替。過去の端末内記録は送信しません。',again:'もう一度あそぶ',finishError:'登録できませんでした。端末内の記録は保存しました。',enter:'1〜16文字のニックネームを入力してください。'},
 en:{score:'Score',time:'Time left',combo:'Combo',practice:'Play on this device',ranked:'Enter shared ranking',local:'Practice · this device',online:'Shared ranking · verified round',ready:'Catch golden moles. Avoid the bombs!',go:'Get ready!',playing:'Keep your streak for up to 3× points!',done:'Round complete!',normal:'Mole +1',gold:'Gold +3',bomb:'Bomb −3',board:'Mole garden',hole:'Hole',target:'Mole',title:'Everyone · weekly top 20',note:'Your nickname and score will be public. Do not use personal or contact information.',name:'Public nickname',refresh:'Refresh',loading:'Loading rankings…',empty:'Be the first this week!',unavailable:'Shared rankings are unavailable. Practice is ready to play.',network:'Connection lost. This round will stay on this device.',registering:'Verifying your round…',registered:'Added to the shared ranking: ',rank:' place',points:' pts',quota:'Daily or repeat-play limit reached. You can still practice.',startError:'Could not connect. You can still practice.',privacy:'Hits are checked by the server during the 25-second round. Automated play cannot be completely ruled out.',weekly:'Resets Monday 00:00 UTC. Previous local records are never uploaded.',again:'Play again',finishError:'Could not register. Your local record was saved.',enter:'Enter a nickname of 1–16 characters.'},
 ko:{score:'점수',time:'남은 시간',combo:'콤보',practice:'이 기기에서 플레이',ranked:'공통 순위 도전',local:'연습 · 이 기기',online:'공통 순위 · 검증 라운드',ready:'황금 두더지를 노리고 폭탄은 피하세요!',go:'곧 시작합니다!',playing:'연속 명중으로 최대 3배!',done:'라운드 종료!',normal:'두더지 +1',gold:'황금 +3',bomb:'폭탄 −3',board:'두더지 정원',hole:'구멍',target:'두더지',title:'모두의 주간 상위 20',note:'닉네임과 점수가 공개됩니다. 개인정보를 입력하지 마세요.',name:'공개 닉네임',refresh:'새로 고침',loading:'순위 불러오는 중…',empty:'이번 주 첫 기록에 도전!',unavailable:'공통 순위를 이용할 수 없습니다. 연습은 가능합니다.',network:'연결이 끊겨 이 기기에만 저장됩니다.',registering:'기록 검증 중…',registered:'공통 순위에 등록: ',rank:'위',points:'점',quota:'오늘 또는 연속 플레이 제한에 도달했습니다. 연습은 가능합니다.',startError:'연결하지 못했습니다. 연습은 가능합니다.',privacy:'25초 동안 명중을 서버에서 검증합니다. 자동 플레이를 완전히 배제할 수는 없습니다.',weekly:'매주 월요일 00:00 UTC에 변경. 기존 로컬 기록은 전송하지 않습니다.',again:'다시 플레이',finishError:'등록하지 못했습니다. 로컬 기록은 저장했습니다.',enter:'1~16자의 닉네임을 입력하세요.'},
 zh:{score:'得分',time:'剩余时间',combo:'连击',practice:'在此设备游玩',ranked:'挑战共享排行榜',local:'练习 · 此设备',online:'共享排行 · 验证回合',ready:'瞄准金地鼠，小心炸弹！',go:'即将开始！',playing:'连续命中，最高3倍！',done:'回合结束！',normal:'地鼠 +1',gold:'金鼠 +3',bomb:'炸弹 −3',board:'地鼠花园',hole:'洞口',target:'地鼠',title:'大家的每周前20名',note:'昵称和得分将公开。请勿填写个人信息。',name:'公开昵称',refresh:'刷新',loading:'加载排行榜…',empty:'来创造本周首个记录吧！',unavailable:'共享排行榜暂不可用，仍可练习。',network:'连接中断，本回合仅保存在此设备。',registering:'正在验证记录…',registered:'已加入共享排行榜：',rank:'名',points:'分',quota:'已达到今日或连续游玩限制，仍可练习。',startError:'无法连接，仍可练习。',privacy:'服务器在25秒回合内验证命中。无法完全排除自动操作。',weekly:'每周一00:00 UTC更新。不会上传过去的本地记录。',again:'再玩一次',finishError:'未能登记，本地记录已保存。',enter:'请输入1至16字昵称。'},
 es:{score:'Puntos',time:'Tiempo',combo:'Combo',practice:'Jugar en este dispositivo',ranked:'Entrar en la clasificación',local:'Práctica · este dispositivo',online:'Clasificación · ronda verificada',ready:'¡Busca topos dorados y evita las bombas!',go:'¡Prepárate!',playing:'¡Encadena aciertos para ganar hasta ×3!',done:'¡Ronda terminada!',normal:'Topo +1',gold:'Dorado +3',bomb:'Bomba −3',board:'Jardín de topos',hole:'Agujero',target:'Topo',title:'Todos · los 20 de la semana',note:'Tu apodo y puntuación serán públicos. No incluyas datos personales.',name:'Apodo público',refresh:'Actualizar',loading:'Cargando clasificación…',empty:'¡Consigue el primer récord de la semana!',unavailable:'La clasificación no está disponible. Puedes practicar.',network:'Conexión perdida. Esta ronda quedará en este dispositivo.',registering:'Verificando tu ronda…',registered:'Registrado en la clasificación: ',rank:' puesto',points:' pts',quota:'Se alcanzó el límite diario o de partidas seguidas. Puedes practicar.',startError:'No se pudo conectar. Puedes practicar.',privacy:'El servidor verifica los aciertos durante los 25 segundos. No se puede descartar por completo el juego automático.',weekly:'Se renueva el lunes a las 00:00 UTC. Los récords locales anteriores no se suben.',again:'Jugar de nuevo',finishError:'No se pudo registrar. Tu récord local se guardó.',enter:'Escribe un apodo de 1–16 caracteres.'}
 };
 const t=k=>(COPY[currentLang]||COPY.ja)[k]||COPY.en[k]||k;
 root.innerHTML='<div class="ay-mole"><div class="mole-hud"><div><small data-mtext="score"></small><strong id="mole-score">0</strong></div><div><small data-mtext="time"></small><strong id="mole-time">25</strong></div><div><small data-mtext="combo"></small><strong id="mole-combo">×1</strong></div></div><div class="mole-clock-track"><i id="mole-clock"></i></div><div class="mole-stage" id="mole-stage"><canvas id="mole-canvas" width="900" height="690"></canvas><div class="mole-grid" id="mole-grid"></div><div class="mole-stage-note" id="mole-overlay"></div></div><div class="mole-status-row"><span class="mole-mode" id="mole-mode"></span><span role="status" id="mole-status"></span></div><div class="mole-controls"><button class="game-button" type="button" id="mole-start"></button><button class="game-button secondary" type="button" id="mole-ranked"></button></div><div class="mole-legend"><span><i class="normal"></i><span data-mtext="normal"></span></span><span><i class="gold"></i><span data-mtext="gold"></span></span><span><i class="bomb"></i><span data-mtext="bomb"></span></span></div><div class="mole-result" id="mole-result" role="status"></div><section class="mole-global" aria-labelledby="mole-global-title"><h3 id="mole-global-title" data-mtext="title"></h3><p data-mtext="weekly"></p><label class="mole-entry"><span class="sr-only" data-mtext="name"></span><input id="mole-name" maxlength="16" autocomplete="nickname"></label><p data-mtext="note"></p><button type="button" class="mole-global-refresh" id="mole-refresh" data-mtext="refresh"></button><ol id="mole-global-list" class="mole-global-list"></ol><p id="mole-global-status" role="status"></p><small data-mtext="privacy"></small></section></div>';
 const q=id=>root.querySelector('#'+id),canvas=q('mole-canvas'),ctx=canvas.getContext('2d');
 q('mole-stage').before(root.querySelector('.mole-controls'));
 const XY=Array.from({length:9},(_,i)=>({x:165+(i%3)*285,y:178+Math.floor(i/3)*187}));
 const buttons=XY.map((p,i)=>{const b=document.createElement('button');b.type='button';b.className='mole-hole';b.dataset.hole=i;b.style.left=p.x/9+'%';b.style.top=p.y/6.9+'%';q('mole-grid').append(b);return b;});
 let disposed=false,playing=false,starting=false,ended=false,ranked=false,rankValid=false,round=null,score=0,hits=0,streak=0,combo=1,lastHit=-1,lastAck=0,offset=0,raf=0,active=null,hitFlash=null,status='ready',globalStatus='loading',resultKey='',finalRank=null,rankingEntries=[],schedule=[],finishedIds=new Set(),pending=new Set(),timers=new Set(),effectNodes=new Set();
 const controller=new AbortController();
 q('mole-name').value=typeof getStored('asobi:nickname','')==='string'?getStored('asobi:nickname',''):'';
 function delay(ms){return new Promise(resolve=>{const id=setTimeout(()=>{timers.delete(id);resolve()},ms);timers.add(id)})}
 async function api(path,body){
  const abort=new AbortController(),stop=()=>abort.abort();controller.signal.addEventListener('abort',stop,{once:true});
  const timer=setTimeout(stop,10000);
  try{const response=await fetch('/api/mole/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store',signal:abort.signal});const data=await response.json();if(!response.ok){const err=new Error(data.error||'API');err.status=response.status;err.code=data.error;throw err}return data}
  finally{clearTimeout(timer);controller.signal.removeEventListener('abort',stop)}
 }
 function translate(){
  root.querySelectorAll('[data-mtext]').forEach(el=>el.textContent=t(el.dataset.mtext));
  q('mole-name').placeholder=t('name');q('mole-name').setAttribute('aria-label',t('name'));canvas.setAttribute('aria-label',t('board'));
  q('mole-start').textContent=t(ended?'again':'practice');q('mole-ranked').textContent=t('ranked');
  q('mole-mode').textContent=t(ranked&&rankValid?'online':'local');q('mole-status').textContent=t(status);
  q('mole-global-status').textContent=globalStatus?t(globalStatus):'';
  q('mole-result').textContent=resultKey?resultKey==='registered'?t('registered')+(finalRank===null?'':finalRank+t('rank')+' · ')+score+t('points'):t(resultKey):'';
  buttons.forEach((b,i)=>b.setAttribute('aria-label',t(active?.hole===i?active.kind:'hole')+' '+(i+1)));
  q('mole-overlay').textContent=!playing&&!starting?ended?score+t('points')+' · '+t('done'):t('ready'):playing&&Date.now()+offset<round.startAt?t('go'):'';
 }
 function hud(){q('mole-score').textContent=score;q('mole-combo').textContent='×'+combo;}
 async function loadRanking(){
  globalStatus='loading';translate();
  try{const data=await api('leaderboard?period=week');if(disposed)return;rankingEntries=data.entries||[];globalStatus=rankingEntries.length?'':'empty';renderRanking()}
  catch{if(disposed)return;globalStatus='unavailable'}translate();
 }
 function renderRanking(){
  const list=q('mole-global-list');list.replaceChildren();
  for(const entry of rankingEntries){const li=document.createElement('li'),pos=document.createElement('b'),name=document.createElement('span'),points=document.createElement('strong');pos.textContent=entry.rank;name.textContent=entry.nickname;points.textContent=entry.score+t('points');li.append(pos,name,points);list.append(li)}
 }
 function localRound(){
  const startAt=Date.now()+400;
  return {startAt,endAt:startAt+25000,targets:Array.from({length:40},(_,i)=>({id:'local-'+i,hole:Math.floor(Math.random()*9),kind:[6,13,20,27,36].includes(i)?'bomb':[4,9,14,19,24,29,34,39].includes(i)?'gold':'normal',openAt:startAt+i*625,closeAt:startAt+i*625+580}))};
 }
 async function start(online){
  if(playing||starting)return;starting=true;ranked=online;rankValid=false;ended=false;resultKey='';score=hits=streak=0;combo=1;lastHit=-1;lastAck=0;finishedIds.clear();pending.clear();offset=0;
  q('mole-start').disabled=q('mole-ranked').disabled=true;translate();hud();
  try{
   if(online){
    const name=q('mole-name').value.normalize('NFC').trim();
    if(!name||Array.from(name).length>16||/[\u0000-\u001f\u007f<>&\u202a-\u202e\u2066-\u2069]/.test(name)){resultKey='enter';q('mole-name').focus();q('mole-name').scrollIntoView({block:'center'});return}
    const before=Date.now();round=await api('session',{nickname:name});if(disposed)return;offset=round.serverNow-(before+Date.now())/2;rankValid=true;putStored('asobi:nickname',name);
   }else round=localRound();
   schedule=round.targets;starting=false;playing=true;status='playing';q('mole-mode').textContent=t(online?'online':'local');translate();tick();
  }catch(err){if(!disposed){resultKey=err.status===429?'quota':err.code==='invalid_nickname'?'enter':'startError';status='ready';}}
  finally{starting=false;if(!playing&&!disposed){q('mole-start').disabled=q('mole-ranked').disabled=false;translate();}}
 }
 function showSpark(target,text){
  const p=XY[target.hole],el=document.createElement('span');el.className='mole-hit-spark';el.style.left=p.x/9+'%';el.style.top=(p.y-60)/6.9+'%';el.textContent=text;q('mole-stage').append(el);effectNodes.add(el);
  const timer=setTimeout(()=>{timers.delete(timer);effectNodes.delete(el);el.remove()},650);timers.add(timer);
 }
 function localScore(target){
  const index=schedule.indexOf(target);
  if(target.kind==='bomb'){score=Math.max(0,score-3);streak=0;combo=1}
  else{let missed=false;for(let i=lastHit+1;i<index;i++)if(schedule[i].kind!=='bomb'&&!finishedIds.has(schedule[i].id))missed=true;if(missed)streak=0;streak++;hits++;combo=Math.min(3,1+Math.floor((streak-1)/5));score+=(target.kind==='gold'?3:1)*combo}
  lastHit=index;hud();
 }
 async function hit(hole){
  const now=Date.now()+offset,target=schedule.find(item=>item.hole===hole&&now>=item.openAt&&now<=item.closeAt&&!finishedIds.has(item.id));
  if(!playing||!target||pending.has(target.id))return;pending.add(target.id);finishedIds.add(target.id);hitFlash={hole,at:performance.now(),kind:target.kind};const previous=score;
  if(ranked&&rankValid){
   try{const data=await api('hit',{sessionId:round.sessionId,targetId:target.id,hole});if(disposed)return;if(data.version>lastAck){lastAck=data.version;score=data.score;hits=data.hits;streak=data.streak;combo=data.combo;hud();showSpark(target,(score-previous>0?'+':'')+(score-previous));}}
   catch(err){if(disposed)return;if(err.status!==409&&err.status!==422){rankValid=false;status='network';resultKey='network';translate();}}
  }else{localScore(target);showSpark(target,(score-previous>0?'+':'')+(score-previous));}
  pending.delete(target.id);
 }
 async function finish(){
  if(!playing)return;playing=false;ended=true;active=null;buttons.forEach(b=>b.classList.remove('active'));status='done';q('mole-time').textContent='0';saveRecord('mole',score);translate();draw(performance.now());
  if(ranked&&rankValid){
   resultKey='registering';translate();
   // Finish uses server time; wait for final hit acknowledgements and clock uncertainty.
   await delay(450);if(disposed)return;
   try{
    let data;for(let attempt=0;attempt<2;attempt++){try{data=await api('finish',{sessionId:round.sessionId});break}catch(err){if(err.status===425||err.status===422){await delay(700)}else throw err}}
    if(!data)throw Error('Unfinished');if(disposed)return;score=data.score;hud();saveRecord('mole',score);finalRank=data.rank;resultKey='registered';loadRanking();
   }catch{if(!disposed)resultKey='finishError'}
  }
  if(!disposed){q('mole-start').disabled=q('mole-ranked').disabled=false;translate();}
 }
 function tick(){
  if(disposed)return;const now=Date.now()+offset;
  active=schedule.find(item=>now>=item.openAt&&now<=item.closeAt&&!finishedIds.has(item.id))||null;
  buttons.forEach((b,i)=>{const yes=active?.hole===i;b.classList.toggle('active',yes);b.setAttribute('aria-label',t(yes?active.kind:'hole')+' '+(i+1))});
  q('mole-time').textContent=Math.max(0,Math.min(25,Math.ceil((round.endAt-now)/1000)));q('mole-clock').style.transform='scaleX('+Math.max(0,Math.min(1,(round.endAt-now)/25000))+')';
  q('mole-overlay').textContent=now<round.startAt?t('go'):'';
  draw(performance.now());if(now>=round.endAt){finish();return}raf=requestAnimationFrame(tick);
 }
 function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
 function mole(p,target,time){
  const now=Date.now()+offset,progress=Math.min(1,Math.max(0,(now-target.openAt)/85),Math.max(0,(target.closeAt-now)/95));
  ctx.save();ctx.beginPath();ctx.rect(p.x-125,p.y-215,250,258);ctx.clip();ctx.translate(p.x,p.y+85-(progress*135));
  if(target.kind==='bomb'){const grad=ctx.createRadialGradient(-24,-40,5,0,-10,66);grad.addColorStop(0,'#727579');grad.addColorStop(1,'#161d24');ellipse(0,-7,63,65,grad);ctx.strokeStyle='#a57d4c';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(10,-64);ctx.quadraticCurveTo(22,-102,43,-84);ctx.stroke();ellipse(43,-84,7+Math.sin(time/60)*2,7,'#ffd05c');ctx.strokeStyle='#eeaa9c';ctx.lineWidth=6;for(const x of [-23,23]){ctx.beginPath();ctx.moveTo(x-7,-27);ctx.lineTo(x+7,-13);ctx.moveTo(x+7,-27);ctx.lineTo(x-7,-13);ctx.stroke()}}
  else{const gold=target.kind==='gold';const fur=ctx.createLinearGradient(-60,-90,70,35);fur.addColorStop(0,gold?'#ffdf72':'#bd9674');fur.addColorStop(.5,gold?'#dc9f28':'#927052');fur.addColorStop(1,gold?'#a56a19':'#614533');ellipse(-53,-36,20,23,gold?'#c38a26':'#72523b');ellipse(53,-36,20,23,gold?'#c38a26':'#72523b');ellipse(0,-9,66,79,fur);ellipse(0,20,42,39,gold?'#ffedb2':'#dec3a4');ellipse(-26,-27,12,15,'#eee8d6');ellipse(26,-27,12,15,'#eee8d6');ellipse(-24,-27,5,8,'#17231d');ellipse(24,-27,5,8,'#17231d');ellipse(-26,-30,2,3,'#fff');ellipse(22,-30,2,3,'#fff');ellipse(0,3,18,13,gold?'#a06427':'#805740');ellipse(-5,0,6,3,'#ffffff50');ctx.fillStyle='#fff5d8';ctx.fillRect(-12,25,10,15);ctx.fillRect(2,25,10,15);ellipse(-48,55,25,13,gold?'#d6a741':'#8c694d');ellipse(48,55,25,13,gold?'#d6a741':'#8c694d');if(gold){ctx.fillStyle='#ffdc64';ctx.beginPath();ctx.moveTo(-32,-75);ctx.lineTo(-40,-115);ctx.lineTo(-13,-96);ctx.lineTo(0,-124);ctx.lineTo(15,-96);ctx.lineTo(40,-115);ctx.lineTo(32,-75);ctx.fill();ctx.strokeStyle='#fff4a4';ctx.lineWidth=3;ctx.stroke()}}
  ctx.restore();
 }
 function draw(time){
  const sky=ctx.createLinearGradient(0,0,0,690);sky.addColorStop(0,'#91b87a');sky.addColorStop(.25,'#558c4c');sky.addColorStop(1,'#27492d');ctx.fillStyle=sky;ctx.fillRect(0,0,900,690);
  ctx.fillStyle='#ffffff12';for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(550,0);ctx.lineTo(i*240,690);ctx.lineTo(i*240+90,690);ctx.fill()}
  for(let i=0;i<14;i++){const x=i*73-20;ctx.fillStyle='#d4be90';ctx.beginPath();ctx.moveTo(x,85);ctx.lineTo(x,27);ctx.lineTo(x+20,8);ctx.lineTo(x+40,27);ctx.lineTo(x+40,85);ctx.fill()}ctx.fillStyle='#9d9168';ctx.fillRect(0,51,900,12);ctx.fillRect(0,83,900,9);
  for(let i=0;i<75;i++){const x=(i*173)%900,y=104+(i*67)%580;ctx.strokeStyle=i%2?'#9eae58':'#50753a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y-12);ctx.moveTo(x,y);ctx.lineTo(x+6,y-15);ctx.stroke()}
  for(const [i,p]of XY.entries()){
   ellipse(p.x+5,p.y+45,137,63,'#17291d66');ellipse(p.x,p.y+21,133,62,'#8c6747');ellipse(p.x,p.y+9,124,53,'#b08b61');
   const dark=ctx.createRadialGradient(p.x,p.y,10,p.x,p.y+10,120);dark.addColorStop(0,'#0d1c15');dark.addColorStop(1,'#493a29');ellipse(p.x,p.y,118,47,dark);
   const demo=!playing&&!ended&&i===4?{kind:'normal',openAt:Date.now()+offset-150,closeAt:Date.now()+offset+1000}:null;
   if(active?.hole===i)mole(p,active,time);else if(demo)mole(p,demo,time);
   ellipse(p.x,p.y+47,124,12,'#537839');for(let j=0;j<6;j++){const x=p.x-105+j*40;ctx.strokeStyle='#8a9c4b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,p.y+46);ctx.lineTo(x-5,p.y+32);ctx.stroke()}
  }
  if(hitFlash&&time-hitFlash.at<330){const p=XY[hitFlash.hole],r=25+(time-hitFlash.at)/5;ctx.strokeStyle=hitFlash.kind==='bomb'?'#fa8970':'#ffe99b';ctx.lineWidth=5;ctx.globalAlpha=1-(time-hitFlash.at)/330;ctx.beginPath();ctx.arc(p.x,p.y-25,r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
 }
 buttons.forEach((b,i)=>b.addEventListener('pointerdown',e=>{e.preventDefault();b.focus({preventScroll:true});hit(i)}));
 buttons.forEach((b,i)=>b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();hit(i)}}));
 buttons.forEach((b,i)=>b.addEventListener('click',e=>{if(e.detail===0)hit(i)}));
 q('mole-start').addEventListener('click',()=>start(false));q('mole-ranked').addEventListener('click',()=>start(true));q('mole-refresh').addEventListener('click',loadRanking);
 const cleanup=()=>{disposed=true;controller.abort();cancelAnimationFrame(raf);for(const id of timers)clearTimeout(id);for(const el of effectNodes)el.remove();playing=false;};
 cleanup.retranslate=()=>{translate();renderRanking()};translate();draw(0);loadRanking();return cleanup;
};
})();
