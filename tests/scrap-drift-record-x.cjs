/* A normal first race, earned body upgrade and another start, using real input.
 * Observers read the shipping model/DOM/audio only. No save fixtures, state
 * writes, model updates, clock changes or replay manipulation are performed.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const{launchBrowser}=require('./v4-helpers.cjs');
const{installAudioProbe}=require('./bodybuilder-audio-probe.cjs');
const URL=process.env.ASOBI_RECORD_URL||'http://127.0.0.1:47844/#game/scrap-drift';
const OUTPUT=path.join(__dirname,'scrap-drift-gameplay.webm'),META=path.join(__dirname,'scrap-drift-media.json');
const audioProbe='('+installAudioProbe.toString().replaceAll('AsobiGymAudio','AsobiDriftAudio').replaceAll('__gymAudioProbe','__driftAudioProbe')+')({record:true,meter:true});';
function installObservations(){
 let Model;const drives=[],stops=[],changes=[];let driveAt=0,active=false;
 Object.defineProperty(window,'AsobiDriftModel',{configurable:true,get(){return Model},set(Class){Model=new Proxy(Class,{construct(Target,args,newTarget){const instance=Reflect.construct(Target,args,newTarget);window.__driftRecordingModel=instance;return instance}})}});
 const audio=Object.getOwnPropertyDescriptor(window,'AsobiDriftAudio');
 Object.defineProperty(window,'AsobiDriftAudio',{configurable:true,get:audio.get,set(Class){
  const drive=Class.prototype.drive,stop=Class.prototype.stopEngine;
  Class.prototype.drive=function(ratio,drifting,nitro){const now=Date.now();if(now-driveAt>=35){driveAt=now;drives.push({at:now,ratio,drifting,nitro,ready:this.ready});}active=true;return drive.call(this,ratio,drifting,nitro)};
  Class.prototype.stopEngine=function(){if(active){stops.push({at:Date.now()});active=false;}return stop.call(this)};
  audio.set.call(window,Class);
 }});
 window.__driftRecordingObservations={drives,stops,changes,view(){const m=window.__driftRecordingModel;if(!m)return null;const s=m.state;return{mode:s.mode,trackIndex:s.trackIndex,coins:s.coins,upgrades:{...s.upgrades},elapsed:s.elapsed,distance:s.distance,speed:s.speed,x:s.x,nitro:s.nitro,rank:s.rank,drifting:s.drifting,usingNitro:s.usingNitro,drifts:s.drifts,driftPoints:s.driftPoints,road:m.roadAt(s.distance),stats:m.getStats(),result:s.result?{...s.result}:null,rivals:s.rivals.map(r=>({...r}))}}};
 const observer=new MutationObserver(()=>{const game=document.getElementById('sd-game');if(game){const last=changes.at(-1),mode=game.dataset.mode,body=document.getElementById('sd-car-name')?.textContent||'';if(!last||last.mode!==mode||last.body!==body)changes.push({at:Date.now(),mode,body});}});observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-mode']});
}
async function main(){
 let browser,context,video,metadata;const cues=[],errors=[],posts=[],inputs=[],held=new Set();
 try{
  browser=await launchBrowser();context=await browser.newContext({viewport:{width:390,height:740},isMobile:true,hasTouch:true,deviceScaleFactor:1,recordVideo:{dir:path.join(__dirname,'.scrap-drift-recording'),size:{width:390,height:740}}});
  await context.addInitScript({content:audioProbe});await context.addInitScript(installObservations);
  const videoStartedAt=Date.now(),page=await context.newPage(),pageCreatedAt=Date.now();video=page.video();
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(r.url())});
  const cue=(type,extra={})=>cues.push({type,at:Date.now(),...extra}),read=()=>page.evaluate(()=>__driftRecordingObservations.view());
  const set=async(key,on)=>{if(on&&!held.has(key)){await page.keyboard.down(key);held.add(key);inputs.push({at:Date.now(),key,down:true})}else if(!on&&held.has(key)){await page.keyboard.up(key);held.delete(key);inputs.push({at:Date.now(),key,down:false})}};
  const release=async()=>{for(const key of [...held])await set(key,false)};
  const alignArena=async()=>{await page.locator('#sd-arena').scrollIntoViewIfNeeded();const box=await page.locator('#sd-arena').boundingBox();await page.mouse.move(378,128);await page.mouse.wheel(0,box.y-110);await page.waitForTimeout(250);};
  await page.goto(URL,{waitUntil:'networkidle'});await page.locator('#sd-start').waitFor({state:'visible'});assert.equal((await read()).coins,0);assert.equal((await read()).upgrades.body,0);
  await page.locator('#sd-sound').tap();await page.waitForFunction(()=>document.getElementById('sd-sound').getAttribute('aria-pressed')==='true',null,{timeout:8000});
  await alignArena();await page.waitForTimeout(600);cue('rust-car-visible');await page.screenshot({path:path.join(__dirname,'scrap-drift-gameplay-rust.png')});
  cue('start-tap');await page.locator('#sd-start').tap();await page.waitForFunction(()=>document.getElementById('sd-game').dataset.mode==='racing',null,{timeout:6500});cue('first-race-go');
  const began=Date.now();let sample=await read(),maxSpeed=0,maxDrifts=0,previousDrifts=0,previousNitro=false,observed=[sample];
  while(Date.now()-began<70000){
   sample=await read();maxSpeed=Math.max(maxSpeed,sample.speed);maxDrifts=Math.max(maxDrifts,sample.drifts);observed.push({...sample,at:Date.now()});
   if(sample.drifts>previousDrifts){cue('drift-visible',{drifts:sample.drifts,distance:sample.distance,curve:sample.road.curve});previousDrifts=sample.drifts;}
   if(sample.usingNitro&&!previousNitro)cue('nitro-visible',{distance:sample.distance,speed:sample.speed});previousNitro=sample.usingNitro;
   if(sample.mode==='finished')break;
   const road=sample.road,ratio=sample.speed/sample.stats.topSpeed,target=-.27;
   const feed=road.curve*ratio*ratio*(sample.drifting?.72:1.08/sample.stats.grip)/(1.42*(.55+.45*Math.min(ratio,1))*(sample.drifting?1.04:1));
   const steer=feed+(target-sample.x)*2.1;
   await set('ArrowLeft',steer<-.09);await set('ArrowRight',steer>.09);await set('Space',Math.abs(road.curve)>.13);await set('Shift',Math.abs(road.curve)<.12);
   await page.waitForTimeout(55);
  }
  await release();const firstResult=await read();assert.equal(firstResult.mode,'finished');assert.equal(firstResult.result.rank,1,'The real first race wins before the body upgrade is purchased.');assert.ok(firstResult.coins>=120);cue('first-finish-visible',{result:firstResult.result,coins:firstResult.coins});await page.waitForTimeout(1500);await page.screenshot({path:path.join(__dirname,'scrap-drift-gameplay-prize.png')});
  await page.locator('#sd-garage').tap();cue('garage-return');await alignArena();await page.waitForTimeout(750);cue('earned-rust-garage',{coins:(await read()).coins});
  await page.locator('[data-sd-upgrade="body"]').tap();cue('body-purchase-tap');const upgraded=await read();assert.equal(upgraded.upgrades.body,1);assert.equal(upgraded.coins,firstResult.coins-120);await alignArena();await page.waitForTimeout(900);cue('blue-car-visible',{coins:upgraded.coins,upgrades:upgraded.upgrades});await page.screenshot({path:path.join(__dirname,'scrap-drift-gameplay-blue.png')});
  await page.waitForTimeout(900);cue('blue-race-start-tap');await page.locator('#sd-start').tap();await page.waitForFunction(()=>document.getElementById('sd-game').dataset.mode==='racing',null,{timeout:6500});cue('blue-race-go');
  const secondBegan=Date.now();while(Date.now()-secondBegan<4200){sample=await read();const steer=( -.27-sample.x)*2.1;await set('ArrowLeft',steer<-.09);await set('ArrowRight',steer>.09);await set('Shift',true);observed.push({...sample,at:Date.now()});await page.waitForTimeout(60)}await release();cue('blue-racing-visible');await page.screenshot({path:path.join(__dirname,'scrap-drift-gameplay-blue-racing.png')});
  const final=await read(),snapshot=await page.evaluate(()=>__driftAudioProbe.snapshot()),recordings=await page.evaluate(()=>__driftAudioProbe.recordings()),observations=await page.evaluate(()=>({drives:__driftRecordingObservations.drives,stops:__driftRecordingObservations.stops,changes:__driftRecordingObservations.changes}));
  const offset=o=>({...o,offsetMs:o.at-videoStartedAt});metadata={video:OUTPUT,url:URL,videoStartedAt,pageCreatedAt,finishedAt:Date.now(),viewport:{width:390,height:740},provenance:'Fresh isolated Playwright profile; normal zero-coin rusty car; real start taps, keyboard steering/drift/nitro, earned first-place prize, real body upgrade purchase and second start. The shipping model/DOM/audio were observed only. No save fixtures, game-state/model writes, direct model.update, clock changes or replay manipulation.',firstResult,final,maxSpeed,maxDrifts,cues:cues.map(offset),inputs:inputs.map(offset),observed:observed.map(s=>s.at?offset(s):s),audioEvents:snapshot.events.filter(e=>e.accepted).map(e=>({key:e.key,offsetMs:e.at-videoStartedAt,voices:e.voices})),audioDrive:observations.drives.map(offset),audioStops:observations.stops.map(offset),uiChanges:observations.changes.map(offset),audioContexts:snapshot.contexts,errors,posts};
  const recording=recordings.find(r=>r.bytes.length>1000);assert.ok(recording);const audioFile=path.join(__dirname,'scrap-drift-native-audio.webm');fs.writeFileSync(audioFile,Buffer.from(recording.bytes));metadata.audio={file:audioFile,offsetMs:recording.startedAt-videoStartedAt,bytes:recording.bytes.length,decoded:recording.decoded};fs.writeFileSync(META,JSON.stringify(metadata,null,2)+'\n');
 }finally{if(context)await context.close();if(video){await video.saveAs(OUTPUT);await video.delete()}if(browser)await browser.close()}
 assert.ok(metadata);assert.equal(errors.length,0);assert.equal(posts.length,0);assert.ok(metadata.audioContexts.some(c=>c.pcmPeak>.005));assert.ok(metadata.audioEvents.some(e=>e.key==='perfect'));assert.ok(metadata.audioEvents.some(e=>e.key==='purchase'));assert.ok(metadata.maxDrifts>=3);
 const probe=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_format','-of','json',OUTPUT],{encoding:'utf8'}));metadata.sourceDuration=Number(probe.format.duration);fs.writeFileSync(META,JSON.stringify(metadata,null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',video:OUTPUT,metadata:META,sourceDuration:metadata.sourceDuration,firstResult:metadata.firstResult.result,upgraded:metadata.final.upgrades,maxSpeed:metadata.maxSpeed,drifts:metadata.maxDrifts,acceptedSounds:metadata.audioEvents.length,driveSamples:metadata.audioDrive.length,errors,posts},null,2));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1});
