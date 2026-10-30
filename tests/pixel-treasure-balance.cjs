/* All runs below use only start, setMove, dash, update and public snapshots. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createPilot}=require('./pixel-treasure-pilot.cjs'),scope={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../games/pixel-treasure-model.js'),'utf8'),scope);
const Data=scope.window.AsobiTreasureData,Model=scope.window.AsobiTreasureModel;
const runs=[];
for(let stage=0;stage<3;stage++)for(const policy of [{name:'eight-walk',full:false,dash:false},{name:'all-walk',full:true,dash:false},{name:'eight-dash',full:false,dash:true},{name:'all-dash',full:true,dash:true}]){
 const model=new Model(),pilot=createPilot(Data,policy);model.start(stage);let frames=0,dashes=0,hits=0;
 while(model.state.mode==='playing'&&frames<4000){const command=pilot.next(model.snapshot());model.setMove(command.x,command.y);if(command.dash&&model.dash().ok)dashes++;model.update(1/120);hits+=model.drainEvents().filter(e=>e.type==='hurt').length;frames++;}
 const s=model.snapshot(),result={stage,policy:policy.name,result:s.mode,time:Number(s.time.toFixed(3)),timeLeft:Number(s.timeLeft.toFixed(3)),gems:s.gems,chest:s.chestOpened,hp:s.player.hp,hits,dashes,score:s.score,plays:s.plays,clears:s.clears};runs.push(result);
 assert.equal(s.mode,'won',JSON.stringify(result));assert.equal(s.plays,1);assert.equal(s.clears,1);assert.ok(s.time>3&&s.time<30);assert.ok(s.score>0&&Number.isFinite(s.score));if(policy.full){assert.equal(s.gems,10);assert.equal(s.chestOpened,true);}
}
const report={checkedAt:new Date().toISOString(),result:'PASS',method:'12 complete runs across 3 original fixed rooms. Public controls only; no state, score, time, health, seed or save injection. Includes every map with and without dash, plus optional ten-gem/key/chest routes.',runs};
fs.writeFileSync(path.join(__dirname,'pixel-treasure-balance-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
