/* Public smoke check in a fresh disposable browser profile. No seeded progress.
 * node tests/mouse-evolution-live.cjs --confirm-deployed
 * Never submits a ranked Mole round or changes an existing user's save.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{launchBrowser,createPage}=require('./v4-helpers.cjs');
if(!process.argv.includes('--confirm-deployed'))throw Error('Run only after verifying the live deployment with --confirm-deployed');
const BASE='https://asobi-yokocho.pages.dev',KEY='asobi:mouse-evolution:v1',checks=[];
const pass=name=>{checks.push({name,status:'PASS'});console.log('PASS '+name)};
async function snapshot(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)}
async function main(){
 const browser=await launchBrowser();let t;
 try{
  t=await createPage(browser,BASE+'/',{width:390,height:844,mobile:true});const p=t.page;assert.equal(new URL(p.url()).origin,BASE);assert.equal(await p.locator('#game-grid .game-card').count(),8);assert.equal(t.scripts.length,0);assert.ok(await p.locator('#recommended-grid [data-open="mouse-evolution"]').count());pass('Public home has eight games and loads no game scripts before selection');
  await t.go('mouse-evolution');assert.equal(await p.locator('.me-game').getAttribute('data-mode'),'ready');const sequence=['model','visual','audio'].map(key=>t.scripts.findIndex(url=>url.endsWith('/games/mouse-evolution-'+key+'.js'))),main=t.scripts.findIndex(url=>url.endsWith('/games/mouse-evolution.js'));assert.ok(sequence.every(index=>index>=0&&index<main));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));pass('Public mouse game loads its three dependencies and fits a phone');
  await p.locator('#me-start').tap();const x=Number(await p.locator('#me-canvas').getAttribute('data-player-x'));await p.keyboard.down('d');await p.waitForTimeout(300);await p.keyboard.up('d');assert.ok(Number(await p.locator('#me-canvas').getAttribute('data-player-x'))>x+30);await p.locator('#me-attack').tap();await p.locator('#me-dash').tap();await p.waitForTimeout(100);assert.ok(await p.locator('#me-dash').isDisabled());await p.locator('#me-pause').click();assert.equal(await p.locator('.me-game').getAttribute('data-mode'),'paused');const before=await snapshot(p);assert.ok(before.player.x>x);pass('Normal start, real movement, bite, dash and pause persist progress');
  for(const language of['en','ko','zh','es','ja']){await p.selectOption('#language-select',language);assert.equal(await p.locator('.me-game').getAttribute('data-mode'),'paused');assert.deepEqual(await snapshot(p),before);assert.doesNotMatch(await p.locator('.me-game').innerText(),/undefined|NaN|breedTitle/)}pass('All five languages retain the same saved run');
  await p.reload({waitUntil:'networkidle'});await p.locator('#me-canvas').waitFor({state:'visible'});const after=await snapshot(p);assert.equal(after.stage,before.stage);assert.equal(after.xp,before.xp);assert.deepEqual(after.genes,before.genes);assert.equal(await p.locator('.me-game').getAttribute('data-mode'),'paused');await p.locator('#me-start').click();assert.equal(await p.locator('.me-game').getAttribute('data-mode'),'playing');await p.screenshot({path:path.join(__dirname,'mouse-evolution-live.png')});pass('Reload preserves growth and can resume without a fixture');
  await t.home();assert.deepEqual(await p.evaluate(()=>__v4Resources()),{intervals:0,frames:0,listeners:0,fetches:0});assert.equal(t.posts.length,0);assert.deepEqual(t.errors,[]);pass('Leaving cleans up; no ranked POSTs or browser exceptions');
 }catch(error){checks.push({name:'Public mouse smoke check',status:'FAIL',message:error.message});throw error}
 finally{fs.writeFileSync(path.join(__dirname,'mouse-evolution-live-results.json'),JSON.stringify({generatedAt:new Date().toISOString(),source:BASE,saveFixtures:false,checks},null,2)+'\n');if(t)await t.context.close();await browser.close()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
