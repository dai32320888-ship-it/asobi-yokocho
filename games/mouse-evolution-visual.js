/* Original canvas animals and worlds for Mouse Big Bang. No listeners or loop. */
(function(){
 'use strict';
 const TAU=Math.PI*2,WORLD_W=1800,WORLD_H=1400;
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(n)?n:a));
 const palettes=[['#344d32','#506b39','#b1ad70'],['#52684a','#8b9a68','#d6c58a'],['#203f35','#3f6650','#8ca471'],['#8c8050','#b3a267','#dec28a'],['#236877','#3b8c99','#dac68e'],['#174e72','#397f98','#94b997'],['#245581','#548db0','#b8d0cf'],['#111d3b','#233b64','#76a9b2'],['#11182e','#274969','#b2c9be']];
 const createCanvas=(w,h)=>{const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):document.createElement('canvas');c.width=w;c.height=h;return c;};
 function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
 function ellipse(c,x,y,rx,ry,fill,stroke,width=1){c.beginPath();c.ellipse(x,y,Math.abs(rx),Math.abs(ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function path(c,points,fill,stroke,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function curve(c,points,color,width){c.beginPath();c.moveTo(points[0],points[1]);c.bezierCurveTo(...points.slice(2));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
 function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#ffffff00');ellipse(c,x,y,r,r,g);}
 function heart(c,x,y,r,color){c.save();c.translate(x,y);c.scale(r,r);c.beginPath();c.moveTo(0,.8);c.bezierCurveTo(-1.8,-.3,-.8,-1.4,0,-.55);c.bezierCurveTo(.8,-1.4,1.8,-.3,0,.8);c.fillStyle=color;c.fill();c.restore();}
 function leaf(c,x,y,size,angle,color){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(-size,0);c.quadraticCurveTo(0,-size*.75,size,0);c.quadraticCurveTo(0,size*.75,-size,0);c.fillStyle=color;c.fill();c.beginPath();c.moveTo(-size*.85,0);c.lineTo(size*.85,0);c.strokeStyle='#f1edb225';c.lineWidth=Math.max(1,size*.06);c.stroke();c.restore();}
 function eye(c,x,y,r=.075){ellipse(c,x,y,r*1.32,r*1.32,'#f6edd5');ellipse(c,x+r*.25,y,r,r,'#15232c');ellipse(c,x+r*.48,y-r*.32,r*.25,r*.25,'#fff');}
 function fur(c,x,y,rx,ry,light,dark){const g=c.createRadialGradient(x-.2,y-.23,.08,x,y,Math.max(rx,ry)*1.35);g.addColorStop(0,light);g.addColorStop(1,dark);ellipse(c,x,y,rx,ry,g,'#14252a65',.045);}
 function paws(c,t,color,scale=1){for(const [x,y,phase]of[[-.55,-.48,0],[.42,-.48,Math.PI],[-.55,.48,Math.PI],[.42,.48,0]])ellipse(c,x+Math.sin(t*10+phase)*.11*scale,y,.22,.13,color);}
 function mouse(c,t,genes={},enemy=false){
  const power=genes.power||0,armor=genes.armor||0,speed=genes.speed||0;
  curve(c,[-.75,.14,-1.4,.85,-2.1,.55,-1.85,-.22],enemy?'#a66e70':'#e4a4a0',.12);
  curve(c,[-.75,.12,-1.4,.82,-2.1,.52,-1.85,-.25],enemy?'#c9908c':'#f6c3b6',.035);
  paws(c,t,enemy?'#cda69b':'#e5beb0',1+speed*.1);
  fur(c,-.22,0,.88,.59,enemy?'#897f79':armor?'#bcb6a6':speed?'#d9c5a9':'#d1c6b2',enemy?'#5b5d5c':'#8b8c86');
  if(armor){for(let i=0;i<3;i++)curve(c,[-.9+i*.25,-.4,-.7+i*.25,-.16,-.7+i*.25,.16,-.9+i*.25,.4],'#5b827e',.12);}
  for(const side of[-1,1]){fur(c,.43,side*.5,.43,.38,enemy?'#96877c':'#c8bfb0','#8b8c86');ellipse(c,.45,side*.51,.29,.265,enemy?'#bb8c86':'#e9b2a4');ellipse(c,.42,side*.54,.19,.17,'#f2cbb55e');}
  fur(c,.58,0,.62,.45,enemy?'#a99c8d':'#eee2c7',enemy?'#6b6b65':'#b4aa96');
  fur(c,1.02,0,.34,.245,enemy?'#c0a99a':'#f4e5cc','#b7aa97');
  eye(c,.78,-.205,.079);eye(c,.78,.205,.079);ellipse(c,1.29,0,.092,.11,enemy?'#9d6264':'#d58884');
  for(const side of[-1,1])for(let i=0;i<3;i++)curve(c,[1.04,side*.09,1.22,side*(.25+i*.09),1.45,side*(.25+i*.14),1.57,side*(.24+i*.18)],'#f2dfc4',.024);
  if(power){path(c,[[1.04,-.11],[1.08,-.015],[1.23,-.07]],'#fff5dd');path(c,[[1.04,.11],[1.08,.015],[1.23,.07]],'#fff5dd');}
  ellipse(c,.15,-.18,.24,.08,'#fff1c422');
 }
 function animal(c,type,t,genes){
  switch(type){
   case'mouse':mouse(c,t,genes);break;
   case'rat':mouse(c,t,{},true);break;
   case'beetle':{
    for(const side of[-1,1])for(let i=0;i<3;i++)curve(c,[-.5+i*.45,side*.25,-.4+i*.45,side*.62,-.65+i*.5,side*.72,-.62+i*.5,side*.9],'#302e2a',.09);
    fur(c,-.12,0,.9,.64,'#c96e4d','#763c36');curve(c,[-.85,0,-.4,-.03,.4,.02,.67,0],'#542b2c',.055);
    for(const [x,y]of[[-.45,-.31],[.14,-.34],[-.45,.31],[.14,.34]])ellipse(c,x,y,.11,.115,'#3c3430');
    fur(c,.7,0,.38,.43,'#57634d','#253b37');path(c,[[.83,-.12],[1.35,-.18],[1.1,0],[1.35,.18],[.83,.12]],'#493b30');break;
   }
   case'frog':{
    for(const side of[-1,1]){ellipse(c,-.56,side*.6,.52,.25,'#6c8c4c');ellipse(c,.53,side*.54,.25,.13,'#a8bd6c');}
    fur(c,-.1,0,.9,.59,'#a8bc70','#49744c');fur(c,.63,0,.48,.56,'#b5ca78','#678f55');
    for(const side of[-1,1]){ellipse(c,.8,side*.37,.22,.2,'#b0c573');eye(c,.84,side*.4,.1);}
    curve(c,[.94,-.25,1.08,-.14,1.08,.14,.94,.25],'#3b6244',.045);for(let i=0;i<4;i++)ellipse(c,-.55+i*.24,Math.sin(i*2)*.23,.075,.06,'#456d454d');break;
   }
   case'snake':{
    const sway=Math.sin(t*5)*.15;curve(c,[-1.7,-.1,-1.2,.8,-.7,-.8,.05,sway],'#234f43',.56);curve(c,[-1.7,-.15,-1.2,.72,-.7,-.87,.05,sway-.06],'#6b9762',.39);
    fur(c,.56,sway,.72,.39,'#8db271','#3d6f4a');path(c,[[.8,-.25],[1.3,-.14],[1.3,.14],[.8,.25]],'#73a568');eye(c,.96,-.2,.075);eye(c,.96,.2,.075);
    curve(c,[1.2,0,1.4,.01,1.5,.06,1.68,0],'#df8985',.038);for(let i=0;i<3;i++)leaf(c,-1.2+i*.5,Math.sin(i*3)*.15,.1,.3,'#c6c884');break;
   }
   case'cat':case'fox':{
    const fox=type==='fox',body=fox?'#c57b43':'#bb9a70',shade=fox?'#7f4932':'#70675b';
    curve(c,[-.72,0,-1.4,-.9,-1.65,-.66,-1.72,-.3],body,fox?.46:.23);if(fox)curve(c,[-1.58,-.55,-1.7,-.5,-1.74,-.4,-1.72,-.3],'#f3ddba',.4);
    paws(c,t,fox?'#493c35':'#8b7963');fur(c,-.23,0,.91,.55,body,shade);
    if(!fox)for(let i=0;i<3;i++)curve(c,[-.65+i*.28,-.51,-.45+i*.28,-.3,-.45+i*.28,-.12,-.6+i*.28,0],'#5c5e51',.1);
    path(c,[[.22,-.18],[.24,-.83],[.77,-.44],[.93,-.14]],body,shade,.05);path(c,[[.22,.18],[.24,.83],[.77,.44],[.93,.14]],body,shade,.05);
    path(c,[[.32,-.43],[.33,-.66],[.58,-.44]],'#caa292');path(c,[[.32,.43],[.33,.66],[.58,.44]],'#caa292');
    fur(c,.63,0,.57,.43,fox?'#e6aa69':'#cfb98e',shade);path(c,[[.64,-.26],[1.29,0],[.64,.26],[.87,0]],fox?'#f1dfb7':'#e1cfa7');
    eye(c,.75,-.22,.075);eye(c,.75,.22,.075);ellipse(c,1.21,0,.085,.095,'#333d39');if(!fox)for(const side of[-1,1])for(let i=0;i<2;i++)curve(c,[1,.08*side,1.2,.3*side,1.45,(.2+i*.2)*side,1.51,(.2+i*.2)*side],'#e9d8b4',.027);break;
   }
   case'boar':case'bear':{
    const bear=type==='bear';paws(c,t,bear?'#6b5544':'#4b4239');fur(c,-.18,0,.98,.7,bear?'#a0845c':'#8f7b5d',bear?'#5f5140':'#564c3f');
    for(const side of[-1,1])ellipse(c,.54,side*.52,bear?.23:.18,bear?.25:.27,bear?'#7a644b':'#695b49');
    fur(c,.72,0,.58,.49,bear?'#ad9068':'#a99371','#6b5b45');fur(c,1.04,0,.3,.28,bear?'#c1a578':'#bb9b7e','#93755a');
    eye(c,.77,-.27,.065);eye(c,.77,.27,.065);ellipse(c,1.26,0,bear?.12:.14,bear?.14:.22,bear?'#3c3933':'#c7a38b');
    if(bear)for(let i=0;i<2;i++)curve(c,[.2+i*.2,-.25,.05+i*.2,-.15,.05+i*.2,.15,.2+i*.2,.25],'#5f514036',.045);
    else{ellipse(c,1.3,-.1,.028,.04,'#634c45');ellipse(c,1.3,.1,.028,.04,'#634c45');for(const side of[-1,1])path(c,[[.93,side*.21],[1.22,side*.48],[1.13,side*.14]],'#f1dcac');}break;
   }
   case'eagle':{
    const flap=Math.sin(t*6)*.13;
    for(const side of[-1,1]){path(c,[[-.55,side*.12],[-.86,side*1.27],[.07,side*(1.8+flap)],[.75,side*.88],[.62,side*.16]],'#815f3d','#493f33',.04);for(let i=0;i<4;i++)curve(c,[-.6+i*.19,side*.3,-.45+i*.23,side*.7,-.35+i*.26,side*1.2,(-.1+i*.15),side*(1.55-i*.16)],'#c3a16c',.08);}
    path(c,[[-.72,-.23],[-1.25,-.41],[-1.32,0],[-1.25,.41],[-.72,.23]],'#674d35');fur(c,-.1,0,.81,.4,'#b8945d','#6b5135');fur(c,.63,0,.43,.34,'#f0e2ba','#b2aa89');path(c,[[.94,-.12],[1.34,0],[.94,.12]],'#e4b758');eye(c,.73,-.18,.062);eye(c,.73,.18,.062);break;
   }
   case'deer':{
    paws(c,t,'#72533a');fur(c,-.26,0,.93,.49,'#c5a06a','#88704e');fur(c,.64,0,.45,.32,'#d0b177','#91734e');
    for(const side of[-1,1]){ellipse(c,.35,side*.43,.28,.11,'#b49b6c');curve(c,[.42,side*.19,.44,side*.66,.12,side*.92,.28,side*1.2],'#e4d5ae',.09);curve(c,[.3,side*.66,.14,side*.8,-.11,side*.73,-.14,side*.88],'#e4d5ae',.065);}
    for(const [x,y]of[[-.6,-.23],[-.17,-.23],[-.43,.16],[.07,.18]])ellipse(c,x,y,.065,.05,'#f4e3bc');eye(c,.77,-.17,.055);eye(c,.77,.17,.055);ellipse(c,1.02,0,.08,.1,'#4c4d3c');break;
   }
   case'elephant':{
    paws(c,t,'#7e9392');fur(c,-.25,0,1,.7,'#aec2ba','#6b8b8c');for(const side of[-1,1])fur(c,.44,side*.56,.5,.41,'#9eb5ac','#6d8c8a');
    fur(c,.66,0,.58,.52,'#bbcbc0','#799697');curve(c,[.98,0,1.6,-.12,1.68,.45,1.32,.49],'#789798',.29);curve(c,[.98,-.05,1.6,-.17,1.61,.39,1.32,.43],'#b4c7bc',.13);for(const side of[-1,1])curve(c,[.92,side*.26,1.3,side*.35,1.35,side*.22,1.5,side*.28],'#f0deb3',.09);eye(c,.85,-.33,.057);eye(c,.85,.33,.057);break;
   }
   case'whale':{
    path(c,[[-.8,-.12],[-1.57,-.73],[-1.34,-.12],[-1.57,.73],[-.8,.12]],'#3b8d9e','#255c72',.045);for(const side of[-1,1])path(c,[[.1,side*.27],[-.28,side*.95],[.48,side*.54],[.64,side*.22]],'#378799');fur(c,.05,0,1.13,.61,'#75b2bb','#2d6c85');ellipse(c,.68,0,.5,.4,'#a7cdc0');curve(c,[.87,-.26,1.21,-.24,1.21,.24,.87,.26],'#3d6e7a',.045);eye(c,.88,-.34,.066);eye(c,.88,.34,.066);ellipse(c,.14,0,.11,.06,'#356d80');break;
   }
   case'dino':{
    path(c,[[-.55,-.22],[-2.05,.13],[-.75,.28]],'#4f8a64','#315951',.04);paws(c,t,'#4b7255',1.5);fur(c,-.21,0,.95,.57,'#91b775','#4b7d5a');fur(c,.75,0,.64,.45,'#abc480','#5e8f64');
    for(const side of[-1,1])path(c,[[1.0,side*.15],[1.39,side*.2],[1.11,side*.32],[.78,side*.29]],'#e9dfb3');for(let i=0;i<4;i++)path(c,[[-.84+i*.3,-.08],[-.7+i*.3,-.28],[-.56+i*.3,-.08]],'#d4bc6f');eye(c,.89,-.28,.072);eye(c,.89,.28,.072);ellipse(c,1.29,0,.035,.09,'#4b7255');break;
   }
   case'cosmic':{
    for(let i=0;i<5;i++)curve(c,[-.65,(i-2)*.19,-1.7,(i-2)*.5,-1.45+Math.sin(t*2+i)*.4,(i-2)*.7,-2,(i-2)*.55],'#8f8cc1',.11);
    for(const side of[-1,1])path(c,[[-.32,side*.24],[.02,side*1.06],[.5,side*.43]],'#8fa7c9');fur(c,.1,0,1.07,.69,'#b9abd9','#635b9a');for(let i=0;i<6;i++)ellipse(c,-.55+i*.24,Math.sin(i*2)*.3,.055,.055,'#d6ecd6');ellipse(c,.86,0,.36,.47,'#8a7bb7');eye(c,1.0,-.22,.105);eye(c,1.0,.22,.105);curve(c,[1.05,-.08,1.3,-.04,1.3,.04,1.05,.08],'#ece5c8',.04);break;
   }
   default:mouse(c,t,{},true);
  }
 }
 function earth(c,x,y,r,time=0){
  c.save();c.translate(x,y);glow(c,0,0,r*1.22,'#8bddf566');const g=c.createRadialGradient(-r*.35,-r*.35,0,0,0,r);g.addColorStop(0,'#6fbfca');g.addColorStop(.7,'#397da1');g.addColorStop(1,'#1f3e67');ellipse(c,0,0,r,r,g,'#bdddd2',r*.018);c.save();c.beginPath();c.arc(0,0,r*.98,0,TAU);c.clip();
  const lands=[[[-.9,-.55],[-.5,-.73],[-.27,-.43],[-.42,-.1],[-.18,.08],[-.34,.45],[-.56,.29],[-.65,-.12]],[[.03,-.74],[.36,-.68],[.43,-.48],[.74,-.43],[.9,-.07],[.48,.12],[.38,.56],[.2,.68],[.08,.29],[.2,.04],[-.07,-.13]],[[.49,.62],[.82,.5],[.93,.7],[.68,.81]]];
  for(const shape of lands)path(c,shape.map(([px,py])=>[px*r,py*r]),'#86af83','#bbca9e',r*.02);
  for(let i=0;i<5;i++){c.save();c.rotate(i*.8+Math.sin(time*.15)*.05);ellipse(c,-r*.2,r*(i%3-.8)*.48,r*.72,r*.065,'#e4f2e137');c.restore();}ellipse(c,r*.47,r*.2,r*.7,r*1.1,'#0b204335');c.restore();ellipse(c,-r*.34,-r*.45,r*.48,r*.16,'#d4f5ee16');c.restore();
 }
 class AsobiMouseVisual{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.lastCamera={x:900,y:700,scale:1.7,width:960,height:640};this.background=null;this.backgroundStage=-1;this.disposed=false;}
  screenToWorld(px,py){const rect=this.canvas.getBoundingClientRect(),camera=this.lastCamera,sx=px*(camera.width/(rect.width||camera.width)),sy=py*(camera.height/(rect.height||camera.height));return{x:camera.x+(sx-camera.width/2)/camera.scale,y:camera.y+(sy-camera.height/2)/camera.scale};}
  backgroundFor(stage){
   if(this.background&&this.backgroundStage===stage)return this.background;
   const map=createCanvas(WORLD_W,WORLD_H),c=map.getContext('2d'),rand=random(1237+stage*191),palette=palettes[stage]||palettes[0];
   c.fillStyle=palette[0];c.fillRect(0,0,WORLD_W,WORLD_H);
   const gradient=c.createLinearGradient(0,0,WORLD_W,WORLD_H);gradient.addColorStop(0,palette[1]+'66');gradient.addColorStop(1,'#0a242244');c.fillStyle=gradient;c.fillRect(0,0,WORLD_W,WORLD_H);
   if(stage>=7){
    for(let i=0;i<390;i++){const x=rand()*WORLD_W,y=rand()*WORLD_H,r=.6+rand()*2;ellipse(c,x,y,r,r,i%7===0?'#bde5d9':'#d9dcc29a');if(i%24===0){c.strokeStyle='#d9dcc24d';c.lineWidth=1;c.beginPath();c.moveTo(x-6,y);c.lineTo(x+6,y);c.moveTo(x,y-6);c.lineTo(x,y+6);c.stroke();}}
    for(let i=0;i<5;i++)glow(c,rand()*WORLD_W,rand()*WORLD_H,230+rand()*180,i%2?'#8d77a11c':'#51a9ac1f');
    earth(c,stage===8?1250:1300,stage===8?500:350,stage===8?230:145);ellipse(c,340,1090,83,83,'#767c8e','#b2b0a2',3);for(let i=0;i<7;i++)ellipse(c,285+rand()*100,1040+rand()*100,4+rand()*14,4+rand()*10,'#555d75');
   }else if(stage>=4){
    for(let i=0;i<23;i++){
     const x=rand()*WORLD_W,y=rand()*WORLD_H,r=(stage===4?75:38)+rand()*(stage===4?145:100);c.save();c.translate(x,y);c.rotate(rand()*TAU);ellipse(c,0,0,r*1.08,r*.62,'#f1e5b34d');ellipse(c,0,0,r,r*.57,stage===4?'#cfbf89':'#76a58e');ellipse(c,-r*.1,-r*.05,r*.8,r*.42,stage===4?'#5c865e':'#4f8d78');for(let j=0;j<5;j++){const xx=(rand()-.5)*r,yy=(rand()-.5)*r*.5;path(c,[[xx-5,yy+4],[xx,yy-8],[xx+5,yy+4]],'#244f47');}c.restore();
    }
    for(let i=0;i<140;i++){const x=rand()*WORLD_W,y=rand()*WORLD_H;c.strokeStyle='#b7e2d521';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+12,y+5,x+25,y);c.stroke();}
    if(stage>=6)for(let i=0;i<18;i++){const x=rand()*WORLD_W,y=rand()*WORLD_H;for(let j=0;j<4;j++)ellipse(c,x+j*23,y+Math.sin(j)*9,40+rand()*20,19+rand()*9,'#e7f1df66');}
   }else{
    for(let i=0;i<170;i++){const x=rand()*WORLD_W,y=rand()*WORLD_H;ellipse(c,x,y,15+rand()*95,10+rand()*50,i%3?'#d3ce7710':'#0f32291a');}
    if(stage===1){c.strokeStyle='#cabd8c3b';c.lineCap='round';c.lineWidth=125;c.beginPath();c.moveTo(0,1050);c.bezierCurveTo(500,800,780,1030,1150,750);c.bezierCurveTo(1400,550,1500,440,1800,600);c.stroke();}
    for(let i=0;i<450;i++){const x=rand()*WORLD_W,y=rand()*WORLD_H,s=4+rand()*12;c.strokeStyle=i%2?palette[2]+'46':'#173b2b5c';c.lineWidth=1.6;c.beginPath();c.moveTo(x-s*.4,y);c.lineTo(x-s*.6,y-s*.8);c.moveTo(x,y);c.lineTo(x,y-s);c.moveTo(x+s*.4,y);c.lineTo(x+s*.65,y-s*.7);c.stroke();}
    for(let i=0;i<68;i++){
     const x=rand()*WORLD_W,y=rand()*WORLD_H,s=10+rand()*20;c.save();c.translate(x,y);c.rotate(rand()*TAU);ellipse(c,5,9,s*.95,s*.63,'#112e2933');path(c,[[-s*.85,0],[-s*.4,-s*.6],[s*.35,-s*.7],[s*.85,-s*.1],[s*.6,s*.48],[-s*.3,s*.7]],'#879785','#bcc7a55e',1.5);path(c,[[-s*.4,-s*.6],[s*.35,-s*.7],[s*.05,-s*.1]],'#b4bf9a64');c.restore();
    }
    for(let i=0;i<36;i++){
     const x=rand()*WORLD_W,y=rand()*WORLD_H;if(stage<2){leaf(c,x,y,20+rand()*35,rand()*TAU,i%2?'#6d9258':'#86a65e');if(i%4===0){for(let j=0;j<5;j++)ellipse(c,x+Math.cos(j*TAU/5)*9,y+Math.sin(j*TAU/5)*9,6,6,'#e8d9a4');ellipse(c,x,y,5,5,'#e0b96b');}}
     else if(stage===2){const s=30+rand()*36;ellipse(c,x+8,y+10,s*1.1,s*.67,'#102e2c57');for(let j=0;j<6;j++)ellipse(c,x+Math.cos(j)*s*.4,y+Math.sin(j)*s*.28,s*.7,s*.47,j%2?'#315c47':'#3e6a4c');ellipse(c,x-s*.18,y-s*.17,s*.6,s*.36,'#66835a70');}
     else{c.strokeStyle='#6b704833';c.lineWidth=9;c.beginPath();c.moveTo(x,y+26);c.lineTo(x+3,y-20);c.stroke();ellipse(c,x,y-23,36,14,'#5b7350');ellipse(c,x-17,y-28,27,12,'#789161');}
    }
   }
   c.strokeStyle='#d8d5ac45';c.lineWidth=8;c.strokeRect(7,7,WORLD_W-14,WORLD_H-14);c.strokeStyle='#172f3559';c.lineWidth=12;c.strokeRect(18,18,WORLD_W-36,WORLD_H-36);
   this.background=map;this.backgroundStage=stage;return map;
  }
  food(c,item,time){
   const x=item.x,y=item.y,r=clamp(item.r||8,4,18);c.save();c.translate(x,y+Math.sin(time*3+(item.id||0))*.9);c.scale(r,r);ellipse(c,0,.5,1.05,.44,'#142b3230');
   if(item.type==='berry'||item.type==='fruit'){for(const [xx,yy]of[[-.35,0],[.32,-.22],[.32,.35]])ellipse(c,xx,yy,.63,.6,'#d87967','#a6514e',.05);leaf(c,0,-.65,.5,-.45,'#8bb77b');ellipse(c,-.48,-.2,.16,.1,'#f6c2a266');}
   else if(item.type==='cheese'){path(c,[[-.85,.55],[-.66,-.62],[.83,-.16],[.92,.62]],'#ebc679','#fff0ad',.055);ellipse(c,-.24,.15,.17,.14,'#bc955b');ellipse(c,.38,.37,.13,.13,'#bc955b');ellipse(c,-.39,-.26,.095,.085,'#c9a168');}
   else if(item.type==='leaf'){leaf(c,0,0,1.12,-.4,'#a3bc72');curve(c,[-.7,.4,-.1,.1,.4,-.2,.75,-.55],'#e1dfa1',.08);}
   else if(item.type==='meat'||item.type==='protein'){fur(c,0,0,.95,.68,'#dfac7a','#b17b5e');ellipse(c,.12,0,.33,.3,'#e6cf9e');ellipse(c,.12,0,.12,.1,'#fff0c4');}
   else if(item.type==='star'||item.type==='energy'){const points=[];for(let i=0;i<10;i++){const a=i*TAU/10-Math.PI/2,rr=i%2?.45:1;points.push([Math.cos(a)*rr,Math.sin(a)*rr]);}path(c,points,'#f4d88a','#fff0b5',.08);}
   else{ellipse(c,0,0,.85,.58,'#d7b56c','#8c754b',.06);curve(c,[-.65,.1,-.25,-.15,.15,-.25,.55,-.15],'#f4db9c',.13);leaf(c,-.57,-.5,.56,.5,'#95b17b');}
   c.restore();
  }
  actor(c,entity,time,isPlayer=false,genes={}){
   const r=clamp(entity.r||24,7,140);c.save();c.translate(entity.x,entity.y);
   if(entity.phase==='windup'){const progress=clamp((entity.phaseTime||0)/.8,0,1);ellipse(c,0,0,r+12+progress*10,r+12+progress*10,'#e5885f24','#f5ad76',2.5);c.save();c.rotate(entity.facing||0);path(c,[[r*.75,-r*.52],[r*2.5,-r*.8],[r*3.05,0],[r*2.5,r*.8],[r*.75,r*.52]],'#e9a56824','#f2bc7966',1.5);c.restore();}
   if(entity.boss){glow(c,0,0,r*1.8,'#eab77725');ellipse(c,0,0,r*1.24,r*1.24,null,'#d7a55c9c',2);}
   ellipse(c,-r*.1,r*.38,r*1.15,r*.6,'#0d252c3d');
   if(isPlayer){ellipse(c,0,0,r*1.2,r*1.2,null,entity.invuln>0?'#a7f2df':'#f3e5af9c',entity.invuln>0?3:1.6);if(entity.dashT>0){c.save();c.rotate(entity.facing||0);for(let i=1;i<4;i++){c.globalAlpha=(4-i)*.11;c.save();c.translate(-r*i*.8,0);c.scale(r,r);mouse(c,time,genes);c.restore();}c.restore();}}
   const stride=isPlayer?(Math.hypot(entity.velocityX||0,entity.velocityY||0)>5?time:0):['stun','windup','recover'].includes(entity.phase)?0:time;
   c.save();c.rotate(entity.facing||0);c.scale(r,r);if(entity.hitFlash>0){c.shadowBlur=8;c.shadowColor='#ffe2a8';}if(isPlayer&&entity.invuln>0&&Math.floor(time*18)%2)c.globalAlpha=.68;animal(c,isPlayer?'mouse':entity.type,stride,genes);c.restore();
   if(isPlayer&&entity.attackT>0){c.save();c.rotate(entity.facing||0);const range=r+54;c.beginPath();c.arc(0,0,range,-1.02,1.02);c.strokeStyle='#fff2ba';c.lineWidth=5;c.lineCap='round';c.stroke();c.beginPath();c.arc(0,0,range+8,-.82,.82);c.strokeStyle='#b1ecbf76';c.lineWidth=2;c.stroke();for(const a of[-.85,.85]){const xx=Math.cos(a)*range,yy=Math.sin(a)*range;c.beginPath();c.moveTo(xx-4,yy);c.lineTo(xx+5,yy);c.moveTo(xx,yy-4);c.lineTo(xx,yy+4);c.strokeStyle='#fff2ba';c.stroke();}c.restore();}
   if(!isPlayer&&(entity.hp<entity.maxHp||entity.boss)){const w=Math.max(36,r*2);c.fillStyle='#132c34cc';c.fillRect(-w/2,-r-15,w,5);c.fillStyle=entity.boss?'#f1bd75':'#d9c38c';c.fillRect(-w/2,-r-15,w*clamp(entity.hp/(entity.maxHp||1),0,1),5);}
   c.restore();
  }
  mate(c,mate,time){if(!mate)return;const r=mate.r||24;c.save();c.translate(mate.x,mate.y);if(mate.ready)glow(c,0,0,85,'#f5bcaf24');ellipse(c,0,4,47,34,'#ac9c69','#d5bf7c',3);for(let i=0;i<12;i++){c.save();c.rotate(i*TAU/12);c.strokeStyle=i%2?'#715e40':'#d3bf7b';c.lineWidth=3;c.beginPath();c.moveTo(29,0);c.lineTo(48,6);c.stroke();c.restore();}c.save();c.scale(r,r);mouse(c,time,{speed:1});c.restore();if(mate.ready){heart(c,0,-r*1.8+Math.sin(time*3)*4,12,'#e9aa9a');ellipse(c,0,0,62,47,null,'#f3c2ac66',1.5);}c.restore();}
  effects(c,list,time){for(const effect of(list||[])){const x=Number.isFinite(effect.x)?effect.x:900,y=Number.isFinite(effect.y)?effect.y:700,life=clamp(effect.life/(effect.maxLife||1),0,1),progress=1-life;c.save();c.translate(x,y);c.globalAlpha=life;
    if(['evolve','breed','clear'].includes(effect.type)){for(let i=0;i<3;i++)ellipse(c,0,0,(30+progress*130+i*16),(30+progress*130+i*16),null,effect.type==='breed'?'#e5ad9b':'#f1d991',3-i*.6);if(effect.type==='breed'){for(let i=0;i<5;i++){const a=i*TAU/5;heart(c,Math.cos(a)*progress*90,Math.sin(a)*progress*90-20,8+life*5,'#f1b7ac');}for(let i=0;i<3;i++){c.save();c.translate((i-1)*28,28-progress*35);c.rotate((i-1)*.35);c.scale(10,10);mouse(c,time,{});c.restore();}}}
    else{const color=effect.type==='hit'?'#e6a176':effect.type==='food'?'#dfe9b2':'#f3d999';for(let i=0;i<6;i++){const a=i*TAU/6+(effect.id||0),distance=10+progress*36;ellipse(c,Math.cos(a)*distance,Math.sin(a)*distance,2.5+life*2,2.5+life*2,color);}}
    c.restore();}}
  pointer(c,x,y,color,kind,label){c.save();c.translate(x,y);glow(c,0,0,30,color+'33');ellipse(c,0,0,20,20,'#172c35db',color,1.7);if(kind==='mate')heart(c,0,-1,10,color);else path(c,[[-7,-8],[10,0],[-7,8],[-2,0]],color);if(label){c.font='700 15px system-ui,sans-serif';c.textAlign='center';c.fillStyle='#edf1d2';c.fillText(label,0,35);}c.restore();}
  compass(c,state,labels){
   const camera=this.lastCamera,p=state.player,items=[];if(state.mate?.ready)items.push({x:state.mate.x,y:state.mate.y,type:'mate',color:'#e9b5a6',label:labels.mate||''});const boss=(state.enemies||[]).find(e=>e.boss);if(boss)items.push({...boss,type:'boss',color:'#edbc78',label:labels.boss||''});
   for(const item of items){const sx=(item.x-camera.x)*camera.scale+camera.width/2,sy=(item.y-camera.y)*camera.scale+camera.height/2;if(sx>45&&sx<camera.width-45&&sy>55&&sy<camera.height-155)continue;const dx=item.x-p.x,dy=item.y-p.y,angle=Math.atan2(dy,dx),cx=camera.width/2,cy=camera.height/2,rx=camera.width/2-43,ry=camera.height/2-95;const factor=Math.min(rx/(Math.abs(Math.cos(angle))||.001),ry/(Math.abs(Math.sin(angle))||.001));this.pointer(c,cx+Math.cos(angle)*factor,cy+Math.sin(angle)*factor,item.color,item.type,item.label);}
   const size=92,x=camera.width-size-18,y=17;c.save();c.globalAlpha=.88;c.fillStyle='#142a35d9';c.strokeStyle='#b4d3bc4d';c.lineWidth=1;c.beginPath();c.roundRect(x,y,size,size*.78,10);c.fill();c.stroke();for(const e of(state.enemies||[]))ellipse(c,x+8+e.x/WORLD_W*(size-16),y+7+e.y/WORLD_H*(size*.78-14),e.boss?3:1.8,e.boss?3:1.8,e.boss?'#e9bb75':'#c78d72');if(state.mate?.ready)heart(c,x+8+state.mate.x/WORLD_W*(size-16),y+7+state.mate.y/WORLD_H*(size*.78-14),4,'#e5ad9b');ellipse(c,x+8+p.x/WORLD_W*(size-16),y+7+p.y/WORLD_H*(size*.78-14),3,3,'#eaf0bb');c.restore();
  }
  victory(c,state,now,labels){const {width:w,height:h}=this.canvas;c.fillStyle='#111b34';c.fillRect(0,0,w,h);const rand=random(912);for(let i=0;i<100;i++){const x=rand()*w,y=rand()*h;ellipse(c,x,y,1+rand(),1+rand(),'#d1dfc68c');}const r=Math.min(w,h)*.185;earth(c,w*.31,h*.43,r,now);c.save();c.translate(w*.71,h*.43);c.rotate(-.18);c.scale(r*.82,r*.82);mouse(c,now,state.genes||{});c.restore();c.font='800 '+Math.max(18,w*.026)+'px system-ui,sans-serif';c.textAlign='center';c.fillStyle='#d1e3cf';c.fillText(labels.earth||'EARTH',w*.31,h*.43+r+42);c.fillStyle='#f4dba0';c.fillText(labels.you||'YOU',w*.71,h*.43+r+42);c.strokeStyle='#9ccfca55';c.lineWidth=2;c.setLineDash([7,10]);c.beginPath();c.ellipse(w*.5,h*.43,w*.44,h*.32,-.12,0,TAU);c.stroke();c.setLineDash([]);}
  render(state,options={}){
   if(this.disposed||!state?.player)return;const canvas=this.canvas,c=this.ctx,rect=canvas.getBoundingClientRect();const w=960,h=Math.max(1,Math.round(w*((rect.height||640)/(rect.width||960))));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   const p=state.player,stage=clamp(Math.floor(state.stage||0),0,8),progress=clamp(state.xp/(state.goal||100),0,1),scale=(stage>=7?1.45:1.78)-progress*.28,halfW=w/scale/2,halfH=h/scale/2;
   this.lastCamera={x:clamp(p.x,halfW,WORLD_W-halfW),y:clamp(p.y,halfH,WORLD_H-halfH),scale,width:w,height:h};const camera=this.lastCamera,now=(options.now||0)/1000,labels=options.labels||{};
   if(state.mode==='won'){this.victory(c,state,now,labels);return;}
   c.fillStyle=palettes[stage][0];c.fillRect(0,0,w,h);c.save();c.translate(w/2-camera.x*scale,h/2-camera.y*scale);c.scale(scale,scale);c.drawImage(this.backgroundFor(stage),0,0);
   for(const food of(state.foods||[]))this.food(c,food,now);this.mate(c,state.mate,now);
   const actors=[...(state.enemies||[]).map(e=>({entity:e,player:false})),{entity:p,player:true}].sort((a,b)=>a.entity.y-b.entity.y);for(const actor of actors)this.actor(c,actor.entity,now,actor.player,state.genes||{});
   this.effects(c,state.effects,now);c.restore();
   const vignette=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.25,w/2,h/2,Math.max(w,h)*.72);vignette.addColorStop(0,'#071c2400');vignette.addColorStop(1,stage>=7?'#080d355e':'#102a2442');c.fillStyle=vignette;c.fillRect(0,0,w,h);
   this.compass(c,state,labels);return this.lastCamera;
  }
  cleanup(){this.disposed=true;this.background=null;this.ctx=null;}
 }
 window.AsobiMouseVisual=AsobiMouseVisual;
})();
