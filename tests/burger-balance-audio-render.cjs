/* Real native OfflineAudioContext renders shipping kitchen/footstep graphs; no speakers. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launchBrowser}=require('./v4-helpers.cjs');
async function main(){const browser=await launchBrowser();try{const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({path:path.resolve(__dirname,'../games/burger-balance-audio.js')});const result=await page.evaluate(async()=>{
 const NativeOffline=window.OfflineAudioContext,metrics=[];
 for(const key of AsobiBurgerAudio.soundKeys){
  const offline=new NativeOffline(1,72000,48000);Object.defineProperty(offline,'state',{get:()=> 'running'});window.AudioContext=function(){return offline};const audio=new AsobiBurgerAudio();audio._muted=false;audio.unlock();for(const invalid of ['__proto__','constructor','toString',null,{}])if(audio.play(invalid)!==false)throw Error('Invalid cue accepted');audio.play(key);const buffer=await offline.startRendering(),samples=buffer.getChannelData(0);let peak=0,energy=0,last=0,finite=true,signature=2166136261;
  for(let i=0;i<samples.length;i++){const sample=samples[i];finite&&=Number.isFinite(sample);peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;if(Math.abs(sample)>.00001)last=i;signature=Math.imul(signature^Math.round(sample*32767),16777619)>>>0;}
  metrics.push({key,peak,rms:Math.sqrt(energy/samples.length),lastAudibleSeconds:last/48000,finite,signature});audio.cleanup();
 }
 const footsteps=[];
 for(const careful of [false,true]){
  const offline=new NativeOffline(1,48000,48000);Object.defineProperty(offline,'state',{get:()=> 'running'});window.AudioContext=function(){return offline};const audio=new AsobiBurgerAudio();audio._muted=false;audio.unlock();audio._clockReady=true;const first=audio.setWalk(3,careful,true),second=audio.setWalk(3,careful,true);const buffer=await offline.startRendering(),samples=buffer.getChannelData(0);let peak=0,energy=0,signature=2166136261;
  for(const sample of samples){if(!Number.isFinite(sample))throw Error('Nonfinite footstepPCM');peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;signature=Math.imul(signature^Math.round(sample*32767),16777619)>>>0;}
  audio.stopWalk();footsteps.push({careful,first,second,walkingAfterStop:audio.walking,peak,rms:Math.sqrt(energy/samples.length),signature});audio.cleanup();
 }

 return {metrics,footsteps};
 });
 for(const m of result.metrics){assert.equal(m.finite,true,m.key+' finitePCM');assert.ok(m.peak>.003&&m.peak<.30,m.key+' audible non-clipping output');assert.ok(m.lastAudibleSeconds<1,m.key+' short tail');assert.ok(m.rms>0);}
 assert.equal(new Set(result.metrics.map(m=>m.signature)).size,result.metrics.length,'Distinct original effect waveforms');
 assert.equal(result.metrics.length,18);
 for(const foot of result.footsteps){assert.equal(foot.first,true);assert.equal(foot.second,false,'Repeated frames do not stack footsteps');assert.equal(foot.walkingAfterStop,false);assert.ok(foot.peak>.003&&foot.peak<.3);assert.ok(foot.rms>0);}
 assert.equal(new Set(result.footsteps.map(m=>m.signature)).size,2,'Careful steps are genuinely softer/distinct');assert.ok(result.footsteps[0].rms>result.footsteps[1].rms);

 const report={checkedAt:new Date().toISOString(),result:'PASS',method:'Native OfflineAudioContext renders unchanged shipping audio. Offline-only state reports permit sound construction; gesture/mute/pause/close are separately checked in a native browser.',sampleRate:48000,...result};fs.writeFileSync(path.join(__dirname,'burger-balance-audio-render-results.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS: 18 distinct effects and2paced footsteps; finite audible PCM, restrained peaks and short tails.');
 }finally{await browser.close();}}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
