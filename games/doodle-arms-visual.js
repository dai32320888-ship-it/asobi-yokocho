/* Original notebook arena and ink fighters. Rendering only; poses come from the model. */
(function(){
 'use strict';
 const W=560,H=320,GROUND=278,TAU=Math.PI*2,SCALE=.66;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const PALETTES=[{paper:'#f5efdb',line:'#89b8cc',ink:'#2e4f62',floor:'#cfba91',accent:'#e6a866'},{paper:'#f1e4cd',line:'#d0a275',ink:'#704d48',floor:'#af825c',accent:'#72a494'},{paper:'#e9e5ef',line:'#b0a1ce',ink:'#62527e',floor:'#beb2cf',accent:'#dcaf6c'}];
 function ellipse(c,x,y,rx,ry,fill,stroke,width=1){c.beginPath();c.ellipse(x,y,Math.max(.001,rx),Math.max(.001,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function line(c,x1,y1,x2,y2,ink,width=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=ink;c.lineWidth=width;c.lineCap='round';c.stroke();}
 function polygon(c,points,fill,stroke,width=1){c.beginPath();for(let i=0;i<points.length;i++)i?c.lineTo(points[i][0],points[i][1]):c.moveTo(points[i][0],points[i][1]);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke();}}
 function star(c,x,y,r,ink,rotation=0){const points=[];for(let i=0;i<10;i++){const angle=rotation+i*Math.PI/5,rad=i%2?r*.47:r;points.push([x+Math.cos(angle)*rad,y+Math.sin(angle)*rad]);}polygon(c,points,ink);}
 function tip(weapon,pose){let point=null,max=-1;for(const p of weapon?.points||[]){const d=p.x*p.x+p.y*p.y;if(d>max){point=p;max=d;}}if(!point)return null;const cos=Math.cos(pose.angle),sin=Math.sin(pose.angle);return{x:pose.x+pose.facing*(point.x*cos-point.y*sin),y:pose.y+point.x*sin+point.y*cos};}
 function strokes(c,drawing){
  c.lineCap='round';c.lineJoin='round';
  for(const stroke of drawing?.strokes||[]){if(!stroke.points?.length)continue;c.strokeStyle=stroke.color;c.fillStyle=stroke.color;c.lineWidth=stroke.width;c.beginPath();const first=stroke.points[0];c.moveTo(first.x,first.y);if(stroke.points.length===1){c.arc(first.x,first.y,stroke.width/2,0,TAU);c.fill();continue;}for(let i=1;i<stroke.points.length;i++)c.lineTo(stroke.points[i].x,stroke.points[i].y);c.stroke();}
 }
 class DoodleVisual{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.disposed=false;this.backgrounds=new Map();this.weapons=new WeakMap();this.trails=new Map();this.camera=null;this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
  resize(width,height,dpr){if(this.disposed)return;const b=this.canvas.getBoundingClientRect();this.width=clamp(width||b.width||W,120,1800);this.height=clamp(height||b.height||this.width*H/W,80,1200);this.dpr=clamp(dpr||window.devicePixelRatio||1,1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);}
  updateCamera(state,now){
   const fighters=[state.player,state.enemy].filter(Boolean);if(fighters.length<2){this.camera={zoom:1,tx:0,ty:0,center:W/2,at:now,round:state.round};return this.camera;}
   let minX=W,maxX=0,minY=GROUND-78;
   for(const f of fighters){minX=Math.min(minX,f.x-25);maxX=Math.max(maxX,f.x+25);const pose=f.weaponPose;if(!pose)continue;const cos=Math.cos(pose.angle),sin=Math.sin(pose.angle);for(const p of f.weapon?.points||[]){const x=pose.x+pose.facing*(p.x*cos-p.y*sin),r=p.r||2;minX=Math.min(minX,x-r);maxX=Math.max(maxX,x+r);}minY=Math.min(minY,pose.y-(f.weapon?.stats?.reach||0)-3);}
   const left=clamp(minX-18,0,W),right=clamp(maxX+18,0,W),fit=Math.min(W/Math.max(1,right-left),(H-36)/Math.max(1,GROUND-minY),1.55),gap=Math.abs(fighters[1].x-fighters[0].x),desired=Math.min(this.reduced?1.25:clamp(1.3+(230-gap)/550,1,1.55),Math.max(1,fit));
   const prior=this.camera,reset=!prior||prior.round!==state.round||['workshop','drawing','editing'].includes(state.mode),dt=prior?clamp((now-prior.at)/1000,0,.08):.02,blend=1-Math.exp(-dt*6);
   let zoom=reset?desired:state.mode==='paused'?prior.zoom:prior.zoom+(desired-prior.zoom)*blend;zoom=clamp(Math.min(zoom,fit),1,1.55);
   const half=W/zoom/2,target=clamp((fighters[0].x+fighters[1].x)/2,half,W-half);let center=reset?target:state.mode==='paused'?prior.center:prior.center+(target-prior.center)*blend;
   // Small safety bounds keep the real tips and both bodies in the frame.
   const lo=Math.max(half,clamp(maxX+3,0,W)-half),hi=Math.min(W-half,clamp(minX-3,0,W)+half);center=lo<=hi?clamp(center,lo,hi):clamp(center,half,W-half);
   this.camera={zoom,center,tx:W/2-center*zoom,ty:H-24-GROUND*zoom,at:now,round:state.round};return this.camera;
  }
  // CSS canvas pixels, useful for checking the same weapon pose after the camera.
  projectPoint(point){const k=this.camera||{zoom:1,tx:0,ty:0};return{x:(point.x*k.zoom+k.tx)*this.width/W,y:(point.y*k.zoom+k.ty)*this.height/H};}
  background(round){
   const index=clamp(round,0,2)|0,p=PALETTES[index];
   if(!this.backgrounds.has(index)){
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d'),gradient=c.createLinearGradient(0,0,0,H);gradient.addColorStop(0,p.paper);gradient.addColorStop(1,index===2?'#d3cbdc':'#ebe0c5');c.fillStyle=gradient;c.fillRect(0,0,W,H);
    c.globalAlpha=.23;for(let y=22;y<GROUND;y+=26)line(c,0,y,W,y,p.line,1);line(c,31,0,31,GROUND,'#d28e8c',1.2);c.globalAlpha=1;
    for(let i=0;i<140;i++){const x=(i*137+47)%W,y=(i*59+11)%H;ellipse(c,x,y,.45,.35,'#4b4b4212');}
    // Taped notes and small original doodles make a workshop, not a UI panel.
    c.save();c.translate(64,44);c.rotate(-.10);c.fillStyle='#fff9eaa8';c.fillRect(-23,-19,46,40);c.fillStyle='#c8d3b6a0';c.fillRect(-13,-24,26,9);polygon(c,[[-15,10],[-2,-11],[15,9]],null,p.ink+'66',1.8);ellipse(c,5,1,4,4,null,p.ink+'66',1.4);c.restore();
    c.save();c.translate(495,49);c.rotate(.09);c.fillStyle='#fff9eaaa';c.fillRect(-26,-24,52,50);c.fillStyle='#d9bda580';c.fillRect(-15,-28,30,10);if(index===0){for(let i=0;i<3;i++)line(c,-16,-10+i*10,15,-12+i*10,p.ink+'55',1.5);star(c,15,12,6,p.accent);}else if(index===1){line(c,-12,14,10,-12,p.ink+'77',3);polygon(c,[[4,-15],[14,-18],[19,-8],[9,-4]],p.accent+'aa',p.ink+'88',1.4);}else{polygon(c,[[-13,-14],[13,-14],[10,2],[0,9],[-10,2]],'#d6b56a',p.ink+'77',1.3);line(c,0,8,0,16,p.ink+'88',2);line(c,-9,18,9,18,p.ink+'88',2);c.strokeStyle=p.ink+'66';c.lineWidth=2;c.beginPath();c.arc(-13,-7,7,Math.PI/2,Math.PI*1.5);c.stroke();c.beginPath();c.arc(13,-7,7,-Math.PI/2,Math.PI/2);c.stroke();}c.restore();
    // Flags are quiet background decoration; combat space stays clear.
    line(c,122,36,438,36,p.ink+'32',1.4);for(let i=0;i<9;i++){const x=135+i*34;polygon(c,[[x,36],[x+17,36],[x+8.5,52]],i%2?p.accent+'66':p.line+'77');}
    c.globalAlpha=.16;c.strokeStyle=p.ink;c.lineWidth=2;c.beginPath();c.ellipse(280,GROUND+1,224,24,0,0,TAU);c.stroke();c.globalAlpha=1;
    c.fillStyle=p.floor;c.fillRect(0,GROUND+9,W,H-GROUND-9);line(c,0,GROUND+8,W,GROUND+8,p.ink+'99',2);for(let i=0;i<9;i++){const x=i*78-20;line(c,x,GROUND+10,x-8,H,p.ink+'20',1);}line(c,0,GROUND+23,W,GROUND+23,'#fff3d455',1.2);
    for(const x of[17,543]){c.fillStyle=p.ink+'55';c.fillRect(x-3,124,6,GROUND-115);ellipse(c,x,123,7,5,p.accent,p.ink+'55',1.2);}line(c,20,151,540,151,p.ink+'0d',1);line(c,20,182,540,182,p.ink+'0b',1);
    if(index===2){for(const x of[75,485]){c.globalAlpha=.055;polygon(c,[[x-13,0],[x+13,0],[x+100,GROUND],[x-100,GROUND]],'#fff9e6');c.globalAlpha=1;}}
    this.backgrounds.set(index,canvas);
   }
   this.ctx.drawImage(this.backgrounds.get(index),0,0,W,H);
  }
  weaponImage(weapon){
   if(!weapon?.drawing)return null;if(this.weapons.has(weapon))return this.weapons.get(weapon);
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=320;const c=canvas.getContext('2d');c.scale(2,2);strokes(c,weapon.drawing);this.weapons.set(weapon,canvas);return canvas;
  }
  weapon(fighter,side,now){
   const pose=fighter?.weaponPose,weapon=fighter?.weapon;if(!pose||!weapon)return;const c=this.ctx,at=tip(weapon,pose),prior=this.trails.get(side);
   if(at&&fighter.attack&&!this.reduced&&prior&&now-prior.at<120){c.save();c.globalAlpha=.25;line(c,prior.x,prior.y,at.x,at.y,side==='player'?'#39b7c2':'#dc876b',7);c.restore();}
   if(at)this.trails.set(side,{...at,at:now});
   const image=this.weaponImage(weapon);if(!image)return;
   c.save();c.translate(pose.x,pose.y);c.scale(pose.facing,1);c.rotate(pose.angle);c.scale(SCALE,SCALE);c.translate(-40,-100);if(fighter.dodgeTime>0)c.globalAlpha=.5;c.drawImage(image,0,0,240,160);c.restore();
   // The grip marker is deliberately small, with its centre on the model pivot.
   ellipse(c,pose.x,pose.y,3.7,3.7,'#f5d3a5','#334955',1.3);
  }
  fighter(f,side,time,round){
   if(!f)return;const c=this.ctx,x=f.x,y=f.y||GROUND,front=f.facing||1,enemy=side==='enemy',p=PALETTES[clamp(round,0,2)|0],coat=enemy?['#cf8175','#b38cbd','#ac81b8'][round%3]:'#65a99b',dark=enemy?'#815c6d':'#416b70',outline='#304756',walk=Math.sin((f.walk||0)*7),moving=Math.min(1,Math.abs(f.vx||0)/65),leg=walk*7*moving;
   c.save();if(f.dodgeTime>0)c.globalAlpha=.52;ellipse(c,x,y+5,24,5,'#243f4128');
   line(c,x-5,y-21,x-12+leg,y-2,outline,7);line(c,x+5,y-21,x+12-leg,y-2,outline,7);line(c,x-5,y-21,x-12+leg,y-3,dark,4.1);line(c,x+5,y-21,x+12-leg,y-3,dark,4.1);ellipse(c,x-13+leg,y-1,8,4,outline);ellipse(c,x+13-leg,y-1,8,4,outline);
   line(c,x-front*7,y-43,x-front*15,y-25,outline,6);line(c,x-front*7,y-43,x-front*15,y-25,'#efc59f',3.8);ellipse(c,x-front*15,y-25,5,5,coat,outline,1.5);
   c.beginPath();c.moveTo(x-11,y-44);c.quadraticCurveTo(x,y-51,x+11,y-44);c.lineTo(x+12,y-23);c.quadraticCurveTo(x,y-17,x-12,y-23);c.closePath();c.fillStyle=f.hurt>0?'#fff8e6':coat;c.fill();c.strokeStyle=outline;c.lineWidth=2.5;c.stroke();line(c,x-9,y-29,x+9,y-29,dark,3);ellipse(c,x,y-37,3.8,4.5,'#f2dda5');
   line(c,x,y-48,x,y-51,'#efc59f',7);ellipse(c,x,y-53,13,13,'#f0cba4',outline,2.1);
   c.beginPath();c.moveTo(x-13,y-53);c.quadraticCurveTo(x-15,y-68,x,y-68);c.quadraticCurveTo(x+14,y-67,x+13,y-54);c.lineTo(x+9,y-58);c.lineTo(x-7,y-59);c.closePath();c.fillStyle=dark;c.fill();c.strokeStyle=outline;c.lineWidth=1.7;c.stroke();line(c,x-12,y-60,x+12,y-60,enemy?'#e4c18e':'#e4db9c',3.2);
   ellipse(c,x+front*5,y-53,1.7,2,'#2c3f4c');line(c,x+front*3,y-47,x+front*8,y-47,'#986c5d',1.1);ellipse(c,x-front*4,y-49,2.6,1.5,'#d99d82');
   const grip=f.weaponPose||{x:x+front*13,y:y-39};line(c,x+front*7,y-43,x+front*17,y-36,outline,7);line(c,x+front*17,y-36,grip.x,grip.y,outline,7);line(c,x+front*7,y-43,x+front*17,y-36,'#efc59f',4.4);line(c,x+front*17,y-36,grip.x,grip.y,'#efc59f',4.4);ellipse(c,grip.x,grip.y,5.3,5,coat,outline,1.7);
   c.restore();
   if(f.telegraph>0||f.intent==='windup'){
    c.save();const pulse=this.reduced?1:.78+Math.sin(time*16)*.18;c.globalAlpha=pulse;c.strokeStyle=enemy?'#cf6f53':'#267d8d';c.lineWidth=2.4;c.beginPath();c.arc(x,y-43,24,-2.8,-.3);c.stroke();line(c,x,y-94,x,y-84,enemy?'#c45d48':'#287f8d',3);ellipse(c,x,y-80,1.7,1.7,enemy?'#c45d48':'#287f8d');c.restore();
   }
   if(f.stun>0){for(let i=0;i<3;i++){const a=time*3+i*TAU/3;star(c,x+Math.cos(a)*19,y-87+Math.sin(a)*4,3.3,p.accent,a);}}
   if(f.invuln>0&&f.dodgeTime<=0){c.save();c.globalAlpha=.4;c.strokeStyle=enemy?'#c77c86':'#42a8ad';c.lineWidth=1.6;c.setLineDash([3,5]);c.beginPath();c.ellipse(x,y-36,23,41,0,0,TAU);c.stroke();c.restore();}
  }
  effects(effects,time){const c=this.ctx;for(const fx of effects||[]){const life=clamp(1-fx.age/(fx.duration||.4),0,1);if(life<=0)continue;c.save();c.globalAlpha=life;
   if(fx.type==='hit'||fx.type==='heavy'){const r=(fx.type==='heavy'?30:21)*(1-life*.4),color=fx.type==='heavy'?'#dc9367':'#efbf68';for(let i=0;i<8;i++){const a=i*TAU/8+fx.id*.4;line(c,fx.x+Math.cos(a)*r*.4,fx.y+Math.sin(a)*r*.4,fx.x+Math.cos(a)*r,fx.y+Math.sin(a)*r,color,i%2?2:3.6);}ellipse(c,fx.x,fx.y,5*life,5*life,'#fff9cf');}
   else if(fx.type==='block'){c.strokeStyle='#4f9fa6';c.lineWidth=3;c.beginPath();c.arc(fx.x,fx.y,8+(1-life)*20,-2.5,.5);c.stroke();star(c,fx.x+7,fx.y-9,5,'#fff3bd',.5);}
   else if(fx.type==='dodge'){const facing=fx.side==='enemy'?-1:1;for(let i=0;i<3;i++)line(c,fx.x-facing*(28+i*5),fx.y-30+i*9,fx.x-facing*(6+i*5),fx.y-30+i*9,'#4ca0ab',2.2);}
   else if(fx.type==='dust'){for(let i=0;i<4;i++)ellipse(c,fx.x+(i-1.5)*6,fx.y-2-(1-life)*i*4,3+life*2,2+life*2,'#bba381');}
   else if(fx.type==='slash'){c.translate(fx.x,fx.y);c.scale(fx.side==='enemy'?-1:1,1);c.strokeStyle='#f7e5b4';c.lineWidth=2.5;c.beginPath();c.arc(0,0,17+(1-life)*13,-1.7,.8);c.stroke();}
   if(Number.isFinite(fx.value)&&fx.value>0&&['hit','heavy'].includes(fx.type)){const y=fx.y-24-(1-life)*20;c.font='900 15px system-ui,sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#fff4dc';c.strokeText(String(Math.round(fx.value)),fx.x,y);c.fillStyle='#95584f';c.fillText(String(Math.round(fx.value)),fx.x,y);}
   c.restore();}}
  render(state,copy={},nowMs=0){if(this.disposed||!state)return;const c=this.ctx,time=nowMs/1000,k=this.updateCamera(state,nowMs);c.setTransform(this.dpr*this.width/W,0,0,this.dpr*this.height/H,0,0);c.globalAlpha=1;c.setLineDash([]);c.fillStyle=PALETTES[(state.round||0)%3].paper;c.fillRect(0,0,W,H);c.translate(k.tx,k.ty);c.scale(k.zoom,k.zoom);this.background(state.round||0);const p=state.player,e=state.enemy;this.fighter(p,'player',time,state.round||0);this.fighter(e,'enemy',time,state.round||0);this.weapon(p,'player',nowMs);this.weapon(e,'enemy',nowMs);this.effects(state.effects,time);
   if(state.mode==='workshop'||state.mode==='drawing'||state.mode==='editing'){c.save();c.globalAlpha=.08;c.fillStyle='#fff9e6';c.fillRect(0,0,W,H);c.restore();}
   if(state.mode==='finished'){const color=PALETTES[(state.round||0)%3].accent;for(let i=0;i<14;i++){const x=40+(i*71)%480,y=60+(i*31)%125;star(c,x,y,2.2,color,(this.reduced?0:time*.3)+i);}}
  }
  cleanup(){if(this.disposed)return;this.disposed=true;this.backgrounds.clear();this.trails.clear();this.weapons=new WeakMap();this.camera=null;}
 }
 window.AsobiDoodleVisual=DoodleVisual;
})();
