/* PRODUCTION CHECK: creates ONE visibly named 2-point operator test round.
 * Do not run until the owning agent confirms the new production deployment.
 * node tests/v4-live-check.cjs --confirm-deployed
 * Fresh isolated browser; no storage seeding, app-state mutation, injected
 * delays, score fixtures, or service mocks. Saved results never contain tokens.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{launchBrowser}=require('./v4-helpers.cjs');
const BASE='https://asobi-yokocho.pages.dev',TEST_NAME='動作確認';
const output={url:BASE,nickname:TEST_NAME,checkedAt:null,checks:[],round:null};
function checked(name,details={}){output.checks.push({name,status:'PASS',...details});console.log('PASS '+name)}
async function makePage(browser,{mobile=true}={}){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:900},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),errors=[],writes=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{
  if(request.method()==='POST'&&request.url().startsWith(BASE+'/api/mole/')){
   let body;try{body=request.postDataJSON()}catch{return}
   // Retain field NAMES only. The session bearer secret is never logged/saved.
   writes.push({endpoint:new URL(request.url()).pathname,fields:Object.keys(body).sort()});
  }
 });
 await page.goto(BASE+'/',{waitUntil:'networkidle',timeout:45000});
 return{context,page,errors,writes};
}
async function go(t,id,selector){await t.page.evaluate(id=>{location.hash='#game/'+id},id);await t.page.locator(selector).first().waitFor({state:'visible',timeout:15000})}
async function home(t){await t.page.evaluate(()=>{location.hash='#home'});await t.page.locator('#home-screen').waitFor({state:'visible'});await t.page.waitForTimeout(120)}
async function fit(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Production page fits viewport')}
async function main(){
 if(!process.argv.includes('--confirm-deployed'))throw Error('Production check is gated. Run only after the owning agent confirms deployment, with --confirm-deployed.');
 output.checkedAt=new Date().toISOString();const browser=await launchBrowser();let desktop,first,second;
 try{
  desktop=await makePage(browser,{mobile:false});assert.equal(new URL(desktop.page.url()).origin,BASE);assert.equal(await desktop.page.locator('#game-grid .game-card').count(),6);assert.equal(await desktop.page.locator('#recommended-grid .recommend-card').count(),3);await fit(desktop.page);await desktop.page.screenshot({path:path.join(__dirname,'v4-live-home.png'),fullPage:true});checked('Public desktop home shows all six games');
  first=await makePage(browser);const p=first.page;assert.equal(await p.locator('#game-grid .game-card').count(),6);await fit(p);checked('Public mobile home fits 390px');

  await go(first,'snake','#snake-canvas');await p.locator('#snake-start').click();await p.waitForTimeout(230);await p.locator('#snake-start').click();assert.ok(await p.locator('#snake-overlay').isVisible());await fit(p);await home(first);checked('Public snake starts and pauses');

  await go(first,'2048','#board-2048 .tile');assert.equal(await p.locator('#board-2048 .tile').count(),16);for(const move of['left','down','right','up']){await p.locator('[data-move="'+move+'"]').click();await p.waitForTimeout(230)}assert.ok(Number(await p.locator('#moves-2048').innerText())>0);await fit(p);await home(first);checked('Public 2048 accepts real moves');

  await go(first,'memory','.memory-card');await p.locator('.memory-card').first().click();assert.equal(await p.locator('.memory-card[aria-pressed="true"]').count(),1);await fit(p);await home(first);checked('Public memory reveals a card');

  await go(first,'ttt','.ttt-cell');await p.locator('[data-ttt-index="0"]').click();assert.equal(await p.locator('.ttt-cell[data-mark="X"]').count(),1);await p.waitForFunction(()=>document.querySelectorAll('.ttt-cell[data-mark="O"]').length===1,null,{timeout:6000});await fit(p);await home(first);checked('Public tic-tac-toe responds through its AI');

  await go(first,'shop','#shop-click');await p.locator('#shop-click').click();await p.locator('[data-order-type="espresso"]').click();await p.locator('[data-ingredient="coffee"]').click();await p.locator('#shop-click').click();await p.waitForFunction(()=>document.getElementById('cafe-served').textContent.startsWith('1 /'),null,{timeout:8000});await fit(p);await home(first);checked('Public cafe serves an actual espresso recipe');

  await go(first,'mole','#mole-canvas');assert.equal(await p.locator('.mole-hole').count(),9);await fit(p);assert.equal(first.writes.length,0,'Opening games never uploads saved records');checked('Opening all games uploads no local records');
  await p.locator('#mole-name').fill(TEST_NAME);
  const sessionResponse=p.waitForResponse(response=>response.url()===BASE+'/api/mole/session'&&response.request().method()==='POST',{timeout:20000});
  await p.locator('#mole-ranked').click();const sessionReply=await sessionResponse;assert.equal(sessionReply.status(),200);const session=await sessionReply.json();assert.equal(session.targets.length,40);
  const finalResponse=p.waitForResponse(response=>response.url()===BASE+'/api/mole/finish'&&response.status()===200,{timeout:40000});
  const accepted=[];
  for(const target of session.targets.slice(0,2)){
   assert.equal(target.kind,'normal','Operator check uses only the first two normal targets');
   const hole=p.locator('.mole-hole.active[data-hole="'+target.hole+'"]');await hole.waitFor({state:'visible',timeout:6000});
   const hitResponse=p.waitForResponse(response=>response.url()===BASE+'/api/mole/hit'&&response.request().method()==='POST',{timeout:15000});await hole.tap();const hitReply=await hitResponse;assert.equal(hitReply.status(),200);const hit=await hitReply.json();assert.equal(hit.accepted,true);accepted.push(hit.score);
  }
  assert.deepEqual(accepted,[1,2]);checked('Two real touch hits accepted by the public server',{acceptedHits:2});
  const early=await p.request.post(BASE+'/api/mole/finish',{headers:{Origin:BASE,'Content-Type':'application/json'},data:{sessionId:session.sessionId}});assert.equal(early.status(),422);assert.equal((await early.json()).error,'round_not_finished');checked('Public server rejects early finish');
  const final=await(await finalResponse).json();assert.equal(final.score,2);assert.equal(final.hits,2);await p.waitForFunction(()=>document.getElementById('mole-result').textContent.includes('登録しました'),null,{timeout:10000});assert.equal(await p.locator('#mole-score').innerText(),'2');assert.doesNotMatch(await p.locator('#mole-result').innerText(),/null|undefined/);
  output.round={nickname:TEST_NAME,score:final.score,hits:final.hits,rank:final.rank,week:final.week};checked('25-second public round confirms only its two server-verified points');
  for(const request of first.writes){const expected=request.endpoint.endsWith('/session')?['nickname']:request.endpoint.endsWith('/hit')?['hole','sessionId','targetId']:['sessionId'];assert.deepEqual(request.fields,expected)}checked('No request submits client scores or local-record data');

  second=await makePage(browser);await go(second,'mole','#mole-canvas');assert.equal(await second.page.evaluate(()=>localStorage.getItem('asobi:records')),null,'Independent browser has no local score history');
  let shared=false;
  for(let attempt=0;attempt<20;attempt++){
   await second.page.locator('#mole-refresh').click();await second.page.waitForTimeout(2000);
   const rows=second.page.locator('#mole-global-list li').filter({hasText:TEST_NAME});
   for(let index=0;index<await rows.count();index++)if(await rows.nth(index).locator('span').innerText()===TEST_NAME&&Number((await rows.nth(index).locator('strong').innerText()).replace(/[^0-9]/g,''))===2)shared=true;
   if(shared)break;
  }
  assert.ok(shared,'The independent browser should see the named 2-point round after the 30-second public cache refresh');assert.equal(second.writes.length,0);
  await second.page.locator('.mole-global').screenshot({path:path.join(__dirname,'v4-live-ranking.png')});checked('Independent browser sees the same shared nickname and 2-point score');
  assert.deepEqual(desktop.errors,[]);assert.deepEqual(first.errors,[]);assert.deepEqual(second.errors,[]);checked('All production checks complete without browser exceptions');
 }finally{
  if(second)await second.context.close();if(first)await first.context.close();if(desktop)await desktop.context.close();await browser.close();
 }
}
main().catch(error=>{output.checks.push({name:'Production verification',status:'FAIL',message:error.message});console.error(error.stack);process.exitCode=1}).finally(()=>{fs.writeFileSync(path.join(__dirname,'v4-live-results.json'),JSON.stringify(output,null,2)+'\n')});
