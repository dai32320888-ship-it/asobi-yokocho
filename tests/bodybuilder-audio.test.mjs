import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../games/bodybuilder-audio.js',import.meta.url),'utf8');
function environment({saved='false',unavailable=false,blockedStorage=false,pendingResume=false,frozenClock=false}={}){
 const data=new Map([['asobi:bodybuilder:soundMuted',saved]]),contexts=[],nodes=[],waiting=[];let now=1000,resumeAllowed=!pendingResume,clockEnabled=!frozenClock;
 const parameter=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>{const value={connected:[],disconnects:0,connect(target){this.connected.push(target)},disconnect(){this.disconnects++;this.connected=[]}};nodes.push(value);return value};
 class Context{
  constructor(){this.state='suspended';this._clock=0;this._anchor=Date.now();this.sampleRate=48000;this.destination=node();this.sources=[];this.resumes=0;this.closes=0;contexts.push(this)}
  get currentTime(){return this._clock+(this.state==='running'&&clockEnabled?(Date.now()-this._anchor)/1000:0)}
  run(){if(this.state==='closed')return;this._clock=this.currentTime;this._anchor=Date.now();this.state='running'}
  createGain(){return Object.assign(node(),{gain:parameter()})}
  createBuffer(channels,length){return{length,getChannelData(){return new Float32Array(length)}}}
  createBiquadFilter(){return Object.assign(node(),{frequency:parameter(),Q:parameter()})}
  createOscillator(){return this.makeSource(false)}
  createBufferSource(){return this.makeSource(true)}
  makeSource(noise){const s=Object.assign(node(),{noise,frequency:parameter(),started:false,stopped:false,start(at){this.started=true;this.at=at},stop(at){if(at===undefined){this.stopped=true;this.onended?.()}else this.stopAt=at}});this.sources.push(s);return s}
  resume(){this.resumes++;if(!resumeAllowed)return new Promise(resolve=>waiting.push(()=>{this.run();resolve()}));this.run();for(const release of waiting.splice(0))release();return Promise.resolve()}
  suspend(){this._clock=this.currentTime;this.state='suspended';return Promise.resolve()}
  close(){this._clock=this.currentTime;this.state='closed';this.closes++;return Promise.resolve()}
 }
 const document={hidden:false},window={AudioContext:unavailable?undefined:Context};
 const localStorage={getItem(key){if(blockedStorage)throw Error('Storage blocked');return data.get(key)||null},setItem(key,value){if(blockedStorage)throw Error('Storage blocked');data.set(key,value)}};
 vm.runInNewContext(source,{window,document,localStorage,performance:{now:()=>now},setTimeout,clearTimeout,console});
 return{sound:new window.AsobiGymAudio(),contexts,nodes,data,document,tick(ms=100){now+=ms},allowResume(){resumeAllowed=true},startClock(){clockEnabled=true;contexts.forEach(ctx=>{ctx._anchor=Date.now()})},release(){resumeAllowed=true;for(const release of waiting.splice(0))release()}};
}
test('No AudioContext or source is created before the first user unlock',async()=>{
 const e=environment();assert.equal(e.sound.play('perfect'),false);assert.equal(e.contexts.length,0);assert.equal(await e.sound.unlock(),true);assert.equal(e.contexts.length,1);assert.equal(e.contexts[0].state,'running');assert.ok(e.contexts[0].currentTime>.002);assert.equal(e.sound.ready,true);assert.equal(e.sound.play('perfect'),true);assert.ok(e.sound.activeVoiceCount>0);assert.ok(e.contexts[0].sources.every(s=>s.started&&s.stopAt>s.at));e.sound.cleanup();
});
test('Rep accuracy has distinct layered effects and rapid duplicate presses are dropped',async()=>{
 const e=environment();await e.sound.unlock();const before=e.contexts[0].sources.length;e.sound.play('perfect');const perfect=e.contexts[0].sources.length-before;assert.equal(e.sound.play('perfect'),false);assert.equal(e.contexts[0].sources.length,before+perfect);e.tick();e.sound.play('miss');const miss=e.contexts[0].sources.length-before-perfect;assert.ok(perfect>miss);e.sound.cleanup();
});
test('Voice stealing bounds overlapping native sources to sixteen',async()=>{
 const e=environment();await e.sound.unlock();for(let i=0;i<40;i++){e.tick();e.sound.play(i%2?'growth':'contest-win');assert.ok(e.sound.activeVoiceCount<=16);assert.ok(e.contexts[0].sources.filter(s=>s.started&&!s.stopped).length<=16)}e.sound.cleanup();assert.equal(e.sound.activeVoiceCount,0);
});
test('Mute persists, silences active sources and a muted fresh game allocates no context',async()=>{
 const e=environment();await e.sound.unlock();e.sound.play('meal');e.sound.setMuted(true);assert.equal(e.sound.activeVoiceCount,0);assert.equal(e.contexts[0].state,'suspended');assert.equal(e.data.get('asobi:bodybuilder:soundMuted'),'true');assert.equal(e.sound.play('perfect'),false);
 const muted=environment({saved:'true'});await muted.sound.unlock();assert.equal(muted.contexts.length,0);muted.sound.setMuted(false);await muted.sound.unlock();assert.equal(muted.contexts.length,1);e.sound.cleanup();muted.sound.cleanup();
});
test('Background pause requires a new gesture; hidden documents cannot emit audio',async()=>{
 const e=environment();await e.sound.unlock();e.sound.play('set');e.sound.pause();assert.equal(e.sound.activeVoiceCount,0);const resumes=e.contexts[0].resumes;e.tick();assert.equal(e.sound.play('perfect'),false);assert.equal(e.contexts[0].resumes,resumes);await e.sound.unlock();e.document.hidden=true;assert.equal(e.sound.play('meal'),false);e.sound.cleanup();
});
test('A late resume cannot play a queued effect after cleanup',async()=>{
 const e=environment({pendingResume:true});const unlocking=e.sound.unlock();e.sound.play('perfect');e.sound.cleanup();e.release();assert.equal(await unlocking,false);await Promise.resolve();assert.ok(e.contexts[0].sources.every(source=>source.buffer?.length===1),'Only the silent one-sample warm-up was allowed');assert.ok(e.contexts[0].sources.every(source=>source.stopped));assert.equal(e.sound.activeVoiceCount,0);assert.equal(e.sound.ready,false);assert.equal(e.sound.play('meal'),false);
});
test('Cleanup closes once and drops every source, filter and master connection',async()=>{
 const e=environment();await e.sound.unlock();e.sound.play('perfect');e.sound.cleanup();e.sound.cleanup();assert.equal(e.contexts[0].closes,1);assert.equal(e.contexts[0].state,'closed');assert.ok(e.nodes.filter(n=>n!==e.contexts[0].destination).every(n=>n.connected.length===0));
});
test('Unavailable audio or blocked/corrupt storage never prevents play',async()=>{
 for(const options of[{unavailable:true},{blockedStorage:true},{saved:'{broken'}]){const e=environment(options);await e.sound.unlock();e.sound.setMuted(false);e.sound.play('meal');e.sound.cleanup();assert.equal(e.sound.activeVoiceCount,0)}
});

