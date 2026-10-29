/* Render the shipping sci-fi synth with real OfflineAudioContext; no speakers. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launchBrowser}=require('./v4-helpers.cjs');
async function main(){const browser=await launchBrowser();try{const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({path:path.resolve(__dirname,'../games/galaxy-guard-audio.js')});const result=await page.evaluate(async()=>{
 const NativeOffline=window.OfflineAudioContext,metrics=[];
 for(const key of['select','start','shoot','hit','kill','dive','power','bomb','hurt','wave','clearWave','boss','warning','bossShot','win','lose','test']){
  const offline=new NativeOffline(1,72000,48000);Object.defineProperty(offline,'state',{get:()=> 'running'});window.AudioContext=function(){return offline};const audio=new AsobiGalaxyAudio();audio._muted=false;audio.unlock();audio.play(key);const buffer=await offline.startRendering(),samples=buffer.getChannelData(0);let peak=0,energy=0,last=0,finite=true,signature=2166136261;
  for(let i=0;i<samples.length;i++){const sample=samples[i];finite&&=Number.isFinite(sample);peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;if(Math.abs(sample)>.00001)last=i;signature=Math.imul(signature^Math.round(sample*32767),16777619)>>>0;}
  metrics.push({key,peak,rms:Math.sqrt(energy/samples.length),lastAudibleSeconds:last/48000,finite,signature});audio.cleanup();
 }
 return{metrics};
 });
 for(const m of result.metrics){assert.equal(m.finite,true,m.key+' finitePCM');assert.ok(m.peak>.003&&m.peak<.35,m.key+' restrained non-clipping output');assert.ok(m.lastAudibleSeconds<1.25,m.key+' short tail');assert.ok(m.rms>0);}
 assert.equal(new Set(result.metrics.map(m=>m.signature)).size,17,'Every effect has a distinct waveform');
 const report={checkedAt:new Date().toISOString(),result:'PASS',method:'Real OfflineAudioContext renders unchanged shipping audio graphs. Offline-only state reports permit sound construction; trusted-gesture, mute, pause and close are independently tested in the native browser.',sampleRate:48000,...result};fs.writeFileSync(path.join(__dirname,'galaxy-guard-audio-render-results.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS: 17 distinct shipping effects, finite audible PCM, restrained peaks and short tails.');
 }finally{await browser.close();}}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
