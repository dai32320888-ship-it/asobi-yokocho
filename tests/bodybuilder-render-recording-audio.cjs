/* Re-render the shipping synth at accepted UI-event times from a real recording.
 * MediaRecorder may omit silent WebAudio frames on some devices. No invented
 * actions, third-party sounds, game-state edits, or microphone input are used.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{launchBrowser}=require('./v4-helpers.cjs');
async function main(){
 const mediaFile=path.join(__dirname,'bodybuilder-v5-1-media.json'),metadata=JSON.parse(fs.readFileSync(mediaFile,'utf8'));
 const output=path.resolve(__dirname,'../../../work/bodybuilder-v5-1-synced.wav'),duration=11.64;
 const browser=await launchBrowser(),context=await browser.newContext(),page=await context.newPage();
 try{
  await page.goto('about:blank');await page.addScriptTag({path:path.join(__dirname,'../games/bodybuilder-audio.js')});
  const rendered=await page.evaluate(async({events,duration})=>{
   const rate=48000,offline=new OfflineAudioContext(1,Math.ceil(rate*duration),rate),engines=[];let clock=0;
   Object.defineProperty(offline,'state',{get:()=> 'running'});Object.defineProperty(offline,'currentTime',{get:()=>clock});
   window.AudioContext=function(){return offline};
   for(const event of events){clock=event.offsetMs/1000;const engine=new AsobiGymAudio();engine._muted=false;await engine.unlock();engine.play(event.key);engines.push(engine)}
   const buffer=await offline.startRendering(),samples=buffer.getChannelData(0),bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);let peak=0;
   for(let i=0;i<samples.length;i++){peak=Math.max(peak,Math.abs(samples[i]));view.setInt16(i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true)}
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));engines.forEach(engine=>engine.cleanup());
   return{pcm:btoa(binary),sampleRate:rate,peak,duration:buffer.duration};
  },{events:metadata.events,duration});
  assert.ok(rendered.peak>.01&&rendered.peak<.8,'Combined exact-timing effects do not clip');
  const pcm=Buffer.from(rendered.pcm,'base64'),header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rendered.sampleRate,24);header.writeUInt32LE(rendered.sampleRate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);fs.writeFileSync(output,Buffer.concat([header,pcm]));
  fs.writeFileSync(path.join(__dirname,'bodybuilder-v5-1-audio-sync-results.json'),JSON.stringify({checkedAt:new Date().toISOString(),result:'PASS',method:'Shipping synth re-rendered at accepted real UI event times',events:metadata.events.length,peak:rendered.peak,duration:rendered.duration,sampleRate:rendered.sampleRate},null,2)+'\n');
  console.log('PASS: exact recorded UI times, '+metadata.events.length+' original game effects, peak '+rendered.peak.toFixed(4));
 }finally{await context.close();await browser.close()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
