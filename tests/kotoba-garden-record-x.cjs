/* Promotional source: a fresh normal CPU round, completed with real taps.
 * Only visible tile DOM and the shipping wordbook are read to guide the pilot.
 * No storage fixtures, model interception, state edits or clock changes.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {launchBrowser}=require('./v4-helpers.cjs');
const {installAudioProbe}=require('./bodybuilder-audio-probe.cjs');
const URL=process.env.ASOBI_RECORD_URL||'http://127.0.0.1:47843/#game/kotoba-garden';
const OUTPUT=path.join(__dirname,'kotoba-garden-gameplay.webm');
const METADATA=path.join(__dirname,'kotoba-garden-media.json');
const TARGET_MS=16400;

async function main(){
 let browser,context,video,metadata;
 const cues=[],errors=[],posts=[];
 try{
  browser=await launchBrowser();
  context=await browser.newContext({viewport:{width:390,height:690},isMobile:true,hasTouch:true,deviceScaleFactor:1,recordVideo:{dir:path.join(__dirname,'.recording/kotoba'),size:{width:390,height:690}}});
  const probe='('+installAudioProbe.toString().replaceAll('AsobiGymAudio','AsobiKotobaAudio').replaceAll('__gymAudioProbe','__kotobaAudioProbe')+')({record:true,meter:true});';
  await context.addInitScript({content:probe});
  const videoStartedAt=Date.now(),page=await context.newPage(),pageCreatedAt=Date.now();video=page.video();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.method()==='POST')posts.push(request.url());});
  await page.goto(URL,{waitUntil:'networkidle'});
  await page.locator('#kw-draw').waitFor({state:'visible'});
  assert.equal(await page.locator('#kw-game').getAttribute('data-kind'),'duel');
  assert.equal(await page.locator('#kw-game').getAttribute('data-phase'),'draw');
  await page.locator('#kw-table').scrollIntoViewIfNeeded();
  cues.push({type:'normal-initial-round-visible',at:Date.now()});
  await page.waitForTimeout(650);
  cues.push({type:'draw-tap',at:Date.now()});
  await page.locator('#kw-draw').tap();
  await page.waitForTimeout(650);
  // This reads the same characters the player can see, never the model/deck.
  const observed=await page.evaluate(()=>{
   const tiles=Array.from(document.querySelectorAll('#kw-hand [data-kw-tile]')).map(button=>({id:button.dataset.kwTile,char:button.dataset.char}));
   return{tiles,solution:window.AsobiKotobaWords.solve(tiles.map(tile=>tile.char))?.map(word=>({reading:word.reading,label:word.label,category:word.category}))||null,wordbookCount:window.AsobiKotobaWords.entries.length};
  });
  assert.equal(observed.tiles.length,9);assert.ok(observed.solution,'The normal first draw must have a solution.');
  assert.deepEqual(observed.solution.map(word=>Array.from(word.reading).length),[2,3,4]);
  cues.push({type:'nine-visible-tiles',at:Date.now(),tiles:observed.tiles,solution:observed.solution});
  await page.screenshot({path:path.join(__dirname,'kotoba-garden-gameplay-hand.png')});
  for(const word of observed.solution){
   const visible=await page.locator('#kw-hand [data-kw-tile]').evaluateAll(buttons=>buttons.map(button=>({id:button.dataset.kwTile,char:button.dataset.char})));
   const used=new Set();
   for(const char of Array.from(word.reading)){
    const tile=visible.find(item=>item.char===char&&!used.has(item.id));assert.ok(tile,'Visible hand contains '+char);used.add(tile.id);
    cues.push({type:'tile-tap',at:Date.now(),char,tileId:tile.id,word:word.reading});
    await page.locator('[data-kw-tile="'+tile.id+'"]').tap();
    await page.waitForTimeout(420);
   }
   assert.equal(await page.locator('#kw-selected').textContent(),word.reading);
   await page.waitForTimeout(180);cues.push({type:'word-place-tap',at:Date.now(),word:word.reading});
   await page.locator('#kw-place').tap();
   await page.waitForTimeout(650);
  }
  assert.equal(await page.locator('#kw-slots .filled').count(),3);
  cues.push({type:'three-words-complete',at:Date.now()});
  await page.screenshot({path:path.join(__dirname,'kotoba-garden-gameplay-three-words.png')});
  await page.waitForTimeout(500);cues.push({type:'finish-tap',at:Date.now()});
  await page.locator('#kw-finish').tap();
  await page.locator('#kw-game[data-mode="won"]').waitFor();
  cues.push({type:'victory-visible',at:Date.now()});
  await page.waitForTimeout(Math.max(0,TARGET_MS-(Date.now()-videoStartedAt)));
  const final=await page.evaluate(()=>{
   const game=document.getElementById('kw-game');
   return{...game.dataset,title:document.getElementById('kw-result-title').textContent,words:Array.from(document.querySelectorAll('#kw-result-words b')).map(node=>node.textContent),score:document.getElementById('kw-score').textContent};
  });
  await page.screenshot({path:path.join(__dirname,'kotoba-garden-gameplay-lastframe.png')});
  const snapshot=await page.evaluate(()=>window.__kotobaAudioProbe.snapshot());
  const recordings=await page.evaluate(()=>window.__kotobaAudioProbe.recordings());
  metadata={video:OUTPUT,url:URL,videoStartedAt,pageCreatedAt,finishedAt:Date.now(),viewport:{width:390,height:690},provenance:'Fresh isolated Playwright browser profile; normal initial CPU round; real touchscreen taps only. The visible hand and unmodified shipping wordbook were read to choose legal words. No model/state/save fixture or clock manipulation.',wordbookCount:observed.wordbookCount,observedTiles:observed.tiles,solution:observed.solution,final,cues:cues.map(cue=>({...cue,offsetMs:cue.at-videoStartedAt})),audioEvents:snapshot.events.filter(event=>event.accepted).map(event=>({key:event.key,offsetMs:event.at-videoStartedAt,voices:event.voices})),audioContexts:snapshot.contexts,errors,posts};
  const recording=recordings.find(item=>item.bytes.length>1000);
  if(recording){const file=path.join(__dirname,'kotoba-garden-audio.webm');fs.writeFileSync(file,Buffer.from(recording.bytes));metadata.audio={file,offsetMs:recording.startedAt-videoStartedAt,bytes:recording.bytes.length,decoded:recording.decoded};}
  fs.writeFileSync(METADATA,JSON.stringify(metadata,null,2)+'\n');
 }finally{
  if(context)await context.close();
  if(video){await video.saveAs(OUTPUT);await video.delete();}
  if(browser)await browser.close();
 }
 assert.ok(metadata);assert.equal(metadata.final.mode,'won');assert.equal(metadata.final.kind,'duel');assert.equal(errors.length,0);assert.equal(posts.length,0);
 assert.ok(metadata.audioEvents.some(event=>event.key==='contest-win'),'Actual victory sound was accepted.');
 assert.ok(metadata.audioContexts.some(item=>item.pcmPeak>.005),'Native output audio was non-silent.');
 const elapsedMs=metadata.finishedAt-metadata.videoStartedAt;assert.ok(elapsedMs>=14000&&elapsedMs<=20000,'Source take is 14–20 seconds.');
 console.log(JSON.stringify({result:'PASS',video:OUTPUT,metadata:METADATA,elapsedMs,words:metadata.final.words,score:metadata.final.score,acceptedSounds:metadata.audioEvents.length,errors,posts},null,2));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
