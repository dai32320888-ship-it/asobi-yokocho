/* Original one-hold balloon game. Pure state; no DOM, clocks, storage or timers. */
(function(){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=Number.isFinite,integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b,clone=value=>JSON.parse(JSON.stringify(value));
 const LIMIT=1000000,FIRST_CAPACITY=7.2,MIN_CAPACITY=6.2,MAX_CAPACITY=8.6,WARNING=.72,DANGER=.9,CLOSE=.8,PERFECT=.98;
 const MODES=['ready','holding','stopped','burst'],GRADES=['tiny','nice','close','perfect','burst'];
 const COLORS=Object.freeze(['#ef827d','#71d8cf','#f5cd70','#ae91df','#77bde1','#ec9ac1']);
 window.AsobiBalloonData=Object.freeze({colors:COLORS,firstCapacity:FIRST_CAPACITY,minCapacity:MIN_CAPACITY,maxCapacity:MAX_CAPACITY,warning:WARNING,danger:DANGER,close:CLOSE,perfect:PERFECT,maxScore:1000,thresholds:Object.freeze({warning:WARNING,danger:DANGER,close:CLOSE,perfect:PERFECT})});
 const fresh=()=>({version:1,round:1,seed:0x65aa1843,best:0,plays:0,successes:0,perfects:0,streak:0,bestStreak:0,lastScore:0,lastGrade:'tiny'});
 const nextSeed=seed=>((Math.imul(seed,1664525)+1013904223)>>>0)||1;
 const capacityFor=(round,seed)=>round===1?FIRST_CAPACITY:MIN_CAPACITY+(seed/4294967295)*(MAX_CAPACITY-MIN_CAPACITY);
 const gradeFor=pressure=>pressure>=PERFECT?'perfect':pressure>=CLOSE?'close':pressure>=.45?'nice':'tiny';
 class BalloonModel{
  constructor(saved){
   this.events=[];const progress=this._load(saved)||fresh();this.state={...progress,...this._empty(progress.round,progress.seed)};
   // A completed result never becomes a second reward after reloading. An
   // interrupted hold restarts the same balloon with only earned stats kept.
   if(this.state.plays===this.state.round)this._prepareNext(false);
  }
  _empty(round,seed){return {mode:'ready',elapsed:0,pressure:0,size:.12,stress:0,score:0,grade:'tiny',capacity:capacityFor(round,seed),colorIndex:(round-1)%COLORS.length};}
  _load(saved){
   if(!saved||saved.version!==1||!integer(saved.round,1,LIMIT+1)||!integer(saved.seed,1,4294967295)||!integer(saved.best,0,1000)||!integer(saved.plays,0,LIMIT)||!integer(saved.successes,0,saved.plays)||!integer(saved.perfects,0,saved.successes)||!integer(saved.streak,0,saved.successes)||!integer(saved.bestStreak,saved.streak,saved.successes)||!integer(saved.lastScore,0,saved.best)||!GRADES.includes(saved.lastGrade)||![saved.plays,saved.plays+1].includes(saved.round))return null;
   if(saved.mode!==undefined&&!MODES.includes(saved.mode))return null;
   if(saved.mode&&(['ready','holding'].includes(saved.mode)?saved.round!==saved.plays+1:saved.round!==saved.plays))return null;
   for(const [key,min,max] of [['elapsed',0,MAX_CAPACITY],['pressure',0,1],['size',0,1],['stress',0,1],['score',0,1000],['capacity',MIN_CAPACITY,MAX_CAPACITY]])if(saved[key]!==undefined&&(!finite(saved[key])||saved[key]<min||saved[key]>max))return null;
   if(saved.colorIndex!==undefined&&!integer(saved.colorIndex,0,COLORS.length-1)||saved.grade!==undefined&&!GRADES.includes(saved.grade))return null;
   if(saved.plays===0&&(saved.best!==0||saved.successes!==0||saved.perfects!==0||saved.streak!==0||saved.bestStreak!==0||saved.lastScore!==0||saved.lastGrade!=='tiny'||saved.round!==1))return null;
   if(saved.lastGrade==='burst'&&saved.lastScore!==0||saved.lastGrade==='perfect'&&saved.lastScore<960||saved.lastGrade==='close'&&(saved.lastScore<640||saved.lastScore>960)||saved.lastGrade==='nice'&&(saved.lastScore<202||saved.lastScore>640)||saved.lastGrade==='tiny'&&saved.lastScore>203)return null;
   if(saved.plays>0&&(saved.lastGrade==='burst'?saved.successes>=saved.plays:saved.successes===0))return null;
   if(saved.mode==='burst'&&(saved.grade!=='burst'||saved.score!==0||saved.pressure!==1)||saved.mode==='stopped'&&(!['tiny','nice','close','perfect'].includes(saved.grade)||saved.score!==saved.lastScore))return null;
   return Object.fromEntries(['version','round','seed','best','plays','successes','perfects','streak','bestStreak','lastScore','lastGrade'].map(key=>[key,saved[key]]));
  }
  _ok(key,extra={}){return {ok:true,key,...extra};}
  _fail(key){return {ok:false,key};}
  _event(type,extra={}){if(this.events.length<32)this.events.push({type,...extra});}
  drainEvents(){return this.events.splice(0);}
  snapshot(){return clone(this.state);}
  _prepareNext(emit=true){
   const s=this.state;s.round=Math.min(LIMIT+1,s.round+1);s.seed=nextSeed(s.seed);Object.assign(s,this._empty(s.round,s.seed));if(emit)this._event('new',{round:s.round,colorIndex:s.colorIndex});
  }
  next(){
   if(!['stopped','burst'].includes(this.state.mode))return this._fail('notFinished');
   this._prepareNext();return this._ok('ready');
  }
  hold(){
   const s=this.state;if(s.mode==='holding')return this._fail('alreadyHolding');
   if(s.plays>=LIMIT)return this._fail('limit');
   if(s.mode==='stopped'||s.mode==='burst')this._prepareNext();
   s.mode='holding';this._event('inflate',{colorIndex:s.colorIndex});return this._ok('holding');
  }
  release(){
   const s=this.state;if(s.mode!=='holding')return this._fail('notHolding');
   // The limit itself is always a burst, even if release arrives at the same
   // frame. A release can only score while the balloon is still intact.
   if(s.pressure>=1)return this._finish(true);
   return this._finish(false);
  }
  cancel(){
   const s=this.state;if(s.mode!=='holding')return this._fail('notHolding');
   Object.assign(s,this._empty(s.round,s.seed));this.events=[];return this._ok('cancelled');
  }
  update(dt){
   if(!finite(dt)||dt<=0)return this._fail('time');const s=this.state;if(s.mode!=='holding')return this._ok('idle');
   const before=s.pressure;s.elapsed=Math.min(s.capacity,s.elapsed+Math.min(dt,.1));if(s.capacity-s.elapsed<1e-10)s.elapsed=s.capacity;s.pressure=clamp(s.elapsed/s.capacity,0,1);s.size=.12+.88*Math.pow(s.pressure,.72);s.stress=clamp((s.pressure-.65)/.35,0,1);
   if(before<WARNING&&s.pressure>=WARNING)this._event('warning');if(before<DANGER&&s.pressure>=DANGER)this._event('danger');
   if(s.pressure>=1)return this._finish(true);return this._ok('inflating');
  }
  _finish(burst){
   const s=this.state;if(s.mode!=='holding')return this._fail('notHolding');s.mode=burst?'burst':'stopped';s.score=burst?0:Math.round(1000*s.pressure*s.pressure);s.grade=burst?'burst':gradeFor(s.pressure);s.plays=Math.min(LIMIT,s.plays+1);if(!burst)s.successes=Math.min(s.plays,s.successes+1);if(s.grade==='perfect')s.perfects=Math.min(s.successes,s.perfects+1);
   s.streak=!burst&&s.pressure>=CLOSE?Math.min(s.successes,s.streak+1):0;s.bestStreak=Math.max(s.bestStreak,s.streak);s.best=Math.max(s.best,s.score);s.lastScore=s.score;s.lastGrade=s.grade;
   const result={score:s.score,grade:s.grade,pressure:s.pressure,elapsed:s.elapsed,round:s.round};this._event(burst?'pop':s.grade==='perfect'?'perfect':'stop',result);return this._ok(burst?'burst':'stopped',result);
  }
 }
 window.AsobiBalloonModel=BalloonModel;
})();
