/* Real normal-start gym play. No progress fixtures or app-state mutation.
 * node tests/bodybuilder-record.cjs -> tests/bodybuilder-gameplay.webm
 */
'use strict';
const path=require('node:path');
const{launchBrowser}=require('./bodybuilder-helpers.cjs');
async function main(){
 const{startIntegrationServer}=await import('./integration-server.mjs');const server=await startIntegrationServer({port:0}),browser=await launchBrowser();
 const context=await browser.newContext({viewport:{width:390,height:690},isMobile:true,hasTouch:true,recordVideo:{dir:path.join(__dirname,'.bodybuilder-recording'),size:{width:390,height:690}}});
 const started=Date.now(),page=await context.newPage(),video=page.video();
 try{
  await page.goto(server.url+'/#game/bodybuilder',{waitUntil:'domcontentloaded'});await page.locator('#bb-canvas').waitFor({state:'visible'});await page.locator('#bb-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(350);
  await page.locator('#bb-train').click();await page.locator('#bb-stage').scrollIntoViewIfNeeded();
  for(let index=0;index<6;index++){
   await page.waitForFunction(()=>{const marker=document.getElementById('bb-marker'),target=document.getElementById('bb-target');return marker&&target&&Math.abs(Number(marker.dataset.position)-Number(target.dataset.center))<.05},null,{timeout:5000});
   // The game focuses its repetition button on start. Scrolling to film the
   // articulated athlete keeps keyboard input on that real control.
   await page.keyboard.press('Space');await page.waitForTimeout(100);
  }
  await page.waitForFunction(()=>document.getElementById('bb-workout-data').dataset.active==='false');
  await page.locator('#bb-end-day').click();await page.locator('#bb-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(900);
  await page.locator('#bb-tab-food').click();await page.locator('[data-bb-meal="fish"]').tap();await page.waitForTimeout(650);
  await page.locator('#bb-stage').scrollIntoViewIfNeeded();await page.locator('#bb-view-pose').tap();
  if(Date.now()-started<12500)await page.waitForTimeout(12500-(Date.now()-started));
  await page.screenshot({path:path.join(__dirname,'bodybuilder-gameplay-lastframe.png')});
  console.log('Real normal-start progress:',await page.locator('#bb-day').innerText());
 }finally{await context.close()}
 try{await video.saveAs(path.join(__dirname,'bodybuilder-gameplay.webm'));await video.delete()}finally{await browser.close();await server.close()}
 console.log('Gym recording:',path.join(__dirname,'bodybuilder-gameplay.webm'));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
