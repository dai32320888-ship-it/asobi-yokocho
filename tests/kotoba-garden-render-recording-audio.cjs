/* Replay accepted actual-input sound cues through unmodified shipping synth.
 * Optional --cuts='[[start,end],...]' and --duration=N map edits to the WAV.
 * No microphone, music, replacement effects or game-state changes are used.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {launchBrowser}=require('./v4-helpers.cjs');
function option(name){const args=process.argv.slice(2),index=args.indexOf('--'+name);if(index>=0)return args[index+1];const item=args.find(arg=>arg.startsWith('--'+name+'='));return item?.slice(name.length+3);}
async function main(){
 const metadata=JSON.parse(fs.readFileSync(path.join(__dirname,'kotoba-garden-media.json'),'utf8'));
 const audioSource=fs.readFileSync(path.join(__dirname,'../games/kotoba-garden-audio.js'),'utf8');
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',metadata.video],{encoding:'utf8'});
 assert.equal(probe.status,0,probe.stderr);const sourceDuration=Number(probe.stdout.trim());assert.ok(sourceDuration>0);
 const alignment=metadata.videoAlignment||{method:'Uncalibrated wall-clock origin',anchors:[]},anchors=alignment.anchors||[];
 // A native browser video starts after newPage was requested and presentation
 // timing varies slightly. Map the wall-clock logs to observed source frames.
 function sourceTime(wallOffsetMs){
  if(!anchors.length)return wallOffsetMs;
  const first=anchors[0],last=anchors.at(-1);
  if(wallOffsetMs<=first.wallOffsetMs)return wallOffsetMs+first.videoOffsetMs-first.wallOffsetMs;
  if(wallOffsetMs>=last.wallOffsetMs)return wallOffsetMs+last.videoOffsetMs-last.wallOffsetMs;
  for(let index=1;index<anchors.length;index++)if(wallOffsetMs<anchors[index].wallOffsetMs){
   const a=anchors[index-1],b=anchors[index],t=(wallOffsetMs-a.wallOffsetMs)/(b.wallOffsetMs-a.wallOffsetMs);
   return a.videoOffsetMs+t*(b.videoOffsetMs-a.videoOffsetMs);
  }
 }
 const requestedCuts=option('cuts')?JSON.parse(option('cuts')):[[0,sourceDuration]],cuts=[],events=[];let destination=0;
 for(const cut of requestedCuts){
  assert.ok(Array.isArray(cut)&&cut.length===2&&cut.every(Number.isFinite));const[sourceStart,sourceEnd]=cut;
  assert.ok(sourceStart>=0&&sourceEnd>sourceStart&&sourceEnd<=sourceDuration+.1);
  cuts.push({sourceStart,sourceEnd,destinationStart:destination});
  for(const event of metadata.audioEvents){const sourceOffsetMs=sourceTime(event.offsetMs);if(sourceOffsetMs>=sourceStart*1000&&sourceOffsetMs<sourceEnd*1000)events.push({key:event.key,offsetMs:+(sourceOffsetMs-sourceStart*1000+destination*1000).toFixed(3),sourceOffsetMs:+sourceOffsetMs.toFixed(3),wallOffsetMs:event.offsetMs});}
  destination+=sourceEnd-sourceStart;
 }
 events.sort((a,b)=>a.offsetMs-b.offsetMs);const silenceStartsAt=+destination.toFixed(6),duration=option('duration')?Number(option('duration')):silenceStartsAt;
 assert.ok(Number.isFinite(duration)&&duration>=silenceStartsAt&&duration<=30);assert.ok(events.length>0);
 const browser=await launchBrowser(),context=await browser.newContext(),page=await context.newPage();
 try{
  await page.goto('about:blank');await page.addScriptTag({content:audioSource});
  const rendered=await page.evaluate(async({events,duration,silenceStartsAt})=>{
   const rate=48000,offline=new OfflineAudioContext(1,Math.round(rate*duration),rate),engines=[];let clock=0;
   Object.defineProperty(offline,'state',{get:()=> 'running'});Object.defineProperty(offline,'currentTime',{get:()=>clock});window.AudioContext=function(){return offline;};
   for(const event of events){
    clock=event.offsetMs/1000;const sound=new window.AsobiKotobaAudio();sound._muted=false;sound.unlock();
    if(sound.play(event.key)!==true)throw Error('Recorded cue rejected by shipping synth: '+event.key);engines.push(sound);
   }
   const buffer=await offline.startRendering(),samples=buffer.getChannelData(0),end=Math.round(silenceStartsAt*rate),fade=Math.round(rate*.02),bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);let peak=0,energy=0,tailPeak=0,finite=true;
   for(let i=0;i<samples.length;i++){
    let value=i>=end?0:samples[i];if(i>=end-fade&&i<end)value*=Math.max(0,(end-i)/fade);finite&&=Number.isFinite(value);peak=Math.max(peak,Math.abs(value));energy+=value*value;if(i>=end)tailPeak=Math.max(tailPeak,Math.abs(value));view.setInt16(i*2,Math.round(Math.max(-1,Math.min(1,value))*32767),true);
   }
   let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));engines.forEach(sound=>sound.cleanup());
   return{pcm:btoa(binary),sampleRate:rate,peak,rms:Math.sqrt(energy/samples.length),duration:buffer.duration,tailPeak,finite,samples:samples.length};
  },{events,duration,silenceStartsAt});
  assert.equal(rendered.finite,true);assert.ok(rendered.peak>.01&&rendered.peak<.8,'Exact-timing shipping effects are audible and do not clip.');assert.ok(Math.abs(rendered.duration-duration)<1/48000);assert.equal(rendered.tailPeak,0);
  const pcm=Buffer.from(rendered.pcm,'base64'),header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rendered.sampleRate,24);header.writeUInt32LE(rendered.sampleRate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  const output=option('output')?path.resolve(option('output')):path.resolve(__dirname,'../../../work/kotoba-garden-synced.wav');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,Buffer.concat([header,pcm]));
  const report={checkedAt:new Date().toISOString(),result:'PASS',method:'Unmodified shipping AsobiKotobaAudio synthesized with real OfflineAudioContext at accepted actual-input cue times, aligned to native source video frames.',synthSha256:crypto.createHash('sha256').update(audioSource).digest('hex'),sourceDuration,videoAlignment:alignment,cuts,sourceCues:metadata.cues.map(cue=>({...cue,videoOffsetMs:+sourceTime(cue.offsetMs).toFixed(3)})),mappedEvents:events,events:events.length,duration:rendered.duration,silenceStartsAt,finalSilenceSeconds:+(duration-silenceStartsAt).toFixed(6),peak:rendered.peak,rms:rendered.rms,sampleRate:rendered.sampleRate,samples:rendered.samples,finalTailPeak:rendered.tailPeak,output};
  fs.writeFileSync(path.join(__dirname,'kotoba-garden-audio-sync-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await context.close();await browser.close();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
