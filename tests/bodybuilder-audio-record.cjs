/* Real normal-start gym video + the actual synthesized game sound stream.
 * No microphone, state fixtures, score edits or replacement sound generation.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const{launchBrowser}=require('./bodybuilder-helpers.cjs');
const{installAudioProbe}=require('./bodybuilder-audio-probe.cjs');
async function main(){
 const{startIntegrationServer}=await import('./integration-server.mjs');const server=await startIntegrationServer({port:0}),browser=await launchBrowser();
 const context=await browser.newContext({viewport:{width:390,height:690},isMobile:true,hasTouch:true,recordVideo:{dir:path.join(__dirname,'.bodybuilder-audio-recording'),size:{width:390,height:690}}});
 await context.addInitScript(installAudioProbe,{record:true});const started=Date.now(),page=await context.newPage(),video=page.video();let audio=[],snapshot;
 try{
  await page.goto(server.url+'/#game/bodybuilder',{waitUntil:'domcontentloaded'});await page.locator('#bb-canvas').waitFor({state:'visible'});await page.locator('#bb-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(250);
  await page.locator('#bb-train').click();await page.locator('#bb-stage').scrollIntoViewIfNeeded();
  for(let index=0;index<6;index++){
   await page.waitForFunction(()=>{const marker=document.getElementById('bb-marker'),target=document.getElementById('bb-target');return marker&&target&&Math.abs(Number(marker.dataset.position)-Number(target.dataset.center))<.05},null,{timeout:5000});await page.keyboard.press('Space');await page.waitForTimeout(100);
  }
  await page.waitForFunction(()=>document.getElementById('bb-workout-data').dataset.active==='false');await page.locator('#bb-end-day').click();await page.waitForTimeout(400);await page.locator('#bb-stage').scrollIntoViewIfNeeded();await page.locator('#bb-compare').click();await page.waitForTimeout(600);
  await page.locator('#bb-tab-food').click();await page.locator('[data-bb-meal="fish"]').tap();await page.waitForTimeout(500);await page.locator('#bb-stage').scrollIntoViewIfNeeded();
  if(Date.now()-started<11000)await page.waitForTimeout(11000-(Date.now()-started));await page.screenshot({path:path.join(__dirname,'bodybuilder-v5-1-gameplay-lastframe.png')});snapshot=await page.evaluate(()=>__gymAudioProbe.snapshot());audio=await page.evaluate(()=>__gymAudioProbe.recordings());console.log('Normal-start final day:',await page.locator('#bb-day').innerText());
 }finally{await context.close()}
 try{
  const videoPath=path.join(__dirname,'bodybuilder-v5-1-gameplay.webm');await video.saveAs(videoPath);await video.delete();
  const recording=audio.find(item=>item.bytes.length>1000);if(recording)fs.writeFileSync(path.join(__dirname,'bodybuilder-v5-1-audio.webm'),Buffer.from(recording.bytes));
  const metadata={video:path.basename(videoPath),videoStartedAt:started,audio:recording?{file:'bodybuilder-v5-1-audio.webm',offsetMs:recording.startedAt-started,bytes:recording.bytes.length,decoded:recording.decoded}:null,events:snapshot?.events.filter(event=>event.accepted).map(event=>({key:event.key,offsetMs:event.at-started,voices:event.voices})),maxObservedSources:Math.max(0,...(snapshot?.contexts||[]).map(item=>item.peak))};
  fs.writeFileSync(path.join(__dirname,'bodybuilder-v5-1-media.json'),JSON.stringify(metadata,null,2)+'\n');console.log('Recorded actual game audio:',Boolean(recording));
 }finally{await browser.close();await server.close()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
