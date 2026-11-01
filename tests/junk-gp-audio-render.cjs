/* Real native OfflineAudioContext renders shipping garage/motor graphs; no speakers. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launchBrowser}=require('./v4-helpers.cjs');
async function main(){const browser=await launchBrowser();try{const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({path:path.resolve(__dirname,'../games/junk-gp-audio.js')});const result=await page.evaluate(async()=>{
 const NativeOffline=window.OfflineAudioContext,metrics=[];
 for(const key of AsobiJunkAudio.soundKeys){
  const offline=new NativeOffline(1,72000,48000);Object.defineProperty(offline,'state',{get:()=> 'running'});window.AudioContext=function(){return offline};const audio=new AsobiJunkAudio();audio._muted=false;audio.unlock();audio.play(key);const buffer=await offline.startRendering(),samples=buffer.getChannelData(0);let peak=0,energy=0,last=0,finite=true,signature=2166136261;
  for(let i=0;i<samples.length;i++){const sample=samples[i];finite&&=Number.isFinite(sample);peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;if(Math.abs(sample)>.00001)last=i;signature=Math.imul(signature^Math.round(sample*32767),16777619)>>>0;}
  metrics.push({key,peak,rms:Math.sqrt(energy/samples.length),lastAudibleSeconds:last/48000,finite,signature});audio.cleanup();
 }
 const engines=[];
 for(const [speed,gas,grounded]of[[0,0,true],[200,1,true],[200,1,false]]){
  const offline=new NativeOffline(1,48000,48000);Object.defineProperty(offline,'state',{get:()=> 'running'});window.AudioContext=function(){return offline};const audio=new AsobiJunkAudio();audio._muted=false;audio.unlock();const started=audio.setEngine(speed,gas,grounded),voices=audio.activeVoiceCount,buffer=await offline.startRendering(),samples=buffer.getChannelData(0);let peak=0,energy=0,finite=true,signature=2166136261;
  for(const sample of samples){finite&&=Number.isFinite(sample);peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;signature=Math.imul(signature^Math.round(sample*32767),16777619)>>>0;}
  audio.stopEngine();engines.push({speed,gas,grounded,started,voices,peak,rms:Math.sqrt(energy/samples.length),finite,signature,stopped:!audio.engineActive});audio.cleanup();
 }
 return {metrics,engines};
 });
 for(const m of result.metrics){assert.equal(m.finite,true,m.key+' finitePCM');assert.ok(m.peak>.003&&m.peak<.30,m.key+' audible non-clipping output');assert.ok(m.lastAudibleSeconds<1,m.key+' short tail');assert.ok(m.rms>0);}
 assert.equal(new Set(result.metrics.map(m=>m.signature)).size,16,'Distinct original effect waveforms');
 for(const e of result.engines){assert.equal(e.finite,true);assert.ok(e.started&&e.voices>=2&&e.voices<=3&&e.stopped,'motor creates and releases both oscillators');assert.ok(e.peak>.0005&&e.peak<.12,'motor finite audible non-clipping output');assert.ok(e.rms>.0001);}
 assert.equal(new Set(result.engines.map(e=>e.signature)).size,3,'Idle, loaded and airborne engine sound respond to actual driving input');
 const report={checkedAt:new Date().toISOString(),result:'PASS',method:'Native OfflineAudioContext renders unchanged shipping audio. Offline-only state reports permit sound construction; gesture/mute/pause/close are separately checked in a native browser.',sampleRate:48000,...result};fs.writeFileSync(path.join(__dirname,'junk-gp-audio-render-results.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS: 16 distinct effects and 3 responsive motor renders; finite audible PCM, restrained peaks and short tails.');
 }finally{await browser.close();}}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
