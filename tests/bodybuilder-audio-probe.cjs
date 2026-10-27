/* Observation only. Keeps the real WebAudio graph and timing intact.
 * Optional recorder branches the actual master output into a MediaStream;
 * it never uses the microphone, invents effects, or changes game state.
 */
'use strict';
function installAudioProbe({record=false,meter=false}={}){
 const contexts=[],sounds=[],events=[],starts=[];let soundClass;
 function instrumentContext(ctx){
  const item={ctx,id:contexts.length,active:new Set(),peak:0,resumes:0,suspends:0,closes:0,recorder:null,chunks:[],recordStartedAt:null,pcmPeak:0,pcmMaxRms:0,meterReads:0};contexts.push(item);
  let analyser=null,meterTimer=null;
  if(meter){analyser=ctx.createAnalyser();analyser.fftSize=1024;const samples=new Float32Array(analyser.fftSize);meterTimer=setInterval(()=>{if(ctx.state==='closed'){clearInterval(meterTimer);return}analyser.getFloatTimeDomainData(samples);let energy=0;for(const sample of samples){item.pcmPeak=Math.max(item.pcmPeak,Math.abs(sample));energy+=sample*sample}item.pcmMaxRms=Math.max(item.pcmMaxRms,Math.sqrt(energy/samples.length));item.meterReads++},10)}
  let tap=null;
  if(record&&typeof MediaRecorder==='function'){
   try{tap=ctx.createMediaStreamDestination();const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';item.recorder=new MediaRecorder(tap.stream,{mimeType:mime});item.recorder.ondataavailable=event=>{if(event.data.size)item.chunks.push(event.data)};item.recordStartedAt=Date.now();item.recorder.start(100)}catch{tap=null}
  }
  function current(){for(const node of item.active)if(node.stopAt!==null&&node.stopAt<=ctx.currentTime)item.active.delete(node);return item.active.size}
  function observeSource(node,kind){
   const data={kind,ctx:item.id,wave:null,frequencies:[],at:null,stopAt:null,wallAt:null};
   if(node.frequency){const set=node.frequency.setValueAtTime.bind(node.frequency),ramp=node.frequency.exponentialRampToValueAtTime.bind(node.frequency);node.frequency.setValueAtTime=(value,time)=>{data.frequencies.push(value);return set(value,time)};node.frequency.exponentialRampToValueAtTime=(value,time)=>{data.frequencies.push(value);return ramp(value,time)}}
   const start=node.start.bind(node),stop=node.stop.bind(node);node.start=(at=0)=>{data.wave=node.type||null;data.at=at;data.wallAt=Date.now();item.active.add(data);current();item.peak=Math.max(item.peak,item.active.size);starts.push(data);return start(at)};
   node.stop=(at)=>{data.stopAt=at===undefined?ctx.currentTime:at;if(at===undefined||at<=ctx.currentTime+.001)item.active.delete(data);return at===undefined?stop():stop(at)};
   node.addEventListener('ended',()=>item.active.delete(data));return node;
  }
  const oscillator=ctx.createOscillator.bind(ctx),buffer=ctx.createBufferSource.bind(ctx),gain=ctx.createGain.bind(ctx);
  ctx.createOscillator=()=>observeSource(oscillator(),'oscillator');ctx.createBufferSource=()=>observeSource(buffer(),'buffer');
  ctx.createGain=()=>{const node=gain();if(tap||analyser){const connect=node.connect.bind(node);node.connect=(destination,...args)=>{if(destination===ctx.destination&&analyser){connect(analyser);analyser.connect(destination);if(tap)analyser.connect(tap);return destination}const result=connect(destination,...args);if(destination===ctx.destination&&tap)connect(tap);return result}}return node};
  for(const method of['resume','suspend','close']){const original=ctx[method].bind(ctx);ctx[method]=(...args)=>{item[method==='resume'?'resumes':method==='suspend'?'suspends':'closes']++;if(method==='close'&&meterTimer)clearInterval(meterTimer);return original(...args)}}
  item.count=current;return ctx;
 }
 for(const name of['AudioContext','webkitAudioContext']){const Native=window[name];if(typeof Native==='function')window[name]=new Proxy(Native,{construct(Target,args,newTarget){return instrumentContext(Reflect.construct(Target,args,newTarget))}})}
 Object.defineProperty(window,'AsobiGymAudio',{configurable:true,get(){return soundClass},set(Class){
  if(typeof Class!=='function'){soundClass=Class;return}
  const play=Class.prototype.play;Class.prototype.play=function(key){const accepted=play.call(this,key);events.push({key,accepted,at:Date.now(),voices:this.activeVoiceCount});return accepted};
  soundClass=new Proxy(Class,{construct(Target,args,newTarget){const instance=Reflect.construct(Target,args,newTarget);sounds.push(instance);return instance}});
 }});
 window.__gymAudioProbe={
  snapshot(){return{contexts:contexts.map(item=>({id:item.id,state:item.ctx.state,currentTime:item.ctx.currentTime,active:item.count(),peak:item.peak,resumes:item.resumes,suspends:item.suspends,closes:item.closes,recordStartedAt:item.recordStartedAt,pcmPeak:item.pcmPeak,pcmMaxRms:item.pcmMaxRms,meterReads:item.meterReads})),sounds:sounds.map(sound=>({muted:sound.muted,active:sound.activeVoiceCount,ready:typeof sound.ready==='boolean'?sound.ready:null,contextState:sound.context?.state||null})),events:events.map(event=>({...event})),starts:starts.map(item=>({kind:item.kind,wave:item.wave,frequencies:[...item.frequencies],wallAt:item.wallAt,at:item.at,stopAt:item.stopAt}))}},
  lastSound(){return sounds.at(-1)},
  async recordings(){const output=[];for(const item of contexts){if(!item.recorder)continue;if(item.recorder.state!=='inactive')await new Promise(resolve=>{item.recorder.addEventListener('stop',resolve,{once:true});item.recorder.stop()});const blob=new Blob(item.chunks,{type:item.recorder.mimeType}),buffer=await blob.arrayBuffer();let decodedInfo=null;try{const decoded=await item.ctx.decodeAudioData(buffer.slice(0));let peak=0;for(let channel=0;channel<decoded.numberOfChannels;channel++)for(const sample of decoded.getChannelData(channel))peak=Math.max(peak,Math.abs(sample));decodedInfo={peak,duration:decoded.duration,sampleRate:decoded.sampleRate}}catch{}output.push({startedAt:item.recordStartedAt,mime:item.recorder.mimeType,bytes:Array.from(new Uint8Array(buffer)),decoded:decodedInfo})}return output}
 };
}
module.exports={installAudioProbe};
