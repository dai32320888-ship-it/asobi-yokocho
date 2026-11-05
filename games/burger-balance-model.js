/* Two real deliveries. Building and partial attempts never mint records. */
(function(){
'use strict';
const P=window.AsobiBurgerPhysics;if(!P)throw Error('Food physics must load first');const STEP=1/120,MAX=1000000,clone=P.clone,integer=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
const Data={buildingDuration:30,countdownDuration:2,carryDuration:60,editingDuration:20,heatEndDuration:2,heats:2,totalDuration:178,step:STEP};
const cleanResults=input=>Array.isArray(input)?input.slice(0,2).filter(r=>r&&integer(r.heat,0,1)&&finite(r.distance)&&r.distance>=0&&r.distance<=180&&integer(r.score,0,MAX)&&integer(r.surviving,0,10)&&integer(r.lost,0,10)).map(r=>({heat:r.heat,distance:r.distance,score:r.score,surviving:r.surviving,lost:r.lost,delivered:r.delivered===true,name:typeof r.name==='string'?[...r.name.replace(/[<>\u0000-\u001f]/g,'')].slice(0,16).join(''):''})):[];
const finite=Number.isFinite;
class BurgerModel{
 constructor(saved){this.events=[];this._acc=0;this._id=0;this._input={move:0,careful:0};let p={version:1,best:0,plays:0,lastScore:0,lastResults:[],draft:P.defaultDraft()};if(saved?.version===1&&integer(saved.best,0,MAX)&&integer(saved.plays,0,MAX)&&integer(saved.lastScore,0,saved.best)&&!(saved.plays===0&&(saved.best||saved.lastScore)))p={version:1,best:saved.best,plays:saved.plays,lastScore:saved.lastScore,lastResults:cleanResults(saved.lastResults),draft:P.normalize(saved.draft).ok?P.normalize(saved.draft).draft:P.defaultDraft()};this.state=this._workshop(p);}
 _workshop(p){return{...clone(p),mode:'workshop',pausedMode:null,heat:0,phaseLeft:30,phaseTime:0,elapsed:0,totalDuration:178,score:0,results:[],delivery:P.createDelivery(p.draft),effects:[],lastCheckpoint:0};}
 _reply(ok,key){return{ok,key};}
 _event(type,extra={}){if(this.events.length<120)this.events.push({type,...extra});}
 _effect(type,x,y,value){this.state.effects.push({id:++this._id,type,x,y,value,age:0,duration:.65});if(this.state.effects.length>24)this.state.effects.shift();}
 _phase(mode,duration){this.state.mode=mode;this.state.phaseTime=0;this.state.phaseLeft=duration;this.state.emptyFor=0;this._input={move:0,careful:0};}
 snapshot(){return clone(this.state);}
 progress(){const s=this.state;return{version:1,best:s.best,plays:s.plays,lastScore:s.lastScore,lastResults:clone(s.lastResults),draft:clone(s.draft)};}
 drainEvents(){return this.events.splice(0);}
 setDraft(draft){if(!['workshop','building','editing','finished'].includes(this.state.mode))return this._reply(false,'phase');const checked=P.normalize(draft);if(!checked.ok)return this._reply(false,checked.key);this.state.draft=checked.draft;this.state.delivery=P.createDelivery(checked.draft);this._event('build');return this._reply(true,'draft');}
 begin(draft=this.state.draft){if(!['workshop','finished'].includes(this.state.mode))return this._reply(false,'phase');const n=P.normalize(draft);if(!n.ok)return this._reply(false,n.key);if(!n.draft.layers.length)return this._reply(false,'empty');const p=this.progress();p.draft=n.draft;this.state=this._workshop(p);this._acc=0;this.events=[];this._phase('building',30);this._event('start');return this._reply(true,'started');}
 readyNow(automatic=false){const s=this.state;if(!['building','editing'].includes(s.mode))return this._reply(false,'phase');if(!s.draft.layers.length){if(!automatic)return this._reply(false,'empty');s.draft=P.defaultDraft();this._event('fallback');}s.delivery=P.createDelivery(s.draft);s.lastCheckpoint=0;this._phase('countdown',2);this._event('countdown',{heat:s.heat});return this._reply(true,'ready');}
 setInput(input){if(!input||!finite(input.move)||!finite(input.careful))return this._reply(false,'input');this._input={move:Math.max(-1,Math.min(1,input.move)),careful:Math.max(0,Math.min(1,input.careful))};return this._reply(true,'input');}
 pause(){const s=this.state;if(['workshop','finished','paused'].includes(s.mode))return this._reply(false,'phase');s.pausedMode=s.mode;s.mode='paused';this._input={move:0,careful:0};return this._reply(true,'paused');}
 resume(){const s=this.state;if(s.mode!=='paused'||!['building','editing','countdown','carrying','heatEnd'].includes(s.pausedMode))return this._reply(false,'phase');s.mode=s.pausedMode;s.pausedMode=null;this._input={move:0,careful:0};return this._reply(true,'resumed');}
 cancel(){this.state=this._workshop(this.progress());this._acc=0;this._input={move:0,careful:0};this.events=[];return this._reply(true,'cancelled');}
 step(dt){if(!finite(dt)||dt<=0)return this._reply(false,'time');if(['workshop','finished','paused'].includes(this.state.mode))return this._reply(true,'idle');this._acc+=Math.min(.1,dt);let guard=0;while(this._acc+1e-10>=STEP&&guard++<13&&!['workshop','finished','paused'].includes(this.state.mode)){this._acc-=STEP;this._tick(STEP);}return this._reply(true,'updated');}
 update(dt){return this.step(dt);}
 _endHeat(reason='time'){const s=this.state,d=s.delivery,distance=Math.round(d.distance*10)/10,delivered=d.arrival&&d.surviving>0,score=Math.max(0,Math.round(d.remainingValue*Math.min(1,d.distance/P.targetDistance)+(delivered?100:0)));s.results.push({heat:s.heat,distance,score,delivered,surviving:d.surviving,lost:d.lostCount,reason,name:s.draft.name,draft:clone(s.draft),stats:clone(d.stats)});s.score=Math.min(MAX,s.score+score);this._phase('heatEnd',2);this._event('heatEnd',{heat:s.heat,score,delivered,surviving:d.surviving,reason});}
 _finish(){const s=this.state;s.plays=Math.min(MAX,s.plays+1);s.best=Math.max(s.best,s.score);s.lastScore=s.score;s.lastResults=cleanResults(s.results);this._phase('finished',0);this._event('finish',{score:s.score});}
 _tick(dt){const s=this.state;s.elapsed=Math.min(178,s.elapsed+dt);s.phaseTime+=dt;s.phaseLeft=Math.max(0,s.phaseLeft-dt);for(const effect of s.effects)effect.age+=dt;s.effects=s.effects.filter(e=>e.age<e.duration);
  if(s.mode==='building'||s.mode==='editing'){if(s.phaseLeft<1e-7)this.readyNow(true);return;}
  if(s.mode==='countdown'){if(s.phaseLeft<1e-7){this._phase('carrying',60);this._event('carry',{heat:s.heat});}return;}
  if(s.mode==='heatEnd'){if(s.phaseLeft<1e-7){if(s.heat===1)this._finish();else{s.heat=1;this._phase('editing',20);this._event('edit',{heat:1});}}return;}
  if(s.mode!=='carrying')return;const d=s.delivery,before=d.lostCount;P.step(d,this._input,dt);if(d.lostCount>before){for(const b of d.bodies.filter(b=>b.lost&&b.lostAt>=d.time-dt*.5)){this._event('drop',{typeId:b.type,id:b.id});this._effect('drop',b.x,b.y,b.type);}}const checkpoint=Math.floor(d.distance/30);if(checkpoint>s.lastCheckpoint){s.lastCheckpoint=checkpoint;this._event('checkpoint',{n:checkpoint});this._effect('checkpoint',d.tray.x,d.tray.y+80,checkpoint);}if(d.lastImpact>55&&s.phaseTime%1<dt)this._event('wobble');s.emptyFor=d.surviving===0?s.emptyFor+dt:0;if(d.arrival)this._endHeat('arrived');else if(s.emptyFor>=1.75)this._endHeat('empty');else if(s.phaseLeft<1e-7)this._endHeat();
 }
}
window.AsobiBurgerData=Data;window.AsobiBurgerModel=BurgerModel;
})();
