/* Public smoke: fresh independent browser, actual input and no save fixtures.
 * Run only after exact deployed-build verification:
 * node tests/balloon-panic-live.cjs --confirm-deployed
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{launchBrowser,createPage}=require('./v4-helpers.cjs');
const{ui,saved,pointerStart,finishAt}=require('./balloon-panic-browser.cjs');
const BASE='https://asobi-yokocho.pages.dev/',checks=[];
const pass=name=>{checks.push({name,status:'PASS'});console.log('PASS '+name)};
async function main(){
 assert.ok(process.argv.includes('--confirm-deployed'),'Deploy and match the tested build before this public check');
 const browser=await launchBrowser();let direct,t,observedStop=null,observedBurst=null;
 try{
  direct=await createPage(browser,BASE+'#game/balloon-panic');await direct.page.locator('#bp-canvas').waitFor({state:'visible'});assert.equal((await ui(direct.page)).mode,'ready');assert.ok(await direct.page.locator('#bp-hold').isEnabled());assert.equal(await direct.page.locator('dialog[open]').count(),0);assert.deepEqual(direct.errors,[]);await direct.context.close();direct=null;pass('A new direct game link opens one immediately playable balloon');
  t=await createPage(browser,BASE);const p=t.page;assert.equal(await p.locator('#game-grid .game-card').count(),11);assert.equal(t.scripts.length,0);await t.go('balloon-panic');for(const name of['balloon-panic-model','balloon-panic-visual','balloon-panic-audio','balloon-panic'])assert.equal(t.scripts.filter(url=>url.endsWith('/games/'+name+'.js')).length,1);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));pass('Eleven-game home loads only the four chosen balloon modules');
  await finishAt(p,.94);const earned=await saved(p);observedStop={...await ui(p),saved:earned};assert.ok(earned.best>850&&earned.best<=1000);assert.equal(earned.plays,1);assert.equal(earned.successes,1);await p.screenshot({path:path.join(__dirname,'balloon-panic-live-stop.png'),fullPage:true});pass('One real held gesture and near-limit release award a local score once');
  await p.reload({waitUntil:'networkidle'});await p.locator('#bp-canvas').waitFor({state:'visible'});assert.equal((await ui(p)).mode,'ready');assert.equal((await saved(p)).best,earned.best);const before=await saved(p);for(const lang of['en','ko','zh','es','ja']){await p.selectOption('#language-select',lang);assert.deepEqual(await saved(p),before);assert.doesNotMatch(await p.locator('#bp-game').innerText(),/undefined|NaN|\{n\}|\{score\}/)}pass('Earned records survive reload and all five interface languages');
  await pointerStart(p);await p.waitForFunction(()=>document.getElementById('bp-game').dataset.mode==='burst',null,{timeout:11000});await p.mouse.up();observedBurst={...await ui(p),saved:await saved(p)};assert.equal(Number(observedBurst.score),0);assert.equal(Number(observedBurst.plays),2);assert.equal((await saved(p)).best,earned.best);await pointerStart(p);await p.waitForTimeout(400);await p.mouse.up();assert.equal((await ui(p)).mode,'stopped');assert.equal(Number((await ui(p)).plays),3);await p.screenshot({path:path.join(__dirname,'balloon-panic-live.png'),fullPage:true});pass('A real pop keeps the best record and the next held press retries immediately');
  await t.home();assert.deepEqual(await p.evaluate(()=>__v4Resources()),{intervals:0,frames:0,listeners:0,fetches:0});assert.equal(t.posts.length,0);assert.deepEqual(t.errors,[]);pass('Leaving releases game resources and makes no shared-ranking POSTs');
 }catch(error){checks.push({name:'Public balloon smoke check',status:'FAIL',message:error.message});throw error}finally{fs.writeFileSync(path.join(__dirname,'balloon-panic-live-results.json'),JSON.stringify({generatedAt:new Date().toISOString(),source:BASE,saveFixtures:false,observedStop,observedBurst,checks},null,2)+'\n');if(direct)await direct.context.close();if(t)await t.context.close();await browser.close()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
