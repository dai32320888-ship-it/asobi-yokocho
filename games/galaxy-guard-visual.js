/* Original space creatures, starfighters and nebulae. Rendering only. */
(function(){
 'use strict';
 const W=480,H=640,TAU=Math.PI*2;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const hash=n=>{n=Math.imul((n|0)^0x683a7c51,0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return((n^(n>>>16))>>>0)/4294967296;};
 const PALETTES=[['#b7fff0','#43c9c1','#155868'],['#d7afff','#9168e8','#362b77'],['#ffce9e','#ee8f69','#743b75'],['#e8ffc2','#a0cb6e','#476347'],['#a3e3ff','#5baddf','#2e507e']];
 function ellipse(c,x,y,rx,ry,fill,rotation=0){c.beginPath();c.ellipse(x,y,Math.max(.001,rx),Math.max(.001,ry),rotation,0,TAU);c.fillStyle=fill;c.fill();}
 function path(c,points,fill,stroke,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function line(c,x1,y1,x2,y2,ink,width=1){c.strokeStyle=ink;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
 function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color.slice(0,7)+'00');ellipse(c,x,y,r,r,g);}
 class GalaxyVisual{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.width=360;this.height=480;this.disposed=false;this.dpr=1;this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
  resize(width,height,dpr){if(this.disposed)return;const b=this.canvas.getBoundingClientRect();this.width=clamp(width||b.width||360,120,1800);this.height=clamp(height||b.height||this.width*4/3,160,2400);this.dpr=clamp(dpr||window.devicePixelRatio||1,1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.backgroundCanvas=null;}
  background(time,wave){
   const c=this.ctx;
   if(!this.backgroundCanvas){
    const bg=document.createElement('canvas');bg.width=W;bg.height=H;const b=bg.getContext('2d'),gradient=b.createLinearGradient(0,0,W,H);gradient.addColorStop(0,'#080e28');gradient.addColorStop(.48,'#171331');gradient.addColorStop(1,'#071c31');b.fillStyle=gradient;b.fillRect(0,0,W,H);
    for(const[x,y,r,ink]of[[430,100,290,'#6245a13b'],[30,370,270,'#164d8040'],[400,600,230,'#0d526332']]){const g=b.createRadialGradient(x,y,4,x,y,r);g.addColorStop(0,ink);g.addColorStop(1,ink.slice(0,7)+'00');b.fillStyle=g;b.fillRect(0,0,W,H);}
    b.save();b.translate(360,170);b.rotate(-.37);for(let i=0;i<4;i++){const g=b.createRadialGradient(0,0,2,0,0,140+i*16);g.addColorStop(0,'#6f4c9120');g.addColorStop(1,'#6f4c9100');ellipse(b,0,i*9,230,67+i*12,g);}b.restore();
    // A distant ringed moon gives the scene depth without competing with bullets.
    b.save();b.translate(407,325);b.rotate(-.35);b.strokeStyle='#8097c620';b.lineWidth=6;b.beginPath();b.ellipse(0,0,65,16,0,0,TAU);b.stroke();const moon=b.createRadialGradient(-10,-12,2,0,0,29);moon.addColorStop(0,'#6b87ac34');moon.addColorStop(1,'#20345526');ellipse(b,0,0,29,29,moon);b.strokeStyle='#9aaacc1d';b.lineWidth=2;b.beginPath();b.ellipse(0,0,65,16,0,0,Math.PI);b.stroke();b.restore();
    // Quiet horizon and launch corridor anchor the player's fixed altitude.
    const horizon=b.createRadialGradient(240,920,285,240,920,440);horizon.addColorStop(0,'#4e98ab00');horizon.addColorStop(.93,'#2f738c14');horizon.addColorStop(.97,'#6cbbd433');horizon.addColorStop(1,'#0b203900');b.fillStyle=horizon;b.fillRect(0,450,W,190);
    b.strokeStyle='#759bc715';b.lineWidth=1;b.beginPath();b.moveTo(28,590);b.lineTo(452,590);b.stroke();for(let i=0;i<17;i++){const x=48+i*24;b.beginPath();b.moveTo(x,589);b.lineTo(x,592+(i%4===0?5:2));b.stroke();}
    this.backgroundCanvas=bg;
   }
   c.drawImage(this.backgroundCanvas,0,0,W,H);
   const speed=this.reduced?0:time*(wave===4?32:21);
   for(let i=0;i<88;i++){const z=.28+hash(i+301)*.72,x=12+hash(i+41)*(W-24),y=((hash(i+77)*H+speed*z)%H+H)%H,r=.45+hash(i+19)*1.2;c.globalAlpha=.24+z*.55;ellipse(c,x,y,r,r,i%7===0?'#f7d9ed':i%5===0?'#a4e8ff':'#dfecff');if(z>.87&&!this.reduced)line(c,x,y-r,x,y-3.5,'#d7edff33',.8);}
   c.globalAlpha=1;
   const vignette=c.createLinearGradient(0,0,W,0);vignette.addColorStop(0,'#02091675');vignette.addColorStop(.12,'#02091600');vignette.addColorStop(.88,'#02091600');vignette.addColorStop(1,'#02091675');c.fillStyle=vignette;c.fillRect(0,0,W,H);
  }
  fighter(player,time,mode){
   const c=this.ctx,x=clamp(player?.x??240,0,W),y=clamp(player?.y??570,-80,H+80),level=clamp(player?.level??1,1,3),invuln=(player?.invuln??player?.invulnerable??0)>0;
   c.save();c.translate(x,y);const bank=clamp(player?.tilt??player?.move??0,-1,1);c.rotate(bank*.10);if(mode==='lost'){c.globalAlpha=.28;}
   if(invuln){c.strokeStyle='#8ceeff99';c.lineWidth=1.8;c.beginPath();c.ellipse(0,-2,29,35,0,0,TAU);c.stroke();glow(c,0,0,40,'#42bfff21');}
   const flicker=this.reduced?1:1+Math.sin(time*53)*.16;
   for(const sign of[-1,1]){const fx=sign*10,fy=20;const g=c.createLinearGradient(0,fy,0,fy+30*flicker);g.addColorStop(0,'#d9ffff');g.addColorStop(.25,'#69e9ffb0');g.addColorStop(1,'#2489ff00');path(c,[[fx-4,fy],[fx+4,fy],[fx+2,fy+14*flicker],[fx,fy+32*flicker],[fx-2,fy+14*flicker]],g);}
   // Forward swept white wings and a separate luminous cockpit.
   path(c,[[0,-29],[10,-7],[19,1],[29,20],[17,16],[10,10],[10,22],[4,18],[-4,18],[-10,22],[-10,10],[-17,16],[-29,20],[-19,1],[-10,-7]],'#6bb9d0','#b4eff2',1.1);
   path(c,[[0,-29],[7,-7],[5,15],[0,21],[-5,15],[-7,-7]],'#dbedf2');
   path(c,[[0,-20],[5,-7],[3,4],[-3,4],[-5,-7]],'#155a85','#61e1fb',.8);line(c,0,-14,0,-3,'#a5ffff',1.8);
   for(const sign of[-1,1]){path(c,[[sign*10,-2],[sign*25,16],[sign*16,12]],'#325b83');line(c,sign*16,5,sign*22,13,'#6cf7ef',1.4);ellipse(c,sign*23,15,1.6,1.6,'#ecf9b5');}
   if(level>1){for(const sign of[-1,1]){path(c,[[sign*29,5],[sign*34,11],[sign*32,25],[sign*25,23]],level===3?'#d5b1fa':'#7fe3d6','#eff0ff',.75);ellipse(c,sign*30,10,2,2,'#fded9b');}}
   if(invuln&&!this.reduced&&Math.sin(time*23)>.3){c.globalAlpha=.25;c.fillStyle='#dfffff';c.beginPath();c.ellipse(0,-1,18,24,0,0,TAU);c.fill();}
   c.restore();
  }
  alien(enemy,time,index=0){
   const c=this.ctx,type=String(enemy.type??enemy.kind??'scout'),k=({scout:0,beetle:0,drone:0,mantis:0,weaver:1,jelly:1,zigzag:1,diver:2,dart:2,ray:2,armored:3,shield:3,crab:3,bomber:4,orb:4})[type]??index%5,p=PALETTES[k],r=clamp(enemy.radius??enemy.r??16,8,34),s=r/18;
   c.save();c.translate(enemy.x??240,enemy.y??150);let rotation=Number.isFinite(enemy.angle)?enemy.angle:0;if(enemy.mode==='diving'&&Number.isFinite(enemy.vx))rotation=clamp(enemy.vx/220,-.9,.9);c.rotate(rotation);c.scale(s,s);if((enemy.flash??enemy.hitFlash??0)>0)c.globalAlpha=.65;
   const wing=this.reduced?.5:Math.sin(time*8+(enemy.id??index)*.7);
   glow(c,0,0,29,p[1]+'14');
   if(k===0){
    for(const side of[-1,1]){path(c,[[side*4,-4],[side*17,-15-wing*3],[side*25,-7],[side*18,9],[side*8,14]],p[2],p[1],1);line(c,side*11,-4,side*18,-8,p[0],1);line(c,side*11,6,side*18,3,p[1],1.3);}
    ellipse(c,0,0,10,16,p[1]);path(c,[[0,-16],[7,-8],[5,10],[0,17],[-5,10],[-7,-8]],p[0]);ellipse(c,0,-5,5.5,5,'#172447');ellipse(c,0,-5,2.4,2.6,'#c7ffc2');line(c,-5,-11,-11,-19,p[0],1.3);line(c,5,-11,11,-19,p[0],1.3);
   }else if(k===1){
    c.strokeStyle=p[1];c.lineWidth=2;for(let j=-2;j<=2;j++){c.beginPath();c.moveTo(j*5,7);c.bezierCurveTo(j*7+wing*3,15,j*5-wing*5,20,j*7+wing*4,25+(j%2)*3);c.stroke();}
    c.beginPath();c.moveTo(-23,5);c.bezierCurveTo(-21,-26,21,-26,23,5);c.quadraticCurveTo(0,17,-23,5);c.fillStyle=p[1];c.fill();c.strokeStyle=p[0];c.lineWidth=1.2;c.stroke();ellipse(c,0,-3,13,10,p[2]);ellipse(c,-5,-4,2.6,3.2,'#f7e8ff');ellipse(c,5,-4,2.6,3.2,'#f7e8ff');line(c,-14,-11,14,-11,p[0]+'70',1.3);
   }else if(k===2){
    path(c,[[0,19],[-7,9],[-27,-4],[-20,-14],[-4,-7],[0,-18],[4,-7],[20,-14],[27,-4],[7,9]],p[2],p[1],1.3);path(c,[[-26,-4],[-8,-1],[0,14],[8,-1],[26,-4],[14,7],[0,21],[-14,7]],p[1]);path(c,[[0,-16],[7,-4],[0,11],[-7,-4]],p[0]);ellipse(c,0,-3,4.2,6,'#5e244b');ellipse(c,0,-1,1.6,2.2,'#ffe9ad');
   }else if(k===3){
    for(const sign of[-1,1]){path(c,[[sign*10,-10],[sign*24,-17],[sign*31,-4],[sign*24,12],[sign*17,8],[sign*23,-3],[sign*12,1]],p[2],p[1],1.1);line(c,sign*11,10,sign*18,21,p[1],2);}
    path(c,[[-13,-12],[0,-19],[13,-12],[16,4],[9,17],[-9,17],[-16,4]],p[1],p[0],1.3);path(c,[[-10,-9],[0,-14],[10,-9],[12,3],[6,12],[-6,12],[-12,3]],p[2]);path(c,[[-7,-4],[7,-4],[4,3],[-4,3]],'#ffeab5');line(c,-4,8,4,8,p[1],1.5);
    if((enemy.hp??1)>1){c.strokeStyle=p[0]+'63';c.lineWidth=1.2;c.beginPath();c.arc(0,0,32,-2.8,-.35);c.stroke();}
   }else{
    for(const sign of[-1,1]){path(c,[[sign*9,-7],[sign*20,-13],[sign*28,-3],[sign*21,13],[sign*12,7]],p[2],p[1],1);ellipse(c,sign*21,0,4,8,p[1]);}
    ellipse(c,0,0,16,19,p[2]);ellipse(c,0,-2,12,13,p[1]);ellipse(c,0,-3,7,8,p[0]);ellipse(c,0,-2,3.5,5,'#1b3d64');line(c,-8,12,8,12,p[0],1.6);
   }
   c.restore();
  }
  boss(boss,time){
   if(!boss||boss.hp<=0)return;const c=this.ctx,x=boss.x??240,y=boss.y??110,scale=clamp(boss.radius??boss.r??61,40,90)/61,pulse=this.reduced?1:1+Math.sin(time*7)*.06;
   c.save();c.translate(x,y);c.scale(scale,scale);glow(c,0,3,110,'#dc6eaa19');
   // An original shell-backed leviathan: jointed arms, citadel shell and iris core.
   for(const sign of[-1,1]){path(c,[[sign*16,-25],[sign*45,-40],[sign*77,-20],[sign*99,9],[sign*82,29],[sign*66,18],[sign*52,4],[sign*27,19]],'#40365c','#b477a2',1.4);path(c,[[sign*36,-22],[sign*56,-24],[sign*79,-6],[sign*69,11],[sign*52,-3]],'#715079');path(c,[[sign*64,14],[sign*82,22],[sign*78,42],[sign*62,52],[sign*56,43]],'#3c345a','#b06e9b',1);ellipse(c,sign*74,27,5,8,'#f69e94');line(c,sign*52,-11,sign*65,-4,'#ffc5ba',2.8);path(c,[[sign*19,17],[sign*39,28],[sign*32,52],[sign*19,43]],'#7f5684','#ed9faa',1);}
   path(c,[[-30,-31],[0,-50],[30,-31],[39,0],[28,35],[0,48],[-28,35],[-39,0]],'#674669','#e6a7ba',1.4);path(c,[[-23,-28],[0,-43],[23,-28],[30,0],[21,27],[0,38],[-21,27],[-30,0]],'#2d2c51');
   for(let i=-2;i<=2;i++){const yy=-30+i*5;line(c,-15,yy,15,yy,'#d293b642',1.2);}
   ellipse(c,0,1,25,28,'#ad7092');ellipse(c,0,1,21,24,'#291f47');glow(c,0,1,29,'#f66c9c65');ellipse(c,0,1,14*pulse,18*pulse,'#f6a9b0');ellipse(c,0,2,5.5,14,'#552949');ellipse(c,-4,-5,3.5,4.5,'#fff1dc');
   for(const sign of[-1,1]){ellipse(c,sign*28,-19,3,4,'#fee9b0');line(c,sign*27,25,sign*31,18,'#f4cbad',2);}
   if((boss.flash??boss.hitFlash??0)>0){c.globalAlpha=.23;ellipse(c,0,0,42,48,'#ffffff');}c.restore();
  }
  warnings(state,time){
   const c=this.ctx,boss=state.boss,warning=boss?.warning;
   if(!warning)return;
   const warn=typeof warning==='object'?warning:{},x=clamp(warn.x??boss.targetX??boss.aimX??state.player?.x??240,15,W-15),width=clamp(warn.width??60,20,200),alpha=this.reduced?.16:.13+Math.sin(time*13)*.04;c.save();
   if(warn.kind==='beam'){c.globalAlpha=alpha;c.fillStyle='#ffab79';c.fillRect(x-width/2,110,width,480);c.globalAlpha=.60;c.strokeStyle='#ffbd8e';c.lineWidth=1.5;c.setLineDash([8,8]);for(const side of[-1,1])line(c,x+side*width/2,110,x+side*width/2,590,'#ffbd8e',1.2);c.setLineDash([]);}
   else{const count=warn.kind==='cross'?9:7,bx=boss.x??240,by=(boss.y??110)+35;c.globalAlpha=.42;c.setLineDash([3,6]);for(let i=0;i<count;i++){const a=Math.PI/2+(i-(count-1)/2)*.18;line(c,bx+Math.cos(a)*36,by+Math.sin(a)*36,bx+Math.cos(a)*110,by+Math.sin(a)*110,'#ffd0a3',1.1);}c.setLineDash([]);glow(c,bx,by,30,'#ffb28149');}c.restore();
  }
  projectiles(state,time){
   const c=this.ctx;
   for(const s of state.shots||[]){const x=s.x??0,y=s.y??0,r=clamp(s.radius??s.r??2.2,1,9);glow(c,x,y,9,'#7aedff42');c.strokeStyle='#73d9ff';c.lineWidth=r*2;c.lineCap='round';c.beginPath();c.moveTo(x,y+7);c.lineTo(x,y-8);c.stroke();c.strokeStyle='#e0ffff';c.lineWidth=Math.max(1.1,r*.7);c.stroke();}
   c.lineCap='butt';
   for(const b of state.bullets||[]){const x=b.x??0,y=b.y??0,r=clamp(b.radius??b.r??4.5,2,14);if(b.kind==='beam'||b.type==='beam'||b.kind==='laser'){const w=clamp(b.width??b.w??r*2,8,90),h=clamp(b.height??b.h??480,20,H),g=c.createLinearGradient(x-w/2,0,x+w/2,0);g.addColorStop(0,'#fb69902b');g.addColorStop(.4,'#ff8ea9');g.addColorStop(.5,'#fff3cb');g.addColorStop(.6,'#ff8ea9');g.addColorStop(1,'#fb69902b');c.fillStyle=g;c.fillRect(x-w/2,y-h/2,w,h);}else{glow(c,x,y,r*2.7,'#ff718c35');ellipse(c,x,y,r,r,'#ff7290');ellipse(c,x-.8,y-.8,r*.52,r*.52,'#ffe1b4');}}
   for(const p of state.pickups||[]){const x=p.x??240,y=p.y??300,heal=p.type==='repair'||p.type==='heal'||p.kind==='heal',color=heal?'#a6ffd8':'#ffda8c',pulse=this.reduced?1:1+.08*Math.sin(time*8);c.save();c.translate(x,y);c.scale(pulse,pulse);glow(c,0,0,25,color+'28');path(c,[[0,-14],[12,-7],[12,7],[0,14],[-12,7],[-12,-7]],'#183447',color,1.5);if(heal){c.fillStyle=color;c.fillRect(-2.5,-7,5,14);c.fillRect(-7,-2.5,14,5);}else{c.strokeStyle=color;c.lineWidth=2.6;c.lineJoin='round';c.beginPath();c.moveTo(-3,7);c.lineTo(-3,-7);c.lineTo(2,-7);c.bezierCurveTo(8,-7,8,1,2,1);c.lineTo(-3,1);c.stroke();c.lineJoin='miter';}c.restore();}
  }
  effect(effect,time){
   const c=this.ctx,type=effect.type??effect.kind??'kill',x=effect.x??240,y=effect.y??300,life=effect.life??effect.duration??.5,age=effect.age??effect.elapsed??(Number.isFinite(effect.at)?time-effect.at:0),p=clamp(age/Math.max(.01,life),0,1);if(p>=1)return;
   c.save();c.globalAlpha=1-p;
   if(type==='bomb'||type==='shockwave'){const r=20+p*730;c.strokeStyle='#b4ffed';c.lineWidth=3+8*(1-p);c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.lineWidth=1;c.strokeStyle='#85baff80';c.beginPath();c.arc(x,y,r*.83,0,TAU);c.stroke();if(!this.reduced){glow(c,x,y,Math.max(1,r),'#79dcff12');}}
   else if(type==='power'||type==='heal'||type==='warp'){c.strokeStyle=effect.color??(type==='heal'?'#b9ffdf':'#ffe2a4');c.lineWidth=type==='warp'?1:2;c.beginPath();c.ellipse(x,y,18+p*(type==='warp'?180:32),(18+p*(type==='warp'?180:32))*(type==='warp'?.35:1),0,0,TAU);c.stroke();}
   else{const r=clamp(effect.r??23,8,140)*(1+p*.7);glow(c,x,y,r*1.5,'#ffb99038');for(let i=0;i<10;i++){const a=i*TAU/10+hash(i+23),d=p*r*1.4;const ink=type==='spark'?'#fff1cc':i%2?effect.color??'#ffbb8f':'#ffe7b4';line(c,x+Math.cos(a)*d*.55,y+Math.sin(a)*d*.55,x+Math.cos(a)*d,y+Math.sin(a)*d,ink,2.7*(1-p)+.6);}ellipse(c,x,y,Math.max(.01,(1-p)*r*.3),Math.max(.01,(1-p)*r*.3),'#fff3c8');}
   c.restore();
  }
  render(state,copy={},nowMs=0){
   if(this.disposed||!this.ctx||!state)return;const c=this.ctx,time=Number.isFinite(state.time)?state.time:Math.max(0,nowMs/1000),cosmetic=state.mode==='ready'&&!this.reduced?nowMs/1000:time;c.save();c.setTransform(this.canvas.width/W,0,0,this.canvas.height/H,0,0);this.background(cosmetic,state.wave);this.warnings(state,time);
   if(state.mode==='ready'&&!(state.enemies||[]).length){c.save();c.globalAlpha=.58;for(let row=0;row<2;row++)for(let col=0;col<5;col++)this.alien({x:104+col*68,y:117+row*66,type:['drone','weaver','diver','armored','drone'][col],radius:15},cosmetic,row*5+col);c.restore();}
   for(let i=0;i<(state.enemies||[]).length;i++)this.alien(state.enemies[i],time,i);this.boss(state.boss,time);this.projectiles(state,time);this.fighter(state.player,time,state.mode);for(const effect of state.effects||[])this.effect(effect,time);
   if(state.mode==='won'){c.save();c.globalAlpha=.65;for(let i=0;i<22;i++){const x=30+hash(i+13)*420,y=90+hash(i+113)*430;line(c,x-2,y,x+2,y,i%2?'#86efdc':'#ffe8ad',1.5);line(c,x,y-2,x,y+2,i%2?'#86efdc':'#ffe8ad',1.5);}c.restore();}
   c.restore();
  }
  cleanup(){if(this.disposed)return;this.disposed=true;this.ctx=null;this.backgroundCanvas=null;}
 }
 window.AsobiGalaxyVisual=GalaxyVisual;
})();
