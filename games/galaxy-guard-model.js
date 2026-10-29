/* Original formation-and-dive shooter. Pure deterministic state; no DOM or timers. */
(function(){
 'use strict';
 const W=480,H=640,LIMIT=1000000,MAX_SCORE=10000000,STEP=1/120;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=Number.isFinite,int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b,clone=x=>JSON.parse(JSON.stringify(x));
 const TYPES=Object.freeze({drone:Object.freeze({hp:1,r:15,score:80,color:'#63dfdf'}),weaver:Object.freeze({hp:2,r:17,score:120,color:'#c494ff'}),diver:Object.freeze({hp:1,r:16,score:150,color:'#ffb064'}),armored:Object.freeze({hp:3,r:20,score:200,color:'#b6e978'})});
 window.AsobiGalaxyData=Object.freeze({width:W,height:H,playerY:570,playerRadius:12,playerSpeed:340,maxHp:3,maxLevel:3,enemyTypes:TYPES,waves:3,bossHp:110,maxTime:90});
 const fresh=()=>({version:1,best:0,plays:0,clears:0,bestCombo:0,lastScore:0,lastWon:false,seed:0x725c18a3});
 class GalaxyModel{
  constructor(saved){this.events=[];this._ids=0;this._acc=0;this.state=this._ready(this._load(saved)||fresh());}
  _load(s){if(!s||s.version!==1||!int(s.best,0,MAX_SCORE)||!int(s.plays,0,LIMIT)||!int(s.clears,0,s.plays)||!int(s.bestCombo,0,100)||!int(s.lastScore,0,s.best)||typeof s.lastWon!=='boolean'||!int(s.seed,1,4294967295))return null;if(s.plays===0&&(s.best||s.clears||s.bestCombo||s.lastScore||s.lastWon))return null;return Object.fromEntries(Object.keys(fresh()).map(k=>[k,s[k]]));}
  _progress(){return Object.fromEntries(Object.keys(fresh()).map(k=>[k,this.state[k]]));}
  _ready(progress){return {...progress,mode:'ready',player:{x:240,y:570,r:12,hp:3,maxHp:3,invuln:0,level:1},wave:1,time:0,waveTime:0,score:0,kills:0,bombs:2,combo:0,runBestCombo:0,comboTimer:0,enemies:[],shots:[],bullets:[],pickups:[],effects:[],boss:null,intermission:0,targetX:240,move:0,reason:'',shotClock:.12,attackClock:1.4,diveClock:2.5};}
  _ok(key){return {ok:true,key};}
  _fail(key){return {ok:false,key};}
  _event(type,extra={}){if(this.events.length<100)this.events.push({type,...extra});}
  _effect(type,x,y,r=20,duration=.45,color='#ffd78a'){this.state.effects.push({id:++this._ids,type,x,y,r,age:0,duration,color});if(this.state.effects.length>90)this.state.effects.shift();}
  _random(){const s=this.state;s.seed=((Math.imul(s.seed,1664525)+1013904223)>>>0)||1;return s.seed/4294967296;}
  snapshot(){return clone(this.state);}
  drainEvents(){return this.events.splice(0);}
  start(){const s=this.state;if(!['ready','won','lost'].includes(s.mode))return this._fail('running');if(s.plays>=LIMIT)return this._fail('limit');this.state=this._ready(this._progress());this._acc=0;this.events=[];this.state.mode='playing';this._event('start');this._spawnWave(1);return this._ok('started');}
  cancel(){if(!['playing','paused'].includes(this.state.mode))return this._fail('notRunning');this.state=this._ready(this._progress());this._acc=0;this.events=[];return this._ok('cancelled');}
  setTarget(x){if(!finite(x))return this._fail('input');this.state.targetX=clamp(x,20,W-20);return this._ok('target');}
  setMove(value){if(!finite(value))return this._fail('input');this.state.move=clamp(value,-1,1);if(value===0)this.state.targetX=this.state.player.x;return this._ok('move');}
  pause(){if(this.state.mode!=='playing')return this._fail('notPlaying');this.state.mode='paused';this.state.move=0;this.state.targetX=this.state.player.x;return this._ok('paused');}
  resume(){if(this.state.mode!=='paused')return this._fail('notPaused');this.state.mode='playing';this.state.move=0;this.state.targetX=this.state.player.x;return this._ok('resumed');}
  bomb(){const s=this.state;if(s.mode!=='playing'||s.bombs<=0)return this._fail('noBomb');s.bombs--;s.bullets=[];s.player.invuln=Math.max(s.player.invuln,1.7);this._effect('bomb',s.player.x,s.player.y,660,.7,'#9befff');this._event('bomb');for(const e of [...s.enemies])this._damageEnemy(e,4);if(s.boss)this._damageBoss(24);return this._ok('bomb');}
  _spawnWave(n){const s=this.state;s.wave=n;s.waveTime=0;s.intermission=0;s.bullets=[];s.shots=[];s.attackClock=1.6;s.diveClock=2.4;this._effect('warp',240,180,190,.8,'#8bdfff');if(n===4){s.enemies=[];s.boss={x:240,y:150,r:52,hp:110,maxHp:110,phase:1,warning:null,attackClock:1.2,flash:0};this._event('boss');return;}
   const patterns=[['drone','weaver','drone','diver','drone','weaver'],['weaver','diver','armored','armored','diver','weaver'],['armored','weaver','diver','diver','weaver','armored']];
   for(let row=0;row<3;row++)for(let col=0;col<6;col++){const type=patterns[(n+row-1)%3][col],d=TYPES[type];s.enemies.push({id:++this._ids,type,x:65+col*70,y:105+row*51,homeX:65+col*70,homeY:105+row*51,r:d.r,hp:d.hp,maxHp:d.hp,mode:'formation',angle:0,flash:0,diveTime:0,diveX:0,diveTarget:0,phase:this._random()*Math.PI*2});}
   this._event('wave',{wave:n});
  }
  _shoot(){const s=this.state,p=s.player,spread=p.level===1?[0]:p.level===2?[-.06,.06]:[-.14,0,.14];for(const a of spread)s.shots.push({id:++this._ids,x:p.x+Math.sin(a)*18,y:p.y-19,vx:Math.sin(a)*590,vy:-Math.cos(a)*590,r:4});this._event('shoot',{level:p.level,x:p.x,y:p.y});if(s.shots.length>100)s.shots.splice(0,s.shots.length-100);}
  _orb(x,y,vx,vy,r=6,kind='orb'){if(this.state.bullets.length<36)this.state.bullets.push({id:++this._ids,x,y,vx,vy,r,kind,life:8});}
  _damageEnemy(e,damage){const s=this.state;if(!s.enemies.includes(e))return;e.hp-=damage;e.flash=.12;if(e.hp>0){this._effect('spark',e.x,e.y,13,.16,'#fff8da');this._event('hit',{x:e.x,y:e.y});return;}s.enemies.splice(s.enemies.indexOf(e),1);s.kills++;s.combo=Math.min(100,s.combo+1);s.runBestCombo=Math.max(s.runBestCombo,s.combo);s.comboTimer=3.2;const value=Math.round(TYPES[e.type].score*(1+Math.min(20,s.combo-1)*.05));s.score=Math.min(MAX_SCORE,s.score+value);this._effect('explode',e.x,e.y,e.r*2,.48,TYPES[e.type].color);this._event('kill',{x:e.x,y:e.y,enemy:e.type,value,combo:s.combo});if(s.kills%6===0){const type=s.kills%12===0&&s.player.hp<3?'repair':'power';s.pickups.push({id:++this._ids,type,x:e.x,y:e.y,r:13,age:0});}}
  _damageBoss(damage){const s=this.state,b=s.boss;if(!b)return;b.hp=Math.max(0,b.hp-damage);b.flash=.11;this._effect('spark',b.x+(this._random()-.5)*60,b.y+25,16,.2,'#ffe2b9');if(b.hp===0){this._effect('explode',b.x,b.y,130,1.2,'#ffc37f');this._event('kill',{x:b.x,y:b.y,enemy:'boss',value:2500,combo:s.combo});s.score=Math.min(MAX_SCORE,s.score+2500);s.boss=null;this._finish(true);}}
  _hurt(){const s=this.state,p=s.player;if(p.invuln>0||s.mode!=='playing')return;p.hp--;p.invuln=1.75;s.combo=0;s.comboTimer=0;this._effect('hurt',p.x,p.y,42,.45,'#ff9d9a');this._event('hurt',{hp:p.hp});if(p.hp<=0)this._finish(false,'hull');}
  _finish(won,reason='clear'){const s=this.state;if(s.mode!=='playing')return;s.mode=won?'won':'lost';s.reason=reason;s.move=0;s.targetX=s.player.x;s.shots=[];s.bullets=[];if(won)s.score=Math.min(MAX_SCORE,s.score+Math.round(500+s.player.hp*250+Math.max(0,90-s.time)*10));s.plays=Math.min(LIMIT,s.plays+1);if(won)s.clears=Math.min(s.plays,s.clears+1);s.best=Math.max(s.best,s.score);s.bestCombo=Math.max(s.bestCombo,s.runBestCombo);s.lastScore=s.score;s.lastWon=won;this._event(won?'win':'lose',{score:s.score});}
  update(dt){if(!finite(dt)||dt<=0)return this._fail('time');if(this.state.mode!=='playing')return this._ok('idle');this._acc+=Math.min(dt,.1);let guard=0;while(this._acc+1e-10>=STEP&&this.state.mode==='playing'&&guard++<13){this._acc-=STEP;this._step(STEP);}return this._ok('updated');}
  _step(dt){const s=this.state,p=s.player;s.time+=dt;s.waveTime+=dt;p.invuln=Math.max(0,p.invuln-dt);s.comboTimer=Math.max(0,s.comboTimer-dt);if(s.comboTimer===0)s.combo=0;const goal=s.move?p.x+s.move*340*dt:s.targetX;p.x=clamp(p.x+clamp(goal-p.x,-340*dt,340*dt),20,W-20);s.shotClock-=dt;if(s.shotClock<=0){s.shotClock+=p.level>=3?.135:.16;this._shoot();}
   for(const fx of s.effects)fx.age+=dt;s.effects=s.effects.filter(fx=>fx.age<fx.duration);
   for(const e of s.enemies){e.flash=Math.max(0,e.flash-dt);if(e.mode==='formation'){e.x=e.homeX+Math.sin(s.waveTime*1.15)*24;e.y=e.homeY+Math.sin(s.waveTime*1.9+e.phase)*5;e.angle=Math.sin(s.waveTime*2+e.phase)*.08;}else{e.diveTime+=dt;const t=e.diveTime/4.4;if(t>=1){e.mode='formation';e.angle=0;}else{const wave=e.type==='weaver'?Math.sin(t*Math.PI*5)*42:Math.sin(t*Math.PI*2)*65;e.x=clamp(e.diveX+(e.diveTarget-e.diveX)*Math.sin(t*Math.PI)+wave,20,W-20);e.y=e.homeY+Math.sin(t*Math.PI)*Math.min(480,582-e.homeY);e.angle=Math.cos(t*Math.PI)*.85;}if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r-3)this._hurt();}}
   if(s.enemies.length){s.attackClock-=dt;s.diveClock-=dt;if(s.attackClock<=0){s.attackClock=1.28-s.wave*.10;const candidates=s.enemies.filter(e=>e.y<420),e=candidates[Math.floor(this._random()*candidates.length)];if(e){const dx=clamp((p.x-e.x)*.35,-65,65),vy=151+s.wave*13;this._orb(e.x,e.y+e.r,dx,vy,6);}}
    if(s.diveClock<=0&&s.enemies.filter(e=>e.mode==='diving').length<2){s.diveClock=2.9-s.wave*.18;const candidates=s.enemies.filter(e=>e.mode==='formation'),e=candidates[Math.floor(this._random()*candidates.length)];if(e){e.mode='diving';e.diveTime=0;e.diveX=e.x;e.diveTarget=clamp(p.x,50,W-50);this._event('dive',{x:e.x,y:e.y});}}}
   if(s.mode!=='playing')return;if(s.boss)this._bossStep(dt);
   for(const shot of s.shots){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;let used=false;for(const e of [...s.enemies])if(Math.hypot(shot.x-e.x,shot.y-e.y)<shot.r+e.r){this._damageEnemy(e,1);used=true;break;}if(!used&&s.boss&&Math.hypot((shot.x-s.boss.x)*.92,shot.y-s.boss.y)<s.boss.r+shot.r){this._damageBoss(1);used=true;}if(used)shot.y=-100;}
   if(s.mode!=='playing')return;s.shots=s.shots.filter(b=>b.y>-30&&b.x>-20&&b.x<W+20);
   for(const b of s.bullets){b.life-=dt;if(b.kind!=='beam'){b.x+=b.vx*dt;b.y+=b.vy*dt;}const collision=b.kind==='beam'?Math.abs(b.x-p.x)<b.w/2+p.r-4&&Math.abs(b.y-p.y)<b.h/2+p.r:Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r-3;if(collision){this._hurt();if(b.kind!=='beam')b.life=0;}}
   if(s.mode!=='playing')return;s.bullets=s.bullets.filter(b=>b.life>0&&b.x>-30&&b.x<W+30&&b.y<H+30);
   for(const item of s.pickups){item.age+=dt;item.y+=122*dt;if(Math.hypot(item.x-p.x,item.y-p.y)<item.r+p.r+13){if(item.type==='repair')p.hp=Math.min(3,p.hp+1);else if(p.level<3)p.level++;else s.score=Math.min(MAX_SCORE,s.score+120);this._effect('power',p.x,p.y,45,.5,item.type==='repair'?'#98edc4':'#83dfff');this._event('power',{kind:item.type,level:p.level,hp:p.hp});item.y=H+100;}}
   s.pickups=s.pickups.filter(i=>i.y<H+30);
   if(s.mode!=='playing')return;
   if(!s.boss&&s.wave<4&&(s.enemies.length===0||s.waveTime>=17)){if(s.intermission===0){s.intermission=.65;s.enemies=[];s.bullets=[];s.score=Math.min(MAX_SCORE,s.score+150);this._event('clearWave',{wave:s.wave});}else{s.intermission-=dt;if(s.intermission<=0)this._spawnWave(s.wave+1);}}
   if(s.time>=90)this._finish(false,'time');
  }
  _bossStep(dt){const s=this.state,b=s.boss;b.x=240+Math.sin(s.waveTime*.85)*125;b.y=150+Math.sin(s.waveTime*1.35)*14;b.flash=Math.max(0,b.flash-dt);b.phase=b.hp>72?1:b.hp>36?2:3;
   if(b.warning){b.warning.ttl-=dt;if(b.warning.ttl<=0){const kind=b.warning.kind;if(kind==='beam')s.bullets.push({id:++this._ids,kind:'beam',x:b.warning.x,y:350,vx:0,vy:0,r:24,w:48,h:480,life:.38});else{const count=kind==='cross'?9:7,speed=150+b.phase*13;for(let i=0;i<count;i++){const a=Math.PI/2+(i-(count-1)/2)*.18;this._orb(b.x,b.y+35,Math.cos(a)*speed,Math.sin(a)*speed,6);}}this._event('bossShot',{kind});b.warning=null;b.attackClock=b.phase===3?1.25:1.65;}}
   else{b.attackClock-=dt;if(b.attackClock<=0){const phaseIndex=Math.floor(s.waveTime/2.4)%3,kind=phaseIndex===1?'beam':phaseIndex===2?'cross':'fan';b.warning={kind,x:pinnedX(s.player.x),ttl:.85,duration:.85,width:48};this._event('warning',{kind,x:b.warning.x});}}
  }
 }
 const pinnedX=x=>clamp(x,35,W-35);
 window.AsobiGalaxyModel=GalaxyModel;
})();
