/* A normal-start model playthrough using only movement/action input.
 * The observer reads positions to steer; it never edits progress or enemies.
 * This is a simulation/balance check, not promotional video footage.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sandbox={window:{},console};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../games/mouse-evolution-model.js'),'utf8'),sandbox);
const model=new sandbox.window.AsobiMouseModel(),stages=[],events={},dt=1/60;let deaths=0,frames=0,lastStage=-1;
model.start();
while(frames<60*1200&&model.state.mode!=='won'){
 const s=model.state,p=s.player;
 if(s.stage!==lastStage){lastStage=s.stage;stages.push({stage:s.stage,time:+s.time.toFixed(2),generation:s.generation,hp:+p.hp.toFixed(1),size:p.size});}
 if(s.mode==='breeding'){model.chooseGene(s.genes.armor<8?'armor':'power');continue;}
 if(s.mode==='dead'){deaths++;if(deaths>20)break;model.restartStage();}
 let target;
 if(s.mate.ready&&!s.stageBred)target=s.mate;
 else if(s.xp>=s.goal*.7&&s.enemies.some(e=>e.boss))target=s.enemies.find(e=>e.boss);
 else target=s.foods.reduce((best,food)=>!best||Math.hypot(food.x-p.x,food.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?food:best,null);
 if(!target)target=s.enemies.find(e=>e.boss)||s.enemies[0]||{x:900,y:700};
 let dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)||1,attack=true,dash=false;
 const nearby=s.enemies.reduce((best,e)=>!best||Math.hypot(e.x-p.x,e.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?e:best,null);
 let aim=nearby&&Math.hypot(nearby.x-p.x,nearby.y-p.y)<200?nearby:target;
 if(target.boss&&d<p.r+target.r+22){dx=-dx;dy=-dy;}
 const danger=s.enemies.find(e=>['windup','charge'].includes(e.phase)&&Math.hypot(e.x-p.x,e.y-p.y)<p.r+e.r+130);
 if(danger&&p.dashCd<=0){const ex=danger.x-p.x,ey=danger.y-p.y,ed=Math.hypot(ex,ey)||1;dx=-ey/ed;dy=ex/ed;aim={x:p.x+dx*400,y:p.y+dy*400};dash=true;}
 const length=Math.hypot(dx,dy)||1;model.update(dt,{x:dx/length,y:dy/length,attack,dash,breed:true,aimX:aim.x,aimY:aim.y});frames++;
 for(const event of model.drainEvents())events[event.type]=(events[event.type]||0)+1;
}
const s=model.state,report={generatedAt:new Date().toISOString(),kind:'Normal-start deterministic input simulation; no state fixtures',mode:s.mode,time:+s.time.toFixed(2),frames,deaths,generation:s.generation,genes:s.genes,score:s.score,kills:s.kills,foodsEaten:s.foodsEaten,size:s.player.size,stages,events};
fs.writeFileSync(path.join(__dirname,'mouse-evolution-normal-run-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));assert.equal(s.mode,'won','The normal action route must reach Earth');assert.equal(stages.length,9);assert.ok(s.generation>1,'The playthrough actually breeds');assert.ok(s.kills>=9,'Each stage requires combat');
