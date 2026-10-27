/* Validates the deliverable as a real file:// page, not a local HTTP substitute. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{pathToFileURL}=require('node:url');
const{launchBrowser,train}=require('./bodybuilder-helpers.cjs');
async function main(){
 const root=path.resolve(__dirname,'..'),version=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')).version.replace(/(?:\.0)+$/,''),file=path.resolve(root,'..','asobi-yokocho-v'+version+'-demo.html');assert.ok(fs.existsSync(file),'Build standalone first');
 const browser=await launchBrowser(),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],network=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{const url=new URL(request.url());if(['http:','https:'].includes(url.protocol)&&!url.pathname.startsWith('/api/mole/'))network.push(request.url())});
 const report={file:path.basename(file),checkedAt:new Date().toISOString(),checks:[]};
 try{
  await page.goto(pathToFileURL(file).href,{waitUntil:'load'});assert.equal(await page.locator('#game-grid .game-card').count(),7);
  for(const image of await page.locator('#game-grid .cover-icon img').all())await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('#game-grid .cover-icon img')].length===7&&[...document.querySelectorAll('#game-grid .cover-icon img')].every(image=>image.complete&&image.naturalWidth>0));
  assert.ok(await page.locator('#game-grid .cover-icon img').evaluateAll(images=>images.every(image=>image.src.startsWith('data:'))));report.checks.push({name:'All seven card images are embedded and decoded',status:'PASS'});
  await page.evaluate(()=>{location.hash='#game/bodybuilder'});await page.locator('#bb-canvas').waitFor({state:'visible'});await train(page,'bench');await page.locator('#bb-end-day').click();assert.match(await page.locator('#bb-day').innerText(),/2/);await page.locator('#bb-compare').click();assert.ok(await page.evaluate(()=>{const stage=document.getElementById('bb-stage'),canvas=document.getElementById('bb-canvas').getBoundingClientRect(),controls=stage.querySelector('.bb-view-controls').getBoundingClientRect();return controls.top>=canvas.bottom-1&&getComputedStyle(stage.querySelector('.bb-stage-label')).display==='none'}),'Standalone includes the final comparison-control layout');report.checks.push({name:'Gym training, growth and comparison work from file URL',status:'PASS'});
  assert.deepEqual(network,[],'Standalone needs no HTTP assets');assert.deepEqual(errors,[]);report.checks.push({name:'No external asset requests or browser exceptions',status:'PASS'});await page.screenshot({path:path.join(__dirname,'bodybuilder-standalone.png'),fullPage:true});console.log('PASS standalone file:// images, game play, no HTTP assets');
 }catch(error){report.checks.push({name:'Standalone verification',status:'FAIL',message:error.message});throw error}finally{fs.writeFileSync(path.join(__dirname,'bodybuilder-standalone-results.json'),JSON.stringify(report,null,2)+'\n');await context.close();await browser.close()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
