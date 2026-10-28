/* Balance audit using only public input, upgrade and course-selection methods. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'games/scrap-drift-model.js'),'utf8'),sandbox);
const Model=sandbox.window.AsobiDriftModel,Data=sandbox.window.AsobiDriftData,model=new Model(),courses=[],purchases=[];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
for(let course=0;course<Data.tracks.length;course++){
 if(course>0){
  const desired={engine:Math.min(3,course),tires:Math.min(3,Math.ceil(course/2)),body:Math.min(3,Math.floor(course/2))};
  for(let round=0;round<3;round++)for(const part of ['engine','tires','body'])if(model.state.upgrades[part]<desired[part]){const result=model.buy(part);if(result.ok)purchases.push({beforeCourse:course,part,cost:result.cost,level:result.level});}
 }
 assert.equal(model.startRace(course).ok,true);let frames=0,collisions=0,perfects=0,nitroFrames=0,driftHeld=false,heldSection=-1,driftPresses=0;
 while(model.state.mode!=='finished'&&frames++<60*130){
  const s=model.state,stats=model.getStats(),road=model.roadAt(s.distance),ratio=clamp(s.speed/stats.topSpeed,0,1.5);
  if(road.section!==heldSection||road.progress>.9){driftHeld=false;heldSection=road.section;}
  if(!driftHeld&&road.section>=0&&road.progress>.085&&road.progress<.34&&s.speed>65){driftHeld=true;driftPresses++;}
  const drifting=driftHeld&&Math.abs(road.curve)>.11;
  let target=0;const close=s.rivals.filter(r=>r.distance-s.distance>-36&&r.distance-s.distance<190);if(close.length){const lanes=[-.81,-.28,.28,.81];target=lanes.sort((a,b)=>Math.min(...close.map(r=>Math.abs(b-r.x)))-Math.abs(b)*.035-(Math.min(...close.map(r=>Math.abs(a-r.x)))-Math.abs(a)*.035))[0];}
  const steer=clamp(road.curve*ratio*ratio*(drifting?.72:1.08/stats.grip)/(1.42*(.55+.45*Math.min(ratio,1))*(drifting?1.04:1))+(target-s.x)*1.8,-1,1);
  const nitro=Math.abs(road.curve)<.15&&s.nitro>8;if(nitro)nitroFrames++;model.update(1/60,{steer,drift:driftHeld,nitro});
  for(const event of model.drainEvents()){if(event.type==='collision')collisions++;if(event.type==='perfect')perfects++;}
 }
 assert.equal(model.state.mode,'finished');const s=model.state;
 courses.push({track:Data.tracks[course].id,upgrades:{...s.upgrades},result:{...s.result},collisions,perfects,driftPresses,nitroFrames,coinsAfter:s.coins});
 assert.equal(s.result.rank,1,'Normal earned-upgrade pilot should win course '+course);
 assert.equal(s.unlocked,Math.min(Data.tracks.length-1,course+1));
}
assert.equal(model.state.result.champion,true);assert.equal(model.state.wins,6);assert.equal(model.state.races,6);
const report={checkedAt:new Date().toISOString(),result:'PASS',provenance:'Fresh ordinary model. Only update(dt,controls), startRace(track) and buy(part) change state. Drift is released outside each corner and freshly pressed at its entry, not held for the race. No fixtures or direct state changes. Steering observes exact positions and is a balance simulation, not a human-playtime claim or promotional recording.',courses,purchases};
fs.writeFileSync(path.join(__dirname,'scrap-drift-balance-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
