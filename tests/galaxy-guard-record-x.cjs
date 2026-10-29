/* Real pointer-guided play in a fresh isolated profile. Read-only telemetry
 * steers ordinary inputs; no saves, scores, model state or time are written.
 * Audio is the actual, unmodified native master output, never a microphone.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const{launchBrowser}=require('./v4-helpers.cjs');
const{installAudioProbe}=require('./bodybuilder-audio-probe.cjs');
const URL=process.env.ASOBI_RECORD_URL||'http://127.0.0.1:47846/#game/galaxy-guard',OUTPUT=path.join(__dirname,'galaxy-guard-gameplay.webm'),META=path.join(__dirname,'galaxy-guard-media.json');
const audioProbe='('+installAudioProbe.toString().replaceAll('AsobiGymAudio','AsobiGalaxyAudio').replaceAll('__gymAudioProbe','__galaxyAudioProbe')+')({record:true,meter:true});';
function installObservations(){
 let Model;Object.defineProperty(window,'AsobiGalaxyModel',{configurable:true,get(){return Model},set(Class){Model=new Proxy(Class,{construct(Target,args,newTarget){const instance=Reflect.construct(Target,args,newTarget);window.__galaxyRecordingModel=instance;return instance;}});}});
 const changes=[];let prior='';const observer=new MutationObserver(()=>{const game=document.getElementById('gg-game');if(!game)return;const current={at:Date.now(),mode:game.dataset.mode,wave:Number(game.dataset.wave),hp:Number(game.dataset.hp),level:Number(game.dataset.level),score:Number(game.dataset.score),kills:Number(game.dataset.kills),bombs:Number(game.dataset.bombs)},signature=JSON.stringify({...current,at:0});if(signature!==prior){changes.push(current);prior=signature;}});observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-mode','data-wave','data-hp','data-level','data-score','data-kills','data-bombs']});
 window.__galaxyRecordingObservations={changes,view(){const s=window.__galaxyRecordingModel?.state;if(!s)return null;return{mode:s.mode,wave:s.wave,time:s.time,waveTime:s.waveTime,score:s.score,best:s.best,plays:s.plays,clears:s.clears,kills:s.kills,bombs:s.bombs,combo:s.combo,runBestCombo:s.runBestCombo,player:{...s.player},enemies:s.enemies.map(e=>({id:e.id,type:e.type,x:e.x,y:e.y,hp:e.hp,mode:e.mode})),bullets:s.bullets.map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy,kind:b.kind,w:b.w,h:b.h})),pickups:s.pickups.map(i=>({x:i.x,y:i.y,type:i.type})),boss:s.boss?{x:s.boss.x,y:s.boss.y,hp:s.boss.hp,maxHp:s.boss.maxHp,phase:s.boss.phase,warning:s.boss.warning?{...s.boss.warning}:null}:null};}};
}
function target(s){
 const p=s.player;let goal=s.boss?s.boss.x+Math.cos(s.waveTime*.85)*125*.85*.62:s.enemies.filter(e=>e.y<500).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0]?.x??240;
 const item=s.pickups.filter(i=>i.y>330&&i.y<600).sort((a,b)=>b.y-a.y)[0];if(item)goal=item.x;
 const threats=s.bullets.filter(b=>b.kind==='beam'?Math.abs(b.x-p.x)<45:b.y>330&&b.y<610&&Math.abs(b.x+b.vx*Math.max(0,(p.y-b.y)/Math.max(1,b.vy))-p.x)<44);
 // Predict from observed positions and velocities, then steer with ordinary
 // pointer movement. This changes decisions, never simulation speed or state.
 const candidates=[goal,p.x,p.x-55,p.x+55,p.x-95,p.x+95,p.x-145,p.x+145,30,450].map(x=>Math.max(20,Math.min(460,x)));
 function cost(x){let result=(x-goal)**2*.025+(x-p.x)**2*.012;
  for(const b of s.bullets){if(b.kind==='beam'){result+=Math.max(0,58-Math.abs(x-b.x))**2*50;continue;}const until=(p.y-b.y)/Math.max(1,b.vy);if(until<-.1||until>1.6)continue;const bx=b.x+b.vx*Math.max(0,until);result+=Math.max(0,43-Math.abs(x-bx))**2*38;}
  for(const e of s.enemies)if(e.y>420&&Math.abs(e.y-p.y)<135)result+=Math.max(0,64-Math.abs(x-e.x))**2*24;
  if(s.boss?.warning?.kind==='beam')result+=Math.max(0,65-Math.abs(x-s.boss.warning.x))**2*60;return result;
 }
 goal=candidates.reduce((best,x)=>cost(x)<cost(best)?x:best,candidates[0]);
 return{goal,bomb:Boolean((s.boss&&s.boss.hp<75&&s.bombs===2)||(p.hp<=1&&p.invuln<.12&&s.bombs>0&&threats.length))};
}
async function main(){
 let browser,context,video,metadata;const cues=[],errors=[],posts=[],inputs=[],observed=[];
 try{
  browser=await launchBrowser();context=await browser.newContext({viewport:{width:390,height:740},isMobile:true,hasTouch:true,deviceScaleFactor:1,recordVideo:{dir:path.join(__dirname,'.galaxy-guard-recording'),size:{width:390,height:740}}});await context.addInitScript({content:audioProbe});await context.addInitScript(installObservations);
  const videoStartedAt=Date.now(),page=await context.newPage(),pageCreatedAt=Date.now();video=page.video();page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.method()==='POST')posts.push(request.url());});
  const cue=(type,extra={})=>cues.push({type,at:Date.now(),...extra}),read=()=>page.evaluate(()=>__galaxyRecordingObservations.view());
  await page.goto(URL,{waitUntil:'networkidle'});await page.locator('#gg-start').waitFor({state:'visible'});const initial=await read();assert.equal(initial.mode,'ready');assert.equal(initial.plays,0);assert.equal(initial.best,0);
  await page.locator('#gg-sound').tap();await page.waitForFunction(()=>document.getElementById('gg-sound').getAttribute('aria-pressed')==='true',null,{timeout:8000});await page.locator('#gg-arena').scrollIntoViewIfNeeded();let box=await page.locator('#gg-arena').boundingBox();await page.mouse.move(379,130);await page.mouse.wheel(0,box.y-116);await page.waitForTimeout(250);cue('ready-visible');await page.screenshot({path:path.join(__dirname,'galaxy-guard-gameplay-ready.png')});
  cue('launch-command');await page.locator('#gg-start').tap();await page.waitForFunction(()=>document.getElementById('gg-game').dataset.mode==='playing',null,{timeout:2000});
  box=await page.locator('#gg-arena').boundingBox();await page.mouse.move(379,130);await page.mouse.wheel(0,box.y-116);await page.waitForTimeout(150);box=await page.locator('#gg-arena').boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=650,'The full battlefield fits the phone viewport.');
  let s=await read(),prior={wave:0,level:1,hp:3,bombs:2},lastSample=0,bossShot=false,shots=0;const startWall=Date.now();await page.mouse.move(box.x+box.width*s.player.x/480,box.y+box.height*.91);await page.mouse.down();inputs.push({type:'pointerdown',at:Date.now(),logicalX:s.player.x});
  while(Date.now()-startWall<110000){
   s=await read();if(s.mode!=='playing')break;const at=Date.now();if(at-lastSample>=180){observed.push({at,mode:s.mode,time:s.time,wave:s.wave,score:s.score,kills:s.kills,hp:s.player.hp,level:s.player.level,x:s.player.x,bombs:s.bombs,combo:s.combo,enemies:s.enemies.length,bullets:s.bullets.length,bossHp:s.boss?.hp??null,bossWarning:s.boss?.warning?.kind??null});lastSample=at;}
   if(s.wave!==prior.wave){cue(s.wave===4?'boss-visible':'wave-visible',{wave:s.wave,time:s.time,kills:s.kills,score:s.score});await page.screenshot({path:path.join(__dirname,'galaxy-guard-gameplay-wave-'+s.wave+'.png')});prior.wave=s.wave;}
   if(s.player.level>prior.level){cue('weapon-upgrade-visible',{level:s.player.level,time:s.time,score:s.score});await page.screenshot({path:path.join(__dirname,'galaxy-guard-gameplay-power-'+s.player.level+'.png')});prior.level=s.player.level;}
   if(s.player.hp<prior.hp){cue('hurt-visible',{hp:s.player.hp,time:s.time});prior.hp=s.player.hp;}
   if(s.boss?.warning&&!bossShot){cue('boss-warning-visible',{kind:s.boss.warning.kind,time:s.time,bossHp:s.boss.hp});await page.screenshot({path:path.join(__dirname,'galaxy-guard-gameplay-boss-warning.png')});bossShot=true;}
   const decision=target(s);if(decision.bomb){cue('bomb-command',{time:s.time,hp:s.player.hp,bombs:s.bombs});inputs.push({type:'Space',at:Date.now()});await page.keyboard.press('Space');await page.screenshot({path:path.join(__dirname,'galaxy-guard-gameplay-bomb-'+s.bombs+'.png')});}
   await page.mouse.move(box.x+box.width*decision.goal/480,box.y+box.height*.91);inputs.push({type:'pointermove',at:Date.now(),logicalX:decision.goal});await page.waitForTimeout(85);shots++;
  }
  await page.mouse.up();inputs.push({type:'pointerup',at:Date.now()});const final=await read();assert.equal(final.mode,'won','Record a genuine completed first sortie; no manipulated victory.');assert.equal(final.plays,1);assert.equal(final.clears,1);cue('victory-visible',{score:final.score,kills:final.kills,hp:final.player.hp,time:final.time,level:final.player.level});await page.waitForTimeout(850);await page.screenshot({path:path.join(__dirname,'galaxy-guard-gameplay-victory.png')});await page.waitForTimeout(400);
  const snapshot=await page.evaluate(()=>__galaxyAudioProbe.snapshot()),recordings=await page.evaluate(()=>__galaxyAudioProbe.recordings()),changes=await page.evaluate(()=>__galaxyRecordingObservations.changes),offset=item=>({...item,offsetMs:item.at-videoStartedAt});
  metadata={video:OUTPUT,url:URL,videoStartedAt,pageCreatedAt,finishedAt:Date.now(),viewport:{width:390,height:740},provenance:'Fresh isolated profile; normal initial starship, zero records. Real pointer dragging and Space bomb inputs guide the ship through three alien formations and the boss. Exact model positions were read only for assisted steering. No save fixtures, state/model writes, direct model.update, clock changes or replay manipulation. This is assisted real-time play, not a human completion-time claim.',initial,final,cues:cues.map(offset),inputs:inputs.map(offset),observed:observed.map(offset),audioEvents:snapshot.events.filter(event=>event.accepted).map(event=>({key:event.key,offsetMs:event.at-videoStartedAt,voices:event.voices})),uiChanges:changes.map(offset),audioContexts:snapshot.contexts,errors,posts};
  const recording=recordings.find(recording=>recording.bytes.length>1000);assert.ok(recording,'Native master recording exists.');const audioFile=path.join(__dirname,'galaxy-guard-native-audio.webm');fs.writeFileSync(audioFile,Buffer.from(recording.bytes));metadata.audio={file:audioFile,offsetMs:recording.startedAt-videoStartedAt,bytes:recording.bytes.length,decoded:recording.decoded};fs.writeFileSync(META,JSON.stringify(metadata,null,2)+'\n');
 }finally{if(context)await context.close();if(video){await video.saveAs(OUTPUT);await video.delete();}if(browser)await browser.close();}
 assert.ok(metadata);assert.equal(errors.length,0);assert.equal(posts.length,0);assert.ok(metadata.audioContexts.some(ctx=>ctx.pcmPeak>.005));for(const event of['shoot','kill','boss','win'])assert.ok(metadata.audioEvents.some(item=>item.key===event),'Recorded sound '+event);
 const probe=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_format','-of','json',OUTPUT],{encoding:'utf8'}));metadata.sourceDuration=Number(probe.format.duration);fs.writeFileSync(META,JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify({result:'PASS',video:OUTPUT,sourceDuration:metadata.sourceDuration,final:{mode:metadata.final.mode,time:metadata.final.time,score:metadata.final.score,kills:metadata.final.kills,hp:metadata.final.player.hp,level:metadata.final.player.level,bombs:metadata.final.bombs},cues:metadata.cues,acceptedSounds:metadata.audioEvents.length,errors,posts},null,2));
}
module.exports={target};if(require.main===module)main().catch(error=>{console.error(error.stack);process.exitCode=1;});
