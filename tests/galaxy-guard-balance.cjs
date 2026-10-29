/* Ordinary public-control simulation. Never writes model state, save or clock. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
function load(){const scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../games/galaxy-guard-model.js'),'utf8'),scope);return scope.window.AsobiGalaxyModel;}
function steer(model,frame=0){
 const s=model.state,p=s.player;
 if(frame%12!==0)return;
 let goal=s.boss?s.boss.x:s.enemies.filter(e=>e.y<500).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0]?.x??240;
 const item=s.pickups.filter(i=>i.y>330&&i.y<600).sort((a,b)=>b.y-a.y)[0];if(item)goal=item.x;
 const threats=s.bullets.filter(b=>b.kind==='beam'?Math.abs(b.x-p.x)<45:(b.y>420&&Math.abs(b.x-p.x)<35));
 if(s.boss?.warning?.kind==='beam'&&Math.abs(s.boss.warning.x-p.x)<60)goal=p.x<240?p.x-100:p.x+100;
 else if(threats.length)goal=p.x<240?p.x-80:p.x+80;
 if(p.hp<=1&&s.bombs>0&&(threats.length||s.boss))model.bomb();
 model.setTarget(goal);
}
function run(model,{idle=false,maxFrames=12000}={}){model.start();let frame=0;const events=[];while(model.state.mode==='playing'&&frame<maxFrames){if(!idle)steer(model,frame);model.update(1/120);events.push(...model.drainEvents().map(e=>({...e,time:model.state.time})));frame++;}return{mode:model.state.mode,seconds:+model.state.time.toFixed(3),score:model.state.score,kills:model.state.kills,hp:model.state.player.hp,level:model.state.player.level,bombs:model.state.bombs,wave:model.state.wave,events};}
function main(){const Model=load(),model=new Model(),attempts=[];for(let i=0;i<12;i++){const result=run(model);assert.ok(['won','lost'].includes(result.mode));assert.ok(result.seconds<=90.02);attempts.push({...result,events:undefined});}const idle=run(new Model(),{idle:true});assert.ok(['won','lost'].includes(idle.mode));const report={checkedAt:new Date().toISOString(),result:'PASS',method:'Read-only observations plus start/setTarget/bomb/update public inputs at 120Hz. Uses exact positions and is a simulation, not a human completion-time claim or promo gameplay.',attempts,wins:attempts.filter(a=>a.mode==='won').length,idle:{...idle,events:undefined},earnedTerminalSave:model.snapshot()};assert.ok(report.wins>=7,'Most assisted-input runs should be achievable');fs.writeFileSync(path.join(__dirname,'galaxy-guard-balance-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
module.exports={load,steer,run};if(require.main===module)try{main()}catch(error){console.error(error.stack);process.exitCode=1;}
