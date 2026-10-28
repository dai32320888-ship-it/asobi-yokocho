/* Puzzle contracts tested in an isolated VM; fixtures never enter public saves. */
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const HERE=path.dirname(fileURLToPath(import.meta.url)),sandbox={window:{},console};
for(const file of['kotoba-garden-words.js','kotoba-garden-model.js'])vm.runInNewContext(readFileSync(path.join(HERE,'../games',file),'utf8'),sandbox,{filename:file});
const Words=sandbox.window.AsobiKotobaWords,Model=sandbox.window.AsobiKotobaModel,Data=sandbox.window.AsobiKotobaData,results=[];
const json=value=>JSON.parse(JSON.stringify(value)),reading=word=>typeof word==='string'?word:word?.reading;
const chars=tiles=>tiles.map(tile=>tile.char),sorted=value=>Array.from(value).sort().join('');
function check(name,fn){test(name,()=>{try{fn();results.push({name,status:'PASS'})}catch(error){results.push({name,status:'FAIL',message:error.message});throw error}})}
function fresh(kind='practice',difficulty='normal'){const m=new Model();m.newRound(kind,difficulty);return m}
function count(m){const s=m.state,total=s.hand.length+s.slots.reduce((sum,slot)=>sum+slot.tiles.length,0);assert.equal(total,s.phase==='arrange'?9:8);const ids=[...s.hand,...s.slots.flatMap(slot=>slot.tiles),...s.cpu,...s.deck,...s.discards.map(entry=>entry.tile)].map(tile=>tile.id);assert.equal(new Set(ids).size,ids.length,'Every physical tile has a unique ID')}
function selectWord(m,word){const used=new Set();m.clearSelection();for(const char of Array.from(reading(word))){const tile=m.state.hand.find(tile=>tile.char===char&&!used.has(tile.id));assert.ok(tile,'Hand contains '+char+' for '+reading(word));used.add(tile.id);assert.equal(m.select(tile.id).ok,true)}return m.placeSelected()}
function complete(m){assert.equal(m.state.phase,'arrange');const solution=Words.solve(chars(m.state.hand));assert.ok(solution,'The introductory hand has a complete solution');for(const word of solution){const result=selectWord(m,word);assert.equal(result.ok,true,JSON.stringify(result));count(m)}assert.equal(m.finish().ok,true);return solution}

