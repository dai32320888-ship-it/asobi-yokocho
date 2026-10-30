/* Original thirty-second pixel treasure rooms. Deterministic simulation; no DOM or clocks. */
(function(){
 'use strict';
 const W=240,H=256,TILE=16,COLS=15,ROWS=16,STEP=1/120,MAX_TIME=30,NEEDED=8,MAX_SCORE=1000000,LIMIT=1000000;
 const finite=Number.isFinite,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),int=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b,clone=x=>JSON.parse(JSON.stringify(x)),point=(c,r)=>({x:c*TILE+8,y:r*TILE+8});
 function map(id,theme,spawn,exit,walls,gems,key,chest,enemies,spikes){
  const tiles=Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>r===0||r===ROWS-1||c===0||c===COLS-1?'#':'.'));
  for(const[c,r]of walls)tiles[r][c]='#';
  return {id,theme,tiles:tiles.map(row=>row.join('')),spawn:point(...spawn),exit:point(...exit),items:[...gems.map((p,i)=>({id:i+1,type:'gem',...point(...p),r:4,collected:false,open:false})),{id:11,type:'key',...point(...key),r:4,collected:false,open:false},{id:12,type:'chest',...point(...chest),r:7,collected:false,open:false}],enemies:enemies.map((p,i)=>({id:i+1,type:i===2?'bat':'slime',...point(p[0],p[1]),r:i===2?5:6,homeX:p[0]*16+8,homeY:p[1]*16+8,dirX:p[2]??1,dirY:p[3]??0,stun:0,phase:i*2.1,flash:0})),spikes:spikes.map((p,i)=>({id:i+1,...point(p[0],p[1]),phase:(i*.71)%3.2,warning:false,active:false}))};
 }
 const rect=(x,y,w,h)=>Array.from({length:w*h},(_,i)=>[x+i%w,y+Math.floor(i/w)]);
 const MAPS=[
  map('moss','ruins',[2,13],[12,2],[...rect(5,4,3,3),...rect(3,8,2,2),...rect(8,10,2,2)],[[2,12],[4,12],[6,13],[9,13],[12,12],[12,9],[11,7],[12,5],[9,3],[3,3]],[2,4],[12,3],[[6,10,1,0],[10,5,0,1],[7,8,1,0]],[[6,11],[10,8],[10,3]]),
  map('crystal','mine',[12,13],[2,2],[...rect(8,4,3,2),...rect(4,9,5,1),...rect(10,10,2,2),...rect(3,5,2,2)],[[12,12],[10,13],[8,12],[5,13],[2,12],[2,9],[3,7],[2,5],[5,3],[11,3]],[12,4],[2,3],[[8,7,1,0],[3,10,0,1],[6,5,1,0]],[[8,11],[5,7],[4,3]]),
  map('moon','castle',[7,13],[7,2],[...rect(5,5,1,5),...rect(9,5,1,5),...rect(3,8,2,1),...rect(10,8,2,1),...rect(6,10,3,1)],[[5,13],[3,12],[2,9],[2,6],[3,3],[7,4],[11,3],[12,6],[12,9],[11,12]],[2,2],[12,2],[[7,7,0,1],[11,10,1,0],[4,5,1,0]],[[3,6],[7,6],[11,6]])
 ];
 // Deep-frozen map data can be read by the renderer and ordinary-input route planners.
 function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
 const Data=freeze({width:W,height:H,tileSize:TILE,columns:COLS,rows:ROWS,maxTime:MAX_TIME,requiredGems:NEEDED,totalGems:10,playerSpeed:72,dashSpeed:210,dashDuration:.18,dashCooldown:.95,spikeCycle:3.2,maps:MAPS});
 const fresh=()=>({version:1,best:0,plays:0,clears:0,lastScore:0,lastWon:false,stage:0,stageBests:[0,0,0],stageClears:[0,0,0],bestCombo:0});
 class TreasureModel{
  constructor(saved){this.events=[];this._acc=0;this._ids=20;this.state=this._ready(this._load(saved)||fresh());}
  _load(s){if(!s||s.version!==1||!int(s.best,0,MAX_SCORE)||!int(s.plays,0,LIMIT)||!int(s.clears,0,s.plays)||!int(s.lastScore,0,s.best)||typeof s.lastWon!=='boolean'||!int(s.stage,0,2)||!int(s.bestCombo,0,10)||!Array.isArray(s.stageBests)||s.stageBests.length!==3||!s.stageBests.every(n=>int(n,0,s.best))||!Array.isArray(s.stageClears)||s.stageClears.length!==3||!s.stageClears.every(n=>int(n,0,s.clears))||s.stageClears.reduce((a,b)=>a+b,0)!==s.clears)return null;if(s.plays===0&&(s.best||s.clears||s.lastScore||s.lastWon||s.bestCombo))return null;return Object.fromEntries(Object.keys(fresh()).map(k=>[k,clone(s[k])]));}
  _progress(){return Object.fromEntries(Object.keys(fresh()).map(k=>[k,clone(this.state[k])]));}
  _ready(progress){const map=MAPS[progress.stage];return {...progress,mode:'ready',time:0,timeLeft:MAX_TIME,score:0,gems:0,requiredGems:NEEDED,totalGems:10,key:false,chestOpened:false,combo:0,runBestCombo:0,comboTimer:0,player:{...map.spawn,r:5,hp:3,maxHp:3,facingX:0,facingY:-1,invuln:0,dashTime:0,dashCooldown:0,walkTime:0},items:clone(map.items),enemies:clone(map.enemies),spikes:clone(map.spikes),exit:{...map.exit,open:false},effects:[],moveX:0,moveY:0,reason:'',stepClock:0,warned10:false,warned5:false};}
  _ok(key){return {ok:true,key};}
  _fail(key){return {ok:false,key};}
  snapshot(){return clone(this.state);}
  drainEvents(){return this.events.splice(0);}
  _event(type,extra={}){if(this.events.length<80)this.events.push({type,...extra});}
  _effect(type,x,y,r=12,duration=.4){this.state.effects.push({id:++this._ids,type,x,y,r,age:0,duration});if(this.state.effects.length>50)this.state.effects.shift();}
  selectStage(stage){if(!int(stage,0,2))return this._fail('stage');if(['playing','paused'].includes(this.state.mode))return this._fail('running');const progress=this._progress();progress.stage=stage;this.state=this._ready(progress);this._acc=0;this.events=[];this._event('select',{stage});return this._ok('selected');}
  start(stage=this.state.stage){if(!int(stage,0,2))return this._fail('stage');if(['playing','paused'].includes(this.state.mode))return this._fail('running');if(this.state.plays>=LIMIT)return this._fail('limit');const progress=this._progress();progress.stage=stage;this.state=this._ready(progress);this.state.mode='playing';this._acc=0;this.events=[];this._event('start',{stage});return this._ok('started');}
  setMove(x,y){if(!finite(x)||!finite(y))return this._fail('input');const length=Math.hypot(x,y),scale=length>1?1/length:1;this.state.moveX=x*scale;this.state.moveY=y*scale;return this._ok('move');}
  pause(){if(this.state.mode!=='playing')return this._fail('notPlaying');this.state.mode='paused';this.setMove(0,0);return this._ok('paused');}
  resume(){if(this.state.mode!=='paused')return this._fail('notPaused');this.state.mode='playing';this.setMove(0,0);return this._ok('resumed');}
  cancel(){if(!['playing','paused'].includes(this.state.mode))return this._fail('notRunning');this.state=this._ready(this._progress());this._acc=0;this.events=[];return this._ok('cancelled');}
  dash(){const s=this.state,p=s.player;if(s.mode!=='playing'||p.dashCooldown>0)return this._fail('cooldown');p.dashTime=.18;p.dashCooldown=.95;p.invuln=Math.max(p.invuln,.2);this._event('dash');this._effect('dash',p.x,p.y,16,.22);return this._ok('dashed');}
  _wall(c,r){return r<0||c<0||r>=ROWS||c>=COLS||MAPS[this.state.stage].tiles[r][c]==='#';}
  _free(x,y,r){for(let cy=Math.floor((y-r)/TILE);cy<=Math.floor((y+r-.000001)/TILE);cy++)for(let cx=Math.floor((x-r)/TILE);cx<=Math.floor((x+r-.000001)/TILE);cx++)if(this._wall(cx,cy))return false;return true;}
  _move(body,dx,dy){const count=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/2));let hitX=false,hitY=false;for(let i=0;i<count;i++){const nx=body.x+dx/count;if(this._free(nx,body.y,body.r))body.x=nx;else hitX=true;const ny=body.y+dy/count;if(this._free(body.x,ny,body.r))body.y=ny;else hitY=true;}return {hitX,hitY};}
  _hurt(kind){const s=this.state,p=s.player;if(s.mode!=='playing'||p.invuln>0||p.dashTime>0)return;p.hp--;p.invuln=1.25;s.combo=0;s.comboTimer=0;this._effect('hurt',p.x,p.y,18,.35);this._event('hurt',{kind,hp:p.hp});if(p.hp<=0)this._finish(false,'health');}
  _finish(won,reason=won?'escaped':'time'){const s=this.state;if(s.mode!=='playing')return;s.mode=won?'won':'lost';s.reason=reason;this.setMove(0,0);s.player.dashTime=0;if(won)s.score=Math.min(MAX_SCORE,s.score+500+s.player.hp*100+Math.round(s.timeLeft*20)+(s.gems===10?200:0));s.plays++;if(won){s.clears++;s.stageClears[s.stage]++;}s.best=Math.max(s.best,s.score);s.stageBests[s.stage]=Math.max(s.stageBests[s.stage],s.score);s.bestCombo=Math.max(s.bestCombo,s.runBestCombo);s.lastScore=s.score;s.lastWon=won;this._effect(won?'win':'lose',s.player.x,s.player.y,40,.8);this._event(won?'win':'lose',{score:s.score,reason});}
  update(dt){if(!finite(dt)||dt<=0)return this._fail('time');if(this.state.mode!=='playing')return this._ok('idle');this._acc+=Math.min(.1,dt);let guard=0;while(this._acc+1e-10>=STEP&&guard++<13&&this.state.mode==='playing'){this._acc-=STEP;this._step(STEP);}return this._ok('updated');}
  _step(dt){
   const s=this.state,p=s.player;s.time=Math.min(MAX_TIME,s.time+dt);s.timeLeft=Math.max(0,MAX_TIME-s.time);p.invuln=Math.max(0,p.invuln-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);s.comboTimer=Math.max(0,s.comboTimer-dt);if(s.comboTimer===0)s.combo=0;
   for(const fx of s.effects)fx.age+=dt;s.effects=s.effects.filter(fx=>fx.age<fx.duration);
   const moving=Math.hypot(s.moveX,s.moveY)>.01;if(moving&&p.dashTime<=0){p.facingX=s.moveX;p.facingY=s.moveY;}
   const dashing=p.dashTime>0,dx=dashing?p.facingX:s.moveX,dy=dashing?p.facingY:s.moveY,speed=dashing?210:72;
   if(Math.hypot(dx,dy)>.01){const beforeX=p.x,beforeY=p.y;this._move(p,dx*speed*dt,dy*speed*dt);const distance=Math.hypot(p.x-beforeX,p.y-beforeY);p.walkTime+=distance/72;s.stepClock+=distance;if(s.stepClock>=12){s.stepClock%=12;this._event('step');}if(dashing&&Math.floor(s.time*60)%3===0)this._effect('trail',p.x,p.y,7,.16);}
   p.dashTime=Math.max(0,p.dashTime-dt);
   for(const enemy of s.enemies){enemy.flash=Math.max(0,enemy.flash-dt);enemy.phase+=dt;enemy.stun=Math.max(0,enemy.stun-dt);if(enemy.stun<=0){let ex,ey;if(enemy.type==='bat'){const distance=Math.hypot(p.x-enemy.x,p.y-enemy.y),chase=distance<88,tx=chase?p.x:enemy.homeX+Math.sin(enemy.phase*1.7)*20,ty=chase?p.y:enemy.homeY+Math.cos(enemy.phase*1.3)*16,angle=Math.atan2(ty-enemy.y,tx-enemy.x);ex=Math.cos(angle)*25;ey=Math.sin(angle)*25;}else{ex=enemy.dirX*23;ey=enemy.dirY*23;}
    const result=this._move(enemy,ex*dt,ey*dt);if(result.hitX)enemy.dirX*=-1;if(result.hitY)enemy.dirY*=-1;
   }
   if(enemy.stun<=0&&Math.hypot(p.x-enemy.x,p.y-enemy.y)<p.r+enemy.r){if(dashing){enemy.stun=1.1;enemy.flash=.22;this._move(enemy,p.facingX*12,p.facingY*12);this._effect('enemy',enemy.x,enemy.y,15,.35);this._event('enemy',{enemy:enemy.type});}else this._hurt('enemy');}
   }
   for(const spike of s.spikes){const phase=(s.time+spike.phase)%3.2;spike.warning=phase>=1.85&&phase<2.5;spike.active=phase>=2.5;if(spike.active&&Math.abs(p.x-spike.x)<p.r+5&&Math.abs(p.y-spike.y)<p.r+5)this._hurt('spike');}
   if(s.mode!=='playing')return;
   for(const item of s.items){if(item.collected||item.open||Math.hypot(item.x-p.x,item.y-p.y)>item.r+p.r+1)continue;if(item.type==='gem'){item.collected=true;s.gems++;s.combo=Math.min(10,s.combo+1);s.runBestCombo=Math.max(s.runBestCombo,s.combo);s.comboTimer=2;const value=100+(Math.min(6,s.combo)-1)*10;s.score=Math.min(MAX_SCORE,s.score+value);this._effect('gem',item.x,item.y,13,.38);this._event('gem',{count:s.gems,value,combo:s.combo});if(s.gems>=NEEDED&&!s.exit.open){s.exit.open=true;this._effect('gate',s.exit.x,s.exit.y,22,.7);this._event('gate');}}
    else if(item.type==='key'){item.collected=true;s.key=true;this._effect('key',item.x,item.y,13,.4);this._event('key');}
    else if(item.type==='chest'&&s.key){item.open=true;s.key=false;s.chestOpened=true;s.score=Math.min(MAX_SCORE,s.score+500);this._effect('chest',item.x,item.y,24,.7);this._event('chest',{value:500});}
   }
   if(s.exit.open&&Math.hypot(s.exit.x-p.x,s.exit.y-p.y)<9){this._finish(true);return;}
   if(!s.warned10&&s.timeLeft<=10){s.warned10=true;this._event('warning',{remaining:10});}if(!s.warned5&&s.timeLeft<=5){s.warned5=true;this._event('warning',{remaining:5});}
   if(s.timeLeft<=.000001){s.time=MAX_TIME;s.timeLeft=0;this._finish(false,'time');}
  }
 }
 window.AsobiTreasureData=Data;window.AsobiTreasureModel=TreasureModel;
})();
