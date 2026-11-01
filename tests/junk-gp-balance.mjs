import {readFileSync,writeFileSync} from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const scope={window:{}};for(const f of ['physics','model'])vm.runInNewContext(readFileSync(new URL('../games/junk-gp-'+f+'.js',import.meta.url),'utf8'),scope);const P=scope.window.AsobiJunkPhysics,M=scope.window.AsobiJunkModel,clone=P.clone,builds=Object.fromEntries(Object.entries(P.templates).map(([k,v])=>[k,clone(v)]));
builds.narrow=clone(builds.balanced);builds.narrow.parts[0].x=-8;builds.narrow.parts[1].x=8;
builds.frontHeavy=clone(builds.balanced);builds.frontHeavy.parts.push({id:'b',type:'ballast',x:88,y:40,angle:0});
builds.rearHeavy=clone(builds.balanced);builds.rearHeavy.parts.push({id:'b',type:'ballast',x:-88,y:40,angle:0});
builds.backFan=clone(builds.balanced);builds.backFan.parts[2].angle=Math.PI;
builds.upFan=clone(builds.balanced);builds.upFan.parts[2].angle=Math.PI/2;
builds.singleWheel=clone(builds.balanced);builds.singleWheel.parts=builds.singleWheel.parts.slice(1);builds.singleWheel.parts[0].x=0;
builds.fourWheel=clone(builds.balanced);builds.fourWheel.parts.push({id:'w3',type:'wheel',x:-88,y:-22,angle:0},{id:'w4',type:'wheel',x:88,y:-22,angle:0});
builds.lowFan=clone(builds.balanced);builds.lowFan.parts[2].y=-8;
const runs=[];for(const [id,draft]of Object.entries(builds))for(const strategy of ['fullGas','tiltAndRecover']){
 const m=new M();assert.equal(m.begin(draft).ok,true);m.readyNow();for(let i=0;i<7500&&m.state.mode!=='heatEnd';i++){
  const s=m.state,v=s.vehicle;if(s.mode==='racing'){
   let gas=1,brake=0;if(strategy==='tiltAndRecover'){
    if(!v.grounded&&v.angle>.45){gas=0;brake=1;}
    if(v.stallTime>2.5&&v.recoverCooldown===0)m.recover();
   }m.setInput({gas,brake});
  }m.step(1/120);
  assert.ok(Number.isFinite(m.state.vehicle.x+m.state.vehicle.y+m.state.vehicle.angle));
 }assert.equal(m.state.mode,'heatEnd');assert.equal(m.state.results.length,1);const r=m.state.results[0];runs.push({build:id,strategy,distance:r.distance,score:r.score,recoveries:r.recoveries,airTime:r.airTime,flips:r.flips,mass:r.stats.mass,wheelbase:r.stats.wheelbase});
}
const diverseDistances=new Set(runs.filter(r=>r.strategy==='fullGas').map(r=>Math.round(r.distance))).size,checks={runs:runs.length===24,defaultPlayable:runs.find(r=>r.build==='balanced'&&r.strategy==='fullGas').distance>500,buildDiversity:diverseDistances>=8,realAirTime:runs.some(r=>r.airTime>1)};
writeFileSync(new URL('./junk-gp-balance-results.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),result:Object.values(checks).every(Boolean)?'PASS':'FAIL',checks,diverseDistances,scope:'24 ordinary public-model-input60s heats. Vehicle state is never injected. Automatic recovery is a normal public action with the real20m penalty.',runs},null,2)+'\n');console.log(JSON.stringify({checks,diverseDistances,runs},null,2));assert.ok(Object.values(checks).every(Boolean));
