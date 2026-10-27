/* Original articulated gym renderer. No animation loop, assets or DOM lookups. */
(function () {
  'use strict';
  const GROUPS=['chest','back','shoulders','arms','quads','core','calves'];
  const clamp=(n,min=0,max=100)=>Math.min(max,Math.max(min,Number.isFinite(Number(n))?Number(n):min));
  const mix=(a,b,p)=>a+(b-a)*p;
  const vec=(x=0,y=0,z=0)=>({x,y,z});
  const add=(a,b)=>vec(a.x+b.x,a.y+b.y,a.z+b.z);
  const sub=(a,b)=>vec(a.x-b.x,a.y-b.y,a.z-b.z);
  const mul=(a,n)=>vec(a.x*n,a.y*n,a.z*n);
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const length=a=>Math.hypot(a.x,a.y,a.z);
  const normal=a=>mul(a,1/(length(a)||1));
  function solveJoint(start,target,upper,lower,pole){
    let delta=sub(target,start),distance=length(delta);
    if(distance>upper+lower-.1){delta=mul(normal(delta),upper+lower-.1);target=add(start,delta);distance=length(delta);}
    distance=Math.max(.1,distance);
    const axis=normal(delta),along=(upper*upper-lower*lower+distance*distance)/(2*distance);
    const bend=normal(sub(pole,mul(axis,dot(pole,axis))));
    return {joint:add(add(start,mul(axis,along)),mul(bend,Math.sqrt(Math.max(0,upper*upper-along*along)))),end:target};
  }
  function normalizeBody(state={}){
    const source=state.muscles||state,body={};
    GROUPS.forEach(key=>{body[key]=clamp(source[key]);});
    body.definition=clamp(state.definition===undefined?state.condition:state.definition);
    body.condition=clamp(state.condition===undefined?body.definition:state.condition);
    body.fatigue=clamp(state.fatigue);
    return body;
  }
  function dimensions(body,flex=false){
    const m=key=>Math.pow(body[key]/100,.84),f=flex?1.035:1;
    return {
      shoulder:(47+23*m('shoulders')+7*m('back'))*f,
      chest:(40+25*m('chest')+9*m('back'))*f,
      lat:38+31*m('back'),waist:27+11*m('core'),hip:29+8*m('quads'),
      deltoid:(11+14*m('shoulders'))*f,arm:(8.6+11.9*m('arms'))*f,
      forearm:7+7.5*m('arms'),quad:14+13*m('quads'),calf:9.3+11*m('calves'),
      legX:21+7*m('quads'),abs:14+7*m('core'),pecDepth:8+11*m('chest'),
      definition:.10+.76*body.definition/100
    };
  }
  class BodyVisual {
    constructor(canvas){
      if(!canvas||typeof canvas.getContext!=='function')throw new TypeError('AsobiBodyVisual needs a canvas');
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.disposed=false;
      if(!this.ctx)throw new Error('Canvas 2D is unavailable');
      this.W=720;this.H=760;this.yaw=-.10;this.scale=1.20;this.centerX=362;this.floorY=684;
      this.highlights=new Set();this.pulse=.22;this.regions={};
    }
    static normalize(state){return normalizeBody(state);}
    static dimensions(state,flex=false){return dimensions(normalizeBody(state),flex);}
    cleanup(){this.disposed=true;this.regions={};}
    _project(point){
      const c=Math.cos(this.yaw),s=Math.sin(this.yaw),x=point.x*c+point.z*s,z=-point.x*s+point.z*c;
      const perspective=1+z/1700;
      return {x:this.centerX+x*this.scale*perspective,y:this.floorY+(point.y+z*.22)*this.scale,z,scale:perspective*this.scale};
    }
    _gradient(x,y,w,h,stops,radial=false){
      const ctx=this.ctx,g=radial?ctx.createRadialGradient(x+w*.35,y+h*.22,Math.max(1,w*.03),x+w*.5,y+h*.5,Math.max(1,Math.max(w,h)*.68)):ctx.createLinearGradient(x,y,x+w,y+h*.48);
      stops.forEach(([at,color])=>g.addColorStop(at,color));return g;
    }
    _ellipse(x,y,rx,ry,fill,rotation=0,stroke=null,width=1){
      const ctx=this.ctx;ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rotation,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
    }
    _round(x,y,w,h,r,fill,stroke=null,width=1){
      const ctx=this.ctx;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
    }
    _line(points,color,width=1,closed=false){
      const ctx=this.ctx;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(closed)ctx.closePath();
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
    }
    _shape(points,fill,stroke=null,width=1,smooth=true){
      const ctx=this.ctx;ctx.beginPath();
      if(smooth){
        const last=points[points.length-1],first=points[0];ctx.moveTo((last.x+first.x)/2,(last.y+first.y)/2);
        points.forEach((p,i)=>{const next=points[(i+1)%points.length];ctx.quadraticCurveTo(p.x,p.y,(p.x+next.x)/2,(p.y+next.y)/2);});
      }else points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke();}
    }
    _bounds(points){
      const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
      return {x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y};
    }
    _skin(points,group,light=0,outline=true){
      const b=this._bounds(points),g=this._gradient(b.x,b.y,b.w,b.h,light>0?[[0,'#f3c9a7'],[.30,'#deb18d'],[.70,'#bf8c6d'],[1,'#92684f']]:[[0,'#e6b994'],[.30,'#d3a17c'],[.7,'#b78060'],[1,'#805841']]);
      this._shape(points,g,outline?'#805c4866':null,.9);
      if(group){this._region(group,points);if(this.highlights.has(group)){
        this.ctx.save();this.ctx.globalAlpha=this.pulse;this._shape(points,'#ffc572','#ffe4aa',1.5);this.ctx.restore();
      }}
    }
    _region(group,points){
      const b=this._bounds(points),old=this.regions[group];
      if(!old)this.regions[group]={x:b.x,y:b.y,width:b.w,height:b.h};
      else{const right=Math.max(old.x+old.width,b.x+b.w),bottom=Math.max(old.y+old.height,b.y+b.h);old.x=Math.min(old.x,b.x);old.y=Math.min(old.y,b.y);old.width=right-old.x;old.height=bottom-old.y;}
    }
    _localShape(transform,points,z,group,light=0){
      const mapped=points.map(([x,y,d])=>this._project(transform(x,y,d===undefined?z:d)));this._skin(mapped,group,light);return mapped;
    }
    _localLine(transform,points,color,width=1){
      this._line(points.map(([x,y,z])=>this._project(transform(x,y,z||0))),color,width);
    }
    _capsule(start,end,rTop,rBottom,group,style='skin',bulge=1.08){
      const a=this._project(start),b=this._project(end),dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,n={x:-dy/l,y:dx/l},s=(a.scale+b.scale)/2;
      const r1=rTop*s,r2=rBottom*s,peak=Math.max(r1,r2)*bulge;
      const at=(p,r)=>({x:mix(a.x,b.x,p)+n.x*r,y:mix(a.y,b.y,p)+n.y*r});
      const points=[at(0,r1*.75),at(.29,peak),at(.67,(r1+r2)*.51),at(1,r2),at(1,-r2),at(.67,-(r1+r2)*.51),at(.29,-peak*.91),at(0,-r1*.75)];
      if(style==='skin')this._skin(points,group);
      else{const q=this._bounds(points),g=this._gradient(q.x,q.y,q.w,q.h,[[0,'#416775'],[.35,'#244c5b'],[.85,'#183340'],[1,'#122a35']]);this._shape(points,g,'#102530',1);}
      return {a,b,n,s,at};
    }
    _environment(time,exercise){
      const c=this.ctx,W=720,H=760;
      const wall=c.createLinearGradient(0,0,0,510);wall.addColorStop(0,'#d8d4bf');wall.addColorStop(.48,'#b6c2ac');wall.addColorStop(1,'#819d8d');c.fillStyle=wall;c.fillRect(0,0,W,H);
      const beam=c.createLinearGradient(50,0,600,690);beam.addColorStop(0,'#fff4ca35');beam.addColorStop(1,'#fff4ca00');this._shape([{x:7,y:75},{x:160,y:73},{x:616,y:760},{x:310,y:760}],beam,null,1,false);
      this._round(22,84,158,286,5,'#5d766b','#e9e6cc',5);
      const windowLight=c.createLinearGradient(28,80,177,348);windowLight.addColorStop(0,'#e8efd6');windowLight.addColorStop(.5,'#bacfbd');windowLight.addColorStop(1,'#8ea991');this._round(31,93,140,267,2,windowLight);
      c.save();c.beginPath();c.rect(31,93,140,267);c.clip();
      this._shape([{x:12,y:310},{x:55,y:202},{x:83,y:315},{x:109,y:240},{x:160,y:348},{x:192,y:300},{x:192,y:373},{x:12,y:373}],'#6f927a88',null,1,false);
      this._line([{x:100,y:92},{x:100,y:363}],'#e6e4ca',7);[167,265].forEach(y=>this._line([{x:29,y},{x:174,y}],'#e6e4ca',6));c.restore();
      this._round(17,365,169,14,2,'#6a7660');this._round(20,379,163,6,1,'#d2c5a4');
      this._round(236,66,448,392,10,'#546d65','#e5d4ad',5);
      const mirror=c.createLinearGradient(247,77,672,448);mirror.addColorStop(0,'#c3d2c5');mirror.addColorStop(.5,'#9db7aa');mirror.addColorStop(1,'#6c9185');this._round(246,76,428,372,3,mirror);
      this._line([{x:460,y:77},{x:460,y:447}],'#526e6260',2);
      this._shape([{x:256,y:80},{x:344,y:80},{x:667,y:350},{x:667,y:405}],'#ffffff16',null,1,false);
      this._shape([{x:537,y:80},{x:580,y:80},{x:669,y:164},{x:669,y:213}],'#ffffff11',null,1,false);
      this._line([{x:254,y:89},{x:441,y:89}],'#f5f3df55',1);
      this._round(519,305,135,72,5,'#466b5e33');this._line([{x:531,y:371},{x:531,y:322},{x:640,y:322},{x:640,y:371}],'#567f6e66',5);
      c.fillStyle='#3e5d4e';c.font='700 13px system-ui,sans-serif';c.textAlign='center';c.letterSpacing='2px';c.fillText('YOKOCHO',466,127);c.font='600 8px system-ui,sans-serif';c.fillText('S T R E N G T H   C L U B',466,143);c.letterSpacing='0px';
      this._line([{x:430,y:102},{x:502,y:102}],'#5c7965',3);this._round(439,94,6,16,1,'#5c7965');this._round(487,94,6,16,1,'#5c7965');
      this._round(0,444,720,28,0,'#587762');this._line([{x:0,y:445},{x:720,y:445}],'#c2bd96',4);this._line([{x:0,y:470},{x:720,y:470}],'#365949',3);
      const floor=c.createLinearGradient(0,469,0,H);floor.addColorStop(0,'#9a9b7c');floor.addColorStop(.38,'#b3a88a');floor.addColorStop(1,'#c4ad89');c.fillStyle=floor;c.fillRect(0,472,W,H-472);
      for(let i=-5;i<12;i++){const x=i*110;this._line([{x:360+(x-360)*.18,y:472},{x,y:H}],'#7b806754',1);}
      [508,561,630,716].forEach(y=>{this._line([{x:0,y},{x:720,y}],'#687e6933',1);this._line([{x:0,y:y+2},{x:720,y:y+2}],'#e3d0a51f',1);});
      this._shape([{x:133,y:578},{x:542,y:578},{x:649,y:732},{x:71,y:732}],'#374d45','#718574',2,false);
      this._shape([{x:144,y:589},{x:537,y:589},{x:630,y:720},{x:91,y:720}],'#3b5349','#243f35',1,false);
      for(let i=0;i<11;i++)this._line([{x:134+i*38,y:589},{x:93+i*53,y:720}],'#c8cead0c',1);
      [618,650,689].forEach(y=>this._line([{x:110-(y-618)*.26,y},{x:557+(y-618)*.47,y}],'#c8cead0c',1));
      this._drawRack();this._drawBackgroundBench();this._drawWeightTree();
      [105,394,636].forEach((x,i)=>{
        this._line([{x,y:0},{x,y:25+i*4}],'#546357',2);
        const shade=c.createLinearGradient(x-26,28,x+24,50);shade.addColorStop(0,'#4b6758');shade.addColorStop(1,'#243f33');
        this._shape([{x:x-17,y:25+i*4},{x:x+17,y:25+i*4},{x:x+31,y:46+i*4},{x:x-31,y:46+i*4}],shade,'#254237',1,false);this._ellipse(x,47+i*4,30,4,'#ead4a2');this._ellipse(x,47+i*4,18,2,'#fff0bf');
      });
      const vignette=c.createRadialGradient(361,360,150,361,420,580);vignette.addColorStop(0,'#18372700');vignette.addColorStop(1,'#18372738');c.fillStyle=vignette;c.fillRect(0,0,W,H);
    }
    _drawRack(){
      const c=this.ctx;this._ellipse(103,523,102,17,'#314f3b40');
      const metal=c.createLinearGradient(35,0,52,0);metal.addColorStop(0,'#284b46');metal.addColorStop(.4,'#607e72');metal.addColorStop(.63,'#789183');metal.addColorStop(1,'#2d4f46');
      this._round(38,205,12,310,3,metal,'#38584b',1);this._round(155,205,12,310,3,metal,'#38584b',1);
      this._round(33,203,141,11,3,'#35584c');this._round(29,509,38,11,2,'#35584c');this._round(139,509,38,11,2,'#35584c');
      for(let y=235;y<490;y+=25){this._ellipse(44,y,2.1,2.1,'#233e35');this._ellipse(161,y,2.1,2.1,'#233e35');}
      this._round(29,319,30,8,2,'#9ca998');this._round(147,319,30,8,2,'#9ca998');
      this._round(6,309,191,5,2,'#b2bbb0');this._round(4,309,193,2,1,'#e9e6cf');
      [18,23,28].forEach((x,i)=>this._ellipse(x,311,4,32-i*2,'#355b50',0,'#182f28',.7));
      [173,178,183].forEach((x,i)=>this._ellipse(x,311,4,32-i*2,'#355b50'));
      this._ellipse(16,311,5,32,'#456d5b',0,'#1e4237',2);this._ellipse(185,311,5,29,'#3c6153',0,'#1e4237',2);
      this._line([{x:60,y:218},{x:60,y:285}],'#c8c8ac55',2);
      this._round(154,364,28,55,4,'#d6ccad');this._line([{x:159,y:374},{x:176,y:374}],'#b6ad94',2);this._line([{x:159,y:380},{x:176,y:380}],'#b6ad94',1);
    }
    _drawBackgroundBench(){
      this._ellipse(585,525,95,17,'#3049333b');
      this._line([{x:539,y:493},{x:526,y:531},{x:550,y:531}],'#41584e',9);this._line([{x:626,y:490},{x:645,y:528},{x:622,y:528}],'#41584e',9);
      this._shape([{x:514,y:482},{x:620,y:477},{x:655,y:496},{x:537,y:502}],'#294e45','#63745c',1,false);
      this._shape([{x:514,y:482},{x:537,y:502},{x:537,y:512},{x:514,y:492}],'#1f3f37',null,1,false);this._shape([{x:537,y:502},{x:655,y:496},{x:655,y:505},{x:537,y:512}],'#18382f',null,1,false);
      this._line([{x:525,y:483},{x:619,y:480}],'#86a18455',1.5);
    }
    _drawWeightTree(){
      this._ellipse(640,599,72,16,'#3a4f3440');this._line([{x:631,y:521},{x:638,y:595}],'#43594a',9);this._line([{x:613,y:598},{x:666,y:598}],'#43594a',10);
      const c=this.ctx;
      [[616,541,29,'#826d46'],[653,553,30,'#345b4d'],[626,577,27,'#54726a']].forEach(([x,y,r,color])=>{
        this._ellipse(x+4,y+3,r*.32,r,color,0,'#24483e',2);this._ellipse(x,y,r*.33,r,color,0,'#aab39a55',1);this._ellipse(x,y,r*.13,r*.35,'#284b3d',0,'#c1bea05c',1);
      });
      this._round(12,576,53,14,3,'#9b8b68');this._round(23,525,31,52,7,'#b4a486');this._line([{x:27,y:539},{x:49,y:539}],'#7d8267',2);
      for(let i=0;i<4;i++){const x=25+i*8;this._line([{x,y:530},{x:x-12+i*7,y:495-i*3}],'#52764f',3);this._ellipse(x-9+i*5,510-i*3,7,17,'#6e8c60',-.4+i*.2);}
    }
    _contestStage(){
      const c=this.ctx,wall=c.createLinearGradient(0,0,0,760);wall.addColorStop(0,'#172e30');wall.addColorStop(.6,'#263f3d');wall.addColorStop(1,'#111f27');c.fillStyle=wall;c.fillRect(0,0,720,760);
      for(let i=0;i<24;i++){const x=i*31-12,g=c.createLinearGradient(x,0,x+34,0);g.addColorStop(0,'#102825');g.addColorStop(.30,'#274b3e');g.addColorStop(.68,'#365445');g.addColorStop(1,'#142f29');this._shape([{x,y:0},{x:x+34,y:0},{x:x+29,y:630},{x:x+5,y:630}],g,null,1,false);}
      const center=c.createRadialGradient(360,350,30,360,350,420);center.addColorStop(0,'#9baa6645');center.addColorStop(.6,'#b7ba750c');center.addColorStop(1,'#10282400');c.fillStyle=center;c.fillRect(0,0,720,690);
      [[139,10,267,684,509,684],[591,10,213,684,479,684]].forEach(([x,y,x1,y1,x2,y2])=>{const g=c.createLinearGradient(x,y,360,690);g.addColorStop(0,'#fff3b541');g.addColorStop(1,'#fff2b408');this._shape([{x:x-8,y},{x:x+8,y},{x:x2,y:y2},{x:x1,y:y1}],g,null,1,false);});
      this._round(0,627,720,133,0,'#15272a');this._ellipse(360,693,268,51,'#c9bc7930');
      this._shape([{x:178,y:663},{x:542,y:663},{x:617,y:725},{x:103,y:725}],'#405347','#81917a',1.3,false);
      this._shape([{x:103,y:725},{x:617,y:725},{x:617,y:744},{x:103,y:744}],'#1b3331','#829177',1.2,false);
      this._line([{x:109,y:729},{x:611,y:729}],'#c2ad70',2);this._line([{x:129,y:717},{x:591,y:717}],'#7c8f6b88',1);
      [39,681].forEach(x=>{this._round(x-15,608,30,36,5,'#182e2e','#557260',2);this._ellipse(x,606,15,6,'#d4c48b');});
      c.textAlign='center';c.fillStyle='#d6c38d';c.font='800 19px system-ui,sans-serif';c.fillText('Y O K O C H O',360,98);c.font='600 9px system-ui,sans-serif';c.fillStyle='#b3b99a';c.fillText('S T R E N G T H   C L U B   /   O P E N   S T A G E',360,118);
      this._line([{x:277,y:135},{x:443,y:135}],'#9c956b80',1);this._shape([{x:360,y:140},{x:365,y:145},{x:360,y:150},{x:355,y:145}],'#c1af74',null,1,false);
    }
    _skeleton(body,options,m){
      const active=options.phase==='work',exercise=active?options.exercise:null,p=active?clamp(options.progress,0,1):0,q=p*p*(3-2*p),flex=options.pose==='flex'||options.phase==='victory'||options.phase==='contest';
      let hip=vec(0,-205,0),bend=0,ankleY=-10,stance=0;
      if(exercise==='squat'){hip=vec(0,-205+89*q,-40*q);bend=.29*q;stance=7;}
      if(exercise==='deadlift'){hip=vec(0,-151-54*q,-32*(1-q));bend=1.28*(1-q);stance=2;}
      if(exercise==='row'){hip=vec(0,-194,-15);bend=.95;stance=3;}
      if(exercise==='calf'){hip.y-=18*q;ankleY-=18*q;}
      let torso=(x,y,z=0)=>vec(hip.x+x,hip.y+y*Math.cos(bend)+z*Math.sin(bend),hip.z-y*Math.sin(bend)+z*Math.cos(bend));
      if(exercise==='bench'){
        hip=vec(0,-105,10);torso=(x,y,z=0)=>vec(x,-105-z,10+y);
      }else if(exercise==='plank'){
        hip=vec(25,-71,0);torso=(x,y,z=0)=>vec(25+y,-71+y*.15+z*.8,x);
      }
      const skeleton={exercise,q,hip,torso,flex,bend,arms:[],legs:[],head:torso(0,-185,3),headBase:torso(0,-151,1),m};
      for(const side of [-1,1]){
        let hipJoint=vec(side*m.legX,hip.y,hip.z),ankle=vec(side*(28+stance),ankleY,9),knee;
        if(exercise==='bench'){hipJoint=vec(side*m.legX,-105,18);knee=vec(side*48,-88,111);ankle=vec(side*55,-9,153);}
        else if(exercise==='plank'){hipJoint=vec(24,-71,side*m.legX*.65);knee=vec(127,-42,side*21);ankle=vec(231,-13,side*20);}
        else{
          const ik=solveJoint(hipJoint,ankle,103,101,vec(side*.2,0,1));knee=ik.joint;ankle=ik.end;
        }
        skeleton.legs.push({side,hip:hipJoint,knee,ankle,exercise});
        const shoulder=torso(side*m.shoulder,-134,0);let hand,elbow;
        if(flex&&!exercise){
          elbow=torso(side*(m.shoulder+65),-141,10);hand=torso(side*(m.shoulder+47),-210,16);
        }else if(exercise==='curl'){
          elbow=torso(side*(m.shoulder+4),-61,8);hand=add(elbow,vec(side*3,-mix(-73,60,q),mix(9,44,q)));
        }else if(exercise==='plank'){
          elbow=vec(-107,-14,side*36);hand=vec(-176,-9,side*37);
        }else{
          let pole=vec(side,0,.12);
          if(exercise==='bench'){hand=vec(side*(m.shoulder+9),-126-130*q,-109);pole=vec(side,1,.5);}
          else if(exercise==='squat'){hand=torso(side*(m.shoulder+21),-139,-17);pole=vec(side,.8,-1);}
          else if(exercise==='deadlift'){hand=vec(side*(m.shoulder-1),-35-155*q,78-43*q);pole=vec(side,.15,.1);}
          else if(exercise==='row'){hand=vec(side*(m.shoulder+4),-126-100*q,110-22*q);pole=vec(side,-.3,-1);}
          else if(exercise==='press'){hand=torso(side*(m.shoulder+5-9*q),mix(-113,-280,q),15);pole=vec(side,1,-.2);}
          else hand=torso(side*(m.shoulder+10),15,10);
          const ik=solveJoint(shoulder,hand,77,76,pole);elbow=ik.joint;hand=ik.end;
        }
        skeleton.arms.push({side,shoulder,elbow,hand,exercise});
      }
      skeleton.neckTop=torso(0,-161,0);skeleton.neckBottom=torso(0,-141,0);
      return skeleton;
    }


    _drawLeg(leg,skeleton,body){
      const m=skeleton.m,upper=this._capsule(leg.hip,leg.knee,m.quad,m.quad*.52,'quads','skin',1.02);
      const knee=this._project(leg.knee),kr=(7.5+body.quads*.025)*knee.scale;
      this._ellipse(knee.x,knee.y,kr,kr*.91,this._gradient(knee.x-kr,knee.y-kr,kr*2,kr*2,[[0,'#e2b08a'],[.45,'#ce9873'],[1,'#976648']],true),0,'#9d70524d',.9);
      const lower=this._capsule(leg.knee,leg.ankle,m.calf*.74,5.7,'calves','skin',1.3);
      const opacity=.08+m.definition*.20;
      this.ctx.save();this.ctx.globalAlpha=opacity;
      this._line([upper.at(.27,upper.s*m.quad*.19),upper.at(.54,upper.s*m.quad*.42),upper.at(.85,0)],'#754d35',1.4);
      this._line([upper.at(.22,-upper.s*m.quad*.48),upper.at(.56,-upper.s*m.quad*.40),upper.at(.81,-2)],'#fff0c8',1.7);
      this._line([lower.at(.20,-lower.s*3),lower.at(.47,lower.s*2),lower.at(.85,0)],'#704a34',1.2);
      this._line([lower.at(.28,lower.s*m.calf*.32),lower.at(.56,lower.s*m.calf*.2)],'#ffe1b1',1.6);this.ctx.restore();
      this._drawShoe(leg);
    }
    _drawShoe(leg){
      if(leg.exercise==='calf'){this._drawCalfShoe(leg);return;}
      const a=this._project(leg.ankle),c=this.ctx,s=a.scale;
      c.save();c.translate(a.x,a.y);c.rotate(leg.exercise==='plank'?.58:leg.side*.12);if(leg.exercise!=='plank')c.scale(leg.side,1);
      this._round(-7*s,-7*s,14*s,11*s,2*s,'#d8d5bd','#999d87',.7);
      const shoe=this._gradient(-12*s,0,39*s,23*s,[[0,'#65746b'],[.3,'#3d5551'],[1,'#203c37']]);
      this._shape([{x:-12*s,y:1*s},{x:4*s,y:-3*s},{x:10*s,y:5*s},{x:23*s,y:7*s},{x:27*s,y:17*s},{x:19*s,y:21*s},{x:-13*s,y:18*s}],shoe,'#1d352f',1.1);
      this._shape([{x:-14*s,y:15*s},{x:25*s,y:15*s},{x:27*s,y:21*s},{x:17*s,y:24*s},{x:-14*s,y:21*s}],'#dcd8c2','#949e86',.7,false);
      this._line([{x:-8*s,y:20*s},{x:21*s,y:20*s}],'#a9b39a',1);
      this._shape([{x:-5*s,y:4*s},{x:4*s,y:1*s},{x:11*s,y:12*s},{x:1*s,y:13*s}],'#82918a',null,1,false);
      for(let i=0;i<3;i++)this._line([{x:(-4+i*2)*s,y:(5+i*2.6)*s},{x:(4+i*2)*s,y:(4+i*2.6)*s}],'#d8d9c2',.85*s);
      this._line([{x:12*s,y:11*s},{x:21*s,y:13*s}],'#c4ac73',2*s);c.restore();
    }
    _drawCalfShoe(leg){
      const a=this._project(leg.ankle),heel=this._project(vec(leg.ankle.x-leg.side*8,leg.ankle.y+6,leg.ankle.z-5)),toe=this._project(vec(leg.ankle.x+leg.side*18,0,leg.ankle.z+24)),s=a.scale,d=Math.sign(toe.x-heel.x)||leg.side;
      this._round(a.x-7*s,a.y-7*s,14*s,11*s,2*s,'#d8d5bd','#999d87',.7);
      const points=[{x:heel.x-d*7*s,y:heel.y-2*s},{x:a.x-7*s,y:a.y-5*s},{x:a.x+7*s,y:a.y-5*s},{x:toe.x+d*8*s,y:toe.y-5*s},{x:toe.x+d*11*s,y:toe.y+4*s},{x:heel.x-d*6*s,y:heel.y+8*s}],b=this._bounds(points);
      this._shape(points,this._gradient(b.x,b.y,b.w,b.h,[[0,'#65746b'],[.4,'#3d5551'],[1,'#203c37']]),'#1d352f',1.1);
      this._shape([{x:heel.x-d*7*s,y:heel.y+5*s},{x:toe.x+d*11*s,y:toe.y+3*s},{x:toe.x+d*11*s,y:toe.y+8*s},{x:toe.x,y:toe.y+10*s},{x:heel.x-d*7*s,y:heel.y+10*s}],'#dcd8c2','#949e86',.7,false);
      for(let i=0;i<3;i++){const f=.3+i*.13,x=mix(a.x,toe.x,f),y=mix(a.y,toe.y,f);this._line([{x:x-3*s,y:y-2*s},{x:x+4*s,y:y-4*s}],'#dedec4',.85*s);}
      this._line([{x:mix(a.x,toe.x,.61),y:mix(a.y,toe.y,.61)+s},{x:mix(a.x,toe.x,.85),y:mix(a.y,toe.y,.85)+s}],'#c4ac73',2*s);
    }
    _drawShorts(skeleton){
      const m=skeleton.m,t=skeleton.torso;
      for(const leg of skeleton.legs){
        const end=add(leg.hip,mul(sub(leg.knee,leg.hip),.44));
        const fabric=this._capsule(leg.hip,end,m.quad+3,m.quad*.90+2,null,'fabric',1.02);
        this._line([fabric.at(.12,leg.side*(m.quad+1)*fabric.s),fabric.at(.78,leg.side*(m.quad*.88)*fabric.s)],'#adc6ad90',3.1);
        this._line([fabric.at(.85,-(m.quad*.7)*fabric.s),fabric.at(.92,(m.quad*.72)*fabric.s)],'#1a3640',1.1);
      }
      const band=[[-m.hip-3,-17,13],[-m.waist,-23,11],[m.waist,-23,11],[m.hip+3,-17,13],[m.hip+2,4,15],[-m.hip-2,4,15]].map(([x,y,z])=>this._project(t(x,y,z)));
      const b=this._bounds(band);this._shape(band,this._gradient(b.x,b.y,b.w,b.h,[[0,'#426772'],[.5,'#234a57'],[1,'#153642']]),'#17323b',1);
      this._localLine(t,[[-m.hip,-14,16],[0,-10,19],[m.hip,-14,16]],'#a6baa278',1.2);
      const knot=this._project(t(0,-10,20));this._line([{x:knot.x-2,y:knot.y},{x:knot.x-4,y:knot.y+12},{x:knot.x-1,y:knot.y+16}],'#dddbc0',1.3);this._line([{x:knot.x+2,y:knot.y},{x:knot.x+5,y:knot.y+10},{x:knot.x+3,y:knot.y+15}],'#dddbc0',1.3);
      const label=this._project(add(skeleton.legs[1].hip,mul(sub(skeleton.legs[1].knee,skeleton.legs[1].hip),.27)));
      this.ctx.save();this.ctx.translate(label.x+6,label.y);this.ctx.rotate(skeleton.exercise==='plank'?-1.25:0);this.ctx.font='800 7px system-ui,sans-serif';this.ctx.textAlign='center';this.ctx.fillStyle='#d7d4ae';this.ctx.fillText('YC',0,0);this.ctx.restore();
    }
    _drawTorso(skeleton,body,back){
      const m=skeleton.m,t=skeleton.torso;
      this._capsule(skeleton.neckBottom,skeleton.neckTop,13.5,11.8,null,'skin',1);
      const contour=[[-12,-155,0],[-m.shoulder*.66,-144,0],[-m.shoulder,-134,0],[-m.chest,-108,0],[-m.lat,-81,0],[-m.waist,-29,0],[-m.hip,-1,0],[m.hip,-1,0],[m.waist,-29,0],[m.lat,-81,0],[m.chest,-108,0],[m.shoulder,-134,0],[m.shoulder*.66,-144,0],[12,-155,0]];
      this._localShape(t,contour,0,back?'back':null);
      if(back)this._drawBack(skeleton,body);else this._drawFront(skeleton,body);
      this._localLine(t,[[-11,-150,3],[-5,-143,8],[0,-141,9],[5,-143,8],[11,-150,3]],'#78563b55',1);
    }
    _drawFront(skeleton,body){
      const m=skeleton.m,t=skeleton.torso,d=m.definition;
      for(const side of [-1,1]){
        const pecH=33+body.chest*.09,top=-132,bottom=top+pecH;
        const pec=[[side*4,top+4,17],[side*m.chest*.55,top-1,m.pecDepth],[side*(m.chest-5),top+8,10],[side*(m.chest-2),bottom-5,12],[side*m.chest*.54,bottom+5,m.pecDepth+2],[side*4,bottom-1,18]];
        this._localShape(t,pec,14,'chest',1);
        this.ctx.save();this.ctx.globalAlpha=.12+d*.24;
        this._localLine(t,[[side*6,bottom+1,20],[side*m.chest*.50,bottom+7,m.pecDepth+4],[side*(m.chest-5),bottom-3,16]],'#714f39',1.3);
        this._localLine(t,[[side*10,top+9,20],[side*m.chest*.48,top+3,m.pecDepth+5],[side*(m.chest-10),top+9,15]],'#fff0d2',1.6);
        this.ctx.restore();
        const flank=[[side*(m.waist+9),-87,8],[side*(m.waist+2),-75,15],[side*(m.waist-2),-27,15],[side*(m.waist-12),-16,14],[side*(m.waist-10),-58,18]];
        this._localShape(t,flank,13,'core');
        this.ctx.save();this.ctx.globalAlpha=.07+d*.20;
        for(let i=0;i<3;i++)this._localLine(t,[[side*(m.waist+5-i),-80+i*12,15],[side*(m.waist-9),-73+i*12,20]],'#70503c',1.1);
        this.ctx.restore();
      }
      const absW=m.abs;
      this.ctx.save();this.ctx.globalAlpha=.25+body.definition*.006;
      for(let row=0;row<3;row++)for(const side of [-1,1]){
        const top=-80+row*19,width=absW-row*1.1;
        const points=[[side*2,top+2,18],[side*width*.72,top-1,16],[side*width,top+5,15],[side*(width-1),top+14,16],[side*3,top+17,19]];
        this._localShape(t,points,17,'core',1);
      }
      this.ctx.restore();
      this.ctx.save();this.ctx.globalAlpha=.08+d*.22;this._localLine(t,[[0,-129,21],[0,-92,22]],'#6f4d36',1.1);this._localLine(t,[[0,-78,21],[0,-31,22]],'#805b42',.8);
      this._localLine(t,[[-m.waist+6,-24,18],[-12,-12,20],[0,-11,21],[12,-12,20],[m.waist-6,-24,18]],'#704a36',1.1);this.ctx.restore();
      const navel=this._project(t(0,-24,22));this._ellipse(navel.x,navel.y,1.2*this.scale,1.7*this.scale,'#865e4466');
    }
    _drawBack(skeleton,body){
      const m=skeleton.m,t=skeleton.torso,d=m.definition;
      for(const side of [-1,1]){
        this._localShape(t,[[side*2,-149,-8],[side*13,-154,-7],[side*(m.shoulder-11),-133,-7],[side*m.lat*.71,-117,-13],[side*6,-119,-17]],-10,'back',1);
        this._localShape(t,[[side*8,-118,-15],[side*(m.chest-6),-126,-10],[side*(m.lat-1),-97,-16],[side*(m.waist+1),-44,-13],[side*5,-48,-18]],-14,'back');
        this._localShape(t,[[side*8,-105,-19],[side*m.lat*.54,-112,-18],[side*m.lat*.69,-91,-18],[side*13,-77,-23]],-18,'back',1);
        this.ctx.save();this.ctx.globalAlpha=.12+d*.24;
        this._localLine(t,[[side*5,-144,-20],[side*17,-127,-22],[side*m.lat*.65,-118,-20]],'#ffe0b4',1.5);
        this._localLine(t,[[side*6,-112,-23],[side*20,-88,-24],[side*9,-44,-22]],'#754e37',1.2);
        this._localLine(t,[[side*(m.lat-5),-91,-22],[side*(m.waist+5),-58,-20]],'#f6d7af',1.3);this.ctx.restore();
        this._localShape(t,[[side*4,-71,-17],[side*14,-67,-19],[side*16,-29,-15],[side*6,-14,-13]],-16,'core');
      }
      this.ctx.save();this.ctx.globalAlpha=.17+d*.18;this._localLine(t,[[0,-148,-24],[0,-111,-25],[0,-70,-24],[0,-20,-19]],'#71503d',1.4);this.ctx.restore();
    }
    _drawArm(arm,skeleton,body){
      const m=skeleton.m;
      const upper=this._capsule(arm.shoulder,arm.elbow,m.arm*.89,m.arm*.64,'arms','skin',1.10);
      const joint=this._project(arm.elbow);this._ellipse(joint.x,joint.y,(m.arm*.62)*joint.scale,(m.arm*.56)*joint.scale,'#c89571',0,'#91694e44',.8);
      const lower=this._capsule(arm.elbow,arm.hand,m.forearm,5.4,'arms','skin',1.02);
      const shoulder=this._project(arm.shoulder),r=m.deltoid*shoulder.scale;
      const g=this._gradient(shoulder.x-r,shoulder.y-r,r*2,r*2,[[0,'#f0c5a1'],[.30,'#d7a47f'],[.72,'#b78363'],[1,'#876048']],true);
      this._ellipse(shoulder.x,shoulder.y,r*.96,r*1.04,g,0,'#805b4666',.9);
      const shoulderBounds=[{x:shoulder.x-r,y:shoulder.y-r},{x:shoulder.x+r,y:shoulder.y+r}];this._region('shoulders',shoulderBounds);
      if(this.highlights.has('shoulders')){this.ctx.save();this.ctx.globalAlpha=this.pulse;this._ellipse(shoulder.x,shoulder.y,r*.96,r*1.04,'#ffc572',0,'#ffe1a2',1.5);this.ctx.restore();}
      this.ctx.save();this.ctx.globalAlpha=.08+m.definition*.30;
      this._line([upper.at(.20,-upper.s*3),upper.at(.47,-upper.s*m.arm*.30),upper.at(.78,0)],'#ffe5bc',1.5);
      this._line([upper.at(.22,upper.s*m.arm*.44),upper.at(.53,upper.s*m.arm*.62),upper.at(.80,upper.s*2)],'#744e35',1.25);
      this._line([lower.at(.14,-lower.s*3),lower.at(.41,-lower.s*m.forearm*.30),lower.at(.77,0)],'#fff0c9',1.25);
      this._line([lower.at(.22,lower.s*m.forearm*.38),lower.at(.72,lower.s*2)],'#78513b',1);
      this.ctx.restore();
    }
    _drawHand(arm,gripping){
      const hand=this._project(arm.hand),elbow=this._project(arm.elbow),angle=Math.atan2(hand.y-elbow.y,hand.x-elbow.x)-Math.PI/2,c=this.ctx,s=hand.scale;
      c.save();c.translate(hand.x,hand.y);c.rotate(angle);
      const skin=this._gradient(-8*s,-3*s,16*s,20*s,[[0,'#ecc29b'],[.5,'#cc9a73'],[1,'#9c6f50']]);
      this._shape([{x:-6*s,y:-5*s},{x:5*s,y:-5*s},{x:8*s,y:2*s},{x:7*s,y:12*s},{x:0,y:gripping?13*s:19*s},{x:-7*s,y:gripping?10*s:15*s},{x:-8*s,y:2*s}],skin,'#8c654b88',.7);
      if(gripping){for(let i=0;i<3;i++)this._line([{x:(-5+i*4)*s,y:2*s},{x:(-5+i*4)*s,y:9*s}],'#9f755644',.8);this._ellipse(6*s,3*s,3.8*s,6*s,'#d4a67e',-.5,'#90684b44',.6);}
      else{for(let i=0;i<3;i++)this._line([{x:(-4+i*3)*s,y:9*s},{x:(-4+i*3)*s,y:15*s}],'#9e745645',.7);this._ellipse(7*s,3*s,3.1*s,7*s,'#d4a67e',-.4);}
      c.restore();
    }
    _drawHead(skeleton,body,back){
      const p=this._project(skeleton.head),base=this._project(skeleton.headBase),angle=Math.atan2(p.x-base.x,-(p.y-base.y)),c=this.ctx,s=p.scale;
      c.save();c.translate(p.x,p.y);c.rotate(angle);c.scale(s,s);
      this._ellipse(-19,2,4,7,'#bf8b67',-.12,'#8d654b66',.8);this._ellipse(19,2,4,7,'#b27d5b',.12,'#8d654b66',.8);
      const face=this._gradient(-21,-27,42,58,[[0,'#efc6a3'],[.28,'#dfb18b'],[.7,'#c18f6a'],[1,'#976c4e']],true);
      this._shape([{x:-15,y:-24},{x:-20,y:-11},{x:-19,y:12},{x:-11,y:25},{x:0,y:29},{x:12,y:23},{x:20,y:8},{x:19,y:-12},{x:13,y:-25}],face,'#8d644954',.8);
      if(back){
        const hair=c.createLinearGradient(-20,-26,16,18);hair.addColorStop(0,'#53453a');hair.addColorStop(.5,'#39382f');hair.addColorStop(1,'#272e29');this._shape([{x:-20,y:7},{x:-23,y:-14},{x:-13,y:-30},{x:5,y:-33},{x:19,y:-24},{x:22,y:-5},{x:17,y:15},{x:8,y:20},{x:-8,y:20}],hair,'#323b2f',.8);
        for(let i=0;i<9;i++)this._line([{x:-14+i*3.5,y:-18},{x:-11+i*2.8,y:9}],'#aa97813a',.7);
        this._line([{x:-11,y:23},{x:0,y:27},{x:11,y:23}],'#f4d8b45c',1.2);
      }else{
        this._shape([{x:-20,y:-5},{x:-23,y:-17},{x:-18,y:-28},{x:-6,y:-33},{x:12,y:-31},{x:21,y:-21},{x:19,y:-7},{x:14,y:-11},{x:10,y:-20},{x:-1,y:-16},{x:-12,y:-18},{x:-16,y:-6}],this._gradient(-24,-34,46,34,[[0,'#655142'],[.5,'#3e3b31'],[1,'#26352e']]),'#334034',.8);
        this._line([{x:-13,y:-23},{x:-1,y:-25},{x:10,y:-26}],'#b399773d',1.4);this._line([{x:-8,y:-27},{x:3,y:-30},{x:13,y:-27}],'#c0a17b26',1);
        this._line([{x:-13,y:-2},{x:-6,y:-3},{x:-3,y:-1}],'#574b39',1.5);this._line([{x:4,y:-1},{x:8,y:-3},{x:14,y:-1}],'#574b39',1.5);
        this._ellipse(-8,1,3.3,1.6,'#e7dfc6',0);this._ellipse(8,1,3.3,1.6,'#e7dfc6',0);this._ellipse(-7.4,1,1.4,1.7,'#354b3b');this._ellipse(7.7,1,1.4,1.7,'#354b3b');this._ellipse(-7.7,.4,.4,.6,'#fff5d7');this._ellipse(7.4,.4,.4,.6,'#fff5d7');
        this._line([{x:1,y:1},{x:3,y:8},{x:-1,y:10}],'#a8795688',.9);this._line([{x:-5,y:16},{x:1,y:17},{x:7,y:15}],'#8f624a',1.1);this._line([{x:-3,y:20},{x:4,y:20}],'#f1cda74d',1);
        this._ellipse(-12,9,4,2,'#f1c39c33');this._line([{x:-13,y:13},{x:-9,y:21},{x:0,y:25},{x:10,y:20}],'#a7795b2e',1);
        if(body.fatigue>45&&skeleton.exercise){this._ellipse(15,5,1.5,3,'#e1f2dc88',.2);}
      }
      c.restore();
    }


    _worldPolygon(points,fill,stroke=null,width=1){this._shape(points.map(p=>this._project(p)),fill,stroke,width,false);}
    _drawBench(){
      const c=this.ctx;
      [[-161,-150],[14,37]].forEach(([z1,z2])=>{
        this._line([this._project(vec(-19,-88,z1)),this._project(vec(-35,-2,z2)),this._project(vec(35,-2,z2))],'#324d45',10);
        this._line([this._project(vec(19,-88,z1)),this._project(vec(35,-2,z2))],'#789082',3);
      });
      const top=[vec(-30,-94,-202),vec(30,-94,-202),vec(30,-94,49),vec(-30,-94,49)];
      const edge=top.map(p=>vec(p.x,p.y+12,p.z));
      this._worldPolygon([top[0],top[3],edge[3],edge[0]],'#1d3b35','#16352f',1);
      this._worldPolygon([top[3],top[2],edge[2],edge[3]],'#244c40','#17392f',1);
      const projected=top.map(p=>this._project(p)),b=this._bounds(projected);
      this._shape(projected,this._gradient(b.x,b.y,b.w,b.h,[[0,'#678374'],[.2,'#456d5a'],[1,'#254d3f']]),'#8f9e7b',1.2,false);
      this._line([this._project(vec(-24,-95,-195)),this._project(vec(-24,-95,40)),this._project(vec(24,-95,40))],'#a1b09170',1.3);
      this._line([this._project(vec(-28,-95,-147)),this._project(vec(28,-95,-147))],'#173f31',2);
    }
    _drawFloorAccessory(skeleton){
      if(skeleton.exercise==='plank'){
        this._worldPolygon([vec(-211,9,-53),vec(259,9,-53),vec(259,9,58),vec(-211,9,58)],'#273f3c','#b9bb8555',2);
        this._line([this._project(vec(-205,8,50)),this._project(vec(253,8,50))],'#9aa77a70',1.7);
      }else if(skeleton.exercise==='calf'){
        this._worldPolygon([vec(-65,8,-5),vec(65,8,-5),vec(65,8,60),vec(-65,8,60)],'#758976','#a7b19a',1.5);
        this._worldPolygon([vec(-65,8,60),vec(65,8,60),vec(65,23,60),vec(-65,23,60)],'#405c4d','#284a3a',1);
        for(let i=0;i<8;i++)this._line([this._project(vec(-56+i*16,7,1)),this._project(vec(-56+i*16,7,53))],'#263f3655',1.2);
      }
    }
    _barbell(arms,body,skeleton){
      const a=arms[0].hand,b=arms[1].hand,direction=normal(sub(b,a)),extension=59;
      const start=add(a,mul(direction,-extension)),end=add(b,mul(direction,extension)),p=this._project(start),q=this._project(end),c=this.ctx;
      this._line([p,q],'#263f38',8);this._line([{x:p.x,y:p.y-1},{x:q.x,y:q.y-1}],'#a4afa1',5);this._line([{x:p.x,y:p.y-2},{x:q.x,y:q.y-2}],'#e5e5d0',1.5);
      const grips=[a,b];grips.forEach(hand=>{
        const left=this._project(add(hand,mul(direction,-9))),right=this._project(add(hand,mul(direction,9)));
        this._line([left,right],'#6b7c70',4.3);
        for(let i=0;i<5;i++){const x=mix(left.x,right.x,i/5),y=mix(left.y,right.y,i/5);this._line([{x:x-1,y:y-1.5},{x:x+1,y:y+1.5}],'#dbe0c678',.7);}
      });
      const weightMass=(body.quads+body.chest+body.back)/300,plateCount=weightMass>.60?3:2,radius=26+weightMass*9;
      [0,1].forEach(index=>{
        const hand=index===0?a:b,sign=index===0?-1:1;
        for(let i=plateCount-1;i>=0;i--){
          const center=add(hand,mul(direction,sign*(32+i*8))),point=this._project(center),angle=Math.atan2(q.y-p.y,q.x-p.x),s=point.scale;
          c.save();c.translate(point.x,point.y);c.rotate(angle);
          const plate=c.createLinearGradient(-10*s,-radius*s,9*s,radius*s);plate.addColorStop(0,'#688477');plate.addColorStop(.25,'#385d50');plate.addColorStop(.7,'#254b3e');plate.addColorStop(1,'#183c32');
          this._round(-8*s,-radius*s,9*s,radius*2*s,1.5*s,'#24483c');
          this._ellipse(-3*s,0,(6+Math.abs(Math.sin(this.yaw))*2)*s,radius*s,plate,0,'#82937a99',1.2);
          this._ellipse(-3*s,0,3.8*s,radius*.73*s,'#315345',0,'#c4c49a55',1);
          this._ellipse(-3*s,0,2.1*s,7*s,'#a7ad98',0,'#18382d',1);
          this._line([{x:-5*s,y:-radius*.72*s},{x:-5*s,y:-radius*.38*s}],'#d1c19a66',1.2);
          c.restore();
        }
        const collar=this._project(add(hand,mul(direction,sign*(36+plateCount*8))));
        this._ellipse(collar.x,collar.y,3*collar.scale,8*collar.scale,'#c5b58b',Math.atan2(q.y-p.y,q.x-p.x), '#5f705b',1);
      });
    }
    _dumbbell(arm,body){
      const c=this.ctx,center=this._project(arm.hand),radius=11.5+body.arms*.035,s=center.scale,forearm=this._project(arm.elbow),bend=clamp((forearm.y-center.y)/80,-1,1);
      c.save();c.translate(center.x,center.y);c.rotate(bend*.10);
      this._line([{x:-24*s,y:0},{x:24*s,y:0}],'#233d36',5);
      this._line([{x:-22*s,y:-1},{x:22*s,y:-1}],'#b2b8a1',3);
      [-1,1].forEach(side=>{
        this._round(side<0?-24*s:15*s,-radius*s,9*s,radius*2*s,2*s,'#2c4c42','#768975',1);
        this._ellipse(side*19*s,0,5*s,radius*s,this._gradient(-22*s,-radius*s,44*s,radius*2*s,[[0,'#799381'],[.4,'#3c5e4f'],[1,'#1f4136']]),0,'#acc0a155',.8);
        this._ellipse(side*24*s,0,2.2*s,4*s,'#9da991');
      });c.restore();
    }
    _comparison(before,skeleton){
      const m=dimensions(normalizeBody(before),skeleton.flex),t=skeleton.torso,c=this.ctx;
      const points=[[-12,-153,20],[-m.shoulder,-133,17],[-m.chest,-104,19],[-m.lat,-80,20],[-m.waist,-25,21],[-m.hip,0,20],[m.hip,0,20],[m.waist,-25,21],[m.lat,-80,20],[m.chest,-104,19],[m.shoulder,-133,17],[12,-153,20]].map(([x,y,z])=>this._project(t(x,y,z)));
      c.save();c.setLineDash([3,5]);c.globalAlpha=.58;this._line(points,'#e4edc8',1.2,true);c.restore();
    }
    _athlete(skeleton,body,back){
      const depth=p=>this._project(p).z;
      const legs=[...skeleton.legs].sort((a,b)=>depth(a.ankle)-depth(b.ankle));
      legs.forEach(leg=>this._drawLeg(leg,skeleton,body));
      this._drawTorso(skeleton,body,back);this._drawShorts(skeleton);
      const arms=[...skeleton.arms].sort((a,b)=>depth(a.elbow)-depth(b.elbow));
      arms.forEach(arm=>this._drawArm(arm,skeleton,body));this._drawHead(skeleton,body,back);
    }
    render(state={},options={}){
      if(this.disposed)return null;
      const c=this.ctx,canvas=this.canvas,width=canvas.width||720,height=canvas.height||760,fit=Math.min(width/720,height/760),offsetX=(width-720*fit)/2,offsetY=(height-760*fit)/2;
      const body=normalizeBody(state),exercise=options.phase==='work'?options.exercise:null,back=options.view==='back';
      this.highlights=new Set(Array.isArray(options.highlight)?options.highlight:options.highlight?[options.highlight]:[]);
      this.pulse=.18+Math.sin((Number(options.time)||0)*.005)*.045;
      this.yaw=(back?Math.PI:0)+(exercise==='bench'?.57:exercise==='plank'?.28:-.10);
      this.scale=exercise==='bench'?1.31:exercise==='plank'?1.11:1.20;
      this.centerX=exercise==='plank'?333:362;this.floorY=exercise==='bench'?656:exercise==='plank'?661:681;this.regions={};
      const flex=options.pose==='flex'||options.phase==='victory'||options.phase==='contest',m=dimensions(body,flex),skeleton=this._skeleton(body,options,m);
      c.save();c.resetTransform();c.clearRect(0,0,width,height);c.fillStyle='#374f43';c.fillRect(0,0,width,height);c.translate(offsetX,offsetY);c.scale(fit,fit);
      const stage=options.stage==='contest'||options.phase==='contest'||options.phase==='victory',cacheKey=stage?'_stageBackground':'_background';
      if(this[cacheKey])c.drawImage(this[cacheKey],0,0);
      else if(typeof OffscreenCanvas==='function'){
        try{
          const cached=new OffscreenCanvas(720,760),saved=this.ctx;this.ctx=cached.getContext('2d');if(stage)this._contestStage();else this._environment(0,null);this.ctx=saved;this[cacheKey]=cached;c.drawImage(cached,0,0);
        }catch{this.ctx=c;if(stage)this._contestStage();else this._environment(0,null);}
      }else if(stage)this._contestStage();else this._environment(0,null);
      this._ellipse(this.centerX,exercise==='bench'?691:exercise==='plank'?677:703,exercise==='plank'?239:exercise==='bench'?151:82,exercise==='plank'?19:15,'#152e264d');
      this._drawFloorAccessory(skeleton);if(exercise==='bench')this._drawBench();
      if(exercise==='squat')this._barbell(skeleton.arms,body,skeleton);
      this._athlete(skeleton,body,back);
      if(['bench','deadlift','row','press'].includes(exercise))this._barbell(skeleton.arms,body,skeleton);
      if(exercise==='curl'||exercise==='calf')skeleton.arms.forEach(arm=>this._dumbbell(arm,body));
      skeleton.arms.forEach(arm=>this._drawHand(arm,Boolean(exercise)&&exercise!=='plank'||flex));
      if(options.before||options.ghost)this._comparison(options.before||options.ghost,skeleton);
      const glow=c.createRadialGradient(156,170,15,300,330,450);glow.addColorStop(0,'#ffe0a80a');glow.addColorStop(1,'#ffe0a800');c.fillStyle=glow;c.fillRect(0,0,720,760);
      c.restore();
      const regions={};Object.entries(this.regions).forEach(([key,b])=>{regions[key]={x:offsetX+b.x*fit,y:offsetY+b.y*fit,width:b.width*fit,height:b.height*fit};});
      return {muscleRegions:regions,dimensions:{...m},landmarks:{head:this._project(skeleton.head),hands:skeleton.arms.map(a=>this._project(a.hand)),feet:skeleton.legs.map(l=>this._project(l.ankle))}};
    }
  }
  window.AsobiBodyVisual=BodyVisual;
})();

