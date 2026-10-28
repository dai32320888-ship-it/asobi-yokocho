/* Promotional source: real normal-start keyboard/click play in an isolated tab.
 * Observation guides the pilot. No storage fixtures, clock changes, direct
 * model updates, progress changes, enemy edits or synthesized input callbacks.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {launchBrowser}=require('./v4-helpers.cjs');
const {installAudioProbe}=require('./bodybuilder-audio-probe.cjs');

function observeModel(){
 let exposed;
 Object.defineProperty(window,'AsobiMouseModel',{configurable:true,get(){return exposed},set(Class){
  exposed=typeof Class==='function'?new Proxy(Class,{construct(Target,args,newTarget){const instance=Reflect.construct(Target,args,newTarget);window.__mouseRecordModel=instance;return instance}}):Class;
 }});
}
function observe(){
 const s=window.__mouseRecordModel?.state;if(!s)return null;const p=s.player;
 const closest=list=>list.reduce((best,item)=>!best||Math.hypot(item.x-p.x,item.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?item:best,null);
 const nearest=closest(s.enemies),distance=nearest?Math.hypot(nearest.x-p.x,nearest.y-p.y):Infinity;
 const danger=s.enemies.find(enemy=>['windup','charge'].includes(enemy.phase)&&Math.hypot(enemy.x-p.x,enemy.y-p.y)<p.r+enemy.r+125);
 let target;
 if(s.mate.ready&&!s.stageBred)target=s.mate;
 else if(nearest&&distance<175)target=nearest;
 else if(s.xp>=s.goal*.7)target=s.enemies.find(enemy=>enemy.boss)||closest(s.foods);
 else target=closest(s.foods);
 target=target||nearest||{x:900,y:700};let dx=target.x-p.x,dy=target.y-p.y;
 let dash=false;
 if(danger&&p.dashCd<=0){const ex=danger.x-p.x,ey=danger.y-p.y,ed=Math.hypot(ex,ey)||1;dx=-ey/ed;dy=ex/ed;dash=true;}
 const length=Math.hypot(dx,dy)||1;
 return{mode:s.mode,stage:s.stage,generation:s.generation,xp:s.xp,goal:s.goal,hp:p.hp,size:p.size,kills:s.kills,foodsEaten:s.foodsEaten,breeds:s.breeds,genes:{...s.genes},x:p.x,y:p.y,dx:dx/length,dy:dy/length,dash,canBreed:s.mate.ready&&!s.stageBred&&Math.hypot(p.x-s.mate.x,p.y-s.mate.y)<=p.r+s.mate.r+75,nearest:nearest?{type:nearest.type,distance,boss:nearest.boss,phase:nearest.phase}:null};
}
async function main(){
 const {startIntegrationServer}=await import('./integration-server.mjs');const server=await startIntegrationServer({port:0});let browser,context,video,snapshot,recordings=[],videoStartedAt,startedAt;
 const cues=[],states=[],errors=[],posts=[],pressed=new Set();let selectedGene=false,deathCount=0,firstBreedAt=null;
 try{
  browser=await launchBrowser();context=await browser.newContext({viewport:{width:390,height:690},isMobile:true,hasTouch:true,deviceScaleFactor:1,recordVideo:{dir:path.join(__dirname,'.mouse-evolution-recording'),size:{width:390,height:690}}});
  await context.addInitScript(observeModel);
  const probe='('+installAudioProbe.toString().replaceAll('AsobiGymAudio','AsobiMouseAudio').replaceAll('__gymAudioProbe','__mouseAudioProbe')+')({record:true,meter:true});';
  await context.addInitScript({content:probe});videoStartedAt=Date.now();const page=await context.newPage();const pageCreatedAt=Date.now();video=page.video();
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.method()==='POST')posts.push(request.url())});
  await page.goto(server.url+'/#game/mouse-evolution',{waitUntil:'networkidle'});await page.locator('#me-start').waitFor({state:'visible'});await page.locator('#me-arena').scrollIntoViewIfNeeded();
  cues.push({type:'start-click',at:Date.now()});await page.locator('#me-start').click();startedAt=Date.now();await page.locator('#me-arena').scrollIntoViewIfNeeded();await page.locator('#me-arena').focus();
  async function keys(next){for(const key of pressed)if(!next.has(key)){await page.keyboard.up(key);pressed.delete(key)}for(const key of next)if(!pressed.has(key)){await page.keyboard.down(key);pressed.add(key)}}
  let lastStateTime=0;
  while(Date.now()-startedAt<24500){
   const s=await page.evaluate(observe);if(!s)throw Error('Model observer missing');const elapsed=Date.now()-startedAt;
   if(elapsed-lastStateTime>200){states.push({at:Date.now(),...s});lastStateTime=elapsed;}
   if(s.mode==='breeding'){
    await keys(new Set());if(firstBreedAt===null)firstBreedAt=Date.now();cues.push({type:'breed-choice-visible',at:Date.now(),generation:s.generation});await page.waitForTimeout(850);await page.screenshot({path:path.join(__dirname,'mouse-evolution-breed-frame.png')});await page.locator('[data-me-gene="power"]').click();selectedGene=true;cues.push({type:'gene-selected',gene:'power',at:Date.now()});await page.waitForTimeout(300);continue;
   }
   if(s.mode==='dead'){deathCount++;await keys(new Set());cues.push({type:'death',at:Date.now()});break;}
   if(s.mode==='paused'){await page.locator('#me-start').click();continue;}
   if(s.mode==='won')break;
   if(s.canBreed){await keys(new Set());await page.keyboard.press('e');cues.push({type:'breed-key',at:Date.now()});await page.waitForTimeout(90);continue;}
   const next=new Set(['j']);if(s.dx>.23)next.add('d');else if(s.dx<-.23)next.add('a');if(s.dy>.23)next.add('s');else if(s.dy<-.23)next.add('w');await keys(next);
   if(s.dash){await page.keyboard.press('k');cues.push({type:'dash-key',at:Date.now()});}
   if(elapsed>=19500&&selectedGene&&s.kills>=2)break;
   await page.waitForTimeout(75);
  }
  await keys(new Set());await page.waitForTimeout(180);const final=await page.evaluate(observe);snapshot=await page.evaluate(()=>__mouseAudioProbe.snapshot());recordings=await page.evaluate(()=>__mouseAudioProbe.recordings());await page.screenshot({path:path.join(__dirname,'mouse-evolution-gameplay-lastframe.png')});
  const metadata={video:'mouse-evolution-gameplay.webm',videoStartedAt,pageCreatedAt,gameplayStartedAt:startedAt,finishedAt:Date.now(),provenance:'Normal initial state in a fresh isolated browser context; observations only; real keyboard and button input; no save fixtures or state/time modifications.',final,deathCount,selectedGene,firstBreedAt,cues:cues.map(cue=>({...cue,offsetMs:cue.at-videoStartedAt})),states:states.map(value=>({...value,offsetMs:value.at-videoStartedAt})),audioEvents:snapshot.events.filter(event=>event.accepted).map(event=>({key:event.key,offsetMs:event.at-videoStartedAt,voices:event.voices})),audioContexts:snapshot.contexts,errors,posts};
  const recording=recordings.find(item=>item.bytes.length>1000);if(recording){fs.writeFileSync(path.join(__dirname,'mouse-evolution-audio.webm'),Buffer.from(recording.bytes));metadata.audio={file:'mouse-evolution-audio.webm',offsetMs:recording.startedAt-videoStartedAt,bytes:recording.bytes.length,decoded:recording.decoded};}
  fs.writeFileSync(path.join(__dirname,'mouse-evolution-media.json'),JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify({final,selectedGene,deathCount,errors,posts,sounds:metadata.audioEvents.length,elapsedMs:Date.now()-startedAt},null,2));
 }finally{
  if(context)await context.close();if(video){await video.saveAs(path.join(__dirname,'mouse-evolution-gameplay.webm'));await video.delete()}if(browser)await browser.close();await server.close();
 }
 if(errors.length)throw Error('Browser errors in the recording');if(!selectedGene)throw Error('Normal recording did not reach breeding');if(deathCount)throw Error('Recording ended in a death');
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
