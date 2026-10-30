/* Original hand-drawn pixel sprites and tile art. Rendering only. */
(function(){
 'use strict';
 const W=240,H=256,T=16;
 const THEMES=[
  {floor:'#293e3b',tile:'#344943',seam:'#1f3030',light:'#41574b',wall:'#77836a',top:'#a2ac82',edge:'#424d45',shade:'#596755',mark:'#95aa6d',moss:'#6e9c60',water:'#275252',accent:'#f0bf76',sky:'#172b2d'},
  {floor:'#2b314b',tile:'#343a58',seam:'#202439',light:'#454563',wall:'#646b8d',top:'#9aa0bc',edge:'#373b5a',shade:'#505978',mark:'#8992ba',moss:'#6e729a',water:'#284966',accent:'#8ce4df',sky:'#191d34'},
  {floor:'#3a3045',tile:'#46384f',seam:'#2b2339',light:'#56455c',wall:'#81738e',top:'#b4a0b4',edge:'#4c425e',shade:'#675a78',mark:'#b49cbe',moss:'#6c7995',water:'#3c426a',accent:'#ebbd8c',sky:'#251f37'}
 ];
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a)),hash=n=>{n=Math.imul(n^0x7a4c9b13,0x45d9f3b);return((n^(n>>>16))>>>0)/4294967296;};
 function rect(c,x,y,w,h,ink){c.fillStyle=ink;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 function sprite(c,x,y,rows,colors,scale=1){x=Math.round(x);y=Math.round(y);for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){const ink=colors[rows[row][col]];if(ink)rect(c,x+col*scale,y+row*scale,scale,scale,ink);}}
 const HERO=[
  '................','.....hhhhhh.....','....hHHHHHHh....','...hHHHHHHHHh...','...hHssssssHh...','...hHslsslsHh...','....hssssssh....','....hhhsshhh....','...cRrrrrrrRc...','...cRrrrrrrRc...','....RrrbrrR.....','....RrbbbrrR....','.....bbbbb......','.....bB.Bb......','.....BB.BB......','................'
 ];
 const BACK=[
  '................','.....hhhhhh.....','....hHHHHHHh....','...hHHHHHHHHh...','...hHHHHHHHHh...','...hHHHHHHHHh...','....hHHHHHHh....','....hhhHHhhh....','...cRrrrrrrRc...','...cRrrrrrrRc...','....RrrrrrR.....','....RrrbrrR.....','.....bbbbb......','.....bB.Bb......','.....BB.BB......','................'
 ];
 const COLORS={h:'#59394b',H:'#e98c61',s:'#f4d4a1',l:'#29333d',c:'#e7c495',R:'#763a53',r:'#c65e62',b:'#405169',B:'#263548'};
 function drawHero(c,p,time,mode,reduced){
  if(!p)return;const x=Math.round(p.x),y=Math.round(p.y),dash=p.dashTime>0,moving=p.walkTime>0,step=moving&&!reduced&&Math.floor(p.walkTime*12)%2===1;
  rect(c,x-5,y+5,10,2,'#111c2566');
  if(dash){const dx=p.facingX||0,dy=p.facingY||1;for(let i=3;i>=1;i--){c.globalAlpha=.12+(3-i)*.07;rect(c,x-dx*i*5-4,y-dy*i*5-5,8,10,'#c1f2d9');}c.globalAlpha=1;}
  if(p.invuln>0&&!reduced&&Math.floor(time*15)%2===0)c.globalAlpha=.52;
  if(mode==='lost')c.globalAlpha=.5;
  c.save();c.translate(x,y);if(p.facingX<0)c.scale(-1,1);
  sprite(c,-8,-8,p.facingY<-.3?BACK:HERO,COLORS);
  if(step){rect(c,-3,5,2,2,COLORS.b);rect(c,1,6,2,1,COLORS.B);rect(c,3,5,1,1,COLORS.c);}
  if(Math.abs(p.facingX)>.3){rect(c,1,-3,3,1,COLORS.s);rect(c,3,-3,1,1,COLORS.l);}
  if(dash){rect(c,-5,-7,10,1,'#e4fff0');rect(c,-6,-6,1,10,'#e4fff0');rect(c,5,-6,1,10,'#e4fff0');}
  c.restore();c.globalAlpha=1;
 }
 function gem(c,x,y,index,time,reduced){
  const palettes=[['#294f6d','#66d8de','#bcfff0'],['#633d70','#e4a0e5','#fff1fa'],['#676037','#eccf75','#fff2b5']],p=palettes[index%3],bob=reduced?0:Math.floor(Math.sin(time*4+index)*1.1);
  x=Math.round(x);y=Math.round(y)+bob;rect(c,x-3,y+4,7,1,'#14253699');
  sprite(c,x-4,y-5,['...aa...','..abba..','.abccba.','abbccbaa','.abbbaa.','..abba..','...aa...','........'],{a:p[0],b:p[1],c:p[2]});
  if(!reduced&&Math.floor(time*4+index)%7===0){rect(c,x+5,y-6,1,3,'#e6fff8');rect(c,x+4,y-5,3,1,'#e6fff8');}
 }
 function key(c,x,y,time,reduced){const bob=reduced?0:Math.floor(Math.sin(time*5)*1.1);sprite(c,x-6,y-3+bob,['.aaaa.......','abbbba......','ab..baaaaaa.','ab..bbbbbbba','abbbba.a.aa.','.aaaa..a.a..','............'],{a:'#755531',b:'#ffe099'});}
 function chest(c,item,time){const x=Math.round(item.x),y=Math.round(item.y),open=Boolean(item.open||item.collected);rect(c,x-7,y+5,15,2,'#111c2599');if(open){rect(c,x-7,y-8,14,4,'#886144');rect(c,x-6,y-8,12,1,'#f4cf82');rect(c,x-6,y-4,12,2,'#1b2632');}else{rect(c,x-7,y-6,14,6,'#a76742');rect(c,x-6,y-7,12,1,'#eac17d');rect(c,x-6,y-6,12,2,'#bd8550');}rect(c,x-7,y,14,6,'#8f5140');rect(c,x-6,y+4,12,1,'#b5754b');rect(c,x-5,y-6,2,12,'#e6b968');rect(c,x+3,y-6,2,12,'#e6b968');rect(c,x-7,y,14,1,'#553b3e');rect(c,x-1,y-1,3,4,'#ffe8a3');rect(c,x,y,1,2,'#674b3e');if(open){rect(c,x-1,y-1,3,4,'#302c39');if(Math.floor(time*4)%2===0)rect(c,x+5,y-10,1,2,'#ffe9a1');}}
 function enemy(c,e,time,reduced){
  const x=Math.round(e.x),y=Math.round(e.y),stun=e.stun>0,phase=e.phase||0;
  rect(c,x-5,y+4,10,2,'#111c2577');
  if(stun){rect(c,x-6,y-9,2,1,'#ffe6a3');rect(c,x+3,y-10,2,2,'#ffe6a3');if(Math.floor(time*6)%2)rect(c,x+7,y-7,1,2,'#fff6ce');}
  if(e.flash>0)c.globalAlpha=.6;
  if(e.type==='bat'){
   const up=!reduced&&Math.sin(time*13+phase)>0;
   sprite(c,x-8,y-6,up?['.a............a.','abbaa......aabba','abbbba.aa.abbbba','.abbbbbbbbbbbba.','..abbccccccbba..','....bcwccwcb....','.....bccccb.....','......abba......','................']:['................','................','.......aa.......','....aabbbbaa....','..abbccccccbba..','.abbbcwccwcbbba.','abbaaabccbaaabba','.aa...abba...aa.','................'],{a:'#392b50',b:'#9d76bc',c:'#c29bd3',w:stun?'#f7d295':'#ffdb9a'});
  }else{
   const squish=!reduced&&Math.sin(time*5+phase)>0;
   sprite(c,x-7,y-6+(squish?1:0),squish?['..............','....aaaaaa....','..aabbbbcbaa..','.abbbbbbbbcba.','abbbwwbbwwcbba','abbbbbbbbbbbba','.aaaaaaaaaaaa.','..............']:['....aaaaaa....','...abbbbcca...','..abbbbbbbcca.','.abbbwwbwwbcba','abbbbbbbbbbcba','abbbbbbbbbbbba','.aaaaaaaaaaaa.','..............'],{a:'#315257',b:'#80bb83',c:'#b5d99b',w:stun?'#f2d39d':'#253f4a'});
  }
  c.globalAlpha=1;
 }
 function spike(c,s,time,reduced){
  const x=Math.round(s.x),y=Math.round(s.y);rect(c,x-7,y-7,14,14,'#23303a');rect(c,x-6,y-6,12,12,s.active?'#66383f':s.warning?'#654f40':'#39404a');
  if(s.warning){const on=reduced||Math.floor(time*10)%2===0;rect(c,x-7,y-7,14,1,on?'#f6be70':'#a27858');rect(c,x-7,y+6,14,1,on?'#f6be70':'#a27858');rect(c,x-7,y-6,1,12,on?'#f6be70':'#a27858');rect(c,x+6,y-6,1,12,on?'#f6be70':'#a27858');rect(c,x-1,y-4,2,5,'#ffd89d');rect(c,x-1,y+3,2,2,'#ffd89d');}
  else if(s.active){for(const dx of[-4,0,4]){rect(c,x+dx-1,y-5,1,2,'#ffe1ba');rect(c,x+dx-2,y-3,3,3,'#e9a7a1');rect(c,x+dx-3,y,5,3,'#ae687d');rect(c,x+dx-3,y+3,5,1,'#693d57');}}
  else for(const dx of[-4,0,4])rect(c,x+dx-1,y-1,2,3,'#222d37');
 }
 function exit(c,s,time,p){
  const e=s.exit;if(!e)return;const x=Math.round(e.x),y=Math.round(e.y);
  rect(c,x-8,y-10,16,20,p.edge);rect(c,x-7,y-12,14,3,p.top);rect(c,x-9,y-10,3,20,p.wall);rect(c,x+6,y-10,3,20,p.wall);rect(c,x-8,y-10,1,20,p.top);rect(c,x-5,y-9,10,17,e.open?'#182c39':'#3f4b66');
  if(e.open){rect(c,x-5,y-9,10,2,'#7dbf9d');rect(c,x-4,y-7,8,7,'#afd8a6');rect(c,x-4,y,8,2,'#77978a');rect(c,x-5,y+2,10,2,'#aac4a4');rect(c,x-6,y+4,12,2,'#5d867d');rect(c,x-7,y+6,14,2,'#a7c3a0');rect(c,x+7,y-13,1,7,'#d9edb7');rect(c,x+8,y-13,5,3,'#9cddbd');if(Math.floor(time*5)%3===0){rect(c,x-11,y-5,1,3,'#d7fbd0');rect(c,x-12,y-4,3,1,'#d7fbd0');}}
  else{rect(c,x-5,y-6,10,1,'#92abc8');rect(c,x-5,y-1,10,1,'#92abc8');rect(c,x-5,y+4,10,1,'#92abc8');rect(c,x-2,y-4,4,6,'#be9fcf');rect(c,x-1,y-5,2,8,'#ead4e8');}
  for(let i=0;i<8;i++)rect(c,x-7+i*2,y-15,1,2,i<(s.gems||0)?'#97e5d9':'#465263');
 }
 class TreasureVisual{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.buffer=document.createElement('canvas');this.buffer.width=W;this.buffer.height=H;this.b=this.buffer.getContext('2d',{alpha:false});this.disposed=false;this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;this.cache=new Map();this.canvas.style.imageRendering='pixelated';this.resize();}
  resize(){if(this.disposed)return;const box=this.canvas.getBoundingClientRect(),dpr=clamp(window.devicePixelRatio||1,1,2);this.canvas.width=Math.max(W,Math.round((box.width||W)*dpr));this.canvas.height=Math.max(H,Math.round((box.height||H)*dpr));this.ctx.imageSmoothingEnabled=false;this.b.imageSmoothingEnabled=false;}
  map(s){return window.AsobiTreasureData?.maps?.[s.stage||0]||{tiles:Array.from({length:16},(_,r)=>Array.from({length:15},(_,col)=>r===0||r===15||col===0||col===14?'#':'.').join(''))};}
  background(s){
   const map=this.map(s),stage=clamp(s.stage||0,0,2),p=THEMES[stage],cacheKey=String(stage)+map.tiles.join('');let bg=this.cache.get(cacheKey);
   if(!bg){bg=document.createElement('canvas');bg.width=W;bg.height=H;const c=bg.getContext('2d');rect(c,0,0,W,H,p.sky);
    for(let row=0;row<16;row++)for(let col=0;col<15;col++){
     const x=col*T,y=row*T,n=row*31+col,wall=map.tiles[row]?.[col]==='#';
     if(wall){rect(c,x,y,16,16,p.edge);rect(c,x+1,y,15,12,p.wall);rect(c,x+1,y,15,2,p.top);rect(c,x+1,y+11,15,2,p.shade);rect(c,x,y+14,16,2,'#172b3199');rect(c,x+8,y+2,1,4,p.shade);rect(c,x+1,y+6,14,1,p.shade);rect(c,x+4,y+7,1,4,p.shade);if(hash(n+18)>.6){rect(c,x+2,y+3,3,1,p.mark);rect(c,x+3,y+4,1,2,p.mark);}if(stage===0&&hash(n+5)>.56){rect(c,x+1,y,5,2,p.moss);rect(c,x+1,y+2,2,3,p.moss);rect(c,x+13,y+1,2,2,p.moss);}if(stage===1&&hash(n+10)>.81){rect(c,x+7,y+2,2,7,'#9b9fd1');rect(c,x+6,y+4,1,3,'#b8d8e4');rect(c,x+9,y+5,2,4,'#697cbb');}}
     else{rect(c,x,y,16,16,p.floor);rect(c,x+1,y+1,14,13,p.tile);rect(c,x+1,y+14,15,1,p.seam);rect(c,x+15,y,1,16,p.seam);if(hash(n)>.55){rect(c,x+3,y+3,2,1,p.light);rect(c,x+11,y+10,1,2,p.floor);}if(hash(n+1)>.81){rect(c,x+7,y+8,1,4,p.seam);rect(c,x+5,y+10,2,1,p.seam);}if(stage===0&&hash(n+9)>.9){rect(c,x+2,y+11,1,3,p.moss);rect(c,x+4,y+12,1,2,p.moss);}if(stage===2&&hash(n+24)>.95){rect(c,x+5,y+2,6,1,'#7b6c7a');rect(c,x+7,y,2,5,'#7b6c7a');}}
    }
    this.cache.set(cacheKey,bg);
   }
   this.b.drawImage(bg,0,0);return p;
  }
  render(s,copy,nowMs=0){
   if(this.disposed||!s)return;const c=this.b,p=this.background(s),map=this.map(s),time=s.mode==='playing'||s.mode==='paused'||s.mode==='won'||s.mode==='lost'?(s.time||0):(this.reduced?0:nowMs/1000);
   // Torches are decorative wall fixtures; they never hide the walkable floor.
   for(let row=1;row<15;row++)for(let col=1;col<14;col++){if(map.tiles[row]?.[col]==='#'&&map.tiles[row+1]?.[col]!== '#'&&(row*7+col)%7===0){const x=col*T+8,y=row*T+8;rect(c,x-1,y,3,6,'#483646');rect(c,x-2,y-1,5,2,'#c98f5f');const f=this.reduced?0:Math.floor(time*9+col)%2;rect(c,x-1,y-5-f,3,5+f,'#ec9460');rect(c,x,y-5,1,4,'#ffdd95');rect(c,x-3,y-6,1,1,'#ac66545a');}}
   exit(c,s,time,p);
   for(const hazard of s.spikes||[])spike(c,hazard,time,this.reduced);
   for(const item of s.items||[]){if(item.type==='chest')chest(c,item,time);else if(!item.collected){if(item.type==='key')key(c,item.x,item.y,time,this.reduced);else gem(c,item.x,item.y,Number(item.id)||Math.round(item.x+item.y),time,this.reduced);}}
   const actors=[...(s.enemies||[]).map(e=>({y:e.y,e})),{y:s.player?.y||0,player:true}].sort((a,b)=>a.y-b.y);
   for(const actor of actors)actor.player?drawHero(c,s.player,time,s.mode,this.reduced):enemy(c,actor.e,time,this.reduced);
   for(const effect of s.effects||[]){const k=clamp(effect.age/effect.duration,0,1),x=Math.round(effect.x),y=Math.round(effect.y),ink=effect.type==='hurt'?'#ffa8a0':effect.type==='key'||effect.type==='chest'?'#ffe6a3':effect.type==='enemy'?'#d6c8f3':'#b1f3db',r=(effect.r||12)*k;c.globalAlpha=1-k;for(let i=0;i<6;i++){const a=i*Math.PI/3+(effect.id||0);rect(c,x+Math.cos(a)*r,y+Math.sin(a)*r,2,2,ink);}c.globalAlpha=1;}
   // A solid one-pixel frame keeps the source grid crisp at fractional CSS sizes.
   rect(c,0,0,W,1,'#152b30');rect(c,0,H-1,W,1,'#152b30');rect(c,0,0,1,H,'#152b30');rect(c,W-1,0,1,H,'#152b30');
   this.ctx.imageSmoothingEnabled=false;this.ctx.drawImage(this.buffer,0,0,this.canvas.width,this.canvas.height);
  }
  cleanup(){if(this.disposed)return;this.disposed=true;this.cache.clear();this.buffer.width=1;this.buffer.height=1;}
 }
 window.AsobiTreasureVisual=TreasureVisual;
})();
