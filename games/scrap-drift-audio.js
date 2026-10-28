/* Original garage and racing effects. Synthesized locally; no audio files or permissions. */
(function(){
 'use strict';
 const KEY='asobi:scrap-drift:soundMuted',MAX_VOICES=16,MASTER_LEVEL=.55;
 const tone=(frequency,duration=.12,volume=.18,delay=0,end=frequency,type='sine')=>({frequency,duration,volume,delay,end,type});
 const air=(duration=.08,volume=.08,delay=0,cutoff=1800)=>({noise:true,duration,volume,delay,cutoff});
 const SOUNDS={
  select:[tone(440,.055,.13,0,550,'triangle')],
  start:[tone(92,.17,.22,0,180,'sawtooth'),air(.12,.1,.02,1000)],
  countdown:[tone(420,.09,.19,0,415,'triangle')],
  go:[tone(660,.14,.18,0,880,'triangle'),tone(990,.19,.1,.06,1100)],
  drift:[air(.19,.15,0,2400),tone(150,.14,.06,0,100,'triangle')],
  perfect:[tone(740,.1,.18,0,880,'triangle'),tone(1108,.18,.11,.06,1320)],
  collision:[air(.15,.22,0,1300),tone(95,.17,.25,0,38,'triangle')],
  nitro:[air(.32,.17,0,2700),tone(90,.28,.1,0,210,'sawtooth')],
  purchase:[tone(330,.12,.15,0),tone(440,.13,.13,.09),tone(660,.25,.17,.18)],
  finish:[tone(392,.18,.17,0),tone(494,.18,.14,.13),tone(587,.18,.14,.26),tone(784,.4,.18,.39)],
  error:[tone(160,.1,.12,0,100,'triangle')]
 };
 SOUNDS.test=[tone(523,.23,.25,0),tone(659,.25,.23,.22),tone(784,.34,.22,.46)];
 class DriftAudio{
  constructor(){
   this.context=null;this.master=null;this._noise=null;this._voices=new Set();this._authorized=false;this._disposed=false;this._generation=0;this._probe=null;this._clockReady=false;this._warmGeneration=-1;this._last=new Map();
   try{this._muted=JSON.parse(localStorage.getItem(KEY))===true}catch{this._muted=false}
  }
  get muted(){return this._muted}
  get ready(){return !this._disposed&&!this._muted&&this._authorized&&this._clockReady&&this.context?.state==='running'}
  get activeVoiceCount(){return this._voices.size+(this._engine?.sources.length||0)}
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
     const size=Math.ceil(this.context.sampleRate*.3),buffer=this.context.createBuffer(1,size,this.context.sampleRate),samples=buffer.getChannelData(0);let seed=7319;
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
   if(last!==undefined&&now-last<(key==='select'?50:70))return false;
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
  drive(ratio,drifting=false,nitro=false){
   if(!this.ready){this.stopEngine();return;}
   const ctx=this.context,amount=Math.max(0,Math.min(1.5,Number(ratio)||0));
   try{
    if(!this._engine){
     const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),motor=ctx.createOscillator(),harmonic=ctx.createOscillator(),mix=ctx.createGain(),airSource=ctx.createBufferSource(),airFilter=ctx.createBiquadFilter(),airGain=ctx.createGain();
     gain.gain.value=0;filter.type='lowpass';filter.frequency.value=650;filter.Q.value=.5;motor.type='triangle';harmonic.type='sawtooth';mix.gain.value=.12;motor.connect(filter);harmonic.connect(mix);mix.connect(filter);filter.connect(gain);gain.connect(this.master);
     airSource.buffer=this._noise;airSource.loop=true;airFilter.type='highpass';airFilter.frequency.value=900;airGain.gain.value=0;airSource.connect(airFilter);airFilter.connect(airGain);airGain.connect(this.master);
     motor.start();harmonic.start();airSource.start();this._engine={sources:[motor,harmonic,airSource],nodes:[gain,filter,mix,airFilter,airGain],motor,harmonic,gain,airGain,filter};
    }
    const engine=this._engine,at=ctx.currentTime,frequency=43+amount*93;
    engine.motor.frequency.setTargetAtTime(frequency,at,.065);engine.harmonic.frequency.setTargetAtTime(frequency*2.015,at,.065);engine.gain.gain.setTargetAtTime(.045+amount*.035+(nitro?.025:0),at,.07);engine.filter.frequency.setTargetAtTime(470+amount*1050,at,.08);engine.airGain.gain.setTargetAtTime(drifting?.095: nitro?.055:amount*.003,at,.045);
   }catch{this.stopEngine();}
  }
  stopEngine(){
   const engine=this._engine;if(!engine)return;this._engine=null;
   for(const source of engine.sources){try{source.stop();source.disconnect()}catch{}}
   for(const node of engine.nodes){try{node.disconnect()}catch{}}
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
 window.AsobiDriftAudio=DriftAudio;
})();
