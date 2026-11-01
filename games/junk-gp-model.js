/* Two one-minute runs with a real mid-run rebuild. No unfinished run earns a record. */
(function(){
'use strict';
const P=window.AsobiJunkPhysics;if(!P)throw Error('Vehicle physics must load first');const STEP=1/120,MAX=1000000,clone=P.clone,integer=(x,a,b)=>Number.isInteger(x)&&x>=a&&x<=b;
const Data={buildingDuration:30,countdownDuration:2,raceDuration:60,editingDuration:20,heatEndDuration:2,heats:2,totalDuration:178,recoverPenalty:20,step:STEP};
const cleanResults=input=>Array.isArray(input)?input.slice(0,2).filter(r=>r&&integer(r.heat,0,1)&&Number.isFinite(r.distance)&&r.distance>=0&&r.distance<=2000&&integer(r.score,0,MAX)&&integer(r.recoveries,0,100)).map(r=>({heat:r.heat,distance:r.distance,score:r.score,recoveries:r.recoveries,name:typeof r.name==='string'?[...r.name].slice(0,16).join(''):''})):[];
class JunkModel{
 constructor(saved){this.events=[];this._acc=0;this._id=0;this._input={gas:0,brake:0};let progress={version:1,best:0,plays:0,lastScore:0,lastResults:[],draft:P.defaultDraft()};if(saved?.version===1&&integer(saved.best,0,MAX)&&integer(saved.plays,0,MAX)&&integer(saved.lastScore,0,saved.best)&&!(saved.plays===0&&(saved.best||saved.lastScore))){progress={version:1,best:saved.best,plays:saved.plays,lastScore:saved.lastScore,lastResults:cleanResults(saved.lastResults),draft:P.normalize(saved.draft).ok?P.normalize(saved.draft).draft:P.defaultDraft()};}this.state=this._workshop(progress);}
 _workshop(p){return {...clone(p),mode:'workshop',pausedMode:null,heat:0,phaseLeft:30,phaseTime:0,elapsed:0,totalDuration:178,score:0,results:[],vehicle:P.createVehicle(p.draft),effects:[],lastCheckpoint:0};}
 _reply(ok,key){return {ok,key};}
 _event(type,extra={}){if(this.events.length<120)this.events.push({type,...extra});}
 _effect(type,x,y,duration,value){const effects=this.state.effects;effects.push({id:++this._id,type,x,y,age:0,duration,value});if(effects.length>30)effects.shift();}
 _phase(mode,duration){this.state.mode=mode;this.state.phaseTime=0;this.state.phaseLeft=duration;this._input={gas:0,brake:0};}
 snapshot(){return clone(this.state);}
 progress(){const s=this.state;return {version:1,best:s.best,plays:s.plays,lastScore:s.lastScore,lastResults:clone(s.lastResults),draft:clone(s.draft)};}
 drainEvents(){return this.events.splice(0);}
 setDraft(draft){if(!['workshop','building','editing','finished'].includes(this.state.mode))return this._reply(false,'phase');const v=P.normalize(draft);if(!v.ok)return this._reply(false,v.key);this.state.draft=v.draft;this.state.vehicle=P.createVehicle(v.draft,this.state.heat);this._event('build');return this._reply(true,'draft');}
 begin(draft=this.state.draft){if(!['workshop','finished'].includes(this.state.mode))return this._reply(false,'phase');const normalized=P.normalize(draft);if(!normalized.ok)return this._reply(false,normalized.key);if(!P.stats(normalized.draft).canRace)return this._reply(false,'noWheels');const p=this.progress();p.draft=normalized.draft;this.state=this._workshop(p);this._acc=0;this.events=[];this._phase('building',30);this._event('start');return this._reply(true,'started');}
 readyNow(automatic=false){const s=this.state;if(!['building','editing'].includes(s.mode))return this._reply(false,'phase');if(!P.stats(s.draft).canRace){if(!automatic)return this._reply(false,'noWheels');s.draft=P.defaultDraft();this._event('fallback');}s.vehicle=P.createVehicle(s.draft,s.heat);s.lastCheckpoint=0;this._phase('countdown',2);this._event('countdown',{heat:s.heat});return this._reply(true,'ready');}
 setInput(input){if(!input||!Number.isFinite(input.gas)||!Number.isFinite(input.brake))return this._reply(false,'input');this._input={gas:Math.max(0,Math.min(1,input.gas)),brake:Math.max(0,Math.min(1,input.brake))};return this._reply(true,'input');}
 recover(){const s=this.state;if(s.mode!=='racing')return this._reply(false,'phase');if(s.vehicle.recoverCooldown>0)return this._reply(false,'cooldown');P.recover(s.vehicle);this._event('recover',{heat:s.heat,penalty:20});this._effect('recover',s.vehicle.origin.x,s.vehicle.origin.y,.55,20);return this._reply(true,'recoverPenalty');}
 pause(){const s=this.state;if(['workshop','finished','paused'].includes(s.mode))return this._reply(false,'phase');s.pausedMode=s.mode;s.mode='paused';this._input={gas:0,brake:0};return this._reply(true,'paused');}
 resume(){const s=this.state;if(s.mode!=='paused'||!['building','editing','countdown','racing','heatEnd'].includes(s.pausedMode))return this._reply(false,'phase');s.mode=s.pausedMode;s.pausedMode=null;this._input={gas:0,brake:0};return this._reply(true,'resumed');}
 cancel(){this.state=this._workshop(this.progress());this._input={gas:0,brake:0};this._acc=0;this.events=[];return this._reply(true,'cancelled');}
 step(dt){if(!Number.isFinite(dt)||dt<=0)return this._reply(false,'time');if(['workshop','finished','paused'].includes(this.state.mode))return this._reply(true,'idle');this._acc+=Math.min(.1,dt);let guard=0;while(this._acc+1e-10>=STEP&&guard++<13&&!['workshop','finished','paused'].includes(this.state.mode)){this._acc-=STEP;this._tick(STEP);}return this._reply(true,'updated');}
 update(dt){return this.step(dt);}
 _endHeat(){const s=this.state,v=s.vehicle,distance=Math.round(v.maxDistance*10)/10,score=Math.max(0,Math.min(50000,Math.round((distance-v.recoveries*20)*10)));s.results.push({heat:s.heat,distance,score,recoveries:v.recoveries,name:s.draft.name,draft:clone(s.draft),stats:clone(v.stats),airTime:Math.round(v.totalAirTime*10)/10,flips:v.flips});s.score=Math.min(MAX,s.score+score);this._phase('heatEnd',2);this._event('heatEnd',{heat:s.heat,distance,score});}
 _finish(){const s=this.state;s.plays=Math.min(MAX,s.plays+1);s.best=Math.max(s.best,s.score);s.lastScore=s.score;s.lastResults=cleanResults(s.results);this._phase('finished',0);this._event('finish',{score:s.score});}
 _tick(dt){const s=this.state;s.elapsed=Math.min(178,s.elapsed+dt);s.phaseTime+=dt;s.phaseLeft=Math.max(0,s.phaseLeft-dt);for(const e of s.effects)e.age+=dt;s.effects=s.effects.filter(e=>e.age<e.duration);
  if(s.mode==='building'||s.mode==='editing'){if(s.phaseLeft<1e-7)this.readyNow(true);return;}
  if(s.mode==='countdown'){if(s.phaseLeft<1e-7){this._phase('racing',60);this._event('race',{heat:s.heat});}return;}
  if(s.mode==='heatEnd'){if(s.phaseLeft<1e-7){if(s.heat===1)this._finish();else{s.heat=1;this._phase('editing',20);this._event('edit',{heat:1});}}return;}
  if(s.mode!=='racing')return;const v=s.vehicle,before=v.grounded;P.step(v,this._input,dt,s.heat);if(before>0&&v.grounded===0){this._event('jump');this._effect('jump',v.origin.x,v.origin.y-.5,.35);}if(before===0&&v.grounded>0&&v.terrainImpact>50){this._event('land',{impact:v.terrainImpact});const w=v.wheels.find(w=>w.contact);this._effect('land',w?w.x:v.x,w?w.y-w.radius:P.terrain(v.x),.45,v.terrainImpact);}if(v.checkpoints>s.lastCheckpoint){s.lastCheckpoint=v.checkpoints;this._event('checkpoint',{n:v.checkpoints});this._effect('checkpoint',v.origin.x,v.origin.y+40,.65,v.checkpoints);}if(v.y<P.terrain(v.x)-200||!Number.isFinite(v.x+v.y+v.angle))this.recover();if(s.phaseLeft<1e-7)this._endHeat();
 }
}
window.AsobiJunkData=Data;window.AsobiJunkModel=JunkModel;
})();
