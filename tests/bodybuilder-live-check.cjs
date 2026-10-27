/* Run ONLY after the owning agent confirms the new production deployment:
 * node tests/bodybuilder-live-check.cjs --confirm-deployed
 * Normal fresh local progress only; never touches the shared mole leaderboard.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{launchBrowser,train,SAVE_KEY}=require('./bodybuilder-helpers.cjs');
const BASE='https://asobi-yokocho.pages.dev',report={url:BASE,checkedAt:null,checks:[]};
function pass(name){report.checks.push({name,status:'PASS'});console.log('PASS '+name)}
async function main(){
 if(!process.argv.includes('--confirm-deployed'))throw Error('Await the new production deployment confirmation, then pass --confirm-deployed.');
 report.checkedAt=new Date().toISOString();const browser=await launchBrowser();let context;
 try{
  context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[],posts=[],scripts=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.method()==='POST')posts.push(new URL(request.url()).pathname);if(/\/games\/[^/]+\.js$/.test(new URL(request.url()).pathname))scripts.push(request.url())});
  await page.goto(BASE+'/',{waitUntil:'networkidle',timeout:45000});assert.equal(new URL(page.url()).origin,BASE);assert.equal(await page.locator('#game-grid .game-card').count(),7);assert.equal(scripts.length,0);await page.screenshot({path:path.join(__dirname,'bodybuilder-live-home.png'),fullPage:true});pass('Public home shows seven games without loading game scripts');
  await page.locator('#recommended-grid [data-open="bodybuilder"]').first().click();await page.locator('#bb-canvas').waitFor({state:'visible',timeout:15000});const visual=scripts.findIndex(url=>url.endsWith('/games/bodybuilder-visual.js')),mechanics=scripts.findIndex(url=>url.endsWith('/games/bodybuilder.js'));assert.ok(visual>=0&&mechanics>visual);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));pass('Recommended gym opens with the renderer loaded before mechanics');
  const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);await train(page,'bench');const trained=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);assert.ok(trained.pending.chest>before.pending.chest);assert.equal(trained.muscles.chest,before.muscles.chest);assert.equal(trained.ap,before.ap-1);pass('Six real timed bench repetitions create chest recovery gains');
  await page.locator('#bb-end-day').click();const recovered=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);assert.equal(recovered.day,2);assert.ok(recovered.muscles.chest>before.muscles.chest);pass('Ending the first day applies real chest growth');
  for(const lang of['en','ko','zh','es','ja']){await page.selectOption('#language-select',lang);assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY),recovered)}pass('All five languages preserve progress');
  await page.reload({waitUntil:'networkidle'});await page.locator('#bb-canvas').waitFor({state:'visible'});assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY),recovered);await page.screenshot({path:path.join(__dirname,'bodybuilder-live-game.png'),fullPage:true});pass('Reload preserves the grown body and second-day resources');
  await page.evaluate(()=>{location.hash='#home'});await page.locator('#home-screen').waitFor({state:'visible'});assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);pass('No browser exceptions or shared-ranking/network submissions');
  report.progress={day:recovered.day,chestBefore:before.muscles.chest,chestAfter:recovered.muscles.chest};
 }finally{if(context)await context.close();await browser.close()}
}
main().catch(error=>{report.checks.push({name:'Public gym verification',status:'FAIL',message:error.message});console.error(error.stack);process.exitCode=1}).finally(()=>{fs.writeFileSync(path.join(__dirname,'bodybuilder-live-results.json'),JSON.stringify(report,null,2)+'\n')});
