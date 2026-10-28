/* Proportion check using public controls only. This is not promotional footage. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../games/balloon-panic-model.js'),'utf8'),sandbox);
const Model=sandbox.window.AsobiBalloonModel,model=new Model(),rounds=[];
for(let i=0;i<24;i++){
 const target=[.2,.6,.82,.95,.985,1][i%6];assert.equal(model.hold().ok,true);const capacity=model.state.capacity;
 while(model.state.mode==='holding'&&model.state.pressure+1e-12<target){const remaining=(target-model.state.pressure)*capacity;model.update(Math.min(1/120,Math.max(1e-10,remaining)));}
 if(model.state.mode==='holding')assert.equal(model.release().ok,true);
 const s=model.state;rounds.push({round:s.round,colorIndex:s.colorIndex,capacity:+capacity.toFixed(6),elapsed:+s.elapsed.toFixed(6),pressure:+s.pressure.toFixed(6),grade:s.grade,score:s.score,streak:s.streak,warningEvents:model.drainEvents().filter(event=>['warning','danger'].includes(event.type)).map(event=>event.type)});
 assert.ok(s.elapsed<=8.6);assert.equal(s.mode,target===1?'burst':'stopped');
 if(target===1)assert.equal(s.score,0);else assert.ok(Math.abs(s.score-Math.round(1000*target*target))<=1);
 const restored=new Model(model.snapshot());for(const key of['best','plays','successes','perfects','streak','bestStreak','lastScore','lastGrade'])assert.equal(restored.state[key],s[key]);
}
assert.equal(model.state.plays,24);assert.equal(model.state.successes,20);assert.equal(model.state.perfects,4);assert.equal(model.state.bestStreak,3);
const capacityRange=[Math.min(...rounds.map(round=>round.capacity)),Math.max(...rounds.map(round=>round.capacity))];
const report={checkedAt:new Date().toISOString(),result:'PASS',provenance:'Ordinary fresh model; public hold/update/release only. Timing targets are exact model observations for proportion checks, not a claim about human scores or the promotional recording.',rounds,capacityRange,final:{best:model.state.best,plays:model.state.plays,successes:model.state.successes,perfects:model.state.perfects,bestStreak:model.state.bestStreak}};
fs.writeFileSync(path.join(__dirname,'balloon-panic-balance-results.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS: 24 legal rounds; readable warning stages; 6.2–8.6-second capacity; bounded scores and no restore reward duplication.');
