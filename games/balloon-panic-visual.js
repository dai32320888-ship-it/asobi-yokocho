/* Original latex balloon and festival set. Visuals only; no timers or input. */
(function(){
 'use strict';
 const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const COLORS=[
  {light:'#ffb59b',base:'#ed6b66',edge:'#a43c54',shine:'#fff1d5'},
  {light:'#b2f1cf',base:'#55c6bb',edge:'#237e91',shine:'#f1ffdb'},
  {light:'#ffe9a0',base:'#efb854',edge:'#bc7541',shine:'#ffffdc'},
  {light:'#d9c2ff',base:'#9b80d6',edge:'#655697',shine:'#fff0ff'},
  {light:'#a6ddf6',base:'#5ba9d3',edge:'#306a9d',shine:'#eaffff'},
  {light:'#ffd0de',base:'#e985ac',edge:'#a2457b',shine:'#fff2ef'}
 ];
 const hash=n=>{n=Math.imul((n|0)^0x7f4a7c15,0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return((n^(n>>>16))>>>0)/4294967296;};
 function ellipse(c,x,y,rx,ry,fill,rotation=0){c.beginPath();c.ellipse(x,y,Math.max(.01,Math.abs(rx)),Math.max(.01,Math.abs(ry)),rotation,0,TAU);c.fillStyle=fill;c.fill();}
 function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
 function poly(c,points,fill){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
 function star(c,x,y,r,color,rotation=0){const points=[];for(let i=0;i<10;i++){const a=rotation-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;points.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}poly(c,points,color);}
 function balloonPath(c,x,y,rx,ry){
  c.beginPath();c.moveTo(x,y-ry);
  c.bezierCurveTo(x+rx*.86,y-ry*1.03,x+rx*1.12,y-ry*.20,x+rx*.96,y+ry*.22);
  c.bezierCurveTo(x+rx*.80,y+ry*.72,x+rx*.23,y+ry*.95,x+rx*.055,y+ry);
  c.lineTo(x-rx*.055,y+ry);
  c.bezierCurveTo(x-rx*.23,y+ry*.95,x-rx*.80,y+ry*.72,x-rx*.96,y+ry*.22);
  c.bezierCurveTo(x-rx*1.12,y-ry*.20,x-rx*.86,y-ry*1.03,x,y-ry);c.closePath();
 }
 class BalloonVisual{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.width=390;this.height=380;this.dpr=1;this.disposed=false;this.reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;this._mode='';this._round=-1;this._phaseAt=0;this.resize();}
  resize(width,height,dpr){if(this.disposed)return;const box=this.canvas.getBoundingClientRect();this.width=clamp(width||box.width||390,150,1800);this.height=clamp(height||box.height||380,200,1400);this.dpr=clamp(dpr||window.devicePixelRatio||1,1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.ctx?.setTransform(this.dpr,0,0,this.dpr,0,0);}
  background(pressure){
   const c=this.ctx,w=this.width,h=this.height,g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#183f50');g.addColorStop(.55,'#28515a');g.addColorStop(1,'#274b4c');c.fillStyle=g;c.fillRect(0,0,w,h);
   const glow=c.createRadialGradient(w*.5,h*.39,8,w*.5,h*.4,Math.max(w,h)*.65);glow.addColorStop(0,'#83b49b20');glow.addColorStop(1,'#10293900');c.fillStyle=glow;c.fillRect(0,0,w,h);
   for(let i=0;i<15;i++){const x=hash(i+7)*w,y=hash(i+35)*h*.76,size=1+hash(i+58)*2;c.globalAlpha=.18+hash(i+8)*.16;ellipse(c,x,y,size,size,'#e2dec0');}c.globalAlpha=1;
   c.strokeStyle='#6d8381';c.lineWidth=1.2;c.beginPath();c.moveTo(-8,h*.055);c.quadraticCurveTo(w*.50,h*.18,w+8,h*.045);c.stroke();
   for(let i=0;i<9;i++){const x=w*(i+.5)/9,t=x/w,y=h*(.05+.115*4*t*(1-t));line(c,x,y,x,y+8,'#8b9380',1);const gg=c.createRadialGradient(x,y+11,1,x,y+11,11);gg.addColorStop(0,'#ffe9ac55');gg.addColorStop(1,'#ffe9ac00');ellipse(c,x,y+11,12,12,gg);ellipse(c,x,y+11,2.6,3.5,i%3===1?'#bce5cb':'#ffe0a1');}
   // Quiet side curtains frame the balloon without hiding its outline.
   c.fillStyle='#0e2b3b22';c.fillRect(0,0,w*.07,h*.86);c.fillRect(w*.93,0,w*.07,h*.86);
   const floor=c.createLinearGradient(0,h*.82,0,h);floor.addColorStop(0,'#ccad7b');floor.addColorStop(1,'#e2c796');c.fillStyle=floor;c.fillRect(0,h*.84,w,h*.16);line(c,0,h*.84,w,h*.84,'#eedbb08c',2);
   for(let i=0;i<7;i++){const x=i*w/6;line(c,w*.5+(x-w*.5)*.55,h*.84,x,h,'#a68a5d32',1);}
   ellipse(c,w*.5,h*.89,Math.min(w*.33,h*.29),h*.035,'#183b4936');
   // Tension is spatial and continuous, never a full-screen flash.
   if(pressure>.83){const risk=clamp((pressure-.83)/.17,0,1);c.strokeStyle='rgba(246,172,113,'+(.08+risk*.14)+')';c.lineWidth=1+2*risk;c.strokeRect(w*.035,h*.15,w*.93,h*.65);}
  }
  ribbon(x,y,rx,ry,color,phase){
   const c=this.ctx,w=this.width,h=this.height;c.strokeStyle='#f2d6a0';c.lineWidth=Math.max(1,w*.0032);c.beginPath();c.moveTo(x,y+ry+10);c.bezierCurveTo(x-rx*.18,y+ry+22,x+rx*.20,h*.83,x-rx*.04,h*.91);c.stroke();
   const neck=Math.max(3,rx*.065);c.fillStyle=color.edge;c.beginPath();c.ellipse(x,y+ry,neck,neck*.44,0,0,TAU);c.fill();poly(c,[[x-neck*.40,y+ry+1],[x-neck*1.2,y+ry+neck*1.9],[x+neck*1.15,y+ry+neck*1.7],[x+neck*.32,y+ry]],color.base);
   if(phase==='stopped'){c.strokeStyle='#e9ce91';c.lineWidth=1.5;c.beginPath();c.moveTo(x,y+ry+neck);c.bezierCurveTo(x-neck*4,y+ry-neck*2,x-neck*5,y+ry+neck*3,x,y+ry+neck);c.bezierCurveTo(x+neck*5,y+ry-neck*2,x+neck*5,y+ry+neck*3,x,y+ry+neck);c.stroke();}
  }
  intact(state,color,phase,seconds){
   const c=this.ctx,w=this.width,h=this.height,pressure=clamp(state.pressure,0,1),size=clamp(Number.isFinite(state.size)?state.size:pressure,0,1),stress=clamp(Number.isFinite(state.stress)?state.stress:(pressure-.72)/.28,0,1),elapsed=Number.isFinite(state.elapsed)?state.elapsed:0;
   const maxRx=Math.min(w*.355,h*.285),rx=maxRx*(.30+.70*Math.pow(size,.79)),ry=rx*(1.13-.08*pressure),neckY=h*.745;
   const shake=!this.reduced&&phase==='holding'?Math.pow(stress,1.8)*(Math.sin(elapsed*61)+Math.sin(elapsed*39)*.42)*Math.min(3.1,w*.009):0,idle=!this.reduced&&phase==='ready'?Math.sin(seconds*1.7)*1.4:0,x=w*.5+shake,y=neckY-ry+idle;
   if(phase==='stopped'&&['close','perfect'].includes(state.grade)){const halo=c.createRadialGradient(x,y,rx*.6,x,y,rx*1.6);halo.addColorStop(0,'#f5d88716');halo.addColorStop(1,'#f5d88700');ellipse(c,x,y,rx*1.7,ry*1.45,halo);}
   c.save();c.shadowColor='#071d2f45';c.shadowBlur=Math.max(9,rx*.12);c.shadowOffsetY=rx*.045;balloonPath(c,x,y,rx,ry);const latex=c.createRadialGradient(x-rx*.36,y-ry*.43,rx*.08,x+rx*.12,y+ry*.10,rx*1.37);latex.addColorStop(0,color.light);latex.addColorStop(.53,color.base);latex.addColorStop(.91,color.edge);latex.addColorStop(1,color.edge);c.fillStyle=latex;c.fill();c.shadowColor='transparent';c.strokeStyle=color.edge;c.lineWidth=Math.max(1.3,rx*.017*(1-pressure*.43));c.stroke();c.restore();
   c.save();balloonPath(c,x,y,rx,ry);c.clip();
   const translucency=c.createLinearGradient(x-rx,y-ry,x+rx,y+ry);translucency.addColorStop(0,'#fff4df0d');translucency.addColorStop(.58,'#fff4df00');translucency.addColorStop(1,'#f8eecf20');c.fillStyle=translucency;c.fillRect(x-rx*1.2,y-ry*1.2,rx*2.4,ry*2.4);
   const spec=c.createLinearGradient(x-rx*.6,y-ry*.65,x-rx*.15,y+ry*.05);spec.addColorStop(0,'#fff8dd98');spec.addColorStop(.7,'#fff8dd34');spec.addColorStop(1,'#fff8dd00');ellipse(c,x-rx*.39,y-ry*.40,rx*.18,ry*.36,spec,.46);ellipse(c,x-rx*.45,y-ry*.57,rx*.065,ry*.12,'#fffbe6a6',.46);
   c.strokeStyle='#fff3dc38';c.lineWidth=Math.max(1,rx*.035);c.beginPath();c.ellipse(x+rx*.04,y-ry*.02,rx*.82,ry*.86,-.03,-.72,.37);c.stroke();
   if(pressure>.74){c.strokeStyle='rgba(255,246,215,'+(.1+.28*stress)+')';c.lineWidth=Math.max(.75,rx*.009);for(const side of[-1,1]){c.beginPath();c.ellipse(x+side*rx*.04,y,rx*.92,ry*.94,0,side<0?2.45:-.64,side<0?3.60:.48);c.stroke();}}
   c.restore();this.ribbon(x,y,rx,ry,color,phase);
   if(stress>.18&&phase==='holding'){const alpha=.20+.55*stress,ink='rgba(255,219,165,'+alpha+')';c.lineWidth=1.6;c.strokeStyle=ink;for(const side of[-1,1]){const dx=side*rx*1.13;c.beginPath();c.moveTo(x+dx,y-ry*.25);c.quadraticCurveTo(x+dx+side*7,y-ry*.02,x+dx,y+ry*.20);c.stroke();if(stress>.65){c.beginPath();c.moveTo(x+dx+side*7,y-ry*.11);c.quadraticCurveTo(x+dx+side*12,y+ry*.02,x+dx+side*7,y+ry*.14);c.stroke();}}}
   if(phase==='stopped'&&['close','perfect'].includes(state.grade))this.confetti(color,seconds,rx,y);
  }
  confetti(color,seconds,rx,y){const c=this.ctx,w=this.width,h=this.height,phase=this.reduced ? .6 :Math.min(2.8,seconds);for(let i=0;i<18;i++){const sign=i%2?1:-1,t=hash(i+61),x=w*.5+sign*(rx*.80+t*rx*.42)+Math.sin(i*2.3+phase)*5,cy=y-rx*.5+hash(i+88)*h*.57+phase*(7+hash(i+9)*11);if(cy>h*.83)continue;c.save();c.translate(x,cy);c.rotate(i+phase*.7);c.globalAlpha=Math.max(.4,1-phase*.15);c.fillStyle=[color.light,'#f5d485','#a8ddc2','#e9c7b0'][i%4];if(i%4===0)star(c,0,0,3.5,c.fillStyle);else c.fillRect(-1.5,-3,3,6);c.restore();}}
  burst(state,color,seconds){const c=this.ctx,w=this.width,h=this.height,phase=this.reduced ? .65 :Math.min(1.3,seconds),cx=w*.5,cy=h*.43,r=Math.min(w*.355,h*.285);for(let i=0;i<10;i++){const a=-Math.PI/2+i*TAU/10,spread=r*(.46+phase*.63),x=cx+Math.cos(a)*spread,y=cy+Math.sin(a)*spread*.82+phase*phase*12; c.save();c.translate(x,y);c.rotate(a+phase*(i%2?1:-1));poly(c,[[-r*.08,-r*.09],[r*.11,-r*.03],[r*.05,r*.12],[-r*.05,r*.07]],i%3===0?color.light:i%3===1?color.base:color.edge);line(c,-r*.04,-r*.055,r*.055,r*.01,'#fff0d855',1);c.restore();}c.strokeStyle='#f8ddab85';c.lineWidth=1.6;for(let i=0;i<8;i++){const a=i*TAU/8,len=r*(.55+phase*.30);line(c,cx+Math.cos(a)*len,cy+Math.sin(a)*len*.8,cx+Math.cos(a)*(len+9),cy+Math.sin(a)*(len+9)*.8,'#f8ddab85',1.6);}c.strokeStyle='#ead6a7';c.lineWidth=1.4;c.beginPath();c.moveTo(cx-3,h*.74);c.bezierCurveTo(cx-18,h*.80,cx+18,h*.85,cx,h*.91);c.stroke();poly(c,[[cx-4,h*.74],[cx+6,h*.735],[cx+9,h*.76],[cx-7,h*.76]],color.base);}
  render(state,labels={},now=0){if(this.disposed||!this.ctx||!state)return;const ms=Number.isFinite(now)?now:0;if(this._mode!==state.mode||this._round!==state.round){this._mode=state.mode;this._round=state.round;this._phaseAt=ms;}const phase=Math.max(0,(ms-this._phaseAt)/1000),c=this.ctx,color=COLORS[Math.floor(clamp(state.colorIndex,0,5))];c.save();c.setTransform(this.dpr,0,0,this.dpr,0,0);this.background(state.mode==='holding'?clamp(state.pressure,0,1):0);if(state.mode==='burst')this.burst(state,color,phase);else this.intact(state,color,state.mode,phase);c.restore();}
  cleanup(){if(this.disposed)return;this.disposed=true;this.ctx=null;}
 }
 window.AsobiBalloonVisual=BalloonVisual;
})();
