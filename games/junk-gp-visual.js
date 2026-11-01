/* Original scrapyard illustration. Every moving wheel uses the physics snapshot. */
(function(){
 'use strict';
 const W=640,H=380,TAU=Math.PI*2,INK='#243b4b',CREAM='#fff5d9';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
 const color=value=>/^#[\da-f]{6}$/i.test(value||'')?value:'#ed8653';
 const line=(c,x1,y1,x2,y2,ink=INK,width=2)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=ink;c.lineWidth=width;c.lineCap='round';c.stroke();};
 function polygon(c,points,fill,stroke=INK,width=2){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke();}}
 function ellipse(c,x,y,rx,ry,fill,stroke=INK,width=2){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function box(c,x,y,w,h,r,fill,stroke=INK,width=2){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function bolt(c,x,y,r=2.2){ellipse(c,x,y,r,r,'#dbe5d9',INK,.8);line(c,x-r*.4,y,x+r*.4,y,INK,.65);}
 function star(c,x,y,r,fill,angle=0){const p=[];for(let i=0;i<10;i++){const a=angle+i*Math.PI/5,rr=i%2?r*.45:r;p.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}polygon(c,p,fill,null);}
 function spring(c,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);if(len<2)return;const nx=-dy/len,ny=dx/len;line(c,x1,y1,x2,y2,'#354c58',4.8);c.beginPath();c.moveTo(x1,y1);for(let i=1;i<12;i++){const f=i/12,a=i%2?4:-4;c.lineTo(x1+dx*f+nx*a,y1+dy*f+ny*a);}c.lineTo(x2,y2);c.strokeStyle='#f5d765';c.lineWidth=2.5;c.lineJoin='round';c.stroke();}
 function part(c,type,x,y,angle=0,opts={}){
  const wheel=type==='wheel'||type==='big-wheel'||type==='spring-wheel',r=type==='big-wheel'?29:type==='spring-wheel'?21:20;
  c.save();c.translate(x,y);c.rotate(wheel?(opts.spin||0):angle);
  if(wheel){
   ellipse(c,1,-2,r+1,r+1,'#172f3b',null);ellipse(c,0,0,r,r,'#334c56',INK,2.2);ellipse(c,0,0,r-4,r-4,'#425d64','#83928a',1);
   for(let i=0;i<12;i++){const a=i*TAU/12;line(c,Math.cos(a)*(r-2),Math.sin(a)*(r-2),Math.cos(a+.10)*(r-5),Math.sin(a+.10)*(r-5),'#1d333d',2.2);}
   const hub=type==='spring-wheel'?'#f0c962':type==='big-wheel'?'#6db9ae':'#e9aa6c';ellipse(c,0,0,r*.49,r*.49,hub,INK,1.4);
   for(let i=0;i<5;i++){const a=i*TAU/5;line(c,Math.cos(a)*3,Math.sin(a)*3,Math.cos(a)*r*.40,Math.sin(a)*r*.40,'#f8e8b9',2.2);}
   ellipse(c,0,0,4,4,'#d5ddd0',INK,1.3);ellipse(c,0,0,1.3,1.3,'#304956',null);
   c.globalAlpha=.35;line(c,-r*.6,r*.50,-r*.25,r*.72,'#d0ddd0',2);c.globalAlpha=1;
  }else if(type==='fan'){
   box(c,-9,-13,18,26,4,'#69b6ad',INK,2);box(c,-18,-8,10,16,2,'#e6b26d',INK,1.5);line(c,-13,-5,-13,5,INK,1.5);
   ellipse(c,3,0,17,17,'#cee0c4',INK,2.3);c.save();c.translate(3,0);c.rotate(-(opts.time||0)*((opts.active?24:3)));for(let i=0;i<3;i++){c.save();c.rotate(i*TAU/3);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(10,-11,18,-5,8,3);c.quadraticCurveTo(2,7,0,0);c.fillStyle='#74aaa3';c.fill();c.strokeStyle=INK;c.lineWidth=1;c.stroke();c.restore();}c.restore();ellipse(c,3,0,3,3,'#f3c368',INK,1.2);
   c.globalAlpha=.55;for(let i=-1;i<=1;i++)line(c,-11,i*8,17,i*8,'#6b8d88',.8);ellipse(c,3,0,12,12,null,'#668b85',.7);c.globalAlpha=1;
   // This arrow points along the actual thrust direction, not exhaust direction.
   polygon(c,[[25,-4],[32,0],[25,4]],'#d77650',null);line(c,19,0,29,0,'#d77650',2);
   if(opts.active){c.save();c.globalAlpha=.55;for(let i=0;i<3;i++){const phase=((opts.time||0)*5+i*.27)%1;line(c,-23-phase*11,-7+i*7,-31-phase*11,-7+i*7,'#ecdbc0',1.8);}c.restore();}
  }else if(type==='ballast'){
   polygon(c,[[-15,-12],[15,-12],[12,10],[-12,10]],'#738892',INK,2);box(c,-6,9,12,6,2,null,INK,2);line(c,-10,4,8,4,'#a4b0ad',2);line(c,-11,-5,8,-5,'#536c79',2);bolt(c,0,-1,2.7);
  }
  c.restore();
 }
 function chassis(c,draft,time=0){
  const paint=color(draft?.color);ellipse(c,-2,-8,59,9,'#173b4126',null);
  // Outline follows the 124 × 26 rigid hull. Insets and nose are paint only.
  box(c,-62,-13,124,26,7,paint,INK,2.4);box(c,-55,-8,51,15,3,'#f6d789',INK,1.2);line(c,-48,-2,-12,-2,'#d18f5b',2);line(c,-47,3,-15,3,'#d18f5b',1.6);line(c,20,-6,48,-6,'#9c5d4866',2);
  polygon(c,[[40,11],[59,8],[60,-3],[43,-1]],'#f4c269',INK,1.3);line(c,55,-3,55,7,'#fff1bc',3);for(const[x,y]of[[-55,-8],[-55,8],[33,-8],[33,8]])bolt(c,x,y);
  // Little workshop stickers and a visible rear engine make each build a toy.
  box(c,-44,14,23,12,3,'#618e89',INK,1.4);line(c,-40,19,-27,19,'#a3c5b2',2);line(c,-34,26,-34,32,INK,3);line(c,-34,32,-27,32,INK,3);
  c.save();c.translate(30,12);c.rotate(Math.sin(time*11)*.008);line(c,-5,3,-10,16,INK,5);line(c,-5,3,-10,16,'#6d9fa1',3);ellipse(c,-9,24,8.5,9.5,'#eac599',INK,1.7);c.beginPath();c.arc(-9,26,10,0,Math.PI);c.lineTo(-19,24);c.lineTo(0,24);c.closePath();c.fillStyle='#f3d56e';c.fill();c.strokeStyle=INK;c.lineWidth=1.8;c.stroke();line(c,-19,24,3,24,INK,2.3);line(c,-11,25,-7,34,'#ed985c',2.8);ellipse(c,-3,23,1.4,1.8,INK,null);line(c,-3,18,0,18,'#a47461',1);line(c,-6,9,7,9,INK,3);line(c,4,10,9,16,INK,2);ellipse(c,11,16,5.4,5.4,null,INK,1.6);c.restore();
  star(c,-51,-1,4.3,'#f9f0c4',.2);
 }
 function wheelLocal(w,v){const o=v?.origin||{x:v?.x||0,y:v?.y||0},a=v?.angle||0,dx=w.x-o.x,dy=w.y-o.y;return{x:Math.cos(a)*dx+Math.sin(a)*dy,y:-Math.sin(a)*dx+Math.cos(a)*dy};}
 function drawMachine(c,draft,opts={}){
  if(!c||!draft)return;const scale=clamp(opts.scale??1,.05,10),x=opts.x??0,y=opts.y??0,a=Number.isFinite(opts.angle)?opts.angle:0,vehicle=opts.vehicle,time=opts.time||0;
  c.save();c.translate(x,y);c.scale(scale,-scale);c.rotate(a);c.lineCap='round';c.lineJoin='round';
  const parts=draft.parts||[],wheels=parts.filter(p=>p.type.includes('wheel')),other=parts.filter(p=>!p.type.includes('wheel'));
  for(const p of parts){const wx=clamp(p.x,-96,96),wy=clamp(p.y,-50,65),anchorX=clamp(wx,-52,52),anchorY=clamp(wy,-9,9);line(c,anchorX,anchorY,wx,wy,'#233e4b',5);line(c,anchorX,anchorY,wx,wy,'#adc1b0',2);bolt(c,anchorX,anchorY,2.4);}
  chassis(c,draft,time);
  for(const p of other)part(c,p.type,p.x,p.y,p.angle||0,{time,active:!!vehicle&&Math.abs(vehicle.throttle||0)>.01});
  for(const p of wheels){const actual=vehicle?.wheels?.find(w=>w.id===p.id),at=actual?wheelLocal(actual,vehicle):{x:p.x,y:p.y};if(p.type==='spring-wheel'){spring(c,p.x,p.y+10,at.x,at.y);if(Math.hypot(at.x-p.x,at.y-p.y)<5)spring(c,p.x,p.y+22,at.x,at.y+4);}else if(actual&&Math.hypot(at.x-p.x,at.y-p.y)>1){line(c,p.x,p.y,at.x,at.y,'#344f5a',5);line(c,p.x,p.y,at.x,at.y,'#d5c18b',2);}part(c,p.type,at.x,at.y,p.angle||0,{spin:actual?.spin??0,time});}
  const selected=parts.find(p=>p.id===opts.selectedId);if(selected){c.save();c.strokeStyle='#207d83';c.lineWidth=1.8;c.setLineDash([4,4]);ellipse(c,selected.x,selected.y,(selected.type==='big-wheel'?28:20)+8,(selected.type==='big-wheel'?28:20)+8,null,'#207d83',1.8);c.restore();}
  if(opts.showCom){const s=opts.stats||window.AsobiJunkPhysics?.stats(draft),com=s?.com;if(com){ellipse(c,com.x,com.y,5,5,CREAM,'#d15d4a',1.5);line(c,com.x-8,com.y,com.x+8,com.y,'#d15d4a',1.2);line(c,com.x,com.y-8,com.x,com.y+8,'#d15d4a',1.2);}}
  c.restore();
 }
 class JunkVisual{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.disposed=false;this.camera=null;this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
  resize(width,height,dpr){if(this.disposed)return;const b=this.canvas.getBoundingClientRect();this.width=clamp(width||b.width||W,120,2000);this.height=clamp(height||b.height||this.width*H/W,80,1500);this.dpr=clamp(dpr||window.devicePixelRatio||1,1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);}
  sky(c,heat,time,cam){
   const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,heat?'#d0e3d1':'#b9ded7');g.addColorStop(.7,'#f3edce');g.addColorStop(1,'#f6d6a3');c.fillStyle=g;c.fillRect(0,0,W,H);ellipse(c,529,62,32,32,'#f7d988',null);ellipse(c,529,62,39,39,null,'#f4e5b344',7);
   const scroll=cam.x*.10;for(let i=-1;i<7;i++){const x=((i*158-scroll)%1106+1106)%1106-210,y=45+(i*37%53);c.save();c.globalAlpha=.52;ellipse(c,x,y,34,9,'#fff9e5',null);ellipse(c,x-11,y-5,17,11,'#fff9e5',null);ellipse(c,x+10,y-6,21,13,'#fff9e5',null);c.restore();}
   polygon(c,[[0,183],[60,144],[108,174],[177,128],[241,164],[304,121],[379,171],[455,130],[523,170],[586,142],[640,172],[640,H],[0,H]],'#8cb7a95c',null);
   const skylineShift=cam.x*.20;for(let i=-1;i<10;i++){const wx=i*110,x=((wx-skylineShift)%1210+1210)%1210-140,h=26+((i+20)*31%48),base=226;box(c,x,base-h,56,h,2,'#6e9d9860',null);polygon(c,[[x-4,base-h],[x+28,base-h-18],[x+60,base-h]],'#729d9460',null);for(let j=0;j<3;j++)box(c,x+8+j*15,base-h+10,7,10,1,'#d8d6ae70',null);}
   const near=cam.x*.42;for(let i=-1;i<8;i++){const x=((i*145-near)%1305+1305)%1305-160,base=256+(i%2)*5;c.save();c.globalAlpha=.54;for(let n=0;n<3;n++){ellipse(c,x+n*18,base-8,15,15,'#677e76',null);ellipse(c,x+n*18,base-8,7,7,'#c5cfb0',null);}box(c,x+55,base-33,42,31,3,i%2?'#b39e7d':'#9ca891',null);line(c,x+59,base-26,x+91,base-26,'#e0d7ae',2);c.restore();}
   // Crane and bunting sit behind the real terrain, with no implied obstacles.
   const cx=566-((cam.x*.08)%480);line(c,cx,102,cx,228,'#648b8466',4);line(c,cx-6,107,cx+94,118,'#648b8466',4);line(c,cx,102,cx+65,72,'#648b8466',2);line(c,cx+65,72,cx+94,118,'#648b8466',2);line(c,cx+82,117,cx+82,159,'#648b8466',1.5);line(c,cx+77,160,cx+82,166,'#648b8466',2);line(c,cx+82,166,cx+88,159,'#648b8466',2);
  }
  terrain(c,heat,cam){
   const P=window.AsobiJunkPhysics,ground=x=>P?.terrain(x,heat)||0,left=cam.x-180/cam.zoom-40,right=cam.x+(W-180)/cam.zoom+40;
   c.save();c.translate(180-cam.x*cam.zoom,cam.ty);c.scale(cam.zoom,-cam.zoom);c.beginPath();c.moveTo(left,-1000);for(let x=left;x<=right;x+=7)c.lineTo(x,ground(x));c.lineTo(right,ground(right));c.lineTo(right,-1000);c.closePath();c.fillStyle=heat?'#c09e72':'#c7ab79';c.fill();
   c.save();c.clip();for(let i=Math.floor(left/53);i<right/53+1;i++){const x=i*53,y=ground(x)-21-(Math.abs(i*31)%50);ellipse(c,x,y,3+Math.abs(i%3),2,'#947b5b50',null);line(c,x+10,y-13,x+17,y-11,'#e6c99599',1.2);}c.restore();
   c.beginPath();for(let x=left;x<=right;x+=5){const y=ground(x);x===left?c.moveTo(x,y):c.lineTo(x,y);}c.lineTo(right,ground(right));c.strokeStyle='#3f6661';c.lineWidth=10;c.lineCap='round';c.lineJoin='round';c.stroke();c.strokeStyle='#82b791';c.lineWidth=5;c.stroke();
   const first=Math.floor((left-180)/800)*800+180;for(let x=first;x<=right;x+=800){if(x<350)continue;const y=ground(x);line(c,x,y+4,x,y+56,'#4e6d67',2);polygon(c,[[x,y+56],[x+30,y+49],[x,y+42]],Math.round((x-180)/800)%2?'#e49565':'#73b7ab',INK,1);c.save();c.translate(x-3,y+29);c.scale(1,-1);c.font='bold 9px system-ui,sans-serif';c.fillStyle='#45645f';c.textAlign='right';c.fillText(Math.max(0,Math.round((x-180)/10))+'m',0,0);c.restore();}
   c.restore();
  }
  render(state,copy={},nowMs=0){
   if(this.disposed||!state)return;const c=this.ctx,v=state.vehicle,heat=state.heat||0,time=this.reduced?0:(v?.time??nowMs/1000),origin=v?.origin||{x:v?.x||180,y:v?.y||70},ground=window.AsobiJunkPhysics?.terrain(origin.x,heat)||0,prior=this.camera;
   const dt=prior?clamp((nowMs-prior.at)/1000,0,.08):.016,blend=1-Math.exp(-dt*7),reset=!prior||prior.heat!==heat||state.mode==='countdown'&&prior.mode!=='countdown',zoom=1.28,targetX=origin.x,targetY=278+ground*zoom;
   const camera={x:reset?targetX:prior.x+(targetX-prior.x)*blend,ty:reset?targetY:prior.ty+(targetY-prior.ty)*blend,zoom,heat,at:nowMs,mode:state.mode};
   // Keep genuine large jumps visible without inventing motion or changing poses.
   if(v)camera.ty=Math.max(camera.ty,70+origin.y*zoom);this.camera=camera;
   c.setTransform(this.dpr*this.width/W,0,0,this.dpr*this.height/H,0,0);c.globalAlpha=1;c.setLineDash([]);this.sky(c,heat,time,camera);this.terrain(c,heat,camera);
   if(v){const x=180+(origin.x-camera.x)*zoom,y=camera.ty-origin.y*zoom;
    const altitude=Math.max(0,origin.y-ground);c.save();c.globalAlpha=clamp(1-altitude/240,.08,.3);ellipse(c,x,camera.ty-ground*zoom-4,70*zoom,7*zoom,'#304d45',null);c.restore();
    if(v.grounded&&Math.abs(v.vx||v.speed||0)>40&&!this.reduced){c.save();c.globalAlpha=.24;for(let i=0;i<4;i++){const phase=(time*4+i*.25)%1;ellipse(c,x-66*zoom-phase*26,camera.ty-ground*zoom-9-phase*8,5+phase*6,3+phase*3,'#e8dab9',null);}c.restore();}
    drawMachine(c,state.draft,{x,y,scale:zoom,angle:v.angle||0,vehicle:v,time:this.reduced?0:time});
    if(!v.grounded&&altitude>105){c.save();c.globalAlpha=.65;star(c,x-70,y-17,5,'#fff9df',time);star(c,x+65,y+8,3,'#e0a568',-time);c.restore();}
   }else drawMachine(c,state.draft,{x:230,y:250,scale:1.25,time});
   for(const fx of state.effects||[]){const age=fx.age||0,life=clamp(1-age/(fx.duration||.55),0,1);if(!life)continue;const x=180+((fx.x??origin.x)-camera.x)*zoom,y=camera.ty-(fx.y??ground)*zoom;c.save();c.globalAlpha=life;if(fx.type==='land'||fx.type==='recover'||fx.type==='coin'||fx.type==='checkpoint'){for(let i=0;i<6;i++){const a=i*TAU/6;star(c,x+Math.cos(a)*(20+age*45),y+Math.sin(a)*(12+age*28),3*life,fx.type==='recover'?'#73b8b0':'#f4c864',a+time);}}else if(fx.type==='jump'){for(let i=0;i<3;i++)line(c,x-30-i*7,y-9+i*9,x-45-i*7,y-12+i*9,'#f8f0cc',2);}else if(fx.type==='dust'){for(let i=0;i<4;i++)ellipse(c,x+(i-1.5)*(8+age*18),y-age*15-i*2,4+age*9,3+age*4,'#e4d4af',null);}c.restore();}
   const overlay=c.createLinearGradient(0,H-38,0,H);overlay.addColorStop(0,'#ad8f5a00');overlay.addColorStop(1,'#94795433');c.fillStyle=overlay;c.fillRect(0,H-38,W,38);
  }
  projectPoint(point){const cam=this.camera||{x:180,ty:278,zoom:1.28};return{x:(180+(point.x-cam.x)*cam.zoom)*this.width/W,y:(cam.ty-point.y*cam.zoom)*this.height/H};}
  cleanup(){this.disposed=true;this.camera=null;}
 }
 JunkVisual.drawMachine=drawMachine;
 JunkVisual.drawPart=(c,type,x,y,angle=0,opts={})=>{c.save();c.translate(x,y);c.scale(opts.scale||1,-(opts.scale||1));part(c,type,0,0,angle,opts);c.restore();};
 JunkVisual.exportCard=(draft,result={},copy={})=>{
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=960;const c=canvas.getContext('2d');c.fillStyle='#f7f0dc';c.fillRect(0,0,720,960);c.strokeStyle='#cfdbca';c.lineWidth=1;for(let x=0;x<720;x+=24)line(c,x,0,x,960,'#b9cbbd40',1);for(let y=0;y<960;y+=24)line(c,0,y,720,y,'#b9cbbd40',1);
  box(c,30,30,660,900,24,'#fff8e8',INK,3);box(c,49,49,622,90,15,'#345c5d',null);c.fillStyle='#f3cd77';c.font='900 17px system-ui,sans-serif';c.textAlign='center';c.fillText('ASOBI YOKOCHO / GARAGE COLLECTION',360,82);c.fillStyle='#fff6dd';c.font='900 30px system-ui,sans-serif';c.fillText(copy.cardTitle||'GARAKUTA MACHINE GP',360,119);
  c.save();c.beginPath();c.roundRect(58,163,604,308,18);c.clip();c.fillStyle='#d8e7cf';c.fillRect(58,163,604,308);for(let i=0;i<5;i++){box(c,80+i*129,370-(i%3)*23,75,80,4,'#acc5b4',null);}c.fillStyle='#c9b280';c.fillRect(58,398,604,73);line(c,58,399,662,399,'#5c8972',8);const extents=(draft.parts||[]).map(p=>({low:p.y-(window.AsobiJunkPhysics?.parts[p.type]?.radius||20),high:p.y+(window.AsobiJunkPhysics?.parts[p.type]?.radius||20)})),low=Math.min(-13,...extents.map(p=>p.low)),high=Math.max(47,...extents.map(p=>p.high)),machineScale=Math.min(2.25,226/(high-low));drawMachine(c,draft,{x:360,y:400+low*machineScale,scale:machineScale});c.restore();
  const safeName=String(draft?.name||copy.blankName||'MY MACHINE').replace(/[\u0000-\u001f]/g,'');c.fillStyle=INK;let fontSize=32;c.font='900 '+fontSize+'px system-ui,sans-serif';while(c.measureText(safeName).width>570&&fontSize>18){fontSize--;c.font='900 '+fontSize+'px system-ui,sans-serif';}c.fillText(safeName,360,520);
  const score=Number.isFinite(result.score)?Math.max(0,Math.round(result.score)):0;box(c,65,547,590,136,17,'#e7efda',null);c.fillStyle='#456665';c.font='bold 17px system-ui,sans-serif';c.fillText(copy.score||'TOTAL DISTANCE',360,581);c.fillStyle='#284d52';c.font='900 65px system-ui,sans-serif';c.fillText((score/10).toLocaleString(undefined,{maximumFractionDigits:1})+' m',360,652);
  const heats=Array.isArray(result.results)?result.results:[];c.textAlign='left';c.font='bold 18px system-ui,sans-serif';c.fillStyle='#526d67';c.fillText(copy.cardFooter||'Your machine. Your way.',77,728);c.font='bold 17px system-ui,sans-serif';for(let i=0;i<Math.min(2,heats.length);i++){const r=heats[i],distance=Number.isFinite(r.score)?r.score/10:Math.max(0,(r.distance||0)-(r.recoveries||0)*20);c.fillText(copy.raceNames?.[i]||('HEAT '+(i+1)),78,771+i*37,400);c.textAlign='right';c.fillText(distance.toLocaleString(undefined,{maximumFractionDigits:1})+' m',642,771+i*37);c.textAlign='left';}
  c.fillStyle='#496c69';c.font='bold 16px system-ui,sans-serif';c.textAlign='center';c.fillText('asobi-yokocho.pages.dev',360,874);c.font='bold 12px system-ui,sans-serif';c.fillStyle='#7d8d7c';c.fillText(copy.cardFooter||'FREE BROWSER GAME / ASOBI YOKOCHO',360,901);return canvas;
 };
 window.AsobiJunkVisual=JunkVisual;
})();
