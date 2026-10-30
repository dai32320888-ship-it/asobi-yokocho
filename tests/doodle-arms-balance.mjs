import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createPilot}=require('./doodle-arms-pilot.cjs'),scope={window:{}};
for(const file of ['geometry','model'])vm.runInNewContext(readFileSync(new URL('../games/doodle-arms-'+file+'.js',import.meta.url),'utf8'),scope);
const Geo=scope.window.AsobiDoodleGeometry,Model=scope.window.AsobiDoodleModel;
const stroke=(points,width=6)=>({color:'#58b9b6',width,points:points.map(([x,y])=>({x,y}))}),art=(name,strokes)=>({version:1,name,strokes});
const shapes={...Geo.templates,long:art('LONG',[stroke([[40,100],[232,100]])]),brick:art('BRICK',[40,50,60,70,80].map(x=>stroke([[x,80],[x,120]],18))),ring:art('RING',[stroke([[80,40],[190,40],[190,150],[80,150],[80,40]])])};
const runs=[];
for(const [name,drawing] of Object.entries(shapes))for(const strategy of ['attack','timed']){
 const m=new Model(),pilot=createPilot(strategy,{skipArt:false});m.begin(drawing);let ticks=0,acceptedAttacks=0,acceptedDodges=0;
 while(m.state.mode!=='finished'&&ticks++<22400){pilot.next(m);m.update(1/120);for(const e of m.drainEvents()){if(e.actor==='player'&&e.type==='swing')acceptedAttacks++;if(e.actor==='player'&&e.type==='dodge')acceptedDodges++;}}
 assert.equal(m.state.mode,'finished');assert.equal(m.state.plays,1);assert.equal(m.state.results.length,3);assert.ok(m.state.elapsed<=186);
 runs.push({shape:name,strategy,stats:Geo.compile(drawing).stats,activeSeconds:Math.round(m.state.elapsed*100)/100,wins:m.state.wins,score:m.state.score,acceptedAttacks,acceptedDodges,rounds:m.state.results.map(r=>({round:r.round,win:r.win,reason:r.reason,playerHp:r.playerHp,enemyHp:r.enemyHp,damageDealt:r.damageDealt,damageTaken:r.damageTaken}))});
}
const bricks=runs.filter(r=>r.shape==='brick');assert.ok(bricks.every(r=>r.wins<3),'A short solid clump must not automatically dominate');assert.ok(new Set(runs.map(r=>r.wins)).size>=2,'Shape handling must produce meaningful different outcomes');assert.ok(runs.every(r=>r.rounds.some(round=>round.damageTaken>0)),'Attack spam cannot stun-lock every opponent');
const report={checkedAt:new Date().toISOString(),result:'PASS',method:'Fresh models and actual public begin/attack/dodge/update only. No state, clock, score, health, save or collision mutation. First art40s + edits10s wait naturally; bots select attack or attack with a telegraph-based timed dodge. Deterministic balance evidence, not a human-usability claim.',runs};
writeFileSync(new URL('./doodle-arms-balance-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,runs:runs.map(({shape,strategy,wins,activeSeconds,score})=>({shape,strategy,wins,activeSeconds,score}))},null,2));
