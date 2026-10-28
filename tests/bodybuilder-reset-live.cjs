/* Production smoke uses a new disposable browser profile, normal controls only.
 * No progress injection and no shared-ranking submission. Explicit deploy guard.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{launchBrowser}=require('./bodybuilder-helpers.cjs');
const ORIGIN='https://asobi-yokocho.pages.dev',SAVE_KEY='asobi:bodybuilder:v1';
const results=[],errors=[],posts=[];
async function state(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY)}
async function main(){
 if(!process.argv.includes('--confirm-deployed'))throw Error('Production smoke requires --confirm-deployed after the deployed files have been verified.');
 const browser=await launchBrowser();
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try{
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.method()==='POST'){const u=new URL(request.url());posts.push(u.origin+u.pathname)}});
   await page.goto(ORIGIN+'/#game/bodybuilder',{waitUntil:'networkidle'});await page.locator('#bb-canvas').waitFor({state:'visible'});
   let saved=await state(page);assert.equal(saved.day,1);assert.equal(saved.coins,60);assert.equal(saved.ap,3);assert.ok(Object.values(saved.muscles).every(value=>value===8));results.push({name:'Fresh disposable profile starts normally at DAY 1',status:'PASS'});
   await page.locator('#bb-end-day').click();saved=await state(page);assert.equal(saved.day,2);assert.equal(saved.coins,80);results.push({name:'Normal end-day control reaches DAY 2 without fixtures',status:'PASS'});
   const before=JSON.stringify(saved);await page.locator('#bb-reset').click();await page.locator('#bb-reset-confirm').waitFor({state:'visible'});await page.locator('#bb-reset-cancel').click();assert.equal(JSON.stringify(await state(page)),before);assert.ok(await page.locator('#bb-reset-confirm').isHidden());results.push({name:'Cancelling reset preserves the normal DAY 2 save',status:'PASS'});
   await page.locator('#bb-reset').click();await page.locator('#bb-reset-confirm').click();saved=await state(page);assert.equal(saved.day,1);assert.equal(saved.coins,60);assert.equal(saved.ap,3);assert.equal(saved.bestContest,0);assert.deepEqual(saved.history,[]);assert.ok(Object.values(saved.muscles).every(value=>value===8));results.push({name:'Confirmed reset returns this disposable run to DAY 1 and 60 coins',status:'PASS'});
   await page.reload({waitUntil:'networkidle'});await page.locator('#bb-canvas').waitFor({state:'visible'});saved=await state(page);assert.equal(saved.day,1);assert.equal(saved.coins,60);assert.ok(await page.locator('#bb-reset-confirm').isHidden());results.push({name:'Reload preserves the reset and dismisses confirmation',status:'PASS'});
   assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);results.push({name:'No browser exceptions or POST requests, including shared ranking',status:'PASS'});
   await page.screenshot({path:path.join(__dirname,'bodybuilder-reset-live.png')});
  }finally{await context.close()}
 }catch(error){results.push({name:'Production reset smoke',status:'FAIL',message:error.message});throw error}
 finally{await browser.close();fs.writeFileSync(path.join(__dirname,'bodybuilder-reset-live-results.json'),JSON.stringify({generatedAt:new Date().toISOString(),origin:ORIGIN,disposableProfile:true,progressInjection:false,posts,errors,results},null,2)+'\n')}
 console.log(results.length+'/'+results.length+' production reset smoke groups passed');
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
