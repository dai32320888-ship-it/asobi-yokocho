/* Render the shipping sound engine with real Web Audio, without speakers. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{launchBrowser}=require('./v4-helpers.cjs');
async function main(){
 const browser=await launchBrowser(),context=await browser.newContext(),page=await context.newPage();
 try{
  await page.goto('about:blank');await page.addScriptTag({path:path.resolve(__dirname,'../games/bodybuilder-audio.js')});
  const metrics=await page.evaluate(async()=>{
   const result=[],NativeOffline=window.OfflineAudioContext;
   for(const key of['select','start','perfect','good','miss','set','meal','rest','pose','growth','contest-win','contest-lose']){
    const offline=new NativeOffline(1,72000,48000);Object.defineProperty(offline,'state',{get:()=> 'running'});window.AudioContext=function(){return offline};
    const engine=new window.AsobiGymAudio();engine._muted=false;await engine.unlock();engine.play(key);const rendered=await offline.startRendering(),samples=rendered.getChannelData(0);
    let peak=0,energy=0,last=0,signature=2166136261,finite=true;
    for(let i=0;i<samples.length;i++){const value=samples[i];finite&&=Number.isFinite(value);peak=Math.max(peak,Math.abs(value));energy+=value*value;if(Math.abs(value)>.00001)last=i;signature=Math.imul(signature^Math.round(value*32767),16777619)>>>0;}
    result.push({key,peak,rms:Math.sqrt(energy/samples.length),lastAudibleSeconds:last/48000,signature,finite});engine.cleanup();
   }
   return result;
  });
  for(const metric of metrics){assert.equal(metric.finite,true,metric.key+' finite PCM');assert.ok(metric.peak>.005&&metric.peak<.35,metric.key+' has restrained, non-clipping output');assert.ok(metric.lastAudibleSeconds<1.2,metric.key+' finishes without a sustained tone');assert.ok(metric.rms>0);}
  assert.equal(new Set(metrics.map(metric=>metric.signature)).size,12,'All effects, including timing outcomes, sound different');
  fs.writeFileSync(path.join(__dirname,'bodybuilder-audio-render-results.json'),JSON.stringify({checkedAt:new Date().toISOString(),result:'PASS',sampleRate:48000,metrics},null,2)+'\n');console.log('PASS 12 shipping effects: real Web Audio PCM, distinct waveforms, no clipping, short tails');
 }finally{await context.close();await browser.close()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
