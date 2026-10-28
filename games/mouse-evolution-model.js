/* Mouse Big Bang: local, deterministic action simulation. No DOM or timers. */
(function(){
'use strict';
const W=1800,H=1400,TAU=Math.PI*2;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const finite=(n,min,max,fallback)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max?n:fallback;
const integer=(n,min,max,fallback)=>Number.isInteger(n)?finite(n,min,max,fallback):fallback;
const ANIMALS={
 beetle:{r:17,hp:24,speed:78,damage:8,loot:7,behavior:'skitter'},
 frog:{r:25,hp:38,speed:91,damage:11,loot:10,behavior:'charge'},
 rat:{r:22,hp:34,speed:112,damage:10,loot:9,behavior:'melee'},
 snake:{r:27,hp:42,speed:112,damage:12,loot:11,behavior:'charge'},
 cat:{r:31,hp:48,speed:119,damage:13,loot:12,behavior:'charge'},
 fox:{r:31,hp:50,speed:123,damage:13,loot:13,behavior:'charge'},
 boar:{r:34,hp:56,speed:92,damage:15,loot:14,behavior:'charge'},
 bear:{r:36,hp:62,speed:83,damage:16,loot:15,behavior:'melee'},
 eagle:{r:26,hp:37,speed:140,damage:11,loot:11,behavior:'charge'},
 deer:{r:30,hp:40,speed:129,damage:10,loot:11,behavior:'skitter'},
 elephant:{r:40,hp:70,speed:76,damage:16,loot:17,behavior:'charge'},
 whale:{r:42,hp:74,speed:82,damage:15,loot:18,behavior:'charge'},
 dino:{r:39,hp:76,speed:106,damage:17,loot:19,behavior:'melee'},
 cosmic:{r:38,hp:80,speed:111,damage:16,loot:20,behavior:'charge'}
};
const bounds=[.1,.7,4,30,250,3000,80000,900000,1800000,12742000];
const stageData=[
 ['garden',['beetle','frog'],'frog',72],
 ['yard',['rat','frog','cat'],'cat',82],
 ['forest',['snake','fox','deer'],'fox',94],
 ['savanna',['boar','deer','eagle'],'boar',106],
 ['coast',['bear','eagle','snake'],'bear',118],
 ['continent',['elephant','bear','whale'],'elephant',130],
 ['sky',['whale','dino','eagle'],'whale',142],
 ['orbit',['dino','cosmic','whale'],'dino',154],
 ['earth',['cosmic','dino'],'cosmic',168]
];
const STAGES=stageData.map(([world,animals,boss,goal],index)=>Object.freeze({key:world,world,minSize:bounds[index],maxSize:bounds[index+1],goal,animals:Object.freeze(animals),boss}));
const GENES=Object.freeze(['speed','power','armor']);
const data=Object.freeze({STAGES:Object.freeze(STAGES),ANIMALS:Object.freeze(ANIMALS),GENES,W,H});
class AsobiMouseModel{
 constructor(saved){
  this._seed=0x15af409d;this._id=0;this._events=[];this._spawnClock=0;this._foodClock=0;this._dashHits=new Set();
  const valid=saved&&typeof saved==='object'&&!Array.isArray(saved)&&saved.version===1?saved:{};
  const stage=integer(valid.stage,0,STAGES.length-1,0),spec=STAGES[stage];
  const genes=Object.fromEntries(GENES.map(key=>[key,integer(valid.genes?.[key],0,9,0)]));
  const maxHp=100+genes.armor*18;
  this.state={version:1,mode:'ready',stage,xp:finite(valid.xp,0,spec.goal,0),goal:spec.goal,score:integer(valid.score,0,1000000000,0),time:finite(valid.time,0,10000000,0),generation:integer(valid.generation,1,100,1),genes,
   player:{x:finite(valid.player?.x,60,W-60,W/2),y:finite(valid.player?.y,60,H-60,H/2),r:24,size:spec.minSize,hp:finite(valid.player?.hp,0,maxHp,maxHp),maxHp,facing:finite(valid.player?.facing,-Math.PI,Math.PI,0),attackT:0,attackCd:0,dashT:0,dashCd:0,invuln:1.2,hitFlash:0,velocityX:0,velocityY:0},
   enemies:[],foods:[],mate:{x:W/2+310,y:H/2-170,r:24,ready:false},effects:[],bossDefeated:valid.bossDefeated===true,bossSpawned:false,stageBred:valid.stageBred===true,breeds:integer(valid.breeds,0,100,0),kills:integer(valid.kills,0,1000000,0),foodsEaten:integer(valid.foodsEaten,0,1000000,0),transition:0};
  if(valid.mode==='dead'||this.state.player.hp===0){this.state.mode='dead';this.state.player.hp=0;}
  else if(valid.mode==='won'&&stage===8&&this.state.xp>=spec.goal&&this.state.bossDefeated)this.state.mode='won';
  else if(valid.mode==='paused'||valid.mode==='playing'||valid.mode==='breeding')this.state.mode='paused';
  this._buildWorld();this._syncGrowth();
  if(this.state.mode==='won'){this.state.player.size=12742000;this.state.enemies=[];this.state.foods=[];}
 }
 _random(){let x=this._seed;x^=x<<13;x^=x>>>17;x^=x<<5;this._seed=x>>>0;return this._seed/4294967296;}
 _between(min,max){return min+(max-min)*this._random();}
 _event(type,extra={}){if(this._events.length<64)this._events.push({type,...extra});}
 _effect(type,x,y,extra={}){const life=extra.life||.45;this.state.effects.push({type,x,y,life,maxLife:life,...extra});if(this.state.effects.length>120)this.state.effects.splice(0,this.state.effects.length-120);}
 _location(minDistance=270){
  const p=this.state.player;
  for(let tries=0;tries<20;tries++){const angle=this._between(0,TAU),dist=this._between(minDistance,Math.max(minDistance+100,650));const x=clamp(p.x+Math.cos(angle)*dist,75,W-75),y=clamp(p.y+Math.sin(angle)*dist,75,H-75);if(Math.hypot(x-p.x,y-p.y)>=minDistance*.8)return{x,y};}
  return{x:p.x<W/2?W-130:130,y:p.y<H/2?H-130:130};
 }
 _spawnEnemy(type,boss=false){
  const a=ANIMALS[type]||ANIMALS.beetle,position=this._location(boss?390:290),hp=boss?108+this.state.stage*13:a.hp;
  const enemy={id:++this._id,type,...position,r:boss?Math.max(48,a.r*1.55):a.r,hp,maxHp:hp,facing:this._between(-Math.PI,Math.PI),phase:'wander',phaseTime:this._between(.7,2),boss,hitFlash:0,stun:0,vx:0,vy:0,chargeX:0,chargeY:0};
  this.state.enemies.push(enemy);if(boss){this.state.bossSpawned=true;this._effect('boss',position.x,position.y,{life:1.2});}return enemy;
 }
 _spawnFood(position,value){
  const p=position||this._location(70),types=this.state.stage<3?['seed','berry','cheese']:this.state.stage<6?['berry','cheese','leaf']:['star','berry','cheese'];
  this.state.foods.push({id:++this._id,x:clamp(p.x,30,W-30),y:clamp(p.y,30,H-30),r:value>=4?11:8,type:types[Math.floor(this._random()*types.length)],value:value||Math.floor(this._between(2,5))});
 }
 _buildWorld(){
  const s=this.state;s.enemies=[];s.foods=[];s.effects=[];s.bossSpawned=false;this._spawnClock=0;this._foodClock=0;
  const spec=STAGES[s.stage];for(let i=0;i<9;i++)this._spawnEnemy(spec.animals[i%spec.animals.length]);
  for(let i=0;i<28;i++){if(i<8){const a=i/8*TAU;this._spawnFood({x:s.player.x+Math.cos(a)*110,y:s.player.y+Math.sin(a)*110},3);}else this._spawnFood();}
  s.mate={x:clamp(s.player.x+300,120,W-120),y:clamp(s.player.y-160,120,H-120),r:24,ready:!s.stageBred&&s.xp>=s.goal*.3};
  if(!s.bossDefeated&&s.xp>=s.goal*.5)this._spawnEnemy(spec.boss,true);
 }
 _syncGrowth(){const s=this.state,p=s.player,progress=clamp(s.xp/s.goal,0,1),spec=STAGES[s.stage];p.r=24+progress*18;p.size=spec.minSize*Math.pow(spec.maxSize/spec.minSize,progress);p.maxHp=100+s.genes.armor*18;p.hp=clamp(p.hp,0,p.maxHp);}
 start(){if(this.state.mode==='ready'||this.state.mode==='paused'){this.state.mode='playing';return true;}return false;}
 pause(){if(this.state.mode==='playing'){this.state.mode='paused';return true;}return false;}
 resume(){return this.start();}
 canBreed(){const s=this.state;return s.mode==='playing'&&s.mate.ready&&!s.stageBred&&Math.hypot(s.player.x-s.mate.x,s.player.y-s.mate.y)<=s.player.r+s.mate.r+75;}
 chooseGene(key){
  const s=this.state;if(s.mode!=='breeding'||!GENES.includes(key)||s.stageBred||s.genes[key]>=9)return false;
  s.genes[key]++;s.generation=Math.min(100,s.generation+1);s.breeds++;s.stageBred=true;s.mate.ready=false;this._syncGrowth();s.player.hp=Math.min(s.player.maxHp,s.player.hp+s.player.maxHp*.35);s.player.invuln=1.7;s.mode='playing';
  this._effect('breed',s.player.x,s.player.y,{life:1.5,gene:key});this._event('breed',{gene:key,generation:s.generation});return true;
 }
 restartStage(){
  const s=this.state;if(s.mode!=='dead')return false;s.xp=0;s.bossDefeated=false;s.player.x=W/2;s.player.y=H/2;s.player.hp=s.player.maxHp;s.player.attackT=0;s.player.attackCd=0;s.player.dashT=0;s.player.dashCd=0;s.player.invuln=2;s.player.hitFlash=0;s.mode='playing';this._dashHits.clear();this._buildWorld();this._syncGrowth();return true;
 }
 _gain(value){
  const s=this.state;s.xp=Math.min(s.goal,s.xp+value);s.score=Math.min(1000000000,s.score+Math.round(value*10*(s.stage+1)));this._syncGrowth();
  if(!s.stageBred&&!s.mate.ready&&s.xp>=s.goal*.3){s.mate.ready=true;this._effect('heart',s.mate.x,s.mate.y,{life:1.4});this._event('mateReady');}
  if(!s.bossDefeated&&!s.bossSpawned&&s.xp>=s.goal*.5)this._spawnEnemy(STAGES[s.stage].boss,true);
 }
 _hitEnemy(enemy,damage,nx,ny,kind){
  if(enemy.hp<=0)return;enemy.hp=Math.max(0,enemy.hp-damage);enemy.hitFlash=.15;
  // A boss keeps its visibly announced charge. Holding attack cannot stunlock
  // it out of the only dangerous move; dodge, then punish the recovery window.
  if(!enemy.boss||!['windup','charge'].includes(enemy.phase)){enemy.stun=enemy.boss?.12:.24;enemy.phase='stun';enemy.phaseTime=enemy.stun;enemy.vx=nx*(enemy.boss?180:330);enemy.vy=ny*(enemy.boss?180:330);}
  this._effect(kind||'hit',enemy.x,enemy.y,{life:.28,boss:enemy.boss});
  if(enemy.hp===0){
   const s=this.state,a=ANIMALS[enemy.type]||ANIMALS.beetle;s.kills++;this._effect('defeat',enemy.x,enemy.y,{life:.7,typeName:enemy.type});
   if(enemy.boss){s.bossDefeated=true;this._gain(20);this._event('bossDefeated',{animal:enemy.type});}else this._gain(Math.round(a.loot*.65));
   for(let i=0;i<(enemy.boss?6:3);i++){const angle=i/3*TAU;this._spawnFood({x:enemy.x+Math.cos(angle)*21,y:enemy.y+Math.sin(angle)*21},enemy.boss?4:2);}
  }
 }
 _attack(){
  const s=this.state,p=s.player;p.attackCd=.38;p.attackT=.21;const nx=Math.cos(p.facing),ny=Math.sin(p.facing),power=(20+s.genes.power*5)*(p.dashT>0?1.45:1);let hits=0;
  for(const enemy of s.enemies){const dx=enemy.x-p.x,dy=enemy.y-p.y,dist=Math.hypot(dx,dy);if(dist>p.r+60+enemy.r*.65)continue;const alignment=dist<1?1:(dx*nx+dy*ny)/dist;if(alignment<.43&&dist>p.r+enemy.r*.7)continue;this._hitEnemy(enemy,power,dist?dx/dist:nx,dist?dy/dist:ny,'bite');hits++;}
  this._effect('bite',p.x+nx*(p.r+20),p.y+ny*(p.r+20),{life:.2,facing:p.facing,r:p.r+60});this._event('bite',{hits});
 }
 _hurt(damage,enemy){
  const s=this.state,p=s.player;if(p.invuln>0||p.dashT>0||s.mode!=='playing')return;
  p.hp=Math.max(0,p.hp-damage/(1+s.genes.armor*.09));p.invuln=.8;p.hitFlash=.23;
  const dx=p.x-enemy.x,dy=p.y-enemy.y,dist=Math.hypot(dx,dy)||1;p.x=clamp(p.x+dx/dist*34,p.r,W-p.r);p.y=clamp(p.y+dy/dist*34,p.r,H-p.r);
  this._effect('hurt',p.x,p.y,{life:.3});this._event('hit',{damage});
  if(p.hp<=0){s.mode='dead';p.attackT=0;p.dashT=0;this._event('death',{stage:s.stage,score:s.score});}
 }
 _advance(){
  const s=this.state;if(s.xp<s.goal||!s.bossDefeated)return;
  if(s.stage===STAGES.length-1){s.mode='won';s.player.size=12742000;s.player.r=51;s.enemies=[];s.foods=[];s.mate.ready=false;this._effect('clear',s.player.x,s.player.y,{life:2});this._event('clear',{score:s.score});return;}
  const from=s.stage;s.stage++;s.xp=0;s.goal=STAGES[s.stage].goal;s.stageBred=false;s.bossDefeated=false;s.player.hp=Math.min(s.player.maxHp,s.player.hp+32);s.player.x=W/2;s.player.y=H/2;s.player.invuln=2;s.player.attackT=0;s.player.dashT=0;s.transition=1.4;this._buildWorld();this._syncGrowth();this._effect('evolve',s.player.x,s.player.y,{life:1.4});this._event('evolve',{from,stage:s.stage});
 }
 update(delta,input={}){
  const s=this.state,dt=finite(delta,0,.25,0);if(s.mode!=='playing'||dt<=0)return;const step=Math.min(dt,.05),p=s.player;s.time=Math.min(10000000,s.time+step);s.transition=Math.max(0,s.transition-step);
  for(const key of['attackT','attackCd','dashT','dashCd','invuln','hitFlash'])p[key]=Math.max(0,p[key]-step);
  s.effects=s.effects.filter(effect=>(effect.life-=step)>0);
  let x=finite(input.x,-1,1,0),y=finite(input.y,-1,1,0),length=Math.hypot(x,y);if(length>1){x/=length;y/=length;length=1;}
  if(Number.isFinite(input.aimX)&&Number.isFinite(input.aimY)&&Math.hypot(input.aimX-p.x,input.aimY-p.y)>4)p.facing=Math.atan2(input.aimY-p.y,input.aimX-p.x);else if(length>.04)p.facing=Math.atan2(y,x);
  if(input.dash&&p.dashCd<=0){p.dashT=.24;p.dashCd=1.35;p.invuln=Math.max(p.invuln,.28);this._dashHits.clear();this._effect('dash',p.x,p.y,{life:.35,facing:p.facing});this._event('dash');}
  if(input.attack&&p.attackCd<=0)this._attack();
  const speed=245*(1+s.genes.speed*.105);if(p.dashT>0){p.velocityX=Math.cos(p.facing)*speed*2.8;p.velocityY=Math.sin(p.facing)*speed*2.8;}else{p.velocityX=x*speed;p.velocityY=y*speed;}
  p.x=clamp(p.x+p.velocityX*step,p.r,W-p.r);p.y=clamp(p.y+p.velocityY*step,p.r,H-p.r);
  for(const food of s.foods){
   const dx=p.x-food.x,dy=p.y-food.y,dist=Math.hypot(dx,dy);
   if(dist<p.r+food.r+8){food.eaten=true;s.foodsEaten++;this._gain(food.value);p.hp=Math.min(p.maxHp,p.hp+1.4);this._effect('food',food.x,food.y,{life:.45,value:food.value});this._event('food',{value:food.value});}
   else if(dist<p.r+85){const pull=Math.min(dist,step*260);food.x+=dx/dist*pull;food.y+=dy/dist*pull;}
  }
  s.foods=s.foods.filter(food=>!food.eaten);
  for(const enemy of s.enemies){
   if(enemy.hp<=0)continue;const a=ANIMALS[enemy.type]||ANIMALS.beetle;enemy.hitFlash=Math.max(0,enemy.hitFlash-step);enemy.phaseTime-=step;
   const dx=p.x-enemy.x,dy=p.y-enemy.y,dist=Math.hypot(dx,dy)||1;
   if(p.dashT>0&&dist<p.r+enemy.r&&!this._dashHits.has(enemy.id)){this._dashHits.add(enemy.id);this._hitEnemy(enemy,12+s.genes.power*2,Math.cos(p.facing),Math.sin(p.facing),'dash');}
   if(enemy.phase==='stun'){enemy.x+=enemy.vx*step;enemy.y+=enemy.vy*step;enemy.vx*=Math.max(0,1-step*7);enemy.vy*=Math.max(0,1-step*7);if(enemy.phaseTime<=0){enemy.phase='recover';enemy.phaseTime=.22;}}
   else if(enemy.phase==='windup'){
    if(enemy.phaseTime<=0){enemy.phase='charge';enemy.phaseTime=a.behavior==='melee'?.22:.5;enemy.vx=enemy.chargeX*a.speed*(enemy.boss?3.4:2.9);enemy.vy=enemy.chargeY*a.speed*(enemy.boss?3.4:2.9);}
   }else if(enemy.phase==='charge'){
    enemy.x+=enemy.vx*step;enemy.y+=enemy.vy*step;if(enemy.phaseTime<=0){enemy.phase='recover';enemy.phaseTime=enemy.boss?.75:.65;}
   }else if(enemy.phase==='recover'){if(enemy.phaseTime<=0){enemy.phase='wander';enemy.phaseTime=.3;}}
   else{
    const aggro=enemy.boss?620:390;
    if(dist<aggro){enemy.facing=Math.atan2(dy,dx);const chase=a.speed*(enemy.boss?.78:.7);if(dist>p.r+enemy.r+42){enemy.x+=dx/dist*chase*step;enemy.y+=dy/dist*chase*step;}if(dist<p.r+enemy.r+(enemy.boss?145:88)&&enemy.phaseTime<=0){enemy.phase='windup';enemy.phaseTime=enemy.boss?.7:.55;enemy.chargeX=dx/dist;enemy.chargeY=dy/dist;enemy.facing=Math.atan2(dy,dx);}}
    else{enemy.x+=Math.cos(enemy.facing)*a.speed*.28*step;enemy.y+=Math.sin(enemy.facing)*a.speed*.28*step;if(enemy.phaseTime<=0){enemy.facing+=this._between(-1.4,1.4);enemy.phaseTime=this._between(.8,2.2);}}
   }
   enemy.x=clamp(enemy.x,enemy.r,W-enemy.r);enemy.y=clamp(enemy.y,enemy.r,H-enemy.r);
   if(enemy.hp>0&&dist<p.r+enemy.r-2&&enemy.phase==='charge')this._hurt((enemy.boss?22:a.damage),enemy);
  }
  s.enemies=s.enemies.filter(enemy=>enemy.hp>0);
  if(s.mode!=='playing')return;
  if(input.breed&&this.canBreed()){s.mode='breeding';this._event('breedChoice');return;}
  this._spawnClock+=step;this._foodClock+=step;
  if(this._spawnClock>=3.5){this._spawnClock=0;if(s.enemies.filter(enemy=>!enemy.boss).length<9){const types=STAGES[s.stage].animals;this._spawnEnemy(types[Math.floor(this._random()*types.length)]);}}
  if(this._foodClock>=.6){this._foodClock=0;if(s.foods.length<28)this._spawnFood();}
  this._advance();
 }
 snapshot(){
  const s=this.state,p=s.player;return{version:1,mode:s.mode==='playing'?'paused':s.mode,stage:s.stage,xp:s.xp,score:s.score,time:s.time,generation:s.generation,genes:{...s.genes},player:{x:p.x,y:p.y,hp:p.hp,facing:p.facing},bossDefeated:s.bossDefeated,stageBred:s.stageBred,breeds:s.breeds,kills:s.kills,foodsEaten:s.foodsEaten};
 }
 drainEvents(){const events=this._events;this._events=[];return events;}
}
window.AsobiMouseData=data;
window.AsobiMouseModel=AsobiMouseModel;
})();
