/* Original garage clunks, spring twangs, motor and finish bells. Synthesized locally; no audio files or permissions. */
(function(){
 'use strict';
 const KEY='asobi:junk-gp:soundMuted',MAX_VOICES=16,MASTER_LEVEL=.55;
 const tone=(frequency,duration=.12,volume=.18,delay=0,end=frequency,type='sine')=>({frequency,duration,volume,delay,end,type});
 const air=(duration=.08,volume=.08,delay=0,cutoff=1800)=>({noise:true,duration,volume,delay,cutoff});
 const SOUNDS={
  select:[tone(523.25,.045,.07,0,659.25,'triangle')],
  place:[air(.06,.08,0,2400),tone(294,.10,.10,0,147,'triangle'),tone(1174.66,.045,.04,.025,880,'sine')],
  rotate:[tone(440,.055,.06,0,660,'triangle'),tone(880,.045,.045,.045,1174.66,'triangle')],
  remove:[air(.065,.05,0,1900),tone(330,.10,.07,0,165,'triangle')],
  start:[tone(261.63,.075,.085,0,261.63,'triangle'),tone(392,.075,.08,.08,392,'triangle'),tone(523.25,.16,.09,.17,523.25,'triangle')],
  countdown:[tone(523.25,.10,.085,0,523.25,'square'),tone(261.63,.11,.04,0,261.63,'sine')],
  go:[tone(783.99,.08,.085,0,783.99,'triangle'),tone(1046.5,.24,.09,.09,1046.5,'triangle'),air(.12,.035,.03,2200)],
  land:[air(.13,.10,0,950),tone(117,.14,.13,0,55,'sine'),tone(262,.07,.045,.015,131,'triangle')],
  spring:[tone(392,.22,.08,0,196,'triangle'),tone(784,.20,.035,.015,392,'sine')],
  coin:[tone(1174.66,.075,.065,0,1174.66,'triangle'),tone(1567.98,.18,.065,.065,1567.98,'sine')],
  flip:[tone(220,.09,.07,0,440,'triangle'),tone(659.25,.13,.06,.09,1046.5,'triangle')],
  recover:[air(.10,.07,0,1500),tone(196,.07,.085,0,196,'triangle'),tone(293.66,.07,.08,.08,293.66,'triangle'),tone(392,.14,.08,.16,392,'triangle')],
  warning:[tone(698.46,.065,.05,0,698.46,'triangle'),tone(523.25,.065,.045,.12,523.25,'triangle')],
  finish:[tone(523.25,.10,.08,0,523.25,'triangle'),tone(659.25,.10,.075,.10,659.25,'triangle'),tone(783.99,.10,.075,.20,783.99,'triangle'),tone(1046.5,.23,.08,.30,1046.5,'triangle')],
  results:[tone(392,.09,.075,0,392,'triangle'),tone(523.25,.09,.075,.10,523.25,'triangle'),tone(659.25,.09,.075,.20,659.25,'triangle'),tone(783.99,.26,.08,.30,783.99,'triangle'),tone(1174.66,.20,.04,.35,1174.66,'sine')],
  test:[tone(523.25,.14,.10,0,523.25,'triangle'),tone(659.25,.14,.095,.17,659.25,'triangle'),tone(783.99,.23,.095,.34,783.99,'triangle')]
 };

 class JunkAudio{
  constructor(){
   this.context=null;this.master=null;this._noise=null;this._voices=new Set();this._authorized=false;this._disposed=false;this._generation=0;this._probe=null;this._clockReady=false;this._warmGeneration=-1;this._last=new Map();
   try{this._muted=JSON.parse(localStorage.getItem(KEY))===true}catch{this._muted=false}
  }
  get muted(){return this._muted}
  get ready(){return !this._disposed&&!this._muted&&this._authorized&&this._clockReady&&this.context?.state==='running'}
  get activeVoiceCount(){return this._voices.size+(this._engine?2:0)}
  get engineActive(){return !!this._engine}
  _hidden(){return typeof document!=='undefined'&&document.hidden}
  unlock(){
   if(this._disposed||this._hidden())return Promise.resolve(false);
   this._authorized=true;
   if(this._muted)return Promise.resolve(false);
   try{
    if(!this.context||this.context.state==='closed'){
     this._cancelProbe();try{this.master?.disconnect()}catch{}this._clockReady=false;this._warmGeneration=-1;
     const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return Promise.resolve(false);
     this.context=new Audio({latencyHint:'interactive'});this.master=this.context.createGain();this.master.gain.value=MASTER_LEVEL;this.master.connect(this.context.destination);
     const size=Math.ceil(this.context.sampleRate*.3),buffer=this.context.createBuffer(1,size,this.context.sampleRate),samples=buffer.getChannelData(0);let seed=197431;
     for(let i=0;i<size;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=(seed/4294967295*2-1)*.75;}this._noise=buffer;
    }
    if(this.ready)return Promise.resolve(true);
    const ctx=this.context;
    // Retry resume synchronously on EVERY real gesture. A request made before
    // touchend may remain pending forever; it must not block a later click.
    try{Promise.resolve(ctx.resume()).catch(()=>{})}catch{}
    this._warm(ctx);
    if(this._probe&&this._probe.ctx===ctx&&this._probe.generation===this._generation)return this._probe.promise;
    this._cancelProbe();
    const probe={ctx,generation:this._generation,clock:ctx.currentTime,deadline:Date.now()+500,timer:null,resolve:null,promise:null};
    probe.promise=new Promise(resolve=>{probe.resolve=resolve});this._probe=probe;
    const finish=ready=>{if(probe.timer!==null)clearTimeout(probe.timer);if(this._probe===probe)this._probe=null;this._clockReady=Boolean(ready);probe.resolve(Boolean(ready))};
    const check=()=>{
     if(this._disposed||this._muted||!this._authorized||this._hidden()||this.context!==ctx||this._generation!==probe.generation){finish(false);return;}
     if(ctx.state==='running'&&ctx.currentTime>probe.clock+.002){finish(true);return;}
     if(Date.now()>=probe.deadline){finish(false);return;}
     probe.timer=setTimeout(check,20);
    };
    probe.timer=setTimeout(check,20);return probe.promise;
   }catch{return Promise.resolve(false)}
  }
  _cancelProbe(){const probe=this._probe;if(!probe)return;this._probe=null;if(probe.timer!==null)clearTimeout(probe.timer);probe.resolve(false)}
  _warm(ctx){
   if(this._warmGeneration===this._generation)return;this._warmGeneration=this._generation;
   try{const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=ctx.createBuffer(1,1,ctx.sampleRate);gain.gain.value=0;source.connect(gain);gain.connect(this.master);const voice={source,gain,filter:null};this._voices.add(voice);source.onended=()=>this._remove(voice);source.start(ctx.currentTime);source.stop(ctx.currentTime+.004)}catch{}
  }
  setMuted(value){
   if(this._disposed)return;this._muted=Boolean(value);this._generation++;
   try{localStorage.setItem(KEY,JSON.stringify(this._muted))}catch{}
   if(this._muted){this._clockReady=false;this._authorized=false;this._cancelProbe();this._stop();try{this.context?.suspend()?.catch(()=>{})}catch{}}
  }
  play(key){
   if(this._disposed||this._muted||!this._authorized||this._hidden()||!SOUNDS[key])return false;
   const now=typeof performance==='object'?performance.now():Date.now(),last=this._last.get(key);
   if(last!==undefined&&now-last<(key==='place'?35:key==='select'?50:70))return false;
   this._last.set(key,now);
   const generation=this._generation;
   if(this.context?.state==='running'){this._emit(key);return true;}
   // At most one sound waits for a gesture-driven resume; all subsequent
   // gesture feedback is current-time audio, never an accumulating playlist.
   if(this._deferred)return false;
   this._deferred=true;
   this.unlock().then(ready=>{this._deferred=false;if(ready&&!this._disposed&&!this._muted&&!this._hidden()&&generation===this._generation)this._emit(key)});
   return true;
  }
  _remove(voice){
   this._voices.delete(voice);try{voice.source.disconnect();voice.gain.disconnect();voice.filter?.disconnect()}catch{}
  }
  _stop(){
   this.stopEngine();

   for(const voice of this._voices){try{voice.source.stop()}catch{}this._remove(voice)}
   this._voices.clear();
  }
  _emit(key){
   const ctx=this.context;if(!ctx||ctx.state!=='running'||this._disposed||this._muted)return;
   const parts=SOUNDS[key];
   while(this._voices.size+parts.length>MAX_VOICES)this._cancelOldest();
   const now=ctx.currentTime+.003;
   for(const part of parts){
    try{
     const source=part.noise?ctx.createBufferSource():ctx.createOscillator(),gain=ctx.createGain(),at=now+part.delay,end=at+part.duration;
     let filter=null;
     if(part.noise){source.buffer=this._noise;filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=part.cutoff;filter.Q.value=.35;source.connect(filter);filter.connect(gain)}
     else{source.type=part.type;source.frequency.setValueAtTime(part.frequency,at);source.frequency.exponentialRampToValueAtTime(part.end,end);source.connect(gain)}
     gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(part.volume,at+Math.min(.008,part.duration/4));gain.gain.exponentialRampToValueAtTime(.0001,end);gain.connect(this.master);
     const voice={source,gain,filter};this._voices.add(voice);source.onended=()=>this._remove(voice);source.start(at);source.stop(end+.008);
    }catch{/* Unsupported or interrupted audio must never stop the game. */}
   }
  }
  setEngine(speed=0,gas=0,grounded=true){
   if(this._disposed||this._muted||!this._authorized||this._hidden()||this.context?.state!=='running'){this.stopEngine();return false;}
   const ctx=this.context,now=ctx.currentTime,safeSpeed=Number.isFinite(speed)?Math.min(900,Math.abs(speed)):0,throttle=Number.isFinite(gas)?Math.max(0,Math.min(1,gas)):0;
   if(!this._engine){
    try{
     const low=ctx.createOscillator(),buzz=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
     low.type='triangle';buzz.type='sawtooth';low.frequency.value=42;buzz.frequency.value=84;filter.type='lowpass';filter.frequency.value=650;filter.Q.value=.55;gain.gain.value=.0001;
     low.connect(filter);buzz.connect(filter);filter.connect(gain);gain.connect(this.master);low.start(now);buzz.start(now);this._engine={low,buzz,filter,gain};
    }catch{this.stopEngine();return false;}
   }
   const motor=this._engine,freq=42+Math.min(1,safeSpeed/430)*43+throttle*(grounded?17:35),volume=.009+throttle*.018+Math.min(1,safeSpeed/350)*.009;
   try{motor.low.frequency.setTargetAtTime(freq,now,.045);motor.buzz.frequency.setTargetAtTime(freq*2.01,now,.045);motor.filter.frequency.setTargetAtTime(360+throttle*650+safeSpeed*.8,now,.06);motor.gain.gain.setTargetAtTime(volume,now,.06);}catch{}
   return true;
  }
  stopEngine(){
   const motor=this._engine;this._engine=null;if(!motor)return;
   for(const source of[motor.low,motor.buzz]){try{source.stop();source.disconnect()}catch{}}
   try{motor.filter.disconnect();motor.gain.disconnect()}catch{}
  }
  _cancelOldest(){const voice=this._voices.values().next().value;if(!voice)return;try{voice.source.stop()}catch{}this._remove(voice)}
  pause(){
   this._generation++;this._authorized=false;this._clockReady=false;this._deferred=false;this._cancelProbe();this._stop();
   try{if(this.context&&this.context.state!=='closed')this.context.suspend().catch(()=>{})}catch{}
  }
  cleanup(){
   if(this._disposed)return;this._disposed=true;this._generation++;this._clockReady=false;this._cancelProbe();this._stop();this._last.clear();
   const ctx=this.context;this.context=null;this._noise=null;
   try{this.master?.disconnect();if(ctx&&ctx.state!=='closed')ctx.close().catch(()=>{})}catch{}
   this.master=null;
  }
 }
 JunkAudio.soundKeys=Object.freeze(Object.keys(SOUNDS));
 window.AsobiJunkAudio=JunkAudio;
})();
