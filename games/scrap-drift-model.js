/* Original arcade driving model. Pure data and fixed-step simulation; no DOM or timers. */
(function(){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=Number.isFinite,clone=value=>JSON.parse(JSON.stringify(value));
 const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
 const MAX_UPGRADE=3,PARTS=['engine','tires','body'],COSTS={engine:[150,270,420],tires:[100,200,320],body:[120,220,350]};
 const track=(id,nameKey,length,ai,curves,palette)=>Object.freeze({id,nameKey,length,ai,curves:Object.freeze(curves.map(([start,end,curve])=>Object.freeze({start,end,curve}))),palette:Object.freeze(palette),rivalNames:Object.freeze(['rival1','rival2','rival3'])});
 const TRACKS=Object.freeze([
  track('old-town','oldTown',6100,143,[[600,1450,.42],[2050,2900,-.46],[3500,4350,.5],[4920,5660,-.4]],{sky:'#b8d3ce',ground:'#7a9473',road:'#485558',accent:'#f6d386'}),
  track('seaside','seaside',6600,158,[[650,1550,-.5],[2100,3100,.55],[3500,4400,-.56],[4950,5850,.5]],{sky:'#8ed0e4',ground:'#78a49b',road:'#435960',accent:'#f5df94'}),
  track('mountain','mountain',6900,174,[[420,1350,.6],[1600,2500,-.64],[2850,3800,.66],[4150,5100,-.58],[5500,6370,.6]],{sky:'#a2b6d0',ground:'#6e8473',road:'#4d5259',accent:'#d7e499'}),
  track('industrial','industrial',7300,188,[[700,1600,-.62],[2100,3050,.65],[3450,4450,-.7],[4750,5650,.6],[6000,6750,-.55]],{sky:'#d2ac87',ground:'#6f7773',road:'#464b53',accent:'#ffc372'}),
  track('neon-city','neonCity',7600,200,[[480,1430,.65],[1730,2670,-.7],[3000,3950,.72],[4270,5300,-.68],[5700,6900,.62]],{sky:'#2d3959',ground:'#344a52',road:'#3c4051',accent:'#83ead3'}),
  track('champion-road','championRoad',7900,210,[[500,1430,-.72],[1750,2700,.74],[3000,4000,-.76],[4300,5300,.74],[5600,6700,-.7],[6970,7600,.58]],{sky:'#a6bdce',ground:'#6c8b78',road:'#454e59',accent:'#f7dc98'})
 ]);
 window.AsobiDriftData=Object.freeze({tracks:TRACKS,maxUpgrade:MAX_UPGRADE,parts:Object.freeze(PARTS.slice()),costs:Object.freeze(COSTS),maxRaceSeconds:120});
 class DriftModel{
  constructor(saved){
   this.events=[];this._sections=new Set();this._sectionPoints=new Map();this._driftEventTimer=0;this._lastDrift=false;this._lastSection=-1;this._lastCountdown=3;this._heldDrift=false;this._driftPressAge=99;
   const progress=this._load(saved)||{version:1,coins:0,upgrades:{engine:0,tires:0,body:0},unlocked:0,trackIndex:0,wins:0,races:0,best:Array(TRACKS.length).fill(0)};
   this.state={...progress,...this._emptyRace(),mode:'garage'};
  }
  _emptyRace(){return {mode:'garage',countdown:0,elapsed:0,distance:0,speed:0,x:0,steer:0,drifting:false,usingNitro:false,nitro:100,driftPoints:0,drifts:0,rank:4,rivals:[],collisionTime:0,result:null,offroad:false,perfectTime:0,driftTime:0};}
  _load(saved){
   if(!saved||saved.version!==1||!integer(saved.coins,0,10000000)||!saved.upgrades||!PARTS.every(part=>integer(saved.upgrades[part],0,MAX_UPGRADE))||!integer(saved.unlocked,0,TRACKS.length-1)||!integer(saved.trackIndex,0,saved.unlocked)||!integer(saved.wins,0,1000000)||!integer(saved.races,saved.wins,1000000)||!Array.isArray(saved.best)||saved.best.length!==TRACKS.length||!saved.best.every(value=>integer(value,0,1000000)))return null;
   if(saved.mode!==undefined&&!['garage','countdown','racing','finished'].includes(saved.mode))return null;
   for(const key of ['countdown','elapsed','distance','speed','x','steer','nitro','driftPoints','drifts','rank','collisionTime'])if(saved[key]!==undefined&&!finite(saved[key]))return null;
   return {version:1,coins:saved.coins,upgrades:Object.fromEntries(PARTS.map(part=>[part,saved.upgrades[part]])),unlocked:saved.unlocked,trackIndex:saved.trackIndex,wins:saved.wins,races:saved.races,best:[...saved.best]};
  }
  _ok(key,extra={}){return {ok:true,key,...extra};}
  _fail(key){return {ok:false,key};}
  _event(type,extra={}){if(this.events.length<64)this.events.push({type,...extra});}
  drainEvents(){return this.events.splice(0);}
  snapshot(){return clone(this.state);}
  getStats(){
   const u=this.state.upgrades;
   return {topSpeed:182+u.engine*21+u.body*4,acceleration:49+u.engine*9,grip:1+u.tires*.2,nitroDrain:23-u.body*2,nitroPower:1.28+u.body*.025,collisionRetention:.56+u.body*.055,upgradeCosts:Object.fromEntries(PARTS.map(part=>[part,u[part]<MAX_UPGRADE?COSTS[part][u[part]]:null]))};
  }
  roadAt(distance,trackIndex=this.state.trackIndex){
   const course=TRACKS[integer(trackIndex,0,TRACKS.length-1)?trackIndex:0],position=finite(distance)?Math.max(0,distance):0;
   const section=course.curves.findIndex(curve=>position>=curve.start&&position<curve.end),part=course.curves[section];
   const progress=part?clamp((position-part.start)/(part.end-part.start),0,1):0;
   const next=course.curves.find(curve=>curve.start>position);
   return {curve:part?part.curve*Math.sin(Math.PI*progress):0,width:1,section,progress,nextCurve:next?.curve||0,nextDistance:next?Math.max(0,next.start-position):Math.max(0,course.length-position)};
  }
  selectTrack(index){if(this.state.mode==='countdown'||this.state.mode==='racing')return this._fail('racing');if(!integer(index,0,this.state.unlocked))return this._fail('locked');this.state.trackIndex=index;return this._ok('track');}
  buy(part){
   const s=this.state;if(s.mode!=='garage'&&s.mode!=='finished')return this._fail('racing');if(!PARTS.includes(part))return this._fail('part');if(s.upgrades[part]>=MAX_UPGRADE)return this._fail('max');
   const cost=COSTS[part][s.upgrades[part]];if(s.coins<cost)return this._fail('coins');s.coins-=cost;s.upgrades[part]++;this._event('purchase',{part,level:s.upgrades[part]});return this._ok('bought',{part,level:s.upgrades[part],cost});
  }
  startRace(index=this.state.trackIndex){
   const s=this.state;if(s.mode==='countdown'||s.mode==='racing')return this._fail('racing');if(!integer(index,0,s.unlocked))return this._fail('locked');
   Object.assign(s,this._emptyRace(),{mode:'countdown',trackIndex:index,countdown:2.4});
   s.rivals=Array.from({length:3},(_,id)=>({id,distance:24+id*38,x:[-.58,.02,.58][id],speed:0,finishTime:null}));
   this.events=[];this._sections.clear();this._sectionPoints.clear();this._driftEventTimer=0;this._lastDrift=false;this._lastSection=-1;this._lastCountdown=3;this._heldDrift=false;this._driftPressAge=99;this._event('countdown',{value:3});return this._ok('started');
  }
  returnGarage(){const s=this.state;if(s.mode==='countdown'||s.mode==='racing')return this._fail('racing');Object.assign(s,this._emptyRace());this.events=[];return this._ok('garage');}
  update(dt,input={}){
   if(!finite(dt)||dt<=0||!input||typeof input!=='object')return this._fail('time');
   const seconds=Math.min(dt,.1),s=this.state;if(s.mode!=='countdown'&&s.mode!=='racing')return this._ok('idle');
   const controls={steer:finite(input.steer)?clamp(input.steer,-1,1):0,drift:input.drift===true,nitro:input.nitro===true,brake:input.brake===true};
   let remaining=seconds;while(remaining>1e-8&&(s.mode==='countdown'||s.mode==='racing')){const step=Math.min(remaining,1/120);this._step(step,controls);remaining-=step;}
   return this._ok(s.mode==='finished'?'finished':'updated');
  }
  _step(dt,input){
   const s=this.state,course=TRACKS[s.trackIndex];
   // Timing uses the actual rising edge, including a key held through countdown.
   // Holding drift preserves cornering, but cannot auto-collect PERFECT entries.
   this._driftPressAge=input.drift&&!this._heldDrift?0:Math.min(99,this._driftPressAge+dt);this._heldDrift=input.drift;
   if(s.mode==='countdown'){
    s.countdown=Math.max(0,s.countdown-dt);const count=Math.ceil(s.countdown/0.8);if(count>0&&count<this._lastCountdown){this._lastCountdown=count;this._event('countdown',{value:count});}
    if(s.countdown<=1e-7){s.countdown=0;s.mode='racing';this._event('go');}return;
   }
   const stats=this.getStats(),road=this.roadAt(s.distance),speedRatio=clamp(s.speed/stats.topSpeed,0,1.5),previousDistance=s.distance;
   s.elapsed+=dt;s.collisionTime=Math.max(0,s.collisionTime-dt);s.perfectTime=Math.max(0,s.perfectTime-dt);s.driftTime=Math.max(0,s.driftTime-dt);s.steer=input.steer;
   const correctTurn=Math.abs(input.steer)>.12&&Math.sign(input.steer)===Math.sign(road.curve);
   s.offroad=Math.abs(s.x)>1.02;
   s.drifting=input.drift&&correctTurn&&Math.abs(road.curve)>.105&&s.speed>65&&!s.offroad&&!input.brake;
   if(s.drifting&&(!this._lastDrift||road.section!==this._lastSection)&&road.section>=0&&!this._sections.has(road.section)){
    this._sections.add(road.section);s.drifts++;const perfect=this._driftPressAge<=.65&&road.progress>.045&&road.progress<.34;s.perfectTime=perfect?1.0:0;s.driftTime=1;
    const bonus=perfect?55:22;s.driftPoints+=bonus;s.nitro=Math.min(100,s.nitro+(perfect?20:9));this._event(perfect?'perfect':'drift',{points:bonus,section:road.section});
   }
   if(s.drifting&&road.section>=0){
    const before=this._sectionPoints.get(road.section)||0,gain=Math.min(dt*17,Math.max(0,95-before));s.driftPoints+=gain;this._sectionPoints.set(road.section,before+gain);s.nitro=Math.min(100,s.nitro+dt*9);this._driftEventTimer+=dt;
   }else this._driftEventTimer=0;
   this._lastDrift=s.drifting;this._lastSection=road.section;
   const nitro=input.nitro&&(s.usingNitro?s.nitro>.2:s.nitro>=8)&&s.speed>45&&!s.offroad&&!input.brake;
   if(nitro&&!s.usingNitro)this._event('nitro');s.usingNitro=nitro;
   s.nitro=clamp(s.nitro+(nitro?-stats.nitroDrain:3.4)*dt,0,100);
   let target=stats.topSpeed*(1-Math.abs(road.curve)*(s.drifting?.055:.23/stats.grip));
   if(nitro)target*=stats.nitroPower;
   if(input.brake)target*=.42;
   if(s.offroad)target=Math.min(target,79+s.upgrades.tires*9);
   const acceleration=s.speed<target?stats.acceleration*(nitro?1.5:1):s.offroad?125:input.brake?160:62;
   s.speed+=clamp(target-s.speed,-acceleration*dt,acceleration*dt);s.speed=clamp(s.speed,0,stats.topSpeed*stats.nitroPower);
   const steeringPower=1.42*(.55+.45*Math.min(speedRatio,1))*(s.drifting?1.04:1),centrifugal=road.curve*speedRatio*speedRatio*(s.drifting?.72:1.08/stats.grip);
   s.x=clamp(s.x+(input.steer*steeringPower-centrifugal)*dt,-1.65,1.65);
   s.distance=Math.min(course.length,s.distance+s.speed*dt);
   for(const rival of s.rivals){
    const ownRoad=this.roadAt(rival.distance),desired=course.ai*(1+(2-rival.id)*.027)*(1-Math.abs(ownRoad.curve)*.065),before=rival.distance;
    rival.speed=Math.min(desired,rival.speed+47*dt);rival.distance+=rival.speed*dt;rival.x=clamp([-.56,.02,.56][rival.id]+Math.sin(rival.distance/540+rival.id*1.7)*.11,-.8,.8);
    if(before<course.length&&rival.distance>=course.length&&rival.finishTime===null)rival.finishTime=s.elapsed;
    if(s.collisionTime<=0&&Math.abs(rival.x-s.x)<.205&&Math.abs(rival.distance-s.distance)<31&&s.speed>rival.speed+5&&s.distance>previousDistance){
     s.speed*=stats.collisionRetention;s.collisionTime=.95;s.x=clamp(s.x+(s.x<rival.x?-.16:.16),-1.65,1.65);this._event('collision',{rival:rival.id});
    }
   }
   s.rank=1+s.rivals.filter(rival=>rival.distance>s.distance+.001).length;
   if(s.distance>=course.length||s.elapsed>=120)this._finish();
  }
  _finish(){
   const s=this.state;if(s.mode!=='racing')return;const course=TRACKS[s.trackIndex],rank=s.elapsed>=120&&s.distance<course.length?4:1+s.rivals.filter(rival=>rival.finishTime!==null&&rival.finishTime<=s.elapsed).length;
   const won=rank===1,newTrack=won&&s.trackIndex===s.unlocked&&s.unlocked<TRACKS.length-1,champion=won&&s.trackIndex===TRACKS.length-1;
   const coins=60+(4-rank)*35+Math.min(90,Math.floor(s.driftPoints/7))+(won?65+s.trackIndex*15:0),score=Math.max(1,Math.round((5-rank)*250+s.driftPoints*2+Math.max(0,75-s.elapsed)*10+s.trackIndex*80));
   s.coins=Math.min(10000000,s.coins+coins);s.races=Math.min(1000000,s.races+1);if(won)s.wins=Math.min(s.races,s.wins+1);if(newTrack)s.unlocked++;s.best[s.trackIndex]=Math.max(s.best[s.trackIndex],score);s.rank=rank;s.mode='finished';s.drifting=false;s.usingNitro=false;s.steer=0;s.result={rank,coins,score,newTrack,champion,time:+s.elapsed.toFixed(3),drifts:s.drifts,driftPoints:Math.floor(s.driftPoints),trackIndex:s.trackIndex};this._event('finish',{...s.result});
  }
 }
 window.AsobiDriftModel=DriftModel;
})();