check('The original vocabulary has bounded unique Japanese readings and useful word lengths',()=>{
 assert.ok(Words.entries.length>=450);const seen=new Set(),lengths=new Set();for(const word of Words.entries){assert.equal(typeof word.reading,'string');assert.match(word.reading,/^[ぁ-ゖー]+$/u);assert.ok([2,3,4].includes(Array.from(word.reading).length),word.reading);assert.equal(word.reading,word.reading.normalize('NFC'));assert.ok(!seen.has(word.reading),'Duplicate '+word.reading);seen.add(word.reading);lengths.add(Array.from(word.reading).length);assert.ok(word.label&&word.category)}assert.deepEqual([...lengths].sort(),[2,3,4]);assert.ok(Words.lookup('ねこ'));assert.ok(Words.lookup('さくら'));assert.ok(Words.lookup('ひこうき'));
});
check('Vocabulary normalization and solutions preserve small kana and repeated physical letters',()=>{
 assert.equal(Words.normalize('サクラ'),'さくら');assert.equal(Words.normalize('ﾊﾞﾅﾅ'),'ばなな');assert.equal(Words.normalize('ガッコウ'),'がっこう');const input='ねこさくらひこうき',solution=Words.solve(Array.from(input));assert.ok(solution);assert.deepEqual(json(solution.map(word=>Array.from(reading(word)).length)),[2,3,4]);assert.equal(new Set(solution.map(reading)).size,3);assert.equal(sorted(solution.map(reading).join('')),sorted(input));assert.equal(Words.solve(Array.from('あああああああああ')),null);
});
check('Draw, lock, unlock and finish conserve the exact nine tiles',()=>{
 const m=fresh();count(m);assert.equal(m.state.phase,'draw');assert.equal(m.draw().ok,true);count(m);const before=sorted(chars(m.state.hand).join('')),solution=Words.solve(chars(m.state.hand));assert.ok(solution);assert.equal(selectWord(m,solution[0]).ok,true);count(m);const slot=m.state.slots.findIndex(slot=>slot.word);assert.ok(slot>=0);assert.equal(m.unlock(slot).ok,true);count(m);assert.equal(sorted(chars(m.state.hand).join('')),before);for(const word of solution)assert.equal(selectWord(m,word).ok,true);assert.equal(m.state.hand.length,0);assert.deepEqual(json(m.state.slots.map(slot=>slot.tiles.length)),[2,3,4]);assert.equal(m.finish().ok,true);assert.equal(m.state.mode,'won');assert.ok(m.state.score>0);assert.ok(m.state.stars>=1&&m.state.stars<=3);
});
check('Invalid actions and repeated drawing cannot create tiles or change the turn',()=>{
 const m=fresh();const total=m.state.hand.length+m.state.deck.length+m.state.cpu.length;assert.equal(m.select(-999).ok,false);assert.equal(m.placeSelected().ok,false);assert.equal(m.finish().ok,false);assert.equal(m.draw('unknown').ok,false);assert.equal(m.draw().ok,true);const before=json(m.snapshot());assert.equal(m.draw().ok,false);assert.equal(m.state.turn,before.turn);assert.equal(m.state.hand.length,before.hand.length);assert.equal(m.state.hand.length+m.state.deck.length+m.state.cpu.length,total);m.clearSelection();assert.equal(m.discardSelected().ok,false);for(const tile of m.state.hand.slice(0,2))m.select(tile.id);assert.equal(m.discardSelected().ok,false);count(m);
});
check('Unregistered selections are rejected and locked words cannot be changed during the CPU turn',()=>{
 const m=fresh();m.draw();let pair;for(const a of m.state.hand)for(const b of m.state.hand)if(a.id!==b.id&&!Words.lookup(a.char+b.char))pair=[a,b];assert.ok(pair);for(const tile of pair)m.select(tile.id);const before=json(m.snapshot());assert.equal(m.placeSelected().ok,false);assert.deepEqual(json(m.snapshot()),before);m.clearSelection();const solution=Words.solve(chars(m.state.hand));assert.equal(selectWord(m,solution[0]).ok,true);const slot=m.state.slots.findIndex(slot=>slot.word);m.select(m.state.hand[0].id);m.discardSelected();const cpu=json(m.snapshot());assert.equal(m.unlock(slot).ok,false);assert.equal(m.select(m.state.hand[0].id).ok,false);assert.deepEqual(json(m.snapshot()),cpu);count(m);
});
check('Three hints select an available word without completing it or revealing future draws',()=>{
 const m=fresh();m.draw();for(let n=1;n<=3;n++){const result=m.hint();assert.equal(result.ok,true);assert.equal(m.state.hintsUsed,n);assert.ok(m.state.selected.length>=2&&m.state.selected.length<=4);const word=m.state.selected.map(id=>m.state.hand.find(tile=>tile.id===id)?.char).join('');assert.ok(Words.lookup(word));assert.ok(m.state.slots.every(slot=>!slot.word));count(m)}assert.equal(m.hint().ok,false);assert.equal(m.state.hintsUsed,3);
 const a=fresh();a.draw();const snap=json(a.snapshot()),alternate=json(snap);alternate.deck.reverse();const b=new Model(alternate);const ha=a.hint(),hb=b.hint();assert.equal(ha.ok,true);assert.equal(hb.ok,true);assert.deepEqual(json(a.state.selected),json(b.state.selected),'Hints depend on the hand, not the deck order');
});
check('Discard gives exactly one CPU turn, then the player chooses a public draw',()=>{
 const m=fresh('duel');m.draw();m.select(m.state.hand[0].id);assert.equal(m.discardSelected().ok,true);assert.equal(m.state.phase,'cpu');count(m);assert.equal(m.draw().ok,false);const result=m.cpuStep();assert.equal(result.ok,true);if(m.state.mode==='playing'){assert.equal(m.state.phase,'draw');count(m);const before=json(m.snapshot());assert.equal(m.cpuStep().ok,false);assert.equal(m.state.turn,before.turn);if(m.state.discards.at(-1)?.by==='cpu'){assert.equal(m.draw('discard').ok,true);assert.equal(m.state.phase,'arrange');count(m)}}
});
check('CPU choices do not depend on the opponent’s hidden hand',()=>{
 const m=fresh('duel','hard');m.draw();m.select(m.state.hand[0].id);m.discardSelected();const snap=json(m.snapshot()),alternate=json(snap);const letters=Array.from('ねこさくらひこう');alternate.hand=alternate.hand.map((tile,index)=>({...tile,char:letters[index%letters.length]}));const a=new Model(snap),b=new Model(alternate);assert.equal(a.state.phase,'cpu');assert.equal(b.state.phase,'cpu');assert.deepEqual(json(a.state.cpu),json(b.state.cpu));assert.deepEqual(json(a.state.deck),json(b.state.deck));a.cpuStep();b.cpuStep();assert.deepEqual(json(a.state.cpu),json(b.state.cpu));assert.deepEqual(json(a.state.cpuWords),json(b.state.cpuWords));assert.deepEqual(json(a.state.discards),json(b.state.discards));assert.equal(a.state.mode,b.state.mode);
});
check('Corrupt saved progress falls back to finite bounded playable state',()=>{
 const good=json(fresh().snapshot()),badIds=json(good);badIds.hand[1].id=badIds.hand[0].id;
 for(const bad of[null,[],true,'bad',{version:999},badIds,{...good,hand:[{id:1,char:'<script>'}]},{...good,turn:Infinity,score:NaN,selected:[-2]},{...good,deck:Array(1000).fill({id:8,char:'あ'})}]){const m=new Model(bad),s=m.state;assert.equal(s.version,1);assert.ok(['playing','won','lost','draw'].includes(s.mode));assert.ok(Number.isFinite(s.turn)&&s.turn>=1);assert.ok(s.hand.length<=9&&s.deck.length<200);assert.ok(s.hand.every(tile=>/^[ぁ-ゖー]$/u.test(tile.char)));assert.equal(new Set(s.hand.map(tile=>tile.id)).size,s.hand.length);if(s.mode==='playing')count(m)}
});
check('Reload and a new round preserve earned stats while selections stay valid',()=>{
 const m=fresh();m.draw();complete(m);const prior=json(m.state.stats),saved=json(m.snapshot()),restored=new Model(saved);assert.equal(restored.state.mode,'won');assert.deepEqual(json(restored.state.stats),prior);restored.newRound('practice');assert.equal(restored.state.mode,'playing');assert.equal(restored.state.phase,'draw');assert.deepEqual(json(restored.state.stats),prior);assert.ok(restored.state.selected.length===0);count(restored);
});
check('All practice recipes can be reached by drawing, choosing and discarding real tiles',()=>{
 const recipes=Data.practiceRecipes;assert.ok(Array.isArray(recipes)&&recipes.length>=12);const m=fresh();
 for(let index=0;index<recipes.length;index++){
  assert.equal(m.state.practiceIndex,index);const target=recipes[index].map(reading).join(''),need={};for(const char of target)need[char]=(need[char]||0)+1;
  for(let attempt=0;attempt<25&&m.state.mode==='playing';attempt++){
   if(m.state.phase==='cpu')m.cpuStep();if(m.state.phase==='draw')assert.equal(m.draw().ok,true);count(m);
   if(Words.solve(chars(m.state.hand))){complete(m);break;}
   const counts={};for(const tile of m.state.hand)counts[tile.char]=(counts[tile.char]||0)+1;const excess=m.state.hand.find(tile=>counts[tile.char]>(need[tile.char]||0));assert.ok(excess,'A non-target tile can be exchanged');m.clearSelection();m.select(excess.id);assert.equal(m.discardSelected().ok,true);assert.equal(m.cpuStep().ok,true);count(m);
  }
  assert.equal(m.state.mode,'won','Practice '+(index+1)+' has a reachable solution');if(index<recipes.length-1)m.newRound('practice');
 }
});
after(()=>writeFileSync(path.join(HERE,'kotoba-garden-model-results.json'),JSON.stringify({generatedAt:new Date().toISOString(),results},null,2)+'\n'));
