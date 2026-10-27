/* Real HTTP/browser regressions. Always launches an isolated headless browser.
 * Run node scripts/build-single.mjs, then node tests/regression.cjs.
 * Requires Playwright + Chromium, or Playwright + installed Edge on Windows.
 * Optional ASOBI_PLAYWRIGHT_MODULE and ASOBI_BROWSER_PATH override discovery.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),os=require('node:os');
const ROOT=path.resolve(__dirname,'..'),results=[];
const GAMES={snake:['#snake-canvas',1],'2048':['#board-2048 .tile',16],memory:['.memory-card',16],mole:['.mole-hole',9],ttt:['.ttt-cell',9],shop:['#shop-click',1]};
function playwright(){
 for(const candidate of [process.env.ASOBI_PLAYWRIGHT_MODULE,'playwright',path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)){
  try{return require(candidate)}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error}
 }
 throw Error('Playwright is required in the development environment. Set ASOBI_PLAYWRIGHT_MODULE if installed outside this project.');
}
const server=http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 const target=url==='/demo.html'?path.join(ROOT,'..','asobi-yokocho-v3-demo.html'):path.resolve(ROOT,'.'+(url==='/'?'/index.html':url));
 if(url!=='/demo.html'&&!target.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
 fs.readFile(target,(error,data)=>{if(error){res.writeHead(404).end();return}
  res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[path.extname(target)]||'application/octet-stream')+'; charset=utf-8','cache-control':'no-store'}).end(data);
 });
});
function instrumentation({storage,unavailable}={}){
 if(storage){localStorage.clear();for(const[key,value]of Object.entries(storage))localStorage.setItem(key,value)}
 if(unavailable){Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError')};Storage.prototype.setItem=()=>{throw new DOMException('Blocked','QuotaExceededError')}}
 const intervals=new Set(),keys=new Set(),nativeSet=window.setInterval.bind(window),nativeClear=window.clearInterval.bind(window);
 window.setInterval=(fn,delay,...args)=>{const id=nativeSet(fn,delay,...args);intervals.add(id);return id};window.clearInterval=id=>{intervals.delete(id);nativeClear(id)};
 const nativeAdd=document.addEventListener.bind(document),nativeRemove=document.removeEventListener.bind(document);
 document.addEventListener=(name,listener,options)=>{if(name==='keydown')keys.add(listener);return nativeAdd(name,listener,options)};
 document.removeEventListener=(name,listener,options)=>{if(name==='keydown')keys.delete(listener);return nativeRemove(name,listener,options)};
 window.__testResources=()=>({intervals:intervals.size,keyListeners:keys.size});
}
async function makePage(browser,base,options={}){
 const context=await browser.newContext({viewport:{width:options.width||390,height:options.height||844},isMobile:options.mobile!==false,hasTouch:options.mobile!==false,reducedMotion:'reduce'});
 await context.addInitScript(instrumentation,options);const page=await context.newPage(),errors=[],requests=[],external=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{const url=new URL(request.url());if(url.origin!==base&&!['data:','about:'].includes(url.protocol))external.push(request.url());if(/\/games\/[^/]+\.js$/.test(url.pathname))requests.push(url.pathname)});
 const go=async id=>{await page.evaluate(id=>{location.hash='#game/'+id},id);await page.locator(GAMES[id][0]).first().waitFor({state:'visible',timeout:8000})};
 const home=async()=>{await page.evaluate(()=>{location.hash='#home'});await page.locator('#home-screen').waitFor({state:'visible'});await page.waitForTimeout(40)};
 const clean=async()=>{await home();assert.deepEqual(await page.evaluate(()=>__testResources()),{intervals:0,keyListeners:0},'Leaving games releases timers and keys');assert.deepEqual(errors,[],'Browser exceptions');assert.deepEqual(external,[],'No external data transfer while playing')};
 await page.goto(base+(options.demo?'/demo.html':'/'),{waitUntil:'networkidle'});return{context,page,errors,requests,go,home,clean};
}
async function run(name,operation){const started=Date.now();try{await operation();results.push({name,status:'PASS',milliseconds:Date.now()-started});console.log('PASS '+name)}catch(error){results.push({name,status:'FAIL',message:error.message});console.error('FAIL '+name+'\n'+error.stack)}}
async function noOverflow(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow')}
const stored=async(page,key)=>JSON.parse(await page.evaluate(key=>localStorage.getItem(key),key));
async function fieldKey(page,key){return page.locator('#nickname').evaluate((input,key)=>{const event=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});input.dispatchEvent(event);return event.defaultPrevented},key)}

async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const launch={headless:true};if(process.env.ASOBI_BROWSER_PATH)launch.executablePath=process.env.ASOBI_BROWSER_PATH;
 else if(process.platform==='win32'&&fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'))launch.channel='msedge';
 const browser=await playwright().chromium.launch(launch);
 try{
  for(const[name,width,height,mobile]of[['mobile',390,844,true],['desktop',1365,850,false],['small-phone',320,740,true]])await run('Real modular loading, navigation and layout: '+name,async()=>{
   const t=await makePage(browser,base,{width,height,mobile});try{const p=t.page;
    assert.equal(await p.locator('#recommended-grid .recommend-card').count(),3);assert.equal(await p.locator('#game-grid .game-card').count(),6);assert.equal(await p.locator('#genre-grid .genre-card').count(),6);assert.equal(await p.locator('.hero').count(),0);
    assert.deepEqual(t.requests,[],'Home loads no game scripts');assert.ok(await p.locator('#recommended-grid [data-open]').first().isVisible());await noOverflow(p);
    await p.locator('#game-grid [data-favorite="snake"]').click();await p.reload({waitUntil:'networkidle'});assert.equal(await p.locator('#game-grid [data-favorite="snake"]').getAttribute('aria-pressed'),'true','Favorite survives reload');
    await p.locator('#favorites-toggle').click();assert.equal(await p.locator('#game-grid .game-card').count(),1);await p.locator('#favorites-toggle').click();
    await p.locator('#genre-grid [data-category="パズル"]').click();assert.equal(await p.locator('#game-grid .game-card').count(),1);await p.locator('#category-tabs [data-category="すべて"]').click();
    await p.locator('#game-search').fill('2048');assert.equal(await p.locator('#game-grid .game-card').count(),1);await p.locator('#game-search').fill('');
    for(const[id,[selector,count]]of Object.entries(GAMES)){await t.go(id);assert.equal(await p.locator(selector).count(),count,id);await noOverflow(p);assert.ok(t.requests.includes('/games/'+id+'.js'));await t.clean()}
    assert.equal(t.requests.length,6,'Each selected module downloads once');assert.match(await p.locator('#ranking-note').innerText(),/世界ランキングではありません/);await p.locator('[data-rank-tab="personal"]').click();assert.match(await p.locator('#ranking-note').innerText(),/この端末/);
    await p.screenshot({path:path.join(__dirname,'preview-'+name+'.png'),fullPage:true});
   }finally{await t.context.close()}
  });
  await run('2048 merges, editing keys and local best',async()=>{
   const t=await makePage(browser,base);try{const p=t.page;await t.go('2048');await p.evaluate(()=>{window.__randomBackup=Math.random;Math.random=()=>0});await p.locator('#reset-2048').click();
    assert.deepEqual(await p.locator('#board-2048 .tile').allTextContents(),['2','2','','','','','','','','','','','','','','']);await p.locator('[data-move="left"]').click();assert.equal(await p.locator('#score-2048').innerText(),'4');assert.equal(await p.locator('#board-2048 .v4').count(),1);assert.equal((await stored(p,'asobi:records'))['2048'],4);
    const before=await p.locator('#board-2048').innerText();assert.equal(await fieldKey(p,'ArrowRight'),false,'Arrow key edits nickname normally');assert.equal(await p.locator('#board-2048').innerText(),before,'Text editing does not move tiles');
    await p.locator('#nickname').fill('<img src=x>');await p.locator('#nickname-form button').click();await p.locator('[data-move="left"]').click();assert.equal(await p.locator('#game-leaderboard img').count(),0,'Nickname is text');
    await p.evaluate(()=>{Math.random=window.__randomBackup;saveRecord('2048',1)});assert.ok((await stored(p,'asobi:records'))['2048']>=4);await t.clean();
   }finally{await t.context.close()}
  });
  await run('Snake food, collision, reset and keyboard cleanup',async()=>{
   const t=await makePage(browser,base);try{const p=t.page;await t.go('snake');await p.evaluate(()=>{window.__randomBackup=Math.random;Math.random=()=>187/397});await p.locator('#snake-retry').click();assert.equal(await fieldKey(p,' '),false);assert.equal((await p.evaluate(()=>__testResources())).intervals,0,'Space in nickname cannot start game');
    await p.locator('#snake-start').click();await p.waitForFunction(()=>document.getElementById('snake-score').textContent==='10');assert.equal(await p.locator('#snake-length').innerText(),'4');await p.waitForFunction(()=>document.getElementById('snake-status').textContent.includes('ゲームオーバー'),null,{timeout:4000});assert.equal((await p.evaluate(()=>__testResources())).intervals,0);assert.equal((await stored(p,'asobi:records')).snake,10);
    await p.locator('#snake-retry').click();assert.equal(await p.locator('#snake-score').innerText(),'0');await p.evaluate(()=>{Math.random=window.__randomBackup});await t.clean();
   }finally{await t.context.close()}
  });
  await run('Memory completion and state preserved through five languages',async()=>{
   const t=await makePage(browser,base);try{const p=t.page;await t.go('memory');await p.locator('.memory-card').first().click();const firstIcon=await p.locator('.memory-card').first().innerText();
    for(const lang of['en','ko','zh','es','ja']){await p.selectOption('#language-select',lang);assert.equal(await p.locator('.memory-card.open').count(),1,'Language change keeps face-up card');assert.equal(await p.locator('.memory-card').first().innerText(),firstIcon);assert.equal(await p.locator('html').getAttribute('lang'),lang==='zh'?'zh-CN':lang);assert.equal((await stored(p,'asobi:plays')).memory,1)}
    await p.locator('#memory-reset').click();const known=new Map(),matched=new Set(),indices=[...Array(16).keys()];
    const pick=async i=>{await p.locator('[data-memory-index="'+i+'"]').click();const icon=await p.locator('[data-memory-index="'+i+'"]').innerText();known.set(i,icon);return icon};
    while(matched.size<16){
     let first=indices.find(i=>!matched.has(i)&&!known.has(i));assert.notEqual(first,undefined);const icon=await pick(first);
     let second=[...known].find(([i,v])=>i!==first&&!matched.has(i)&&v===icon)?.[0];if(second===undefined)second=indices.find(i=>i!==first&&!matched.has(i)&&!known.has(i));assert.notEqual(second,undefined);
     const next=await pick(second);if(icon===next){matched.add(first);matched.add(second)}else await p.waitForTimeout(860);
     for(const[i,v]of known){if(matched.has(i))continue;const j=[...known].find(([j,w])=>j!==i&&!matched.has(j)&&w===v)?.[0];if(j===undefined)continue;await pick(i);await pick(j);matched.add(i);matched.add(j)}
    }
    assert.equal(await p.locator('#memory-pairs').innerText(),'8/8');const moves=Number(await p.locator('#memory-moves').innerText());assert.equal((await stored(p,'asobi:records')).memory,moves);await p.evaluate(moves=>saveRecord('memory',moves+4),moves);assert.equal((await stored(p,'asobi:records')).memory,moves,'Memory lower moves is better');await t.clean();
   }finally{await t.context.close()}
  });
  await run('All six games preserve progress and resources through five languages',async()=>{
   const t=await makePage(browser,base);try{const p=t.page;
    const progress={snake:'#snake-score','2048':'#board-2048',memory:'.memory-card.open',mole:'#mole-score',ttt:'#ttt-grid',shop:'#shop-coins'};
    for(const id of Object.keys(GAMES)){
     await p.selectOption('#language-select','ja');await t.go(id);
     if(id==='snake')await p.locator('#snake-start').click();
     if(id==='2048'){await p.evaluate(()=>{window.__randomBackup=Math.random;Math.random=()=>0});await p.locator('#reset-2048').click();await p.locator('[data-move="left"]').click();await p.evaluate(()=>{Math.random=window.__randomBackup})}
     if(id==='memory')await p.locator('.memory-card').first().click();
     if(id==='mole'){await p.locator('#mole-start').click();await p.locator('.mole-hole.active').click()}
     if(id==='ttt'){await p.locator('.ttt-cell').first().click();await p.waitForFunction(()=>[...document.querySelectorAll('.ttt-cell')].some(c=>c.textContent==='○'))}
     if(id==='shop')await p.locator('#shop-click').click({clickCount:3,delay:5});
     await p.locator('#game-pane > :first-child').evaluate(el=>{el.dataset.testIdentity='retained'});
     const before=await p.locator(progress[id]).allTextContents(),resources=await p.evaluate(()=>__testResources());
     await p.locator('#nickname').fill('UNSAVED');
     for(const lang of['en','ko','zh','es','ja']){
      await p.selectOption('#language-select',lang);
      assert.equal(await p.locator('#game-pane > :first-child').getAttribute('data-test-identity'),'retained',id+' must keep live game DOM');
      assert.deepEqual(await p.locator(progress[id]).allTextContents(),before,id+' progress persists in '+lang);
      assert.deepEqual(await p.evaluate(()=>__testResources()),resources,id+' resources persist');
      assert.equal(await p.locator('#nickname').inputValue(),'UNSAVED','Unsaved nickname editing survives translation');
      assert.equal((await stored(p,'asobi:plays'))[id],1,'Language is not another play');
      assert.equal(await p.locator('html').getAttribute('lang'),lang==='zh'?'zh-CN':lang);
      assert.doesNotMatch(await p.locator('#game-title').innerText(),/undefined|null/);
     }
     await t.clean();
    }
   }finally{await t.context.close()}
  });
  await run('Mole hits score once and timers are released',async()=>{
   const t=await makePage(browser,base);try{const p=t.page;await t.go('mole');await p.locator('#mole-start').click();const hole=await p.locator('.mole-hole.active').getAttribute('data-hole');await p.locator('[data-hole="'+hole+'"]').click();assert.equal(await p.locator('#mole-score').innerText(),'1');await p.locator('[data-hole="'+hole+'"]').click();assert.equal(await p.locator('#mole-score').innerText(),'1');assert.equal((await p.evaluate(()=>__testResources())).intervals,2);await t.clean()}finally{await t.context.close()}
  });
  await run('Tic-tac-toe AI response and safe pending-turn navigation',async()=>{
   const t=await makePage(browser,base);try{const p=t.page;await t.go('ttt');await p.locator('.ttt-cell').first().click();assert.equal(await p.locator('.ttt-cell').first().innerText(),'×');await p.waitForFunction(()=>[...document.querySelectorAll('.ttt-cell')].some(c=>c.textContent==='○'));assert.equal((await p.locator('.ttt-cell').allTextContents()).filter(x=>x==='○').length,1);await p.locator('.ttt-cell[aria-disabled="false"]').first().click();await t.home();await p.waitForTimeout(450);await t.clean()}finally{await t.context.close()}
  });
  await run('Cafe upgrades, persistence and cancel-reset',async()=>{
   const t=await makePage(browser,base);try{const p=t.page;await t.go('shop');await p.locator('#shop-click').click({clickCount:15,delay:5});assert.match(await p.locator('#shop-coins').innerText(),/15/);await p.locator('[data-upgrade="0"]').click();await p.locator('#shop-click').click();const state=await stored(p,'asobi:shop');assert.equal(state.coins,2);assert.equal(state.total,17);assert.equal(state.levels[0],1);
    p.once('dialog',dialog=>dialog.dismiss());await p.locator('#shop-reset').click();assert.equal((await stored(p,'asobi:shop')).total,17);await t.home();await t.go('shop');assert.match(await p.locator('#shop-coins').innerText(),/2/);await t.clean();
   }finally{await t.context.close()}
  });
  await run('Corrupt storage recovers across app and games',async()=>{
   const cases=[{'asobi:records':'{bad-json','asobi:favorites':'null','asobi:plays':'[]','asobi:leaderboard':'null','asobi:lang':'"toString"','asobi:nickname':'42','asobi:shop':'null','asobi:ttt-wins':'"bad"'},
    {'asobi:records':'null','asobi:favorites':'{}','asobi:plays':'null','asobi:leaderboard':'{"snake":[null,{"name":{},"score":"NaN"}]}','asobi:lang':'{}','asobi:shop':'{"coins":"bad","total":-20,"levels":[-1,"2",null]}'},
    {'asobi:records':'{"2048":-5,"snake":"Infinity"}','asobi:favorites':'[null,{},"snake","missing"]','asobi:plays':'{"snake":"bad"}','asobi:leaderboard':'{"2048":[{"name":"bad","score":-5}]}'}];
   for(const storage of cases){const t=await makePage(browser,base,{storage});try{assert.equal(await t.page.locator('#game-grid .game-card').count(),6);await t.go('shop');await t.page.locator('#shop-click').click();assert.doesNotMatch(await t.page.locator('#shop-coins').innerText(),/NaN|Infinity|-/);await t.go('snake');await t.go('2048');await t.go('ttt');assert.doesNotMatch(await t.page.locator('#ttt-wins').innerText(),/NaN|bad/);await t.clean()}finally{await t.context.close()}}
  });
  await run('Blocked storage still permits play and favorites',async()=>{
   const t=await makePage(browser,base,{unavailable:true});try{await t.page.locator('#game-grid [data-favorite="snake"]').click();assert.equal(await t.page.locator('#game-grid [data-favorite="snake"]').getAttribute('aria-pressed'),'true');await t.go('shop');await t.page.locator('#shop-click').click();assert.match(await t.page.locator('#shop-coins').innerText(),/1/);await t.clean()}finally{await t.context.close()}
  });
  await run('Malformed and unknown routes recover',async()=>{
   const t=await makePage(browser,base);try{for(const hash of['#game/%E0%A4%A','#game/%','#game/../../app','#game/missing','#%zz']){await t.page.evaluate(hash=>{location.hash=hash},hash);await t.page.locator('#home-screen').waitFor({state:'visible'});await t.page.waitForTimeout(50)}await t.clean()}finally{await t.context.close()}
  });
  await run('Download failure retry and late module route race',async()=>{
   const t=await makePage(browser,base);try{const p=t.page;let first=true;await p.route('**/games/mole.js',async route=>{if(first){first=false;await route.abort()}else await route.continue()});await p.evaluate(()=>{location.hash='#game/mole'});await p.locator('#game-pane [role="alert"]').waitFor({state:'visible'});await t.home();await t.go('mole');await t.home();await p.route('**/games/snake.js',async route=>{await new Promise(resolve=>setTimeout(resolve,250));await route.continue()});await p.evaluate(()=>{location.hash='#game/snake'});await p.waitForTimeout(40);await t.home();await p.waitForTimeout(400);assert.ok(await p.locator('#game-screen').isHidden());await t.clean()}finally{await t.context.close()}
  });
  await run('Standalone demo plays all six games without module downloads',async()=>{
   assert.ok(fs.existsSync(path.join(ROOT,'..','asobi-yokocho-v3-demo.html')),'Build standalone first');const t=await makePage(browser,base,{demo:true});try{for(const[id,[selector,count]]of Object.entries(GAMES)){await t.go(id);assert.equal(await t.page.locator(selector).count(),count);await t.clean()}assert.deepEqual(t.requests,[])}finally{await t.context.close()}
  });
 }finally{await browser.close()}
 const failed=results.filter(result=>result.status==='FAIL');fs.writeFileSync(path.join(__dirname,'last-results.json'),JSON.stringify({browser:'isolated headless Chromium/Edge',generatedAt:new Date().toISOString(),results},null,2)+'\n');console.log((results.length-failed.length)+'/'+results.length+' regression groups passed');if(failed.length)process.exitCode=1;
}
main().catch(error=>{console.error(error.stack);process.exitCode=1}).finally(()=>server.close());
