/* Original kitchen pops, sizzling food, footsteps and delivery bells. Synthesized locally; no audio files or permissions. */
(function(){
 'use strict';
 const KEY='asobi:burger-balance:soundMuted',MAX_VOICES=16,MASTER_LEVEL=.55;
 const tone=(frequency,duration=.12,volume=.18,delay=0,end=frequency,type='sine')=>({frequency,duration,volume,delay,end,type});
 const air=(duration=.08,volume=.08,delay=0,cutoff=1800)=>({noise:true,duration,volume,delay,cutoff});
 const SOUNDS={
  select:[tone(587.33,.045,.065,0,783.99,'triangle')],
  place:[air(.065,.075,0,1900),tone(330,.085,.09,0,196,'triangle'),tone(880,.035,.035,.025,1046.5,'sine')],
  sizzle:[air(.22,.08,0,3600),air(.12,.035,.055,6200),tone(160,.10,.025,0,110,'triangle')],
  crunch:[air(.08,.085,0,3000),air(.045,.05,.065,4500),tone(430,.055,.05,0,215,'triangle')],
  remove:[tone(392,.085,.065,0,196,'triangle'),air(.055,.035,0,1500)],
  start:[tone(329.63,.07,.075,0,329.63,'triangle'),tone(440,.07,.075,.08,440,'triangle'),tone(659.25,.17,.085,.16,659.25,'triangle')],
  countdown:[tone(587.33,.085,.075,0,587.33,'square'),tone(293.66,.09,.03,0,293.66,'sine')],
  go:[tone(880,.07,.075,0,880,'triangle'),tone(1174.66,.20,.085,.085,1174.66,'triangle')],
  step:[air(.045,.045,0,700),tone(92,.055,.075,0,62,'sine')],
  softStep:[air(.045,.023,0,550),tone(78,.065,.04,0,54,'sine')],
  land:[air(.085,.075,0,1000),tone(147,.095,.09,0,73.5,'triangle')],
  drop:[air(.10,.08,0,1200),tone(220,.10,.07,0,98,'triangle'),tone(130.81,.13,.035,.07,65.4,'sine')],
  catch:[tone(659.25,.055,.06,0,783.99,'triangle'),tone(1046.5,.10,.06,.06,1046.5,'sine')],
  save:[tone(659.25,.08,.065,0,659.25,'triangle'),tone(880,.11,.065,.085,880,'triangle')],
  arrival:[tone(523.25,.08,.075,0,523.25,'triangle'),tone(659.25,.08,.075,.09,659.25,'triangle'),tone(783.99,.08,.075,.18,783.99,'triangle'),tone(1046.5,.23,.08,.27,1046.5,'triangle')],
  results:[tone(440,.08,.07,0,440,'triangle'),tone(587.33,.08,.07,.09,587.33,'triangle'),tone(739.99,.09,.07,.18,739.99,'triangle'),tone(880,.24,.08,.28,880,'triangle'),tone(1318.51,.17,.035,.31,1318.51,'sine')],
  warning:[tone(698.46,.055,.045,0,698.46,'triangle'),tone(523.25,.065,.04,.11,523.25,'triangle')],
  test:[tone(523.25,.12,.09,0,523.25,'triangle'),tone(659.25,.12,.085,.15,659.25,'triangle'),tone(783.99,.20,.085,.30,783.99,'triangle')]
 };

 class BurgerAudio{
  constructor(){
   this.context=null;this.master=null;this._noise=null;this._voices=new Set();this._authorized=false;this._disposed=false;this._generation=0;this._probe=null;this._clockReady=false;this._warmGeneration=-1;this._last=new Map();
   try{this._muted=JSON.parse(localStorage.getItem(KEY))===true}catch{this._muted=false}
  }
  get muted(){return this._muted}
  get ready(){return !this._disposed&&!this._muted&&this._authorized&&this._clockReady&&this.context?.state==='running'}
  get activeVoiceCount(){return this._voices.size}
  get walking(){return !!this._walking}
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
   if(this._disposed||this._muted||!this._authorized||this._hidden()||typeof key!=='string'||!Object.hasOwn(SOUNDS,key))return false;
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
   this.stopWalk();

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
  setWalk(speed=0,careful=false,active=true){
   if(!active||!Number.isFinite(speed)||Math.abs(speed)<.01||!this.ready){this.stopWalk();return false;}
   const now=typeof performance==='object'?performance.now():Date.now();this._walking=true;
   const interval=careful?550:340;
   if(this._walkAt!==undefined&&now-this._walkAt<interval)return false;
   this._walkAt=now;return this.play(careful?'softStep':'step');
  }
  stopWalk(){this._walking=false;this._walkAt=undefined;}
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
 BurgerAudio.soundKeys=Object.freeze(Object.keys(SOUNDS));
 window.AsobiBurgerAudio=BurgerAudio;
})();
