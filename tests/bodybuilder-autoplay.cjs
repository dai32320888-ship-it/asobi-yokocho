/* STRICT autoplay reproduction. Uses only a NEW isolated browser.
 * All observation is raw CDP Runtime.evaluate(userGesture:false), not
 * Playwright evaluate/locator helpers that mark evaluations as user gestures.
 * node tests/bodybuilder-autoplay.cjs [--baseline] [--observe]
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const{launchBrowser}=require('./v4-helpers.cjs');
const{installAudioProbe}=require('./bodybuilder-audio-probe.cjs');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const baseline=process.argv.includes('--baseline'),observe=process.argv.includes('--observe'),publicCheck=process.argv.includes('--public');
const report={baseline,public:publicCheck,checkedAt:new Date().toISOString(),policy:['document-user-activation-required','AutoplayIgnoreWebAudio disabled','MEI bypass disabled'],cases:[]};
async function evaluate(cdp,expression,contextId){const reply=await cdp.send('Runtime.evaluate',{expression,userGesture:false,awaitPromise:false,returnByValue:true,...(contextId?{contextId}:{})});if(reply.exceptionDetails)throw Error(reply.exceptionDetails.text+': '+reply.exceptionDetails.exception?.description);return reply.result.value}
async function until(cdp,expression,contextId,timeout=15000){const start=Date.now();while(Date.now()-start<timeout){const result=await evaluate(cdp,expression,contextId);if(result)return result;await sleep(30)}throw Error('Timed out waiting for '+expression)}
async function click(cdp,selector,contextId,kind='touch'){
 const box=await evaluate(cdp,`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`,contextId);
 if(kind==='keyboard'){await evaluate(cdp,`document.querySelector(${JSON.stringify(selector)}).focus()`,contextId);await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});return null}
 if(kind==='mouse'){await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:box.x,y:box.y,button:'left',clickCount:1});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:box.x,y:box.y,button:'left',clickCount:1});return null}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x,y:box.y,radiusX:1,radiusY:1}]});await sleep(70);
 const down=await evaluate(cdp,'({activation:navigator.userActivation.isActive,probe:__gymAudioProbe.snapshot()})',contextId);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return down;
}
async function main(){
 if(publicCheck&&!process.argv.includes('--confirm-deployed'))throw Error('Wait for production deployment confirmation, then use --confirm-deployed.');
 const{startIntegrationServer}=await import('./integration-server.mjs'),upstream=await startIntegrationServer({port:0}),saved=baseline?require('./bodybuilder-autoplay-baseline.cjs'):null;
 const proxy=http.createServer(async(req,res)=>{if(req.url.startsWith('/frame')){res.writeHead(200,{'content-type':'text/html'}).end('<!doctype html><style>html,body{margin:0}iframe{border:0;width:100vw;height:100vh;display:block}</style><iframe name="gym" src="'+base+'/#game/bodybuilder" allow="autoplay" sandbox="allow-scripts allow-same-origin"></iframe>');return}const file=req.url.split('?')[0];if(saved&&['/games/bodybuilder-audio.js','/games/bodybuilder.js'].includes(file)){res.writeHead(200,{'content-type':'text/javascript'}).end(file.endsWith('-audio.js')?saved.audio:saved.game);return}try{const response=await fetch(upstream.url+req.url);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch{res.writeHead(500).end()}});
 let base;await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+proxy.address().port;
 const parent=http.createServer((req,res)=>res.writeHead(200,{'content-type':'text/html'}).end('<!doctype html><style>html,body{margin:0}iframe{border:0;width:100vw;height:100vh;display:block}</style><iframe name="gym" src="'+base+'/#game/bodybuilder" allow="autoplay" sandbox="allow-scripts allow-same-origin"></iframe>'));await new Promise(resolve=>parent.listen(0,'127.0.0.1',resolve));const parentUrl='http://127.0.0.1:'+parent.address().port;
 const browser=await launchBrowser({args:['--autoplay-policy=document-user-activation-required','--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies,AutoplayIgnoreWebAudio']});
 try{
  for(const mode of(publicCheck?['touch-test']:['touch','keyboard','mouse','iframe-touch'])){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await context.addInitScript(installAudioProbe,{meter:true});const page=await context.newPage(),cdp=await context.newCDPSession(page);let contextId;
   const created=[];cdp.on('Runtime.executionContextCreated',event=>created.push(event.context));await cdp.send('Runtime.enable');await cdp.send('Page.enable');
   try{
    // localhost parent vs 127.0.0.1 child makes this an actual cross-origin
    // embed. No user IAB browser or profile is inspected or attached.
    await cdp.send('Page.navigate',{url:publicCheck?'https://asobi-yokocho.pages.dev/#game/bodybuilder':mode.startsWith('iframe')?parentUrl:base+'/#game/bodybuilder'});
    if(mode.startsWith('iframe')){await until(cdp,'Boolean(document.querySelector("iframe"))');await sleep(1000);const tree=await cdp.send('Page.getFrameTree');const child=tree.frameTree.childFrames?.find(item=>item.frame.url.startsWith(base));assert.ok(child,'Embedded frame exists: '+JSON.stringify(tree));contextId=created.filter(item=>item.auxData?.frameId===child.frame.id&&item.auxData?.isDefault).at(-1)?.id;assert.ok(contextId,'Embedded main-world context exists')}
    await until(cdp,'Boolean(document.getElementById("bb-rest")&&window.__gymAudioProbe)',contextId);
    const fresh=await evaluate(cdp,'({active:navigator.userActivation.isActive,ever:navigator.userActivation.hasBeenActive,muted:__gymAudioProbe.lastSound().muted,contexts:__gymAudioProbe.snapshot().contexts.length})',contextId);assert.equal(fresh.ever,false,'Observation has not granted user activation');
    await evaluate(cdp,'(()=>{window.__autoplayControl=new AudioContext();__autoplayControl.resume().then(()=>window.__controlResumed=true);return true})()',contextId);await sleep(180);
    const negative=await evaluate(cdp,'({state:__autoplayControl.state,time:__autoplayControl.currentTime,resolved:Boolean(window.__controlResumed)})',contextId);
    await evaluate(cdp,'__autoplayControl.close();true',contextId);
    const down=await click(cdp,mode==='touch-test'?'#bb-sound-test':'#bb-rest',contextId,mode==='iframe-touch'||mode==='touch-test'?'touch':mode);await sleep(300);
    const first=await evaluate(cdp,'__gymAudioProbe.snapshot()',contextId);await sleep(500);const second=await evaluate(cdp,'__gymAudioProbe.snapshot()',contextId),audio=second.contexts.at(-1),previous=first.contexts.at(-1);
    const advanced=audio&&audio.currentTime-previous.currentTime>.2,pcm=audio?.pcmPeak>0.0001&&audio?.pcmMaxRms>0.00001;
    const ui=await evaluate(cdp,'({sound:document.getElementById("bb-sound")?.dataset.soundState,pressed:document.getElementById("bb-sound")?.getAttribute("aria-pressed"),testStatus:document.getElementById("bb-audio-status")?.dataset.status,message:document.getElementById("bb-audio-status")?.textContent})',contextId);
    const item={mode,fresh,negative,beforeTouchEnd:down,after:first,final:second,ui,clockAdvanced:Boolean(advanced),pcmNonzero:Boolean(pcm)};
    report.cases.push(item);console.log(mode+': '+JSON.stringify({fresh,negative,clockAdvanced:advanced,pcmNonzero:pcm,state:audio?.state,time:audio?.currentTime,peak:audio?.pcmPeak,rms:audio?.pcmMaxRms}));
    assert.equal(negative.state,'suspended','Strict policy negative control must block autoplay');assert.equal(negative.time,0);if(!observe){assert.ok(advanced,'Audio clock advances after trusted '+mode);assert.ok(pcm,'Actual output PCM exists after trusted '+mode);if(publicCheck){assert.equal(ui.sound,'on');assert.equal(ui.pressed,'true');assert.equal(ui.testStatus,'ready')}}
   }catch(error){report.cases.push({mode,error:error.message});console.error('FAIL '+mode+': '+error.message);if(!observe)process.exitCode=1}finally{await context.close()}
  }
 }finally{await browser.close();await new Promise(resolve=>proxy.close(resolve));await new Promise(resolve=>parent.close(resolve));await upstream.close()}
 fs.writeFileSync(path.join(__dirname,publicCheck?'bodybuilder-autoplay-live-results.json':baseline?'bodybuilder-autoplay-before-results.json':'bodybuilder-autoplay-results.json'),JSON.stringify(report,null,2)+'\n');
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
