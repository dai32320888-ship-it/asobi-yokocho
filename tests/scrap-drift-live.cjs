/* Public smoke: fresh disposable browser, no save injection or game-state edits.
 * Run only after deploy + exact build verification:
 * node tests/scrap-drift-live.cjs --confirm-deployed
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{launchBrowser,createPage}=require('./v4-helpers.cjs');
const{driveRace,ui}=require('./scrap-drift-browser.cjs');
const BASE='https://asobi-yokocho.pages.dev/',KEY='asobi:scrap-drift:v1',checks=[];
const pass=name=>{checks.push({name,status:'PASS'});console.log('PASS '+name)};
const saved=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function main(){
 assert.ok(process.argv.includes('--confirm-deployed'),'Deploy and verify matching source files before running this script');
 const browser=await launchBrowser();let t,direct,observedRace=null,observedUpgrade=null;
 try{
  direct=await createPage(browser,BASE+'#game/scrap-drift');await direct.page.locator('#sd-canvas').waitFor({state:'visible'});assert.equal((await ui(direct.page)).mode,'garage');assert.ok(await direct.page.locator('#sd-start').isEnabled());assert.equal(direct.posts.length,0);assert.deepEqual(direct.errors,[]);await direct.context.close();direct=null;pass('A fresh direct game link loads a playable starter garage');
  t=await createPage(browser,BASE);const p=t.page;assert.equal(await p.locator('#game-grid .game-card').count(),10);assert.equal(t.scripts.length,0);await t.go('scrap-drift');for(const name of['scrap-drift-model','scrap-drift-visual','scrap-drift-audio','scrap-drift'])assert.equal(t.scripts.filter(url=>url.endsWith('/games/'+name+'.js')).length,1);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));pass('Ten-game home lazily loads only the four requested racing modules');
  await p.locator('#sd-start').tap();await p.waitForFunction(()=>document.getElementById('sd-game').dataset.mode==='racing',null,{timeout:6500});await driveRace(p);assert.equal((await ui(p)).mode,'finished');assert.ok(await p.locator('#sd-result').isVisible());const earned=await saved(p);observedRace=earned.result;assert.equal(earned.races,1);assert.ok(earned.coins>0);assert.ok(earned.result?.rank>=1&&earned.result?.rank<=4);await p.screenshot({path:path.join(__dirname,'scrap-drift-live-finish.png'),fullPage:true});pass('Normal real steering, drifting and nitro finish a full race with one earned reward');
  await p.reload({waitUntil:'networkidle'});await p.locator('#sd-canvas').waitFor({state:'visible'});assert.equal((await ui(p)).mode,'garage');assert.equal((await saved(p)).coins,earned.coins);assert.equal((await saved(p)).races,1);const before=await saved(p);for(const lang of['en','ko','zh','es','ja']){await p.selectOption('#language-select',lang);assert.deepEqual(await saved(p),before);assert.doesNotMatch(await p.locator('#sd-game').innerText(),/undefined|NaN|soundStart/)}pass('Earned progress survives reload and all five interface languages');
  const part=before.coins>=120?'body':'tires',cost=part==='body'?120:100;assert.ok(before.coins>=cost,'The observed earned balance funds a real available upgrade');await p.locator('[data-sd-upgrade="'+part+'"]').tap();const upgraded=await saved(p);assert.equal(upgraded.upgrades[part],1);assert.equal(upgraded.coins,before.coins-cost);observedUpgrade={part,cost,balanceBefore:before.coins,balanceAfter:upgraded.coins};await p.reload({waitUntil:'networkidle'});await p.locator('#sd-canvas').waitFor({state:'visible'});assert.equal((await saved(p)).upgrades[part],1);await p.screenshot({path:path.join(__dirname,'scrap-drift-live.png'),fullPage:true});pass('The introductory upgrade uses genuinely earned coins and remains saved');
  await t.home();assert.deepEqual(await p.evaluate(()=>__v4Resources()),{intervals:0,frames:0,listeners:0,fetches:0});assert.equal(t.posts.length,0);assert.deepEqual(t.errors,[]);pass('Leaving releases racing resources without shared-ranking POSTs or browser exceptions');
 }catch(error){checks.push({name:'Public racing smoke check',status:'FAIL',message:error.message});throw error}finally{fs.writeFileSync(path.join(__dirname,'scrap-drift-live-results.json'),JSON.stringify({generatedAt:new Date().toISOString(),source:BASE,saveFixtures:false,observedFirstRace:observedRace,observedUpgrade,checks},null,2)+'\n');if(direct)await direct.context.close();if(t)await t.context.close();await browser.close()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
