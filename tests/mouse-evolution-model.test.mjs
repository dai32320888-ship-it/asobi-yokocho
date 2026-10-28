/* Pure model checks. Fixtures exist only in this isolated VM; no browser saves. */
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const sandbox={window:{},console,performance:{now:()=>0}};
vm.runInNewContext(readFileSync(path.join(HERE,'../games/mouse-evolution-model.js'),'utf8'),sandbox,{filename:'mouse-evolution-model.js'});
const Model=sandbox.window.AsobiMouseModel,Data=sandbox.window.AsobiMouseData,results=[];
const json=value=>JSON.parse(JSON.stringify(value));
function check(name,fn){test(name,()=>{try{fn();results.push({name,status:'PASS'})}catch(error){results.push({name,status:'FAIL',message:error.message});throw error}})}
function ready(saved){const model=new Model(saved);model.start();model.state.enemies=[];model.state.foods=[];return model}
function ticks(model,seconds,input={}){for(let at=0;at<seconds-1e-8;at+=.02)model.update(.02,input)}
function enemy(model,overrides={}){const original=new Model().state.enemies[0]||{};return{...original,id:991,type:'beetle',x:model.state.player.x+60,y:model.state.player.y,r:15,hp:500,maxHp:500,facing:Math.PI,phase:'stun',phaseTime:10,boss:false,hitFlash:0,...overrides}}
check('Nine distinct growth worlds lead from a small mouse to Earth diameter',()=>{
 assert.equal(Data.STAGES.length,9);assert.equal(new Set(Data.STAGES.map(stage=>stage.world)).size,9);
 assert.ok(Data.STAGES[0].minSize<=.1);assert.equal(Data.STAGES.at(-1).maxSize,12742000);
 for(let index=0;index<Data.STAGES.length;index++){const stage=Data.STAGES[index];assert.ok(stage.maxSize>stage.minSize&&stage.goal>0);if(index)assert.ok(stage.minSize>=Data.STAGES[index-1].minSize);assert.ok(Data.ANIMALS[stage.boss])}
 const m=new Model();assert.equal(m.state.mode,'ready');assert.equal(m.state.stage,0);assert.equal(m.state.generation,1);assert.ok(m.state.player.hp>0);
});
check('Corrupt and hostile save shapes become finite bounded playable state',()=>{
 for(const bad of[null,[],true,'bad',{version:999,stage:999},{version:1,stage:-20,xp:Infinity,score:NaN,time:-1,generation:-4,genes:{speed:'100',power:Infinity,armor:-99},player:{x:Infinity,y:null,hp:-10,facing:NaN},enemies:Array(500).fill({hp:Infinity}),foods:Array(500).fill({value:Infinity})}]){
  const m=new Model(bad),s=m.state;assert.ok(Number.isInteger(s.stage)&&s.stage>=0&&s.stage<9);assert.ok(Number.isFinite(s.xp)&&s.xp>=0);assert.ok(Number.isFinite(s.player.x)&&Number.isFinite(s.player.y));assert.ok(s.player.hp>=0&&s.player.hp<=s.player.maxHp);assert.ok(s.enemies.length<100&&s.foods.length<200);m.start();m.update(.016,{x:1,y:1});assert.ok(Number.isFinite(s.player.x)&&Number.isFinite(s.player.y));
 }
});
check('Movement is time based, diagonal-normalized and bounded to the world',()=>{
 const a=ready(),b=ready(),c=ready(),origin={x:a.state.player.x,y:a.state.player.y};for(let i=0;i<60;i++)a.update(1/60,{x:1,y:0});for(let i=0;i<30;i++)b.update(1/30,{x:1,y:0});ticks(c,1,{x:1,y:1});
 const da=Math.hypot(a.state.player.x-origin.x,a.state.player.y-origin.y),db=Math.hypot(b.state.player.x-origin.x,b.state.player.y-origin.y),dc=Math.hypot(c.state.player.x-origin.x,c.state.player.y-origin.y);assert.ok(da>50);assert.ok(Math.abs(da-db)<3,'Frame rates have the same travel distance');assert.ok(dc<=da*1.02,'Diagonal movement is not faster');ticks(a,20,{x:1,y:1});assert.ok(a.state.player.x<=1800&&a.state.player.y<=1400);
});
check('Bite respects facing, range, cooldown and one hit per swing',()=>{
 const m=ready(),p=m.state.player;const front=enemy(m,{id:901,x:p.x+50}),back=enemy(m,{id:902,x:p.x-60}),far=enemy(m,{id:903,x:p.x+600});m.state.enemies=[front,back,far];ticks(m,.22,{attack:true,aimX:p.x+500,aimY:p.y});assert.ok(front.hp<500,'Front target takes a hit');assert.equal(back.hp,500,'Targets behind the mouse are safe');assert.equal(far.hp,500,'Distant targets are safe');const damaged=front.hp;ticks(m,.08,{attack:true,aimX:p.x+500,aimY:p.y});assert.equal(front.hp,damaged,'Holding cannot multiply hits in one swing');assert.ok(p.attackCd>0);ticks(m,.5,{attack:true,aimX:p.x+500,aimY:p.y});assert.ok(front.hp<damaged,'Another swing becomes available after cooldown');
});
check('Dash is fast, grants invulnerability and cannot retrigger through cooldown',()=>{
 const m=ready(),p=m.state.player,x=p.x;p.invuln=0;m.update(.02,{x:1,dash:true});assert.ok(p.dashT>0&&p.dashCd>0&&p.invuln>0);ticks(m,.1,{x:1,dash:true});assert.ok(p.x-x>40);const remaining=p.dashCd;ticks(m,.3,{x:1,dash:true});assert.ok(p.dashCd<remaining,'Cooldown counts down instead of restarting each frame');assert.ok(p.dashT<=0);
});
check('Enemy windup visibly precedes contact damage and a dash avoids that hit',()=>{
 const a=ready(),p=a.state.player;p.invuln=0;const attacker=enemy(a,{x:p.x+12,y:p.y,phase:'windup',phaseTime:.25,chargeX:-1,chargeY:0,vx:0,vy:0});a.state.enemies=[attacker];ticks(a,.20,{});assert.equal(p.hp,p.maxHp,'A telegraphed attack is harmless before release');ticks(a,.10,{});assert.ok(p.hp<p.maxHp,'The released charge can hurt');
 const b=ready(),q=b.state.player;q.invuln=0;b.state.enemies=[enemy(b,{x:q.x+12,y:q.y,phase:'charge',phaseTime:.3,vx:0,vy:0})];b.update(.02,{dash:true,aimX:q.x+400,aimY:q.y});assert.equal(q.hp,q.maxHp,'A real overlapping attack is evaded during a dash');
});
check('A giant commits to its warning and cannot be stun-locked by bite spam',()=>{
 const m=ready(),p=m.state.player,boss=enemy(m,{id:901,boss:true,x:p.x+55,phase:'windup',phaseTime:.4,chargeX:-1,chargeY:0});m.state.enemies=[boss];m.update(.02,{attack:true,aimX:boss.x,aimY:boss.y});assert.ok(boss.hp<500);assert.equal(boss.phase,'windup','Taking a bite cannot cancel a committed giant attack');
});
check('Eating food grows the body and recovers health without an action button',()=>{
 const m=ready(),s=m.state,p=s.player;p.hp=p.maxHp/2;const r=p.r;s.foods=[{id:991,type:'seed',x:p.x,y:p.y,r:8,value:12}];m.update(.02,{});assert.ok(s.xp>0);assert.ok(p.r>r);assert.ok(p.hp>p.maxHp/2);assert.ok(!s.foods.some(food=>food.id===991));assert.ok(m.drainEvents().some(event=>event.type==='food'));
});
check('Growth cannot skip a live boss; a real bite defeat opens the next world',()=>{
 const m=new Model({...new Model().snapshot(),xp:Data.STAGES[0].goal}),s=m.state,p=s.player;m.start();s.foods=[];m.update(.02,{});assert.equal(s.stage,0,'XP alone cannot unlock the next world');let boss=s.enemies.find(e=>e.boss);assert.ok(boss,'Boss appears by the growth gate');s.enemies=[boss];Object.assign(boss,{x:p.x+50,y:p.y,hp:1,phase:'stun',phaseTime:10});ticks(m,.3,{attack:true,aimX:p.x+500,aimY:p.y});assert.equal(s.stage,1);assert.ok(m.drainEvents().some(event=>event.type==='evolve'));
});
check('Breeding requires proximity and inherits exactly one chosen gene per stage',()=>{
 const m=ready({...new Model().snapshot(),xp:Data.STAGES[0].goal*.4}),s=m.state;assert.ok(s.mate.ready);s.player.x=s.mate.x;s.player.y=s.mate.y;assert.ok(m.canBreed());m.update(.02,{breed:true});assert.equal(s.mode,'breeding');const before={x:s.player.x,y:s.player.y,g:s.generation,power:s.genes.power};ticks(m,1,{x:1,y:1,attack:true});assert.equal(s.player.x,before.x);assert.equal(s.player.y,before.y);m.chooseGene('power');assert.equal(s.generation,before.g+1);assert.equal(s.genes.power,before.power+1);assert.equal(s.mode,'playing');assert.equal(m.canBreed(),false,'One family event per stage');const snap=m.snapshot(),restored=new Model(snap);assert.equal(restored.state.generation,s.generation);assert.equal(restored.state.genes.power,s.genes.power);assert.equal(restored.state.stageBred,true);
});
check('Death and retry preserve inherited genes without allowing another same-world breed',()=>{
 const m=ready({...new Model().snapshot(),xp:Data.STAGES[0].goal*.4}),s=m.state;s.player.x=s.mate.x;s.player.y=s.mate.y;m.update(.02,{breed:true});m.chooseGene('armor');const generation=s.generation,armor=s.genes.armor;s.player.hp=1;s.player.invuln=0;s.enemies=[enemy(m,{x:s.player.x,y:s.player.y,phase:'charge',phaseTime:1,vx:0,vy:0})];m.update(.02,{});assert.equal(s.mode,'dead');m.restartStage();assert.equal(s.generation,generation);assert.equal(s.genes.armor,armor);assert.equal(s.stageBred,true);assert.equal(s.mate.ready,false);
});
check('Every growth gate is reachable and the last world ends at Earth scale',()=>{
 const m=ready();for(let stage=0;stage<9;stage++){assert.equal(m.state.stage,stage);m.state.enemies=[];m.state.foods=[];m.state.xp=m.state.goal;m.state.bossDefeated=true;m.state.bossSpawned=true;m.update(.02,{});if(stage<8)assert.equal(m.state.stage,stage+1)}assert.equal(m.state.mode,'won');assert.equal(m.state.stage,8);assert.ok(m.state.player.size>=12742000);assert.ok(m.drainEvents().some(event=>event.type==='clear'));
});
check('Pause freezes state, death can retry the current stage and saves resume safely',()=>{
 const m=ready();m.pause();const prior=json(m.snapshot());ticks(m,2,{x:1,attack:true,dash:true});assert.deepEqual(json(m.snapshot()),prior);m.resume();assert.equal(m.state.mode,'playing');m.state.player.hp=1;m.state.player.invuln=0;m.state.enemies=[enemy(m,{x:m.state.player.x,y:m.state.player.y,phase:'charge',phaseTime:1,vx:0,vy:0})];m.update(.02,{});assert.equal(m.state.mode,'dead');const stage=m.state.stage;m.restartStage();assert.equal(m.state.stage,stage);assert.ok(m.state.player.hp>0);const snap=m.snapshot(),restored=new Model(snap);assert.notEqual(restored.state.mode,'playing','A restored browser does not start hazards before an explicit input');assert.equal(restored.state.stage,stage);
});
after(()=>writeFileSync(path.join(HERE,'mouse-evolution-model-results.json'),JSON.stringify({generatedAt:new Date().toISOString(),results},null,2)+'\n'));
