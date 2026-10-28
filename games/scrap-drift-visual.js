/* Original code-drawn roads, cars and garage for Scrap Drift. No external art. */
(function(){
 'use strict';
 const TAU=Math.PI*2,clamp=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(n)?n:a));
 const PALETTES=[
  {sky:'#6d9eae',bottom:'#f7d7a2',ground:'#8c9875',grass:'#83916d',road:'#505b61',accent:'#f8d17d',hill:'#7d9391'},
  {sky:'#4b9ab8',bottom:'#d5e6c5',ground:'#b1af79',grass:'#9aab79',road:'#4d6067',accent:'#a1e0dc',hill:'#6c9da2'},
  {sky:'#86a8a4',bottom:'#e6d7a4',ground:'#778a58',grass:'#6d8053',road:'#515d5b',accent:'#c6e1a6',hill:'#557a65'},
  {sky:'#7a7297',bottom:'#f4bb91',ground:'#9b9272',grass:'#8e8468',road:'#575966',accent:'#f5c081',hill:'#7c7b91'},
  {sky:'#151d3d',bottom:'#704b72',ground:'#3a425b',grass:'#333b51',road:'#303945',accent:'#79e5df',hill:'#3e435f'},
  {sky:'#102840',bottom:'#70618c',ground:'#3e5860',grass:'#354e57',road:'#303e4c',accent:'#edca79',hill:'#3a5876'}
 ];
 function path(c,points,fill,stroke,width=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,Math.abs(rx),Math.abs(ry),0,0,TAU);c.fillStyle=fill;c.fill();}
 function line(c,x1,y1,x2,y2,color,width=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function round(c,x,y,w,h,r,color){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();}
 const hash=n=>{n=Math.imul((n|0)^0x9e3779b9,0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return((n^(n>>>16))>>>0)/4294967296;};
 function text(c,value,x,y,size,color,align='left'){c.fillStyle=color;c.font='700 '+size+'px system-ui,sans-serif';c.textAlign=align;c.textBaseline='middle';c.fillText(value,x,y);}
 function car(c,x,y,size,options={},time=0){
  const level=clamp(options.body,0,3),engine=clamp(options.engine,0,3),tires=clamp(options.tires,0,3),base=options.color||['#d7c297','#66b4c5','#56bec7','#e49c72'][level],drift=options.drifting,steer=clamp(options.steer,-1,1);
  c.save();c.translate(x,y);c.rotate((drift?-.13:-.026)*steer);c.scale(size,size);
  ellipse(c,0,.025,.66,.15,'#10212d66');
  if(options.usingNitro){for(const side of[-1,1]){const flame=.32+Math.sin(time*31+side)*.05;path(c,[[side*.27,-.015],[side*.35,.12],[side*.29,flame],[side*.20,.11]],'#5cdfffaa');path(c,[[side*.27,.015],[side*.30,.10],[side*.27,flame*.75],[side*.24,.09]],'#d4f9ff');}}
  const wheelWidth=.115+tires*.012;c.fillStyle='#1c2930';round(c,-.50-wheelWidth,-.58,wheelWidth,.48,.035,'#17252b');round(c,.50,-.58,wheelWidth,.48,.035,'#17252b');
  for(const side of[-1,1]){line(c,side*(.54+tires*.005),-.51,side*(.54+tires*.005),-.16,tires?'#6d828b':'#6b6c61',.025);line(c,side*.515,-.48,side*.515,-.22,'#0e1c24',.022);}
  const metal=c.createLinearGradient(-.5,-.2,.6,-1.2);metal.addColorStop(0,base);metal.addColorStop(.5,base);metal.addColorStop(.52,level?'#b5d8d4':'#e9d8ae');metal.addColorStop(1,base);
  path(c,[[-.49,-.12],[-.49,-.91],[-.34,-1.36],[.31,-1.36],[.49,-.91],[.51,-.14],[.40,.035],[-.41,.035]],metal,'#18323d',.025);
  path(c,[[.31,-1.36],[.49,-.91],[.51,-.14],[.39,.01],[.37,-.88],[.23,-1.28]],'#18364725');
  const glass=c.createLinearGradient(0,-1.27,0,-.78);glass.addColorStop(0,'#244755');glass.addColorStop(.5,'#447480');glass.addColorStop(1,'#759da1');
  path(c,[[-.295,-1.235],[.26,-1.235],[.37,-.85],[-.365,-.85]],glass,'#25444b',.025);
  path(c,[[-.25,-1.20],[-.13,-1.20],[-.28,-.88],[-.33,-.88]],'#d6e8d34f');
  line(c,-.34,-.83,.36,-.83,'#28434b',.035);line(c,-.08,-.88,.19,-.95,'#1c323c',.018);
  path(c,[[-.44,-.77],[.43,-.77],[.46,-.32],[-.46,-.32]],base);
  line(c,-.43,-.75,.42,-.75,'#fff7dc54',.012);line(c,-.45,-.33,.45,-.33,'#17394340',.015);
  for(const side of[-1,1]){round(c,side<0?-.46:.27,-.59,.19,.16,.025,'#733b36');round(c,side<0?-.445:.285,-.575,.16,.065,.01,options.brake?'#ffaea0':'#ec7862');round(c,side<0?-.445:.285,-.50,.16,.045,.007,'#efbf73');}
  round(c,-.45,-.22,.89,.18,.035,level>1?'#253c49':'#88958e');line(c,-.41,-.20,.40,-.20,'#d8e4d58c',.016);
  round(c,-.16,-.27,.32,.14,.013,'#f4e7b5');text(c,'YKC',0,-.20,.070,'#426065','center');
  if(!level){for(const[xr,yr,rx,ry]of[[-.39,-.72,.085,.042],[.30,-.36,.083,.043],[-.24,-.40,.058,.032],[.42,-.83,.044,.085],[-.28,-1.30,.052,.025],[.17,-1.30,.04,.022],[-.40,-.10,.06,.025]]){ellipse(c,xr,yr,rx,ry,'#a56f4f');ellipse(c,xr+.01,yr-.004,rx*.52,ry*.45,'#865d47');}path(c,[[-.39,-.54],[-.22,-.53],[-.22,-.45],[-.39,-.46]],'#b7c1aa');line(c,-.37,-.52,-.25,-.47,'#eff1cc',.014);}
  if(level>=2){for(const side of[-1,1]){path(c,[[side*.42,-.69],[side*.56,-.61],[side*.57,-.17],[side*.47,-.13]],'#28505d');line(c,side*.48,-.54,side*.48,-.28,'#6cc4c3',.024);}round(c,-.48,-.08,.96,.085,.018,'#213845');}
  if(level>=3){round(c,-.37,-.94,.05,.20,.006,'#263d49');round(c,.31,-.94,.05,.20,.006,'#263d49');path(c,[[-.62,-.93],[-.56,-1.01],[.58,-1.01],[.64,-.92],[.57,-.88],[-.56,-.88]],'#223947','#8ac4c6',.014);line(c,-.48,-.96,.48,-.96,'#e4c984',.018);}
  for(let i=0;i<(engine>=2?2:1);i++){const pipe=i===0?-.31:.31;round(c,pipe-.035,-.04,.08,.075,.025,'#8faaa9');ellipse(c,pipe+.005,.023,.027,.017,'#20343d');}
  if(engine){for(let i=0;i<3;i++)round(c,-.24+i*.085,-.69,.06,.035,.009,'#30565c');}
  if(drift){for(const side of[-1,1])for(let i=0;i<4;i++){const phase=(time*2.1+i*.23)%1;ellipse(c,side*(.55+phase*.32),-.09+phase*.21,.08+phase*.16,.045+phase*.08,'#e6e5d2'+Math.round((1-phase)*75).toString(16).padStart(2,'0'));}}
  c.restore();
 }
 class DriftVisual{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.width=390;this.height=420;this.disposed=false;this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
  resize(width,height,dpr){if(this.disposed)return;const box=this.canvas.getBoundingClientRect();this.width=clamp(width||box.width||390,160,1600);this.height=clamp(height||box.height||420,180,1200);this.dpr=clamp(dpr||window.devicePixelRatio||1,1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);}
  palette(state){const index=clamp(Math.floor(state.trackIndex||0),0,5),base=PALETTES[index],custom=window.AsobiDriftData?.tracks?.[index]?.palette||{};return{...base,...custom,index};}
  sky(p,time=0){const c=this.ctx,w=this.width,h=this.height,horizon=h*.29,g=c.createLinearGradient(0,0,0,horizon+h*.08);g.addColorStop(0,p.sky);g.addColorStop(1,p.bottom);c.fillStyle=g;c.fillRect(0,0,w,h);const night=p.index>=4;
   ellipse(c,w*.76,h*.16,h*.065,h*.065,night?'#e7e5c9':'#fce2a9');
   if(night)for(let i=0;i<34;i++)ellipse(c,hash(i+2)*w,hash(i+33)*h*.23,.5+hash(i+10),.5+hash(i+10),'#e9ead7a8');
   for(let layer=0;layer<2;layer++){const pts=[[0,horizon+22]];for(let i=0;i<=12;i++)pts.push([i*w/12,horizon-(.025+hash(i+layer*33)*.07)*h+layer*18]);pts.push([w,horizon+24]);path(c,pts,layer?p.hill:p.hill+'83');}
   if(p.index===0||p.index>=3){for(let i=0;i<15;i++){const x=(i/14)*w,hb=h*(.025+hash(i+19)*.065),wb=w*(.035+hash(i+41)*.025);c.fillStyle=night?'#26374c':'#758d8e';c.fillRect(x,horizon-hb,wb,hb);if(night)for(let row=0;row<3;row++)for(let col=0;col<3;col++)if(hash(i*7+row*3+col)>.35)c.fillStyle=p.accent+'99',c.fillRect(x+3+col*wb*.26,horizon-hb+4+row*hb*.25,Math.max(1,wb*.09),Math.max(1,hb*.08));}}
   c.fillStyle=p.ground;c.fillRect(0,horizon,w,h-horizon);if(p.index===1){c.fillStyle='#6faeaf';c.fillRect(w*.53,horizon,w*.47,h*.10);for(let i=0;i<5;i++)line(c,w*.55,horizon+8+i*6,w,horizon+8+i*6,'#d3e8d847',1);}
  }
  scenery(point,side,id,p,curve){const c=this.ctx,w=this.width,scale=point.scale,x=point.x+side*point.half*(1.35+hash(id)*.7),y=point.y,unit=w*.19*scale;if(unit<3||x<-unit*3||x>w+unit*3)return;const kind=Math.floor(hash(id+47)*6),night=p.index>=4;
   if(Math.abs(curve)>.23&&kind<2){line(c,x,y,x,y-unit*.9,'#607179',unit*.055);round(c,x-unit*.40,y-unit*1.45,unit*.8,unit*.56,unit*.035,night?'#173a49':'#eee0ad');const sign=Math.sign(curve);path(c,[[x-sign*unit*.13,y-unit*1.36],[x+sign*unit*.12,y-unit*1.16],[x-sign*unit*.13,y-unit*.96]],null,p.index>=4?'#81e4df':'#596d67',unit*.09);return;}
   if(p.index===1&&kind<4){line(c,x,y,x-side*unit*.08,y-unit*1.8,'#8d866b',unit*.12);for(let leaf=0;leaf<5;leaf++){const angle=-Math.PI+leaf*Math.PI/4;path(c,[[x-side*unit*.08,y-unit*1.8],[x+Math.cos(angle)*unit*.85,y-unit*1.8+Math.sin(angle)*unit*.3],[x+Math.cos(angle)*unit*.55,y-unit*1.62+Math.sin(angle)*unit*.25]],'#537d69');}return;}
   if((p.index===0&&kind===0)||(p.index>=3&&kind>=2)){const bw=unit*(.7+hash(id+4)*.6),bh=unit*(1.4+hash(id+8));round(c,x-bw/2,y-bh,bw,bh,unit*.02,night?'#273b50':'#b6aa8d');path(c,[[x-bw*.58,y-bh],[x,y-bh-unit*.35],[x+bw*.58,y-bh]],night?'#38516b':'#857a68');for(let row=0;row<3;row++)for(let col=0;col<2;col++)round(c,x-bw*.32+col*bw*.38,y-bh+unit*.22+row*bh*.24,bw*.22,bh*.13,unit*.01,night?p.accent+'bd':'#5b7e83');if(night){line(c,x-bw*.5,y-bh,x+bw*.5,y-bh,p.accent,unit*.035);}return;}
   if(kind===5){line(c,x,y,x,y-unit*2.1,night?'#7d9da6':'#738487',unit*.045);line(c,x,y-unit*2.1,x-side*unit*.40,y-unit*2.1,'#748e96',unit*.045);ellipse(c,x-side*unit*.38,y-unit*2.08,unit*.11,unit*.035,night?'#ffdf9b':'#e9e3bb');return;}
   line(c,x,y,x,y-unit*.65,'#7b7360',unit*.13);for(let j=0;j<3;j++)path(c,[[x,y-unit*(1.9-j*.38)],[x-unit*(.45+j*.08),y-unit*(.75-j*.14)],[x+unit*(.45+j*.08),y-unit*(.75-j*.14)]],night?'#284b55':['#52775f','#4c705c','#658265'][j]);
  }
  road(state,model,p,time){const c=this.ctx,w=this.width,h=this.height,points=[],near=110,step=27,count=65;let heading=0,bend=0;for(let i=0;i<=count;i++){const z=near+i*step,sample=model?.roadAt?.((state.distance||0)+z,state.trackIndex)||{curve:0},curve=clamp(sample.curve,-1,1);heading+=curve*step*.003;bend+=heading*step/600;const scale=near/z;points.push({z,scale,curve,x:w*.5+(bend-(state.x||0))*(w*.55)*scale,y:h*.29+h*.65*scale,half:w*.55*scale});}
   for(let i=points.length-1;i>0;i--){const far=points[i],close=points[i-1],stripe=Math.floor(((state.distance||0)+close.z)/135)%2,yf=clamp(far.y,0,h),yn=clamp(close.y,0,h);c.fillStyle=stripe?p.grass:p.ground;c.fillRect(0,yf,w,Math.max(0,yn-yf+1));}
   for(let i=points.length-1;i>0;i--){const far=points[i],close=points[i-1],stripe=Math.floor(((state.distance||0)+close.z)/135)%2;
    path(c,[[far.x-far.half*1.1,far.y-.7],[far.x+far.half*1.1,far.y-.7],[close.x+close.half*1.1,close.y+.7],[close.x-close.half*1.1,close.y+.7]],stripe?(p.index>=4?'#5a94a0':'#f5d89f'):(p.index>=4?'#32506a':'#bb7767'));
    path(c,[[far.x-far.half,far.y-.7],[far.x+far.half,far.y-.7],[close.x+close.half,close.y+.7],[close.x-close.half,close.y+.7]],p.road);
    for(const side of[-1,1])path(c,[[far.x+side*far.half*.97,far.y],[far.x+side*far.half*.988,far.y],[close.x+side*close.half*.988,close.y],[close.x+side*close.half*.97,close.y]],'#d8e1ceaa');
    if(stripe)for(const lane of[-1/3,1/3])path(c,[[far.x+far.half*(lane-.012),far.y],[far.x+far.half*(lane+.012),far.y],[close.x+close.half*(lane+.012),close.y],[close.x+close.half*(lane-.012),close.y]],'#e1dfbd99');
    const finish=window.AsobiDriftData?.tracks?.[state.trackIndex||0]?.length;if(finish&&state.distance+far.z>=finish&&state.distance+close.z<finish){for(let sq=0;sq<12;sq++){const xa=sq/6-1,xb=(sq+1)/6-1;path(c,[[far.x+far.half*xa,far.y],[far.x+far.half*xb,far.y],[close.x+close.half*xb,close.y],[close.x+close.half*xa,close.y]],sq%2?'#eceddc':'#192c37');}}
   }
   const visible=[];for(let i=points.length-1;i>=0;i--){const point=points[i],roadStep=Math.floor(((state.distance||0)+point.z)/200);if(i===points.length-1||Math.floor(((state.distance||0)+points[i+1].z)/200)!==roadStep)for(const side of[-1,1])visible.push({z:point.z,kind:'scenery',point,side,id:roadStep*2+(side>0?1:0)});}
   for(const rival of state.rivals||[]){const z=rival.distance-(state.distance||0);if(z<near||z>points.at(-1).z)continue;const f=clamp((z-near)/step,0,count-.001),a=points[Math.floor(f)],b=points[Math.floor(f)+1],t=f%1,point={z,scale:a.scale+(b.scale-a.scale)*t,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,half:a.half+(b.half-a.half)*t};visible.push({z,kind:'rival',rival,point});}
   visible.sort((a,b)=>b.z-a.z);for(const item of visible){if(item.kind==='scenery')this.scenery(item.point,item.side,item.id,p,item.point.curve);else{const r=item.rival,colors=['#dc926e','#90b9cd','#c2c779'];car(c,item.point.x+clamp(r.x,-1.5,1.5)*item.point.half,item.point.y,w*.235*item.point.scale,{body:1+(Number(r.id)||0)%3,engine:1,tires:1,color:colors[(Number(r.id)||0)%3]},time);}}
   if(state.drifting){for(const side of[-1,1]){const x=w*.5+side*w*.14;line(c,x,h*.92,x-(state.steer||0)*w*.08,h*.98,'#10232d80',w*.014);}}
   if(state.usingNitro&&!this.reduced){for(let i=0;i<10;i++){const t=(time*1.9+hash(i+6))%1,x=hash(i+31)*w,ys=h*(.32+t*.66);line(c,x,ys,x+(x-w*.5)*.08,ys+h*.05,'#b6ecf468',1+hash(i));}}
   car(c,w*.5,h*.91,clamp(w*.235,69,130),{...state.upgrades,steer:state.steer,drifting:state.drifting,usingNitro:state.usingNitro,brake:state.braking},time);
   const shade=c.createLinearGradient(0,h*.72,0,h);shade.addColorStop(0,'#10233100');shade.addColorStop(1,'#10233142');c.fillStyle=shade;c.fillRect(0,h*.72,w,h*.28);
  }
  garage(state,p,time,labels){const c=this.ctx,w=this.width,h=this.height,g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#233946');g.addColorStop(.55,'#38545b');g.addColorStop(.56,'#3b5054');g.addColorStop(1,'#203b43');c.fillStyle=g;c.fillRect(0,0,w,h);
   for(let i=0;i<7;i++){line(c,i*w/6,0,i*w/6,h*.55,'#172f3b88',2);line(c,0,h*(.13+i*.06),w,h*(.13+i*.06),'#70959122',1);}
   round(c,w*.27,h*.045,w*.46,h*.065,4,'#162d39');text(c,'YOKOCHO / GARAGE',w*.5,h*.077,Math.max(9,w*.024),'#c9d7c3','center');
   for(const side of[0,1]){round(c,w*(.08+side*.65),h*.13,w*.19,h*.018,3,'#d4ddc7');const lamp=c.createLinearGradient(0,h*.15,0,h*.55);lamp.addColorStop(0,'#f6eac22e');lamp.addColorStop(1,'#f5eac200');path(c,[[w*(.08+side*.65),h*.15],[w*(.27+side*.65),h*.15],[w*(.36+side*.65),h*.55],[w*(-.01+side*.65),h*.55]],lamp);}
   for(let i=-2;i<=4;i++)line(c,w*.5,h*.52,i*w/3,h,'#a9b8a52a',1);for(let i=0;i<5;i++)line(c,0,h*(.59+i*.085),w,h*(.59+i*.085),'#a9b8a52a',1);
   path(c,[[w*.08,h*.86],[w*.14,h*.80],[w*.86,h*.80],[w*.92,h*.86]],'#d5bb6a33');line(c,w*.10,h*.86,w*.90,h*.86,'#d1b97688',2);
   round(c,w*.045,h*.37,w*.15,h*.19,3,'#9c6853');for(let i=0;i<3;i++){round(c,w*.06,h*(.40+i*.048),w*.12,h*.026,2,'#b98967');line(c,w*.10,h*(.415+i*.048),w*.14,h*(.415+i*.048),'#e1c8a4',2);}for(let i=0;i<3;i++){ellipse(c,w*.88,h*(.47-i*.045),w*.075,h*.023,'#1b2d35');ellipse(c,w*.88,h*(.462-i*.045),w*.075,h*.023,'#2c414a');ellipse(c,w*.88,h*(.461-i*.045),w*.030,h*.011,'#64807d');}
   ellipse(c,w*.50,h*.90,w*.31,h*.06,'#11283066');car(c,w*.5,h*.87,Math.min(w*.45,h*.48),state.upgrades||{},time);
   for(const side of[-1,1]){line(c,w*.5+side*w*.29,h*.72,w*.5+side*w*.29,h*.87,'#c3b87b70',2);round(c,w*.5+side*w*.29-3,h*.865,6,4,1,'#c3b87b');}
  }
  render(state,model,labels={},time=0){if(this.disposed||!this.ctx||!state)return;const c=this.ctx,w=this.width,h=this.height,p=this.palette(state),t=Number.isFinite(state.elapsed)?state.elapsed:(Number.isFinite(time)?time:0);c.save();c.setTransform(this.dpr,0,0,this.dpr,0,0);if(state.mode==='garage')this.garage(state,p,t,labels);else{this.sky(p,t);this.road(state,model,p,t);if(state.collisionTime>0){c.fillStyle='#d67d6140';c.fillRect(0,0,w,h);}}
   c.restore();}
  cleanup(){this.disposed=true;this.ctx=null;}
 }
 window.AsobiDriftVisual=DriftVisual;
})();
