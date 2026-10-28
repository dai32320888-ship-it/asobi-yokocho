/* Re-create only accepted, actually recorded game cues for the edited video.
 * Shipping synthesis is run in real OfflineAudioContext. No game-state change,
 * microphone, invented action, music, or replacement sound effects are used.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {launchBrowser}=require('./v4-helpers.cjs');
const CUTS=[[2.40,6.40],[8.00,10.80],[18.40,22.00]],DURATION=12.80;
async function main(){
 const metadata=JSON.parse(fs.readFileSync(path.join(__dirname,'mouse-evolution-media.json'),'utf8'));
 const audioSource=fs.readFileSync(path.join(__dirname,'../games/mouse-evolution-audio.js'),'utf8');
 const events=[],cuts=[];let destination=0;
 for(const [sourceStart,sourceEnd]of CUTS){
  cuts.push({sourceStart,sourceEnd,destinationStart:destination});
  for(const event of metadata.audioEvents){if(event.offsetMs>=sourceStart*1000&&event.offsetMs<sourceEnd*1000)events.push({key:event.key,offsetMs:+(event.offsetMs-sourceStart*1000+destination*1000).toFixed(3),sourceOffsetMs:event.offsetMs});}
  destination+=sourceEnd-sourceStart;
 }
 events.sort((a,b)=>a.offsetMs-b.offsetMs);const silenceStartsAt=+destination.toFixed(6);
 assert.equal(silenceStartsAt,10.4);assert.ok(events.length>0);assert.ok(events.every(event=>event.offsetMs>=0&&event.offsetMs<silenceStartsAt*1000));
 const browser=await launchBrowser(),context=await browser.newContext(),page=await context.newPage();
 try{
  await page.goto('about:blank');await page.addScriptTag({content:audioSource});
  const rendered=await page.evaluate(async({events,duration,silenceStartsAt})=>{
   const rate=48000,offline=new OfflineAudioContext(1,Math.round(rate*duration),rate),engines=[];let clock=0;
   Object.defineProperty(offline,'state',{get:()=> 'running'});Object.defineProperty(offline,'currentTime',{get:()=>clock});window.AudioContext=function(){return offline};
   for(const event of events){
    clock=event.offsetMs/1000;const sound=new window.AsobiMouseAudio();sound._muted=false;
    // The public unlock makes the exact shipping context/noise/master graph.
    // Offline scheduling needs no live native-clock readiness probe to finish.
    sound.unlock();assertAccepted(sound.play(event.key),event.key);engines.push(sound);
   }
   function assertAccepted(value,key){if(value!==true)throw Error('Recorded cue rejected by shipping synth: '+key);}
   const buffer=await offline.startRendering(),samples=buffer.getChannelData(0),end=Math.round(silenceStartsAt*rate),fade=Math.round(rate*.02),bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);let peak=0,energy=0,tailPeak=0,finite=true;
   for(let i=0;i<samples.length;i++){
    let value=i>=end?0:samples[i];if(i>=end-fade&&i<end)value*=Math.max(0,(end-i)/fade);finite&&=Number.isFinite(value);peak=Math.max(peak,Math.abs(value));energy+=value*value;if(i>=end)tailPeak=Math.max(tailPeak,Math.abs(value));view.setInt16(i*2,Math.round(Math.max(-1,Math.min(1,value))*32767),true);
   }
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));engines.forEach(sound=>sound.cleanup());
   return{pcm:btoa(binary),sampleRate:rate,peak,rms:Math.sqrt(energy/samples.length),duration:buffer.duration,tailPeak,finite,samples:samples.length};
  },{events,duration:DURATION,silenceStartsAt});
  assert.equal(rendered.finite,true);assert.ok(rendered.peak>.01&&rendered.peak<.8,'Combined exact-timing shipping effects do not clip');assert.equal(rendered.duration,DURATION);assert.equal(rendered.tailPeak,0,'The final 2.4-second card stays silent');
  const pcm=Buffer.from(rendered.pcm,'base64'),header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rendered.sampleRate,24);header.writeUInt32LE(rendered.sampleRate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  const output=path.resolve(__dirname,'../../../work/mouse-evolution-synced.wav');fs.writeFileSync(output,Buffer.concat([header,pcm]));
  const report={checkedAt:new Date().toISOString(),result:'PASS',method:'Unmodified shipping AsobiMouseAudio synthesized with real OfflineAudioContext at mapped accepted actual-input cue times',synthSha256:crypto.createHash('sha256').update(audioSource).digest('hex'),cuts,events:events.length,mappedEvents:events,duration:rendered.duration,silenceStartsAt,finalSilenceSeconds:+(DURATION-silenceStartsAt).toFixed(2),peak:rendered.peak,rms:rendered.rms,sampleRate:rendered.sampleRate,samples:rendered.samples,finalTailPeak:rendered.tailPeak,output};
  fs.writeFileSync(path.join(__dirname,'mouse-evolution-audio-sync-results.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS: '+events.length+' real accepted cues; 12.8 seconds; peak '+rendered.peak.toFixed(5)+'; final card silent.\n'+output);
 }finally{await context.close();await browser.close()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1});
