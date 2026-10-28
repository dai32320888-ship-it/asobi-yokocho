/* Isolated model invariants and real update/input simulations; never public saves. */
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const HERE=path.dirname(fileURLToPath(import.meta.url)),sandbox={window:{},console};
vm.runInNewContext(readFileSync(path.join(HERE,'../games/scrap-drift-model.js'),'utf8'),sandbox,{filename:'scrap-drift-model.js'});
const Model=sandbox.window.AsobiDriftModel,Data=sandbox.window.AsobiDriftData,checks=[];
const clone=value=>JSON.parse(JSON.stringify(value));
function check(name,fn){test(name,()=>{try{fn();checks.push({name,status:'PASS'})}catch(error){checks.push({name,status:'FAIL',message:error.message});throw error}})}
function finite(value){if(typeof value==='number')assert.ok(Number.isFinite(value));else if(value&&typeof value==='object')for(const v of Object.values(value))finite(v)}
function tick(m,seconds,input={}){for(let t=0;t<seconds;t+=1/120)m.update(Math.min(1/120,seconds-t),input)}
function ready(m=new Model()){assert.equal(m.startRace().ok,true);for(let i=0;i<600&&m.state.mode==='countdown';i++)m.update(1/120,{});assert.equal(m.state.mode,'racing');return m}
function funded(){const m=new Model();m.state.coins=1000000;return new Model(m.snapshot())}
function pilot(m,max=120){for(let t=0;t<max&&m.state.mode!=='finished';t+=1/120){const s=m.state,road=m.roadAt(s.distance);m.update(1/120,{steer:Math.max(-1,Math.min(1,road.curve*.8-s.x*1.8)),drift:Math.abs(road.curve)>.13,nitro:Math.abs(road.curve)<.15});finite(s)}return m.state.result}

