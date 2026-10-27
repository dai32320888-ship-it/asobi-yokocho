/* Records real local gameplay, without changing scores, timers or game DOM.
 * Run node tests/record-gameplay.cjs. Same Playwright/Edge setup as regression.cjs.
 */
'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
let playwright;
for(const candidate of[process.env.ASOBI_PLAYWRIGHT_MODULE,'playwright',path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)){
 try{playwright=require(candidate);break}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error}
}
if(!playwright)throw Error('Playwright is required.');
const server=http.createServer((req,res)=>{
 let url;try{url=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 const file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}res.writeHead(200,{'content-type':({'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(file)]||'application/octet-stream')+'; charset=utf-8'}).end(data)});
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const launch={headless:true};if(process.env.ASOBI_BROWSER_PATH)launch.executablePath=process.env.ASOBI_BROWSER_PATH;else if(process.platform==='win32')launch.channel='msedge';
 const browser=await playwright.chromium.launch(launch);
 const context=await browser.newContext({viewport:{width:390,height:690},isMobile:true,hasTouch:true,reducedMotion:'reduce',recordVideo:{dir:path.join(__dirname,'.recording'),size:{width:390,height:690}}});
 const page=await context.newPage(),video=page.video();
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/#game/mole',{waitUntil:'domcontentloaded'});
  await page.locator('#mole-start').waitFor({state:'visible'});
  await page.locator('#game-pane').scrollIntoViewIfNeeded();
  await page.locator('#mole-start').tap();
  const started=Date.now();
  while(Date.now()-started<11000){
   const active=page.locator('.mole-hole.active');
   if(await active.count()){
    const box=await active.boundingBox();
    if(box){await page.waitForTimeout(150);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
   }
   await page.waitForTimeout(180);
  }
  console.log('Recorded real score:',await page.locator('#mole-score').innerText());
  await page.locator('.mole-hole.active').waitFor({state:'visible',timeout:1000});
  await page.screenshot({path:path.join(__dirname,'launch-gameplay-lastframe.png')});
 }finally{await context.close()}
 await video.saveAs(path.join(__dirname,'launch-gameplay.webm'));await video.delete();await browser.close();
 console.log('Gameplay recording:',path.join(__dirname,'launch-gameplay.webm'));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1}).finally(()=>server.close());
