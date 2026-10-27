import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../games/bodybuilder-audio.js',import.meta.url),'utf8');
function environment({saved='false',unavailable=false,blockedStorage=false,pendingResume=false}={}){
 const data=new Map([['asobi:bodybuilder:soundMuted',saved]]),contexts=[],nodes=[];let now=1000,release;
 const parameter=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>{const value={connected:[],disconnects:0,connect(target){this.connected.push(target)},disconnect(){this.disconnects++;this.connected=[]}};nodes.push(value);return value};
 class Context{
  constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=48000;this.destination=node();this.sources=[];this.resumes=0;this.closes=0;contexts.push(this)}
  createGain(){return Object.assign(node(),{gain:parameter()})}
  createBuffer(channels,length){return{getChannelData(){return new Float32Array(length)}}}
  createBiquadFilter(){return Object.assign(node(),{frequency:parameter(),Q:parameter()})}
  createOscillator(){return this.makeSource(false)}
  createBufferSource(){return this.makeSource(true)}
  makeSource(noise){const s=Object.assign(node(),{noise,frequency:parameter(),started:false,stopped:false,start(at){this.started=true;this.at=at},stop(at){if(at===undefined){this.stopped=true;this.onended?.()}else this.stopAt=at}});this.sources.push(s);return s}
  resume(){this.resumes++;if(pendingResume)return new Promise(resolve=>{release=()=>{this.state='running';resolve()}});this.state='running';return Promise.resolve()}
  suspend(){this.state='suspended';return Promise.resolve()}
  close(){this.state='closed';this.closes++;return Promise.resolve()}
 }
 const document={hidden:false},window={AudioContext:unavailable?undefined:Context};
 const localStorage={getItem(key){if(blockedStorage)throw Error('Storage blocked');return data.get(key)||null},setItem(key,value){if(blockedStorage)throw Error('Storage blocked');data.set(key,value)}};
 vm.runInNewContext(source,{window,document,localStorage,performance:{now:()=>now},console});
 return{sound:new window.AsobiGymAudio(),contexts,nodes,data,document,tick(ms=100){now+=ms},release(){release?.()}};
}
test('No AudioContext or source is created before the first user unlock',async()=>{
 const e=environment();assert.equal(e.sound.play('perfect'),false);assert.equal(e.contexts.length,0);await e.sound.unlock();assert.equal(e.contexts.length,1);assert.equal(e.contexts[0].state,'running');assert.equal(e.sound.play('perfect'),true);assert.ok(e.sound.activeVoiceCount>0);assert.ok(e.contexts[0].sources.every(s=>s.started&&s.stopAt>s.at));e.sound.cleanup();
});
test('Rep accuracy has distinct layered effects and rapid duplicate presses are dropped',async()=>{
 const e=environment();await e.sound.unlock();e.sound.play('perfect');const perfect=e.contexts[0].sources.length;assert.equal(e.sound.play('perfect'),false);assert.equal(e.contexts[0].sources.length,perfect);e.tick();e.sound.play('miss');const miss=e.contexts[0].sources.length-perfect;assert.ok(perfect>miss);e.sound.cleanup();
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
 const e=environment({pendingResume:true});const unlocking=e.sound.unlock();e.sound.play('perfect');e.sound.cleanup();e.release();await unlocking;await Promise.resolve();assert.equal(e.contexts[0].sources.length,0);assert.equal(e.sound.activeVoiceCount,0);assert.equal(e.sound.play('meal'),false);
});
test('Cleanup closes once and drops every source, filter and master connection',async()=>{
 const e=environment();await e.sound.unlock();e.sound.play('perfect');e.sound.cleanup();e.sound.cleanup();assert.equal(e.contexts[0].closes,1);assert.equal(e.contexts[0].state,'closed');assert.ok(e.nodes.filter(n=>n!==e.contexts[0].destination).every(n=>n.connected.length===0));
});
test('Unavailable audio or blocked/corrupt storage never prevents play',async()=>{
 for(const options of[{unavailable:true},{blockedStorage:true},{saved:'{broken'}]){const e=environment(options);await e.sound.unlock();e.sound.setMuted(false);e.sound.play('meal');e.sound.cleanup();assert.equal(e.sound.activeVoiceCount,0)}
});
