/* Run: node --test tests/backend.test.mjs (Node 24+, built-in SQLite).
 * Executes production SQL/Worker against an in-memory SQLite D1 adapter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createWorker,RULES,LIMITS,weekStart} from '../backend/worker.mjs';
const schema=readFileSync(new URL('../backend/schema.sql',import.meta.url),'utf8');
class D1{
 constructor(){this.sqlite=new DatabaseSync(':memory:');this.sqlite.exec(schema);this.writes=0}
 prepare(sql){const db=this;let values=[];const statement={bind(...args){values=args;return statement},async first(){return db.sqlite.prepare(sql).get(...values)??null},async all(){return{results:db.sqlite.prepare(sql).all(...values)}},async run(){const result=db.sqlite.prepare(sql).run(...values);db.writes+=Number(result.changes);return{meta:{changes:Number(result.changes)}}}};return statement}
 async batch(statements){this.sqlite.exec('BEGIN IMMEDIATE');try{const results=[];for(const statement of statements)results.push(await statement.run());this.sqlite.exec('COMMIT');return results}catch(error){this.sqlite.exec('ROLLBACK');throw error}}
 close(){this.sqlite.close()}
}
function fixture(){
 const db=new D1();let clock=Date.parse('2026-10-28T03:00:00Z');const worker=createWorker({now:()=>clock});
 const env={RANKING_DB:db,ASSETS:{fetch:async()=>new Response('static asset')}};
 const request=async(endpoint,body,{ip='203.0.113.42',origin='https://games.example',headers={},method='POST',raw}={})=>{
  const request=new Request('https://games.example/api/mole'+endpoint,{method,headers:{origin,'cf-connecting-ip':ip,'content-type':'application/json',...headers},...(method==='GET'?{}:{body:raw===undefined?JSON.stringify(body):raw})});
  const response=await worker.fetch(request,env);const data=await response.json();return{response,data,status:response.status};
 };
 return{db,env,worker,request,get now(){return clock},set now(value){clock=value},async start(nickname='テスター',options){const result=await request('/session',{nickname},options);assert.equal(result.status,200,JSON.stringify(result.data));return result.data},async target(session,index,hole){const target=session.targets[index];clock=target.openAt+100;return request('/hit',{sessionId:session.sessionId,targetId:target.id,hole:hole??target.hole})}};
}

test('schema is idempotent and seeds a database-only random secret',()=>{
 const db=new D1();try{const first=db.sqlite.prepare("SELECT value FROM mole_config WHERE key='ip_hmac_secret'").get().value;assert.match(first,/^[a-f0-9]{64}$/);db.sqlite.exec(schema);assert.equal(db.sqlite.prepare("SELECT value FROM mole_config WHERE key='ip_hmac_secret'").get().value,first)}finally{db.close()}
});
test('session schedule has distinct tokens, valid disjoint server windows and hashed session storage',async()=>{
 const f=fixture();try{const a=await f.start(),b=await f.start('別名');assert.match(a.sessionId,/^[a-f0-9]{64}$/);assert.notEqual(a.sessionId,b.sessionId);assert.equal(a.endAt-a.startAt,25000);assert.equal(a.startAt-a.serverNow,1200);assert.equal(a.targets.length,40);assert.equal(new Set(a.targets.map(x=>x.id)).size,40);
  a.targets.forEach((target,index)=>{assert.match(target.id,/^[a-f0-9]{32}$/);assert.ok(['normal','gold','bomb'].includes(target.kind));assert.ok(target.hole>=0&&target.hole<=8);assert.equal(target.openAt,a.startAt+index*625);assert.equal(target.closeAt-target.openAt,580);if(index)assert.ok(target.openAt>=a.targets[index-1].closeAt)});
  assert.deepEqual(a.targets.map(target=>target.kind),b.targets.map(target=>target.kind),'Every ranked player gets the same kind sequence');assert.equal(a.targets.filter(target=>target.kind==='gold').length,8);assert.equal(a.targets.filter(target=>target.kind==='bomb').length,5);
  const rows=f.db.sqlite.prepare('SELECT * FROM mole_sessions').all();assert.equal(rows.length,2);assert.ok(rows.every(row=>row.id!==a.sessionId&&row.id!==b.sessionId));assert.ok(!JSON.stringify(rows).includes('203.0.113.42'));assert.ok(!JSON.stringify(f.db.sqlite.prepare('SELECT * FROM mole_limits').all()).includes('203.0.113.42'));
 }finally{f.db.close()}
});
test('client scores and client timing fields are rejected before any accepted score',async()=>{
 const f=fixture();try{const s=await f.start(),target=s.targets[0];for(const body of[{sessionId:s.sessionId,targetId:target.id,hole:target.hole,score:999999},{sessionId:s.sessionId,targetId:target.id,hole:target.hole,timestamp:target.openAt}]){const r=await f.request('/hit',body);assert.equal(r.status,400);assert.equal(r.data.error,'unexpected_fields')}
  const finish=await f.request('/finish',{sessionId:s.sessionId,score:999999});assert.equal(finish.status,400);assert.equal(f.db.sqlite.prepare('SELECT score FROM mole_sessions').get().score,0);
 }finally{f.db.close()}
});
test('early, expired, foreign and wrong-hole targets cannot score; duplicate is atomic',async()=>{
 const f=fixture();try{const a=await f.start(),b=await f.start('two'),target=a.targets[0];let r=await f.request('/hit',{sessionId:a.sessionId,targetId:target.id,hole:target.hole});assert.equal(r.data.error,'target_closed');
  f.now=target.openAt+100;r=await f.request('/hit',{sessionId:a.sessionId,targetId:b.targets[0].id,hole:b.targets[0].hole});assert.equal(r.data.error,'target_mismatch');r=await f.request('/hit',{sessionId:a.sessionId,targetId:target.id,hole:(target.hole+1)%9});assert.equal(r.data.error,'target_mismatch');
  const accepted=await f.target(a,0);assert.equal(accepted.status,200);const duplicate=await f.target(a,0);assert.equal(duplicate.status,409);assert.equal(duplicate.data.error,'duplicate_hit');assert.equal(duplicate.data.score,accepted.data.score);
  f.now=target.closeAt;r=await f.request('/hit',{sessionId:a.sessionId,targetId:target.id,hole:target.hole});assert.equal(r.data.error,'target_closed');f.now=a.serverNow+3600000;r=await f.request('/finish',{sessionId:a.sessionId});assert.equal(r.status,410);
 }finally{f.db.close()}
});
test('concurrent duplicate hit requests credit a target once',async()=>{
 const f=fixture();try{const s=await f.start(),target=s.targets.find(x=>x.kind!=='bomb');f.now=target.openAt+100;const body={sessionId:s.sessionId,targetId:target.id,hole:target.hole};const results=await Promise.all([f.request('/hit',body),f.request('/hit',body)]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);assert.equal(f.db.sqlite.prepare('SELECT hits FROM mole_sessions').get().hits,1)}finally{f.db.close()}
});
test('server computes gold, bomb, missed-target streak reset and capped combo',async()=>{
 const f=fixture();try{const s=await f.start();
  // Controlled server-side fixture makes each scoring branch mandatory, without
  // accepting any client-provided score, target kind, or timestamp.
  s.targets.forEach((target,index)=>{target.kind=index===16?'bomb':index===3||index===12?'gold':'normal'});
  f.db.sqlite.prepare('UPDATE mole_sessions SET schedule=?').run(JSON.stringify(s.targets));
  let expected=0,hits=0,streak=0,sawTriple=false;
  for(let index=0;index<s.targets.length;index++){const target=s.targets[index],r=await f.target(s,index);assert.equal(r.status,200);if(target.kind==='bomb'){expected=Math.max(0,expected-3);streak=0}else{hits++;streak++;expected+=(target.kind==='gold'?3:1)*Math.min(3,1+Math.floor((streak-1)/5))}assert.equal(r.data.score,expected);assert.equal(r.data.hits,hits);assert.ok(r.data.combo<=3);if(r.data.combo===3)sawTriple=true}assert.ok(sawTriple,'Sustained hits must reach the capped triple combo');
  f.now=s.endAt;const finish=await f.request('/finish',{sessionId:s.sessionId});assert.equal(finish.status,200);assert.equal(finish.data.score,expected);assert.equal(finish.data.hits,hits);
  const s2=await f.start();const normalIndices=s2.targets.map((x,i)=>x.kind!=='bomb'?i:null).filter(x=>x!==null);assert.ok(normalIndices.length>=3);await f.target(s2,normalIndices[0]);const skipped=await f.target(s2,normalIndices[2]);assert.equal(skipped.data.streak,1);
 }finally{f.db.close()}
});
test('finish refuses short rounds, is idempotent, and blocks subsequent hits',async()=>{
 const f=fixture();try{const s=await f.start();let r=await f.request('/finish',{sessionId:s.sessionId});assert.equal(r.data.error,'round_not_finished');assert.ok(r.data.retryAfterMs>=25000);await f.target(s,0);f.now=s.endAt;
  const first=await f.request('/finish',{sessionId:s.sessionId});assert.equal(first.status,200);const again=await f.request('/finish',{sessionId:s.sessionId});assert.equal(again.status,200);assert.equal(again.data.score,first.data.score);assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) AS n FROM mole_leaderboard').get().n,1);
  const target=s.targets[0];r=await f.request('/hit',{sessionId:s.sessionId,targetId:target.id,hole:target.hole});assert.equal(r.data.error,'session_finished');
 }finally{f.db.close()}
});
test('perfect play has the same 132-point maximum in every ranked round',async()=>{
 const f=fixture();try{const s=await f.start();let version=0;for(let index=0;index<s.targets.length;index++){if(s.targets[index].kind==='bomb')continue;const r=await f.target(s,index);assert.equal(r.status,200);assert.equal(r.data.version,++version)}f.now=s.endAt;const r=await f.request('/finish',{sessionId:s.sessionId});assert.equal(r.data.hits,35);assert.equal(r.data.score,132);assert.equal(r.data.combo,3)}finally{f.db.close()}
});
test('per-IP quota rejects the 11th start without consuming global quota; day hash rotates',async()=>{
 const f=fixture();try{for(let i=0;i<10;i++)await f.start();let r=await f.request('/session',{nickname:'retry'});assert.equal(r.status,429);assert.equal(r.data.error,'rate_limited');const global=f.db.sqlite.prepare("SELECT count FROM mole_limits WHERE bucket_key LIKE 'global:%'").get();assert.equal(global.count,10);assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) AS n FROM mole_sessions').get().n,10);
  const first=f.db.sqlite.prepare("SELECT bucket_key FROM mole_limits WHERE bucket_key LIKE 'ip:%'").get().bucket_key.split(':')[1];f.now+=86400000;await f.start();const keys=f.db.sqlite.prepare("SELECT bucket_key FROM mole_limits WHERE bucket_key LIKE 'ip:%'").all();assert.ok(keys.some(row=>row.bucket_key.split(':')[1]!==first));
 }finally{f.db.close()}
});
test('global quota fails closed at 250 starts and does not charge IP quota',async()=>{
 const f=fixture();try{const key='global:'+new Date(f.now).toISOString().slice(0,10);f.db.sqlite.prepare('INSERT INTO mole_limits VALUES(?,?,?)').run(key,LIMITS.dailySessions,f.now+86400000);const r=await f.request('/session',{nickname:'test'});assert.equal(r.status,429);assert.equal(r.data.error,'daily_limit');assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) AS n FROM mole_sessions').get().n,0);assert.equal(f.db.sqlite.prepare("SELECT COUNT(*) AS n FROM mole_limits WHERE bucket_key LIKE 'ip:%'").get().n,0)}finally{f.db.close()}
});
test('origin, body, JSON, nickname and method restrictions apply before database writes',async()=>{
 const f=fixture();try{const writes=f.db.writes;const cases=[
  [{nickname:'ok'},{origin:'https://evil.example'},403],
  [{nickname:'ok'},{headers:{'sec-fetch-site':'cross-site'}},403],
  [{nickname:'ok'},{headers:{'content-type':'text/plain'}},415],
  [{nickname:'ok'},{raw:'{bad-json'},400],
  [{nickname:'ok'},{raw:' '.repeat(2049)},413],
  [{nickname:'<script>'},{},400],
  [{nickname:'a\u202eb'},{},400],
  [{nickname:'a'.repeat(17)},{},400],
  [{nickname:42},{},400],
  [{nickname:'ok',admin:true},{},400]
 ];for(const[body,options,status]of cases){const r=await f.request('/session',body,options);assert.equal(r.status,status,JSON.stringify(r.data));assert.equal(r.response.headers.get('access-control-allow-origin'),null)}assert.equal(f.db.writes,writes);
  const get=await f.request('/session',undefined,{method:'GET'});assert.equal(get.status,405);
 }finally{f.db.close()}
});
test('leaderboard is shared, weekly, sorted, limited to 20 and reveals no tokens or hashes',async()=>{
 const f=fixture();try{const week=weekStart(f.now),insert=f.db.sqlite.prepare('INSERT INTO mole_leaderboard VALUES(?,?,?,?,?,?)');for(let index=0;index<25;index++)insert.run('private-'+index,'プレイヤー '+index,index,Math.min(index,40),f.now+index,week);insert.run('last-week','OLD',999,40,f.now-7*86400000,weekStart(f.now-7*86400000));
  const r=await f.request('/leaderboard?period=week',undefined,{method:'GET'});assert.equal(r.status,200);assert.equal(r.data.entries.length,20);assert.equal(r.data.entries[0].score,24);assert.equal(r.data.entries[19].score,5);assert.equal(r.data.week,week);assert.ok(!JSON.stringify(r.data).includes('private-'));assert.ok(!JSON.stringify(r.data).includes('OLD'));assert.equal(r.response.headers.get('cache-control'),'public,max-age=30');const invalid=await f.request('/leaderboard?period=all',undefined,{method:'GET'});assert.equal(invalid.status,400);
 }finally{f.db.close()}
});
test('bounded access-triggered cleanup removes expired data and keeps current entries',async()=>{
 const f=fixture();try{f.db.sqlite.prepare('INSERT INTO mole_limits VALUES(?,?,?)').run('expired',1,f.now-1);f.db.sqlite.prepare('INSERT INTO mole_sessions(id,nickname,schedule,start_at,end_at,expires_at) VALUES(?,?,?,?,?,?)').run('expired','old','[]',0,1,f.now-1);f.db.sqlite.prepare('INSERT INTO mole_leaderboard VALUES(?,?,?,?,?,?)').run('expired','old',1,1,f.now-91*86400000,'old');await f.start();assert.equal(f.db.sqlite.prepare("SELECT COUNT(*) AS n FROM mole_limits WHERE bucket_key='expired'").get().n,0);assert.equal(f.db.sqlite.prepare("SELECT COUNT(*) AS n FROM mole_sessions WHERE id='expired'").get().n,0);assert.equal(f.db.sqlite.prepare("SELECT COUNT(*) AS n FROM mole_leaderboard WHERE session_id='expired'").get().n,0);assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) AS n FROM mole_sessions').get().n,1)}finally{f.db.close()}
});
test('unavailable binding/database fails closed and static assets pass through',async()=>{
 const f=fixture();try{let response=await f.worker.fetch(new Request('https://games.example/api/mole/leaderboard'),{ASSETS:f.env.ASSETS});assert.equal(response.status,503);response=await f.worker.fetch(new Request('https://games.example/'),f.env);assert.equal(await response.text(),'static asset');const broken={prepare(){throw Error('quota exceeded')}};response=await f.worker.fetch(new Request('https://games.example/api/mole/leaderboard'),{RANKING_DB:broken});assert.equal(response.status,503);assert.equal((await response.json()).error,'service_unavailable')}finally{f.db.close()}
});
