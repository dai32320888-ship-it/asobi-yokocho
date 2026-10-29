/* Original starship lasers, alien engines and space explosions. Synthesized locally; no audio files or permissions. */
(function(){
 'use strict';
 const KEY='asobi:galaxy-guard:soundMuted',MAX_VOICES=16,MASTER_LEVEL=.55;
 const tone=(frequency,duration=.12,volume=.18,delay=0,end=frequency,type='sine')=>({frequency,duration,volume,delay,end,type});
 const air=(duration=.08,volume=.08,delay=0,cutoff=1800)=>({noise:true,duration,volume,delay,cutoff});
 const SOUNDS={
  select:[tone(520,.055,.10,0,720,'triangle')],
  start:[tone(261.6,.12,.14,0,330,'triangle'),tone(392,.16,.12,.11,520),tone(784,.23,.13,.24,1046)],
  shoot:[tone(1320,.085,.12,0,360,'triangle'),air(.035,.055,0,2600)],
  hit:[tone(820,.045,.09,0,480,'square'),air(.05,.05,0,1900)],
  kill:[air(.13,.19,0,2100),tone(190,.12,.14,0,52,'triangle'),tone(660,.09,.055,.025,330)],
  dive:[tone(540,.22,.09,0,180,'sawtooth')],
  power:[tone(523.25,.1,.14,0),tone(783.99,.13,.13,.07),tone(1046.5,.24,.12,.15)],
  bomb:[air(.48,.28,0,1200),tone(74,.46,.24,0,30,'triangle'),tone(260,.22,.10,.04,850)],
  hurt:[air(.22,.18,0,900),tone(170,.23,.20,0,62,'sawtooth')],
  wave:[tone(392,.13,.12,0),tone(523.25,.14,.12,.11),tone(659.25,.22,.12,.23)],
  clearWave:[tone(440,.12,.11,0),tone(660,.18,.10,.08)],
  boss:[tone(98,.32,.18,0,110,'sawtooth'),tone(146.8,.32,.12,.22,130,'triangle'),tone(98,.37,.16,.46,73.4,'sawtooth')],
  warning:[tone(440,.12,.12,0,480,'triangle'),tone(440,.12,.11,.18,480,'triangle')],
  bossShot:[air(.17,.12,0,2400),tone(440,.20,.12,0,110,'sawtooth')],
  win:[tone(392,.18,.15,0),tone(493.88,.18,.14,.13),tone(587.33,.18,.13,.26),tone(783.99,.38,.16,.42),tone(1174.66,.35,.08,.48)],
  lose:[tone(330,.18,.15,0,294,'triangle'),tone(261.63,.18,.13,.16,220,'triangle'),tone(196,.35,.14,.33,130.8,'triangle')]
 };
 SOUNDS.test=[tone(523.25,.23,.25,0),tone(659.25,.25,.23,.22),tone(783.99,.34,.22,.46)];
 class GalaxyAudio{
  constructor(){
   this.context=null;this.master=null;this._noise=null;this._voices=new Set();this._authorized=false;this._disposed=false;this._generation=0;this._probe=null;this._clockReady=false;this._warmGeneration=-1;this._last=new Map();
   try{this._muted=JSON.parse(localStorage.getItem(KEY))===true}catch{this._muted=false}
  }
  get muted(){return this._muted}
  get ready(){return !this._disposed&&!this._muted&&this._authorized&&this._clockReady&&this.context?.state==='running'}
  get activeVoiceCount(){return this._voices.size}
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
 window.AsobiGalaxyAudio=GalaxyAudio;
})();
