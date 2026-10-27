/* Captures real practice gameplay through touch input. No score/DOM mutation.
 * node tests/v4-record-gameplay.cjs. Output: tests/v4-gameplay.webm.
 */
'use strict';
const path=require('node:path');
const{launchBrowser}=require('./v4-helpers.cjs');
async function main(){
 const{startIntegrationServer}=await import('./integration-server.mjs');const server=await startIntegrationServer({port:0}),browser=await launchBrowser();
 const context=await browser.newContext({viewport:{width:390,height:690},isMobile:true,hasTouch:true,reducedMotion:'reduce',recordVideo:{dir:path.join(__dirname,'.v4-recording'),size:{width:390,height:690}}});
 const page=await context.newPage(),video=page.video();
 try{
  await page.goto(server.url+'/#game/mole',{waitUntil:'domcontentloaded'});await page.locator('#mole-start').waitFor({state:'visible'});await page.locator('#mole-start').tap();await page.locator('.mole-hole.active').waitFor({state:'visible'});
  const start=Date.now(),bombs=new Set([6,13,20,27,36]);
  while(Date.now()-start<11000){
   const active=page.locator('.mole-hole.active'),slot=Math.floor((Date.now()-start+20)/625);
   if(!bombs.has(slot)&&await active.count()){
    const box=await active.boundingBox();if(box){await page.waitForTimeout(160);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2)}
   }
   await page.waitForTimeout(80);
  }
  await page.locator('.mole-hole.active').waitFor({state:'visible',timeout:1000});await page.waitForTimeout(90);
  await page.screenshot({path:path.join(__dirname,'v4-gameplay-lastframe.png')});console.log('Real practice score:',await page.locator('#mole-score').innerText());
 }finally{await context.close()}
 try{await video.saveAs(path.join(__dirname,'v4-gameplay.webm'));await video.delete()}finally{await browser.close();await server.close()}
 console.log('Recording saved:',path.join(__dirname,'v4-gameplay.webm'));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