test('An initially prohibited pending resume is retried by a later permitted gesture',async()=>{
 const e=environment({pendingResume:true});const first=e.sound.unlock();assert.equal(e.contexts[0].state,'suspended');assert.equal(e.sound.ready,false);e.allowResume();const recovered=e.sound.unlock();assert.ok(e.contexts[0].resumes>=2,'A pending request must not suppress the new resume call');assert.equal(await recovered,true);assert.equal(await first,true);assert.ok(e.contexts[0].currentTime>.002);assert.equal(e.sound.ready,true);assert.equal(e.sound.play('test'),true);e.sound.cleanup();
});

test('A running state with a frozen native clock never claims audio readiness',async()=>{
 const e=environment({frozenClock:true});assert.equal(await e.sound.unlock(),false);assert.equal(e.contexts[0].state,'running');assert.equal(e.contexts[0].currentTime,0);assert.equal(e.sound.ready,false);e.startClock();assert.equal(await e.sound.unlock(),true);assert.equal(e.sound.ready,true);e.sound.cleanup();
});

test('A permanently prohibited resume resolves false within a bounded wait and can recover',async()=>{
 const e=environment({pendingResume:true}),started=Date.now();assert.equal(await e.sound.unlock(),false);assert.ok(Date.now()-started<1000,'UI cannot hang forever on a pending autoplay promise');assert.equal(e.sound.ready,false);e.allowResume();assert.equal(await e.sound.unlock(),true);assert.equal(e.sound.ready,true);e.sound.cleanup();
});