check('A fresh garage has a rusty starter car, zero premium systems and six finite courses',()=>{
 const m=new Model(),s=m.state;assert.equal(s.mode,'garage');assert.equal(s.coins,0);assert.equal(s.unlocked,0);assert.equal(s.trackIndex,0);assert.deepEqual(clone(s.upgrades),{engine:0,tires:0,body:0});assert.equal(Data.tracks.length,6);for(let i=0;i<Data.tracks.length;i++){assert.ok(Data.tracks[i].length>2000);for(let z=0;z<Data.tracks[i].length;z+=40){const r=m.roadAt(z,i);finite(r);assert.ok(Math.abs(r.curve)<=1.001)}}finite(s);
});
check('Only unlocked tracks and affordable garage upgrades can be selected',()=>{
 const m=new Model(),before=clone(m.snapshot());assert.equal(m.selectTrack(1).ok,false);for(const part of['engine','tires','body'])assert.equal(m.buy(part).ok,false);assert.deepEqual(clone(m.snapshot()),before);assert.equal(m.selectTrack(-1).ok,false);assert.equal(m.selectTrack(99).ok,false);assert.equal(m.buy('__proto__').ok,false);assert.equal(m.buy('constructor').ok,false);
});
check('Engine, tyres and body all change driving and each upgrade respects its cost and cap',()=>{
 const m=funded();let old=m.getStats();for(const part of['engine','tires','body']){for(let level=1;level<=3;level++){const money=m.state.coins;assert.equal(m.buy(part).ok,true);assert.equal(m.state.upgrades[part],level);assert.ok(m.state.coins<money);const next=m.getStats();if(part==='engine'){assert.ok(next.topSpeed>old.topSpeed);assert.ok(next.acceleration>old.acceleration)}if(part==='tires')assert.ok(next.grip>old.grip);if(part==='body')assert.ok(next.nitroPower>old.nitroPower||next.collisionRetention>old.collisionRetention);old=next}const money=m.state.coins;assert.equal(m.buy(part).ok,false);assert.equal(m.state.coins,money)}finite(m.state);
});
check('A race counts down before accelerating and rejects purchases or course changes while moving',()=>{
 const m=funded();assert.equal(m.startRace().ok,true);assert.equal(m.state.mode,'countdown');const coins=m.state.coins;assert.equal(m.buy('engine').ok,false);assert.equal(m.selectTrack(0).ok,false);m.update(1/120,{steer:1,nitro:true,drift:true});assert.equal(m.state.distance,0);assert.equal(m.state.speed,0);assert.equal(m.state.coins,coins);for(let i=0;i<600&&m.state.mode==='countdown';i++)m.update(1/120,{});assert.equal(m.state.mode,'racing');tick(m,1);assert.ok(m.state.distance>0&&m.state.speed>0);
});
check('Steering direction and off-road friction matter without leaving finite road bounds',()=>{
 const left=ready(),right=ready(),centre=ready();tick(left,1.5,{steer:-1});tick(right,1.5,{steer:1});tick(centre,1.5);assert.ok(left.state.x<centre.state.x);assert.ok(right.state.x>centre.state.x);for(let i=0;i<1000;i++)right.update(1/120,{steer:1});assert.ok(Math.abs(right.state.x)<=2);assert.ok(right.state.speed<right.getStats().topSpeed);finite(right.state);
});
check('Nitro uses a finite tank and actually accelerates the car',()=>{
 const m=ready(),normal=ready();tick(m,2);tick(normal,2);m.state.x=normal.state.x=-.25;const nitro=m.state.nitro;tick(m,1.5,{nitro:true});tick(normal,1.5);assert.ok(m.state.nitro<nitro);assert.ok(m.state.speed>normal.state.speed);tick(m,15,{nitro:true});assert.ok(m.state.nitro>=0&&m.state.nitro<=100);finite(m.state);
});
check('Holding drift on a straight or at rest does not farm rewards',()=>{
 const m=ready();const coins=m.state.coins;tick(m,.5,{drift:true});assert.equal(m.state.driftPoints,0);assert.equal(m.state.drifts,0);assert.equal(m.state.coins,coins);const garage=new Model();tick(garage,5,{steer:1,drift:true,nitro:true});assert.equal(garage.state.driftPoints,0);assert.equal(garage.state.distance,0);finite(garage.state);
});
check('A well-timed curve needs correct steering and a section can reward only one drift entry',()=>{
 const m=ready(),wrong=ready(),section=Data.tracks[0].curves[0],distance=section.start+(section.end-section.start)*.15;
 for(const car of[m,wrong]){car.state.distance=distance;car.state.speed=120;car.state.x=0;car.drainEvents()}
 const direction=Math.sign(m.roadAt(distance).curve);m.update(1/120,{steer:direction,drift:true});wrong.update(1/120,{steer:-direction,drift:true});assert.equal(m.state.drifting,true);assert.equal(wrong.state.drifting,false);assert.equal(m.state.drifts,1);assert.equal(wrong.state.drifts,0);assert.ok(m.drainEvents().some(event=>event.type==='perfect'));
 for(let i=0;i<20;i++){m.update(1/120,{steer:direction,drift:false});m.update(1/120,{steer:direction,drift:true})}assert.equal(m.state.drifts,1);assert.ok(m.state.driftPoints<151);assert.equal(m.state.coins,0);
});
check('A real rival impact slows the car, grants brief protection and bodywork softens the impact',()=>{
 const stock=ready(),body=ready();body.state.upgrades.body=3;
 for(const m of[stock,body]){m.state.distance=480;m.state.speed=170;m.state.x=0;Object.assign(m.state.rivals[1],{distance:500,x:0,speed:100});m.drainEvents();m.update(1/120,{})}
 assert.ok(stock.state.speed<130);assert.ok(body.state.speed>stock.state.speed);assert.ok(stock.state.collisionTime>0);assert.equal(stock.drainEvents().filter(event=>event.type==='collision').length,1);stock.update(1/120,{});assert.equal(stock.drainEvents().filter(event=>event.type==='collision').length,0);finite(stock.state);finite(body.state);
});
check('Holding drift too early or pressing late can drift but cannot earn a perfect timing bonus',()=>{
 const held=ready(),late=ready(),section=Data.tracks[0].curves[0];tick(held,2,{drift:true});held.drainEvents();
 held.state.distance=section.start+(section.end-section.start)*.15;held.state.speed=120;held.state.x=0;held.update(1/120,{steer:Math.sign(held.roadAt(held.state.distance).curve),drift:true});assert.equal(held.state.drifting,true);assert.equal(held.state.drifts,1);assert.ok(held.state.driftPoints<40);assert.equal(held.drainEvents().filter(event=>event.type==='perfect').length,0);
 late.state.distance=section.start+(section.end-section.start)*.65;late.state.speed=120;late.state.x=0;late.drainEvents();late.update(1/120,{steer:Math.sign(late.roadAt(late.state.distance).curve),drift:true});assert.equal(late.state.drifting,true);assert.equal(late.state.drifts,1);assert.ok(late.state.driftPoints<40);assert.equal(late.drainEvents().filter(event=>event.type==='perfect').length,0);
});
check('Equivalent frame rates preserve time, distance and speed',()=>{
 const a=ready(),b=ready();for(let i=0;i<180;i++)a.update(1/30,{});for(let i=0;i<720;i++)b.update(1/120,{});assert.ok(Math.abs(a.state.elapsed-b.state.elapsed)<.06);assert.ok(Math.abs(a.state.distance-b.state.distance)<8);assert.ok(Math.abs(a.state.speed-b.state.speed)<2);assert.ok(Math.abs(a.state.x-b.state.x)<.05);
});
check('Invalid delta times and malformed inputs never produce non-finite progress',()=>{
 const m=ready();for(const dt of[NaN,Infinity,-Infinity,-1,0,1e9])m.update(dt,{steer:NaN,drift:'yes',nitro:null,brake:Infinity});finite(m.state);assert.ok(m.state.elapsed<=.2);assert.ok(Math.abs(m.state.x)<=2);
});
check('Finishing by legal driving awards once, unlocks progress and preserves it through garage and reload',()=>{
 const m=ready(),before=m.state.coins,result=pilot(m);assert.ok(result);assert.equal(m.state.mode,'finished');assert.ok(result.rank>=1&&result.rank<=4);assert.ok(m.state.coins>before);assert.equal(m.state.races,1);const progress=clone(m.snapshot());for(let i=0;i<100;i++)m.update(.05,{steer:1,nitro:true});assert.equal(m.state.coins,progress.coins);assert.equal(m.state.races,1);const restored=new Model(progress);assert.equal(restored.state.mode,'garage');assert.equal(restored.state.coins,progress.coins);assert.equal(restored.state.races,1);assert.deepEqual(clone(restored.state.upgrades),progress.upgrades);if(result.rank===1)assert.equal(restored.state.unlocked,1);assert.equal(m.returnGarage().ok,true);assert.equal(m.state.coins,progress.coins);assert.equal(m.startRace().ok,true);assert.equal(m.state.races,1);
});
check('Corrupt or hostile saves recover to a safe finite garage',()=>{
 const fresh=new Model().snapshot();for(const bad of[null,[],{},'bad',{...fresh,coins:NaN},{...fresh,coins:-1},{...fresh,coins:Infinity},{...fresh,unlocked:99},{...fresh,trackIndex:99},{...fresh,upgrades:{engine:50,tires:-1,body:'3'}},{...fresh,best:Array(6).fill(Infinity)},{...fresh,version:999}]){const m=new Model(bad);assert.equal(m.state.mode,'garage');finite(m.state);assert.ok(m.state.coins>=0&&m.state.coins<=10000000);assert.ok(m.state.unlocked>=0&&m.state.unlocked<6);assert.ok(m.state.trackIndex<=m.state.unlocked);for(const n of Object.values(m.state.upgrades))assert.ok(Number.isInteger(n)&&n>=0&&n<=3)}
});
after(()=>writeFileSync(path.join(HERE,'scrap-drift-model-results.json'),JSON.stringify({generatedAt:new Date().toISOString(),checks},null,2)+'\n'));
