/* Original little food-shop world. Moving food uses the unchanged rigid-body poses. */
(function(){
'use strict';
const W=640,H=430,TAU=Math.PI*2,INK='#513a35',CREAM='#fff4dc';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const safeColor=value=>/^#[\da-f]{6}$/i.test(value||'')?value:'#df715b';
function line(c,x1,y1,x2,y2,color=INK,width=2){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
function box(c,x,y,w,h,r,fill,stroke=INK,width=1.6){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function ellipse(c,x,y,rx,ry,fill,stroke=INK,width=1.6){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function polygon(c,points,fill,stroke=INK,width=1.6){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke();}}
function star(c,x,y,r,fill,rotation=0){const points=[];for(let i=0;i<10;i++){const a=rotation+i*Math.PI/5,v=i%2?r*.45:r;points.push([x+Math.cos(a)*v,y+Math.sin(a)*v]);}polygon(c,points,fill,null);}
function spec(type){return window.AsobiBurgerPhysics?.ingredients?.[type]||{w:86,h:15,width:86,height:15};}
function ingredient(c,type,x,y,angle=0,opts={}){
 const s=spec(type),w=s.w||s.width,h=s.h||s.height,left=-w/2,bottom=-h/2;
 c.save();c.translate(x,y);c.rotate(angle);c.lineCap='round';c.lineJoin='round';
 if(type==='bun-bottom'){
  box(c,left,bottom,w,h,Math.min(7,h/2),'#e5a358',INK,1.8);box(c,left+3,bottom+3,w-6,Math.max(3,h-5),4,'#f5c878',null);line(c,left+9,bottom+4,w/2-10,bottom+4,'#b87945',1.2);line(c,left+9,h/2-3,w/2-9,h/2-3,'#fff0ba',2);
 }else if(type==='bun-top'){
  c.beginPath();c.moveTo(left+6,bottom);c.quadraticCurveTo(left,bottom,left,bottom+6);c.bezierCurveTo(left+1,h/2,-w*.31,h/2,0,h/2);c.bezierCurveTo(w*.31,h/2,w/2-1,h/2,w/2,bottom+6);c.quadraticCurveTo(w/2,bottom,w/2-6,bottom);c.closePath();c.fillStyle='#ecb164';c.fill();c.strokeStyle=INK;c.lineWidth=1.8;c.stroke();line(c,left+8,bottom+4,w/2-8,bottom+4,'#c48749',1.5);
  for(const [sx,sy,a]of[[-29,0,-.4],[-13,7,.35],[6,1,-.3],[24,5,.5],[-2,9,.1],[35,-2,-.4],[-37,-3,.2]]){c.save();c.translate(sx,sy);c.rotate(a);ellipse(c,0,0,2.3,.8,'#fff1bf',null);c.restore();}
 }else if(type==='patty'){
  box(c,left,bottom,w,h,5,'#79432e',INK,1.7);box(c,left+3,bottom+3,w-6,h-5,4,'#9a5639',null);for(let i=0;i<6;i++){const xx=left+9+i*(w-18)/5;line(c,xx-3,bottom+4,xx+3,h/2-3,'#573629',1.6);}for(let i=0;i<8;i++)ellipse(c,left+7+i*(w-14)/7,(i%3-1)*h*.22,1.4,.75,'#c87b4b',null);
 }else if(type==='cheese'){
  polygon(c,[[left,bottom+2],[left+6,h/2],[w/2,h/2],[w/2-1,bottom+2],[w*.27,bottom],[w*.14,bottom+2],[-w*.1,bottom+1],[-w*.3,bottom]],'#f6c942',INK,1.1);line(c,left+10,1,w/2-11,1,'#ffe88d',1.2);ellipse(c,-15,0,3,.9,'#df9d2e',null);ellipse(c,19,0,2,.8,'#df9d2e',null);
 }else if(type==='lettuce'){
  c.beginPath();c.moveTo(left,bottom+3);for(let i=0;i<=12;i++){const xx=left+i*w/12,yy=h/2-(i%2?3:0);c.lineTo(xx,yy);}for(let i=12;i>=0;i--){const xx=left+i*w/12,yy=bottom+(i%2?2:0);c.lineTo(xx,yy);}c.closePath();c.fillStyle='#83ae52';c.fill();c.strokeStyle='#416b3b';c.lineWidth=1.4;c.stroke();for(let i=0;i<5;i++){const xx=left+12+i*(w-24)/4;line(c,xx-6,0,xx+4,2,'#c2d789',1.4);}
 }else if(type==='tomato'){
  box(c,left,bottom,w,h,Math.min(5,h/2),'#e66d54','#9f473a',1.5);box(c,left+4,bottom+2,w-8,h-4,4,'#f68c69',null);for(let i=0;i<6;i++){const xx=left+10+i*(w-20)/5;ellipse(c,xx,0,3.8,Math.max(1,h*.23),'#e56f56',null);line(c,xx-1,-1,xx+1,1,'#ffe6a4',1.4);}line(c,left+9,h/2-2,w/2-10,h/2-2,'#ffc198',1.4);
 }else if(type==='onion'){
  box(c,left,bottom,w,h,4,'#c68fa8','#96627c',1.4);box(c,left+4,bottom+2,w-8,h-4,3,'#f3d9d9',null);for(let i=0;i<6;i++){const xx=left+8+i*(w-16)/5;c.beginPath();c.moveTo(xx,bottom+2);c.quadraticCurveTo(xx+4,0,xx,h/2-2);c.strokeStyle='#b57e9a';c.lineWidth=1;c.stroke();}
 }else if(type==='egg'){
  box(c,left,bottom,w,h,7,'#fff2ce','#bfaa79',1.4);ellipse(c,3,0,w*.20,h*.41,'#f3bd39','#db9c27',1);ellipse(c,0,1,w*.12,h*.22,'#ffe18a',null);for(let i=0;i<5;i++)ellipse(c,left+9+i*(w-18)/4,(i%2?1:-2),1.2,.6,'#d2b879',null);
 }else box(c,left,bottom,w,h,4,'#b7bd82',INK,1.4);
 if(opts.selected){c.save();c.setLineDash([4,3]);box(c,left-5,bottom-5,w+10,h+10,6,null,'#258e8a',1.7);c.restore();}
 c.restore();
}
function layout(draft){return window.AsobiBurgerPhysics?.layout(draft)||[];}
function drawBurger(c,draft,opts={}){
 if(!c||!draft)return;const scale=clamp(opts.scale??1,.05,10),layers=layout(draft);c.save();c.translate(opts.x??0,opts.y??0);c.scale(scale,-scale);
 if(opts.tray!==false){ellipse(c,0,-8,73,6,'#56433618',null);box(c,-66,-10,132,10,4,safeColor(draft.color),INK,2);line(c,-61,-2,61,-2,'#fff0d9',2);}
 for(const layer of layers)ingredient(c,layer.type,layer.x,layer.y,0,{selected:layer.id===opts.selectedId});
 if(opts.showCom){const com=window.AsobiBurgerPhysics?.stats(draft)?.com;if(com){ellipse(c,com.x,com.y,4.2,4.2,CREAM,'#db6e50',1.3);line(c,com.x-7,com.y,com.x+7,com.y,'#db6e50',1.3);line(c,com.x,com.y-7,com.x,com.y+7,'#db6e50',1.3);}}
 c.restore();
}
function chef(c,x,ground,tray,time,careful,paint){
 const bob=Math.sin(time*(careful?7:11))*(careful?.5:1.2),stride=Math.sin(time*(careful?7:11))*(careful?5:9),cx=x-33;
 c.save();c.translate(cx,ground);c.scale(1,.82);line(c,-9,28,-12+stride,6,INK,8);line(c,9,28,13-stride,6,INK,8);ellipse(c,-13+stride,4,9,4,'#4e5147',INK,1.4);ellipse(c,16-stride,4,9,4,'#4e5147',INK,1.4);
 box(c,-18,26+bob,37,37,9,'#fff0d4',INK,2);polygon(c,[[-13,49+bob],[15,49+bob],[20,27],[-18,27]],paint,INK,1.6);line(c,-5,36,8,36,'#f5caa6',2);
 const shoulders=[{x:cx-15,y:ground+(57+bob)*.82},{x:cx+16,y:ground+(57+bob)*.82}],ends=[{x:tray.x-tray.w*.36,y:tray.y-6},{x:tray.x+tray.w*.36,y:tray.y-6}];c.restore();
 for(let i=0;i<2;i++){const a=shoulders[i],b=ends[i];c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo(a.x+(i?16:-10),a.y+20,b.x,b.y);c.strokeStyle=INK;c.lineWidth=7;c.lineCap='round';c.stroke();c.strokeStyle='#efc598';c.lineWidth=4.5;c.stroke();ellipse(c,b.x,b.y,4,3,'#efc598',INK,1.1);}
 c.save();c.translate(cx,ground+bob);c.scale(1,.82);ellipse(c,0,75,15,17,'#f0c99b',INK,1.7);ellipse(c,13,72,4,4,'#f0c99b',INK,1.2);line(c,-7,69,7,69,'#b27a5a',1.1);ellipse(c,4,76,1.5,1.7,INK,null);line(c,3,82,8,82,INK,1);ellipse(c,-7,71,4,2,'#e79d80',null);box(c,-18,87,36,10,4,'#fff8e9',INK,1.6);ellipse(c,-9,102,11,9,'#fff8e9',INK,1.6);ellipse(c,5,106,12,10,'#fff8e9',INK,1.6);ellipse(c,15,100,9,8,'#fff8e9',INK,1.6);box(c,-15,90,31,10,2,'#fff8e9',null);line(c,-12,91,13,91,'#d3c7aa',1);c.restore();
}
class BurgerVisual{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.disposed=false;this.camera=null;this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
 resize(width,height,dpr){if(this.disposed)return;const r=this.canvas.getBoundingClientRect();this.width=clamp(width||r.width||W,120,2000);this.height=clamp(height||r.height||this.width*H/W,90,1600);this.dpr=clamp(dpr||window.devicePixelRatio||1,1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);}
 backdrop(c,camera,heat,time){
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,heat?'#e7ead8':'#cfe6e0');g.addColorStop(.75,'#fff0cd');g.addColorStop(1,'#e4cda4');c.fillStyle=g;c.fillRect(0,0,W,H);ellipse(c,562,56,27,27,'#f4d581',null);ellipse(c,562,56,34,34,null,'#fff1ba66',4);
  for(let i=0;i<5;i++){const x=((i*185-camera.x*.08)%925+925)%925-160,y=38+(i%3)*19;ellipse(c,x,y,30,7,'#fff9dfbb',null);ellipse(c,x-8,y-4,16,8,'#fff9dfbb',null);ellipse(c,x+10,y-4,18,9,'#fff9dfbb',null);}
  const skyline=camera.x*.13;for(let i=-1;i<9;i++){const x=((i*100-skyline)%1000+1000)%1000-130,height=58+(i+11)%4*19;box(c,x,260-height,77,height,3,'#a7bfb15b',null);for(let k=0;k<3;k++)box(c,x+10+k*20,270-height,9,16,2,'#f7e5b866',null);}
  const shift=camera.x*.42;for(let i=-2;i<7;i++){const x=((i*172-shift)%1376+1376)%1376-200,base=307,wall=i%2?'#efcfad':'#e5d9b6',awning=i%3?'#d57c65':'#6a9e8e';box(c,x,146,152,base-146,3,wall,'#b5987c',1.3);box(c,x+6,136,140,27,4,'#f9e9c9','#b5987c',1.3);c.save();c.translate(x+76,154);c.fillStyle='#7d6956';c.font='900 10px system-ui,sans-serif';c.textAlign='center';c.fillText(i%3?'YOKOCHO DELI':'BAKERY',0,0);c.restore();box(c,x+20,187,110,87,3,'#729c926b','#ab947b',1.1);line(c,x+74,189,x+74,272,'#e8d7b6',3);line(c,x+22,232,x+128,232,'#e8d7b6',2);polygon(c,[[x+3,165],[x+149,165],[x+158,191],[x-6,191]],awning,'#a18168',1);for(let k=0;k<8;k++)box(c,x-4+k*20,184,18,12,[0,0,5,5],k%2?awning:'#f9e8cc',null);box(c,x+59,261,29,44,2,'#c6ab7e','#9c866c',1);ellipse(c,x+75,280,7,9,'#76988a',null);}
  // Small original street details remain behind physical food and the tray.
  const lamp=556-((camera.x*.29)%690);line(c,lamp,192,lamp,336,'#9f9d7c',4);line(c,lamp-4,192,lamp+28,192,'#9f9d7c',3);box(c,lamp+18,190,18,24,5,'#f9df96','#a79a73',1.2);
  const catX=87-((camera.x*.25)%760);ellipse(c,catX,325,14,8,'#b79470',INK,1);ellipse(c,catX-7,316,8,8,'#bd9d78',INK,1);polygon(c,[[catX-14,312],[catX-13,303],[catX-7,309]],'#bd9d78',INK,1);polygon(c,[[catX-7,309],[catX-2,302],[catX+1,313]],'#bd9d78',INK,1);line(c,catX+9,326,catX+23,321,'#a48264',4);ellipse(c,catX-10,317,1,1,INK,null);ellipse(c,catX-4,317,1,1,INK,null);
  c.save();c.globalAlpha=.55;line(c,0,102,W,73,'#b39470',1);for(let i=0;i<17;i++){const x=i*42-15,y=102-x*29/W;polygon(c,[[x,y],[x+19,y-1],[x+10,y+17]],i%3===0?'#d67e67':i%3===1?'#8eae87':'#e4bc64',null);}c.restore();
 }
 ground(c,camera){
  const P=window.AsobiBurgerPhysics,ground=x=>{const value=P?.route?.(x/6);return typeof value==='number'?value:value?.y||value?.height||0;},left=camera.x-camera.cx/camera.zoom-50,right=camera.x+(W-camera.cx)/camera.zoom+50;
  c.save();c.translate(camera.cx-camera.x*camera.zoom,camera.sy);c.scale(camera.zoom,-camera.zoom);c.beginPath();c.moveTo(left,-1000);for(let x=left;x<=right;x+=6)c.lineTo(x,ground(x));c.lineTo(right,ground(right));c.lineTo(right,-1000);c.closePath();c.fillStyle='#dbc79f';c.fill();
  c.beginPath();for(let x=left;x<=right;x+=5)x===left?c.moveTo(x,ground(x)):c.lineTo(x,ground(x));c.lineTo(right,ground(right));c.strokeStyle='#9c9676';c.lineWidth=10;c.stroke();c.strokeStyle='#f3e2bb';c.lineWidth=5;c.stroke();
  for(let i=Math.floor(left/40);i<right/40+1;i++){const x=i*40,y=ground(x);line(c,x,y-5,x+1,y-20,'#c2ac86',1);line(c,x+3,y-21,x+36,y-21,'#ead7ae',1);}
  c.restore();
 }
 render(state,copy={},nowMs=0){
  if(this.disposed||!state)return;const c=this.ctx,d=state.delivery,time=this.reduced?0:(Number.isFinite(state.elapsed)?state.elapsed:nowMs/1000),stats=window.AsobiBurgerPhysics?.stats(state.draft),heat=state.heat||0;
  const zoom=clamp((H-72)/(Math.max(60,stats?.height||100)+115),.65,1.55),chefX=d?.chefX??((d?.distance||0)*6),routeY=d?.routeY||0;
  this.camera={x:chefX,cx:W*.44,sy:H-28+routeY*zoom,zoom,heat,at:nowMs};const camera=this.camera;
  c.setTransform(this.dpr*this.width/W,0,0,this.dpr*this.height/H,0,0);c.globalAlpha=1;c.setLineDash([]);this.backdrop(c,camera,heat,time);this.ground(c,camera);
  c.save();c.translate(camera.cx-camera.x*zoom,camera.sy);c.scale(zoom,-zoom);
  const tray=d?.tray||{x:chefX,y:100,w:128,h:10,angle:0},paint=safeColor(state.draft?.color);ellipse(c,chefX-18,routeY+1,52,5,'#654e3920',null);chef(c,chefX,routeY,tray,time,!!d?.careful,paint);
  c.save();c.translate(tray.x,tray.y);c.rotate(tray.angle||0);box(c,-tray.w/2,-tray.h/2,tray.w,tray.h,3,paint,INK,1.8);line(c,-tray.w/2+5,tray.h/2-1,tray.w/2-5,tray.h/2-1,'#ffe8bf',1.7);c.restore();
  if(d?.bodies){for(const body of d.bodies){if(!Number.isFinite(body.x+body.y+body.angle)||Math.abs(body.x-chefX)>850)continue;c.save();if(body.lost)c.globalAlpha=.65;ingredient(c,body.type,body.x,body.y,body.angle||0);c.restore();}}
  else for(const item of layout(state.draft))ingredient(c,item.type,tray.x+item.x,tray.y+tray.h/2+item.y,0);
  for(const fx of state.effects||[]){const age=fx.age||0,life=clamp(1-age/(fx.duration||.6),0,1);if(!life)continue;c.save();c.globalAlpha=life;for(let i=0;i<5;i++){const a=i*TAU/5;star(c,(fx.x??tray.x)+Math.cos(a)*(12+age*25),(fx.y??tray.y)+Math.sin(a)*(12+age*25),3*life,fx.type==='drop'?'#df8a65':'#f2ca60',a+age);}c.restore();}
  c.restore();
  if(d?.careful){c.save();c.globalAlpha=.8;box(c,15,H-46,98,25,12,'#e5edd9','#abc2a6',1);c.fillStyle='#618a72';c.font='bold 11px system-ui,sans-serif';c.textAlign='center';c.fillText(copy.careful||'STEADY',64,H-29,90);c.restore();}
 }
 projectPoint(point){const camera=this.camera||{x:0,cx:W*.44,sy:H-28,zoom:1.5};return{x:(camera.cx+(point.x-camera.x)*camera.zoom)*this.width/W,y:(camera.sy-point.y*camera.zoom)*this.height/H};}
 cleanup(){this.disposed=true;this.camera=null;}
}
BurgerVisual.drawBurger=drawBurger;
BurgerVisual.drawIngredient=(c,type,x,y,angle=0,opts={})=>{c.save();c.translate(x,y);c.scale(opts.scale||1,-(opts.scale||1));ingredient(c,type,0,0,angle,opts);c.restore();};
BurgerVisual.exportCard=(draft,result={},copy={})=>{
 const canvas=document.createElement('canvas');canvas.width=720;canvas.height=960;const c=canvas.getContext('2d');c.fillStyle='#f6ecd3';c.fillRect(0,0,720,960);for(let i=0;i<10;i++)box(c,i*80-40,0,40,960,0,'#f0e2c5',null);box(c,30,30,660,900,25,'#fff6e3',INK,3);box(c,49,49,622,94,15,'#b95749',null);c.textAlign='center';c.fillStyle='#ffdf9d';c.font='900 17px system-ui,sans-serif';c.fillText('ASOBI YOKOCHO / MY BURGER',360,83);c.fillStyle='#fff6e2';c.font='900 31px system-ui,sans-serif';c.fillText(copy.cardTitle||'Wobbly Burger Delivery',360,120,600);
 box(c,58,165,604,319,18,'#e4ead6','#bbc7ac',1.5);const items=layout(draft),stats=window.AsobiBurgerPhysics?.stats(draft),height=stats?.height||120,scale=Math.min(2.6,267/(height+12));drawBurger(c,draft,{x:360,y:459,scale});
 c.textAlign='center';c.fillStyle='#8e9278';c.font='bold 12px system-ui,sans-serif';c.fillText(copy.resultRecipe||'FINAL RECIPE',360,508,580);const name=String(draft?.name||copy.blankName||'MY BURGER').replace(/[\u0000-\u001f]/g,'');c.fillStyle=INK;let size=32;c.font='900 '+size+'px system-ui,sans-serif';while(c.measureText(name).width>580&&size>18){size--;c.font='900 '+size+'px system-ui,sans-serif';}c.fillText(name,360,533,580);
 box(c,65,556,590,129,17,'#f6e4b8',null);c.fillStyle='#9b7253';c.font='bold 17px system-ui,sans-serif';c.fillText(copy.score||'TOTAL SCORE',360,588);c.fillStyle='#754c3a';c.font='900 64px system-ui,sans-serif';c.fillText(Math.max(0,Math.round(result.score||0)).toLocaleString(),360,657);c.font='bold 16px system-ui,sans-serif';c.fillStyle='#827961';c.fillText((copy.cardLayers||'{n} layers').replace('{n}',String(items.length)),360,721,580);
 const heats=Array.isArray(result.results)?result.results:[];for(let i=0;i<Math.min(2,heats.length);i++){const r=heats[i],y=756+i*53;c.textAlign='left';c.font='bold 17px system-ui,sans-serif';c.fillStyle='#88735c';c.fillText((copy.deliveryNames?.[i]||copy.heat?.replace('{n}',String(i+1))||('DELIVERY '+(i+1)))+' · '+(r.delivered?(copy.arrival||'DELIVERED'):(copy.partial||'PARTIAL')),78,y,450);c.textAlign='right';c.fillStyle='#586b53';c.fillText(Math.max(0,Math.round(r.score||0)).toLocaleString(),642,y);c.textAlign='left';c.font='bold 12px system-ui,sans-serif';c.fillStyle='#8e9278';c.fillText((copy.cardCount||'{n} kept / {lost} dropped').replace('{n}',String(r.surviving||0)).replace('{lost}',String(r.lost||0)),78,y+20,560);}
 c.textAlign='center';c.fillStyle='#9b765b';c.font='bold 16px system-ui,sans-serif';c.fillText('asobi-yokocho.pages.dev',360,875);c.font='bold 13px system-ui,sans-serif';c.fillStyle='#8e9278';c.fillText(copy.cardFooter||'FREE BROWSER GAME / ASOBI YOKOCHO',360,903,600);return canvas;
};
window.AsobiBurgerVisual=BurgerVisual;
})();
