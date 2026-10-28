/* Original balloon air, latex and release effects. Synthesized locally; no audio files or permissions. */
(function(){
 'use strict';
 const KEY='asobi:balloon-panic:soundMuted',MAX_VOICES=16,MASTER_LEVEL=.55;
 const tone=(frequency,duration=.12,volume=.18,delay=0,end=frequency,type='sine')=>({frequency,duration,volume,delay,end,type});
 const air=(duration=.08,volume=.08,delay=0,cutoff=1800)=>({noise:true,duration,volume,delay,cutoff});
 const SOUNDS={
  select:[tone(440,.045,.11,0,520,'triangle')],
  inflate:[air(.14,.095,0,1100),tone(140,.085,.055,.01,175,'triangle')],
  warning:[tone(430,.14,.11,0,285,'sine'),air(.045,.035,.015,1500)],
  danger:[tone(690,.12,.095,0,370,'sine'),tone(520,.10,.055,.075,330,'triangle')],
  stop:[tone(210,.085,.105,0,125,'triangle'),tone(659.25,.16,.12,.065,655,'sine')],
  perfect:[tone(523.25,.18,.13,0),tone(659.25,.19,.12,.07),tone(783.99,.23,.11,.14),tone(1046.5,.30,.10,.23)],
  // A short low-passed puff, rather than a startling full-band impulse.
  pop:[air(.085,.18,0,1850),tone(92,.09,.12,.003,38,'triangle')]
 };
 SOUNDS.test=[tone(523.25,.23,.25,0),tone(659.25,.25,.23,.22),tone(783.99,.34,.22,.46)];
 class BalloonAudio{
  constructor(){
   this.context=null;this.master=null;this._noise=null;this._voices=new Set();this._authorized=false;this._disposed=false;this._generation=0;this._probe=null;this._clockReady=false;this._warmGeneration=-1;this._last=new Map();
   try{this._muted=JSON.parse(localStorage.getItem(KEY))===true}catch{this._muted=false}
  }
  get muted(){return this._muted}
  get ready(){return !this._disposed&&!this._muted&&this._authorized&&this._clockReady&&this.context?.state==='running'}
  get activeVoiceCount(){return this._voices.size+(this._inflation?.sources.length||0)}
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
   this.stopInflation();
   for(const voice of this._voices){try{voice.source.stop()}catch{}this._remove(voice)}
   this._voices.clear();
  }
  _emit(key){
   const ctx=this.context;if(!ctx||ctx.state!=='running'||this._disposed||this._muted)return;
   const parts=SOUNDS[key];
   while(this._voices.size+(this._inflation?.sources.length||0)+parts.length>MAX_VOICES)this._cancelOldest();
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
  inflate(pressure,stress){
   if(!this.ready){this.stopInflation();return;}
   const ctx=this.context,amount=Math.max(0,Math.min(1,Number.isFinite(pressure)?pressure:0)),tension=Math.max(0,Math.min(1,Number.isFinite(stress)?stress:(amount-.65)/.35));
   try{
    if(!this._inflation){
     while(this._voices.size+3>MAX_VOICES)this._cancelOldest();
     const airSource=ctx.createBufferSource(),airFilter=ctx.createBiquadFilter(),airGain=ctx.createGain(),latex=ctx.createOscillator(),latexGain=ctx.createGain(),wobble=ctx.createOscillator(),wobbleGain=ctx.createGain();
     airSource.buffer=this._noise;airSource.loop=true;airFilter.type='bandpass';airFilter.frequency.value=1050;airFilter.Q.value=.45;airGain.gain.value=0;airSource.connect(airFilter);airFilter.connect(airGain);airGain.connect(this.master);
     latex.type='sine';latex.frequency.value=145;latexGain.gain.value=0;latex.connect(latexGain);latexGain.connect(this.master);wobble.type='sine';wobble.frequency.value=7;wobbleGain.gain.value=0;wobble.connect(wobbleGain);wobbleGain.connect(latex.frequency);
     airSource.start();latex.start();wobble.start();this._inflation={sources:[airSource,latex,wobble],nodes:[airFilter,airGain,latexGain,wobbleGain],airFilter,airGain,latex,latexGain,wobble,wobbleGain};
    }
    const balloon=this._inflation,at=ctx.currentTime;
    balloon.airFilter.frequency.setTargetAtTime(850+amount*1200,at,.06);balloon.airGain.gain.setTargetAtTime(.065+amount*.045,at,.055);balloon.latex.frequency.setTargetAtTime(145+amount*155+tension*45,at,.06);balloon.latexGain.gain.setTargetAtTime(tension*.075,at,.06);balloon.wobble.frequency.setTargetAtTime(7+tension*15,at,.06);balloon.wobbleGain.gain.setTargetAtTime(tension*12,at,.055);
   }catch{this.stopInflation();}
  }
  stopInflation(){
   const balloon=this._inflation;if(!balloon)return;this._inflation=null;
   for(const source of balloon.sources){try{source.stop();source.disconnect()}catch{}}
   for(const node of balloon.nodes){try{node.disconnect()}catch{}}
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
 window.AsobiBalloonAudio=BalloonAudio;
})();
