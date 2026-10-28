'use strict';
const path=require('node:path'),os=require('node:os'),fs=require('node:fs');
function playwright(){for(const candidate of[process.env.ASOBI_PLAYWRIGHT_MODULE,'playwright',path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)){try{return require(candidate)}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error}}throw Error('Playwright is required')}
async function launchBrowser(overrides={}){const options={headless:true};if(process.env.ASOBI_BROWSER_PATH)options.executablePath=process.env.ASOBI_BROWSER_PATH;else if(process.platform==='win32')options.channel='msedge';return playwright().chromium.launch({...options,...overrides})}
function instrument({storage}={}){
 // Seed once per tab. A reload must read the game's newly persisted progress,
 // rather than silently replace it with the initial test fixture again.
 if(storage&&!sessionStorage.getItem('__asobi_v4_fixture_once__')){for(const[key,value]of Object.entries(storage))localStorage.setItem(key,JSON.stringify(value));sessionStorage.setItem('__asobi_v4_fixture_once__','1')}
 const intervals=new Set(),frames=new Set(),listeners=new Set(),fetches=new Set();
 const si=setInterval.bind(window),ci=clearInterval.bind(window),rf=requestAnimationFrame.bind(window),cf=cancelAnimationFrame.bind(window),fetchNative=fetch.bind(window);
 window.setInterval=(fn,delay,...args)=>{const id=si(fn,delay,...args);intervals.add(id);return id};window.clearInterval=id=>{intervals.delete(id);ci(id)};
 window.requestAnimationFrame=fn=>{const id=rf(time=>{frames.delete(id);fn(time)});frames.add(id);return id};window.cancelAnimationFrame=id=>{frames.delete(id);cf(id)};
 const add=document.addEventListener.bind(document),remove=document.removeEventListener.bind(document);
 document.addEventListener=(type,fn,options)=>{if(['keydown','visibilitychange'].includes(type)){listeners.add(fn);options?.signal?.addEventListener('abort',()=>listeners.delete(fn),{once:true})}return add(type,fn,options)};
 document.removeEventListener=(type,fn,options)=>{listeners.delete(fn);return remove(type,fn,options)};
 window.fetch=async(...args)=>{const token={};fetches.add(token);try{return await fetchNative(...args)}finally{fetches.delete(token)}};
 window.__v4Resources=()=>({intervals:intervals.size,frames:frames.size,listeners:listeners.size,fetches:fetches.size});
}
const SELECTORS={snake:'#snake-canvas','2048':'#board-2048 .tile',memory:'.memory-card',mole:'#mole-canvas',ttt:'.ttt-cell',shop:'#shop-click',bodybuilder:'#bb-canvas','mouse-evolution':'#me-canvas'};
async function createPage(browser,url,options={}){
 const context=await browser.newContext({viewport:{width:options.width||390,height:options.height||844},isMobile:options.mobile!==false,hasTouch:options.mobile!==false,reducedMotion:options.motion||'reduce',...(options.recordVideo?{recordVideo:options.recordVideo}:{})});
 await context.addInitScript(instrument,{storage:options.storage});for(const init of options.initScripts||[])await context.addInitScript(init.fn,init.arg);const page=await context.newPage(),errors=[],scripts=[],posts=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/\/games\/[^/]+\.js$/.test(new URL(request.url()).pathname))scripts.push(request.url());if(request.method()==='POST'&&request.url().includes('/api/mole/'))posts.push(new URL(request.url()).pathname)});
 await page.goto(url,{waitUntil:'networkidle'});
 const go=async id=>{await page.evaluate(id=>{location.hash='#game/'+id},id);await page.locator(SELECTORS[id]).first().waitFor({state:'visible',timeout:10000})};
 const home=async()=>{await page.evaluate(()=>{location.hash='#home'});await page.locator('#home-screen').waitFor({state:'visible'});await page.waitForTimeout(120)};
 return{context,page,errors,scripts,posts,go,home};
}
module.exports={launchBrowser,createPage,SELECTORS};
