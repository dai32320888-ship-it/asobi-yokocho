/* Cloudflare Pages advanced-mode Worker. RANKING_DB is the only required binding.
 * The build copies this file verbatim to dist/_worker.js. No client score is trusted.
 */
export const RULES=Object.freeze({durationMs:25000,slotMs:625,normalPoints:1,goldPoints:3,bombPenalty:3,comboEvery:5,maxCombo:3});
export const LIMITS=Object.freeze({dailySessions:250,ipSessionsPerTenMinutes:10,bodyBytes:2048,sessionRetentionMs:3600000,leaderboardRetentionMs:90*86400000});
const BASE='/api/mole',hexPattern=/^[a-f0-9]{64}$/,targetPattern=/^[a-f0-9]{32}$/;
const GOLD_SLOTS=new Set([4,9,14,19,24,29,34,39]),BOMB_SLOTS=new Set([6,13,20,27,36]);
const hmacKeys=new WeakMap();
class ApiError extends Error{constructor(status,code,extra={}){super(code);this.status=status;this.code=code;this.extra=extra}}
function json(value,status=200,headers={}){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}})}
function hex(bytes){return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('')}
function randomHex(length){return hex(crypto.getRandomValues(new Uint8Array(length)))}
async function digest(value){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))))}
export function weekStart(timestamp){const date=new Date(timestamp);date.setUTCHours(0,0,0,0);date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));return date.toISOString().slice(0,10)}
function cleanNickname(value){
 if(value===undefined)return 'ゲスト';
 if(typeof value!=='string')throw new ApiError(400,'invalid_nickname');
 const nickname=value.normalize('NFC').trim();
 if([...nickname].length>16||/[<>&\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(nickname))throw new ApiError(400,'invalid_nickname');
 return nickname||'ゲスト';
}
async function readBody(request,allowed){
 if((request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()!=='application/json')throw new ApiError(415,'json_required');
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>LIMITS.bodyBytes))throw new ApiError(413,'body_too_large');
 if(!request.body)throw new ApiError(400,'invalid_json');
 const reader=request.body.getReader(),chunks=[];let length=0;
 try{while(true){const{done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>LIMITS.bodyBytes){await reader.cancel();throw new ApiError(413,'body_too_large')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(length);let position=0;for(const chunk of chunks){bytes.set(chunk,position);position+=chunk.length}
 let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw new ApiError(400,'invalid_json')}
 if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(key=>!allowed.includes(key)))throw new ApiError(400,'unexpected_fields');
 return body;
}
async function ipBucket(db,request,now){
 let keyPromise=hmacKeys.get(db);
 if(!keyPromise){keyPromise=(async()=>{const row=await db.prepare("SELECT value FROM mole_config WHERE key='ip_hmac_secret'").first();if(!row||!hexPattern.test(row.value))throw new ApiError(503,'ranking_unavailable');const raw=Uint8Array.from(row.value.match(/../g),pair=>parseInt(pair,16));return crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign'])})();hmacKeys.set(db,keyPromise);keyPromise.catch(()=>hmacKeys.delete(db))}
 const key=await keyPromise;
 // Only Cloudflare's edge-supplied header is used. No X-Forwarded-For trust and no raw IP stored.
 const ip=request.headers.get('cf-connecting-ip')||'unknown';
 const day=new Date(now).toISOString().slice(0,10);
 const hash=hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(day+'|'+ip))));
 return 'ip:'+hash+':'+Math.floor(now/600000);
}
function schedule(startAt){
 let previous=-1;
 return Array.from({length:40},(_,slot)=>{
  const draw=crypto.getRandomValues(new Uint32Array(2));let hole=draw[0]%9;if(hole===previous)hole=(hole+1+(draw[1]%8))%9;previous=hole;
  const openAt=startAt+slot*RULES.slotMs;
  // Identical kind order gives every ranked round the same maximum score.
  // Only positions and unguessable target IDs vary between rounds.
  return{id:randomHex(16),hole,kind:BOMB_SLOTS.has(slot)?'bomb':GOLD_SLOTS.has(slot)?'gold':'normal',openAt,closeAt:openAt+580};
 });
}
function state(row,serverNow){return{score:row.score,hits:row.hits,streak:row.streak,combo:row.combo,version:row.version,serverNow}}
async function readSession(db,sessionId,now){
 if(typeof sessionId!=='string'||!hexPattern.test(sessionId))throw new ApiError(400,'invalid_session');
 const id=await digest(sessionId),row=await db.prepare('SELECT * FROM mole_sessions WHERE id=?').bind(id).first();
 if(!row)throw new ApiError(404,'session_not_found');
 if(row.expires_at<=now)throw new ApiError(410,'session_expired');
 return row;
}
async function prune(db,now){
 // Every successful session removes a bounded backlog. This is access-triggered,
 // not a wall-clock deletion guarantee when the site receives no requests.
 await db.batch([
  db.prepare('DELETE FROM mole_sessions WHERE id IN (SELECT id FROM mole_sessions WHERE expires_at<=? ORDER BY expires_at LIMIT 3)').bind(now),
  db.prepare('DELETE FROM mole_limits WHERE bucket_key IN (SELECT bucket_key FROM mole_limits WHERE expires_at<=? ORDER BY expires_at LIMIT 8)').bind(now),
  db.prepare('DELETE FROM mole_leaderboard WHERE session_id IN (SELECT session_id FROM mole_leaderboard WHERE finished_at<=? ORDER BY finished_at LIMIT 3)').bind(now-LIMITS.leaderboardRetentionMs)
 ]);
}
async function startSession(request,db,now,ctx){
 const body=await readBody(request,['nickname']),nickname=cleanNickname(body.nickname);
 const ipKey=await ipBucket(db,request,now),day=new Date(now).toISOString().slice(0,10),globalKey='global:'+day;
 const tomorrow=Date.parse(day+'T00:00:00Z')+86400000,sessionId=randomHex(32),id=await digest(sessionId);
 const startAt=now+1200,endAt=startAt+RULES.durationMs,targets=schedule(startAt);
 // D1 batch is transactional. changes() gates the following statements: a refused
 // IP/global quota consumes neither a global reservation nor a session row.
 const batch=await db.batch([
  db.prepare(`INSERT INTO mole_limits(bucket_key,count,expires_at)
   SELECT ?,1,? WHERE COALESCE((SELECT count FROM mole_limits WHERE bucket_key=?),0)<?
   ON CONFLICT(bucket_key) DO UPDATE SET count=count+1
   WHERE count<? AND COALESCE((SELECT count FROM mole_limits WHERE bucket_key=?),0)<?`)
   .bind(globalKey,tomorrow+86400000,ipKey,LIMITS.ipSessionsPerTenMinutes,LIMITS.dailySessions,ipKey,LIMITS.ipSessionsPerTenMinutes),
  db.prepare(`INSERT INTO mole_limits(bucket_key,count,expires_at) SELECT ?,1,? WHERE changes()=1
   ON CONFLICT(bucket_key) DO UPDATE SET count=count+1`).bind(ipKey,now+86400000),
  db.prepare(`INSERT INTO mole_sessions(id,nickname,schedule,start_at,end_at,expires_at)
   SELECT ?,?,?,?,?,? WHERE changes()=1`).bind(id,nickname,JSON.stringify(targets),startAt,endAt,now+LIMITS.sessionRetentionMs)
 ]);
 if(batch[2].meta.changes!==1){
  const global=await db.prepare('SELECT count FROM mole_limits WHERE bucket_key=?').bind(globalKey).first();
  if(global?.count>=LIMITS.dailySessions)throw new ApiError(429,'daily_limit',{retryAfterMs:tomorrow-now});
  throw new ApiError(429,'rate_limited',{retryAfterMs:(Math.floor(now/600000)+1)*600000-now});
 }
 const cleaning=prune(db,now).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(cleaning);else await cleaning;
 return json({sessionId,serverNow:now,startAt,endAt,targets,rules:RULES});
}
async function hit(request,db,now){
 const body=await readBody(request,['sessionId','targetId','hole']);
 if(typeof body.targetId!=='string'||!targetPattern.test(body.targetId)||!Number.isInteger(body.hole)||body.hole<0||body.hole>8)throw new ApiError(400,'invalid_target');
 const row=await readSession(db,body.sessionId,now);
 if(row.finished_at!==null)throw new ApiError(409,'session_finished',state(row,now));
 const targets=JSON.parse(row.schedule),slot=targets.findIndex(target=>target.id===body.targetId),target=targets[slot];
 if(!target||target.hole!==body.hole)throw new ApiError(422,'target_mismatch');
 // Arrival time comes from the server. There is deliberately no client timestamp
 // or user-supplied score, and the next target cannot be credited in advance.
 if(now<target.openAt||now>=target.closeAt||now>=row.end_at)throw new ApiError(422,'target_closed');
 const bit=2**slot;
 if(Math.floor(row.hit_mask/bit)%2===1)throw new ApiError(409,'duplicate_hit',state(row,now));
 if(slot<=row.last_slot)throw new ApiError(422,'target_closed');
 const missed=targets.slice(row.last_slot+1,slot).some(item=>item.kind!=='bomb');
 const streak=target.kind==='bomb'?0:(missed?0:row.streak)+1;
 const combo=streak?Math.min(RULES.maxCombo,1+Math.floor((streak-1)/RULES.comboEvery)):1;
 const score=target.kind==='bomb'?Math.max(0,row.score-RULES.bombPenalty):row.score+(target.kind==='gold'?RULES.goldPoints:RULES.normalPoints)*combo;
 const hits=row.hits+(target.kind==='bomb'?0:1);
 // Version compare-and-swap plus bitmask prevents concurrent/replayed requests
 // from crediting the same target twice. Targets occupy non-overlapping slots.
 const result=await db.prepare(`UPDATE mole_sessions SET hit_mask=hit_mask+?,score=?,hits=?,streak=?,combo=?,last_slot=?,version=version+1
  WHERE id=? AND version=? AND (hit_mask & ?)=0 AND finished_at IS NULL AND start_at<=? AND end_at>?`)
  .bind(bit,score,hits,streak,combo,slot,row.id,row.version,bit,now,now).run();
 if(result.meta.changes!==1)throw new ApiError(409,'state_changed');
 return json({accepted:true,score,hits,streak,combo,version:row.version+1,serverNow:now});
}
async function topEntries(db,week){return(await db.prepare('SELECT session_id,nickname,score,hits,finished_at FROM mole_leaderboard WHERE week=? ORDER BY score DESC,finished_at ASC,session_id ASC LIMIT 20').bind(week).all()).results}
async function finish(request,db,now){
 const body=await readBody(request,['sessionId']),row=await readSession(db,body.sessionId,now);
 if(now<row.end_at)throw new ApiError(422,'round_not_finished',{retryAfterMs:row.end_at-now});
 const week=weekStart(row.end_at);
 await db.batch([
  db.prepare('UPDATE mole_sessions SET finished_at=?,version=version+1 WHERE id=? AND finished_at IS NULL AND end_at<=? AND expires_at>?').bind(now,row.id,now,now),
  db.prepare(`INSERT OR IGNORE INTO mole_leaderboard(session_id,nickname,score,hits,finished_at,week)
   SELECT id,nickname,score,hits,finished_at,? FROM mole_sessions WHERE id=? AND finished_at IS NOT NULL AND end_at<=?`).bind(week,row.id,now)
 ]);
 const final=await db.prepare('SELECT * FROM mole_sessions WHERE id=?').bind(row.id).first();
 const entries=await topEntries(db,week),position=entries.findIndex(entry=>entry.session_id===row.id);
 return json({...state(final,now),rank:position<0?null:position+1,period:'week',week});
}
async function leaderboard(request,db,now,ctx){
 const url=new URL(request.url);
 if([...url.searchParams.keys()].some(key=>key!=='period')||url.searchParams.getAll('period').length>1||(url.searchParams.get('period')||'week')!=='week')throw new ApiError(400,'invalid_period');
 const week=weekStart(now),cache=typeof caches!=='undefined'?caches.default:null;
 const cacheUrl=new URL(BASE+'/leaderboard?period=week&week='+week,url.origin),cacheKey=new Request(cacheUrl);
 if(cache){const cached=await cache.match(cacheKey);if(cached)return cached}
 const entries=(await topEntries(db,week)).map((entry,index)=>({rank:index+1,nickname:entry.nickname,score:entry.score,hits:entry.hits,finishedAt:entry.finished_at}));
 const response=json({period:'week',week,entries,serverNow:now},200,{'cache-control':'public,max-age=30'});
 if(cache){const saving=cache.put(cacheKey,response.clone()).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(saving);else await saving}
 return response;
}
export function createWorker({now=Date.now}={}){return{async fetch(request,env,ctx){
 const url=new URL(request.url),timestamp=now();
 if(!url.pathname.startsWith('/api/'))return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
 try{
  if(!env.RANKING_DB)throw new ApiError(503,'ranking_unavailable');
  const endpoint=url.pathname.slice(BASE.length);
  if(!url.pathname.startsWith(BASE+'/'))throw new ApiError(404,'not_found');
  if(request.method==='GET'&&endpoint==='/leaderboard')return await leaderboard(request,env.RANKING_DB,timestamp,ctx);
  if(request.method!=='POST')throw new ApiError(405,'method_not_allowed');
  // These endpoints never set CORS permissions. A malicious site cannot reserve
  // sessions via a visitor's browser, including with a simple form submission.
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'origin_forbidden');
  if(url.search)throw new ApiError(400,'unexpected_query');
  if(endpoint==='/session')return await startSession(request,env.RANKING_DB,timestamp,ctx);
  if(endpoint==='/hit')return await hit(request,env.RANKING_DB,timestamp);
  if(endpoint==='/finish')return await finish(request,env.RANKING_DB,timestamp);
  throw new ApiError(404,'not_found');
 }catch(error){
  if(error instanceof ApiError){const headers=error.extra.retryAfterMs?{'retry-after':String(Math.max(1,Math.ceil(error.extra.retryAfterMs/1000)))}:{};return json({error:error.code,...error.extra,serverNow:timestamp},error.status,headers)}
  // Includes free-plan quota exhaustion: fail closed, do not accept local scores.
  return json({error:'service_unavailable',serverNow:timestamp},503);
 }
}}}
export default createWorker();
