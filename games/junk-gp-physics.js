/* Original small rigid-body vehicle. Every force is applied at its visible mount. */
(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),finite=Number.isFinite,clone=x=>JSON.parse(JSON.stringify(x));
const parts={
 'wheel':{mass:.85,radius:20,travel:14,stiffness:76,damping:15,grip:1.05,motor:280},
 'big-wheel':{mass:1.35,radius:29,travel:14,stiffness:86,damping:17,grip:.92,motor:325},
 'spring-wheel':{mass:1.05,radius:21,travel:29,stiffness:65,damping:3,grip:.94,motor:275},
 'fan':{mass:.7,radius:16,thrust:165},
 'ballast':{mass:2.8,radius:14}
};
const colorSet=['#f4b942','#59c5b3','#f37563','#81a8ed','#bd94df','#e4d6ae'];
const shape={halfWidth:62,halfHeight:13},maxParts=8;
const make=(name,color,values)=>({version:1,name,color,parts:values.map((p,i)=>({id:'p'+i,type:p[0],x:p[1],y:p[2],angle:p[3]||0}))});
const templates={
 balanced:make('JUNK RUNNER',colorSet[0],[['wheel',-48,-22],['wheel',48,-22],['fan',0,24]]),
 bigfoot:make('BIG FOOT',colorSet[1],[['big-wheel',-56,-24],['big-wheel',56,-24],['ballast',0,-5]]),
 bouncer:make('BOING BOING',colorSet[2],[['spring-wheel',-48,-22],['spring-wheel',48,-22],['fan',0,24]]),
 fan:make('WIND RIDER',colorSet[3],[['wheel',-56,-22],['wheel',56,-22],['fan',-40,28],['fan',40,28]])
};
function normalize(input){
 if(!input||input.version!==1||!Array.isArray(input.parts)||input.parts.length>maxParts)return {ok:false,key:'invalid'};
 const used=new Set(),counts={wheel:0,fan:0,ballast:0},draft={version:1,name:typeof input.name==='string'?[...input.name.replace(/[<>\u0000-\u001f\u007f]/g,'')].slice(0,16).join(''):'',color:colorSet.includes(input.color)?input.color:colorSet[0],parts:[]};
 for(let i=0;i<input.parts.length;i++){
  const p=input.parts[i];if(!p||typeof p.type!=='string'||!Object.hasOwn(parts,p.type)||!finite(p.x)||!finite(p.y)||!finite(p.angle)||p.x< -96||p.x>96||p.y< -50||p.y>65)return {ok:false,key:'invalid'};
  const group=p.type.includes('wheel')?'wheel':p.type;counts[group]++;if(counts.wheel>4||counts.fan>2||counts.ballast>2)return {ok:false,key:'partLimit'};
  let id=typeof p.id==='string'&&/^[a-zA-Z0-9_-]{1,24}$/.test(p.id)?p.id:'p'+i;while(used.has(id))id+='x';used.add(id);
  draft.parts.push({id,type:p.type,x:p.x,y:p.y,angle:Math.atan2(Math.sin(p.angle),Math.cos(p.angle))});
 }
 return {ok:true,key:counts.wheel?'valid':'noWheels',draft};
}
function stats(draft){
 const valid=normalize(draft);if(!valid.ok)return null;let mass=3.2,cx=0,cy=3.2*0;const wheelXs=[];let wheels=0,fans=0;
 for(const p of valid.draft.parts){const d=parts[p.type];mass+=d.mass;cx+=p.x*d.mass;cy+=p.y*d.mass;if(p.type.includes('wheel')){wheels++;wheelXs.push(p.x);}if(p.type==='fan')fans++;}
 cx/=mass;cy/=mass;let inertia=3.2*((shape.halfWidth*2)**2+(shape.halfHeight*2)**2)/12+3.2*(cx*cx+cy*cy);
 for(const p of valid.draft.parts){const d=parts[p.type];inertia+=d.mass*((p.x-cx)**2+(p.y-cy)**2+d.radius*d.radius*.5);}
 return {mass,inertia,com:{x:cx,y:cy},wheelbase:wheelXs.length>1?Math.max(...wheelXs)-Math.min(...wheelXs):0,wheels,fans,canRace:wheels>0,parts:valid.draft.parts.length};
}
/* Smooth reproducible hills, plus three actual ramps; both heats share the course. */
function terrain(x){
 if(!finite(x))return 0;if(x<330)return 0;
 const ramp=clamp((x-330)/220,0,1),base=(Math.sin((x-330)/250)*25+Math.sin((x-330)/91)*6)*ramp;
 let height=base;
 for(const [start,width,h]of [[1050,220,52],[2300,250,62],[3720,270,72],[5250,250,66],[6900,270,75],[8500,260,68],[10100,270,76],[11700,270,72],[13300,280,76]]){const u=(x-start)/width;if(u>0&&u<1){const q=u<.73?u/.73:(1-u)/.27;height+=h*(.5-.5*Math.cos(Math.PI*q));}}
 for(const [start,width,depth]of [[1480,340,44],[2870,360,48],[5860,360,50],[7850,360,46],[9450,360,50],[11050,360,50],[12650,360,48]]){const u=(x-start)/width;if(u>0&&u<1){const q=u<.12?u/.12:u>.32?(1-u)/.68:1;height-=depth*(q*q*(3-2*q));}}
 return height;
}
function groundNormal(x){const slope=(terrain(x+.5)-terrain(x-.5));const n=Math.hypot(slope,1);return {x:-slope/n,y:1/n};}
function rotated(x,y,a){return {x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)};}
function worldPoint(v,p){const r=rotated(p.x-v.stats.com.x,p.y-v.stats.com.y,v.angle);return {x:v.x+r.x,y:v.y+r.y};}
function origin(v){return worldPoint(v,{x:0,y:0});}
function contact(v,wheel){
 const p=wheel.part,d=parts[p.type],mount=worldPoint(v,p),axis=rotated(0,-1,v.angle),extension=d.travel,rest={x:mount.x+axis.x*extension,y:mount.y+axis.y*extension},n=groundNormal(rest.x),gap=terrain(rest.x)+d.radius-rest.y;
 // Near-vertical/upside-down springs cannot support through the chassis.
 const facing=-axis.x*n.x-axis.y*n.y,grounded=gap>0&&facing>.25;let compression=grounded?clamp(gap*n.y/facing,0,extension+d.radius*.8):0;
 for(let i=0;i<3&&grounded;i++){const x=rest.x-axis.x*compression,y=rest.y-axis.y*compression,slope=terrain(x+.5)-terrain(x-.5),derivative=axis.y-axis.x*slope,error=terrain(x)+d.radius-y;if(Math.abs(derivative)>.18)compression=clamp(compression-error/derivative,0,extension+d.radius*.8);}
 const actual={x:rest.x-axis.x*compression,y:rest.y-axis.y*compression};
 return {mount,rest,actual,n,compression,grounded,facing};
}
function updateGeometry(v){
 v.origin=origin(v);let grounded=0;
 for(const w of v.wheels){const c=contact(v,w);Object.assign(w,{x:c.actual.x,y:c.actual.y,mountX:c.mount.x,mountY:c.mount.y,compression:c.compression,contact:c.grounded});if(c.grounded)grounded++;}
 v.grounded=grounded;v.speed=Math.hypot(v.vx,v.vy);v.distance=Math.max(0,(v.x-v.startX)/10);v.maxDistance=Math.max(v.maxDistance,v.distance);
}
function createVehicle(draft,heat=0){
 const valid=normalize(draft);if(!valid.ok)throw Error('Invalid vehicle draft');const spec=stats(valid.draft),v={draft:valid.draft,stats:spec,x:180+spec.com.x,y:58+spec.com.y,vx:0,vy:0,angle:0,omega:0,startX:180+spec.com.x,origin:{x:180,y:58},wheels:valid.draft.parts.filter(p=>p.type.includes('wheel')).map(p=>({id:p.id,part:p,radius:parts[p.type].radius,x:0,y:0,mountX:0,mountY:0,compression:0,contact:false,spin:0})),grounded:0,speed:0,distance:0,maxDistance:0,airTime:0,totalAirTime:0,flips:0,recoveries:0,recoverCooldown:0,time:0,throttle:0,brake:0,terrainImpact:0,heat,stallTime:0,checkpoints:0};
 updateGeometry(v);return v;
}
function recover(v){
 const at=Math.max(80,v.x);v.angle=0;v.omega=0;v.vx=0;v.vy=0;v.x=at;v.y=terrain(at)+72+v.stats.com.y;v.recoveries++;v.recoverCooldown=2;v.airTime=0;v.stallTime=0;updateGeometry(v);return v;
}
function step(v,input,dt){
 if(!finite(dt)||dt<=0)return v;dt=Math.min(dt,1/60);const gas=finite(input?.gas)?clamp(input.gas,0,1):0,brake=finite(input?.brake)?clamp(input.brake,0,1):0,m=v.stats.mass,I=v.stats.inertia;let fx=-v.vx*.48-v.vx*Math.abs(v.vx)*.006,fy=-260*m-v.vy*.32,torque=-v.omega*I*.7,maxImpact=0,contacts=0;
 v.throttle=gas;v.brake=brake;v.time+=dt;v.recoverCooldown=Math.max(0,v.recoverCooldown-dt);if(v.recoverCooldown<1e-7)v.recoverCooldown=0;
 function force(x,y,fX,fY){fx+=fX;fy+=fY;torque+=(x-v.x)*fY-(y-v.y)*fX;}
 for(const w of v.wheels){
  const c=contact(v,w),d=parts[w.part.type];if(c.grounded){
   contacts++;const rx=c.actual.x-v.x,ry=c.actual.y-v.y,pvx=v.vx-v.omega*ry,pvy=v.vy+v.omega*rx,vn=pvx*c.n.x+pvy*c.n.y;
   const bottomOut=Math.max(0,terrain(c.actual.x)+d.radius-c.actual.y),spring=Math.max(0,Math.min(4200,d.stiffness*c.compression-d.damping*vn+bottomOut*280));
   force(c.actual.x-c.n.x*d.radius,c.actual.y-c.n.y*d.radius,c.n.x*spring,c.n.y*spring);maxImpact=Math.max(maxImpact,Math.max(0,-vn));
   const tx=c.n.y,ty=-c.n.x,vt=pvx*tx+pvy*ty;
   const motor=gas*d.motor/(1+Math.max(0,vt)/190),friction=clamp(motor-vt*(brake?10:.12),-spring*d.grip,spring*d.grip);
   force(c.actual.x-c.n.x*d.radius,c.actual.y-c.n.y*d.radius,tx*friction,ty*friction);
   w.spin-=vt/d.radius*dt;
  }else w.spin-=(gas*9+v.vx/d.radius)*dt;
 }
 for(const p of v.draft.parts)if(p.type==='fan'){
  const at=worldPoint(v,p),direction=v.angle+p.angle,thrust=parts.fan.thrust*gas;force(at.x,at.y,Math.cos(direction)*thrust,Math.sin(direction)*thrust);
 }
 // Contact uses each actual hull corner and ballast/fan circle, never a build rating.
 const probes=[{x:-62,y:-13,r:2},{x:62,y:-13,r:2},{x:-62,y:13,r:2},{x:62,y:13,r:2},...v.draft.parts.filter(p=>!p.type.includes('wheel')).map(p=>({x:p.x,y:p.y,r:parts[p.type].radius}))];
 for(const p of probes){const at=worldPoint(v,p),depth=terrain(at.x)+p.r-at.y;if(depth>0){const n=groundNormal(at.x),rx=at.x-v.x,ry=at.y-v.y,pvx=v.vx-v.omega*ry,pvy=v.vy+v.omega*rx,vn=pvx*n.x+pvy*n.y,spring=clamp(depth*165-vn*18,0,3200);force(at.x,at.y,n.x*spring,n.y*spring);const tangent=pvx*n.y-pvy*n.x,drag=clamp(-tangent*8,-spring*.55,spring*.55);force(at.x,at.y,n.y*drag,-n.x*drag);maxImpact=Math.max(maxImpact,Math.max(0,-vn));}}
 if(!contacts){v.airTime+=dt;v.totalAirTime+=dt;/* Two existing drive buttons also adjust airborne pitch. */torque+=(gas-brake)*I*1.65;}else v.airTime=0;
 v.vx=clamp(v.vx+fx/m*dt,-120,250);v.vy=clamp(v.vy+fy/m*dt,-360,280);v.omega=clamp(v.omega+torque/I*dt,-5.8,5.8);
 v.x=Math.max(80,v.x+v.vx*dt);v.y+=v.vy*dt;const previous=v.angle;v.angle+=v.omega*dt;if(Math.floor((previous+Math.PI)/(2*Math.PI))!==Math.floor((v.angle+Math.PI)/(2*Math.PI)))v.flips++;
 v.terrainImpact=Math.max(maxImpact,v.terrainImpact*Math.exp(-dt*12));if(Math.abs(v.vx)<4)v.stallTime+=dt;else v.stallTime=0;updateGeometry(v);v.checkpoints=Math.floor(v.maxDistance/80);
 return v;
}
window.AsobiJunkPhysics={parts,templates,colors:colorSet,shape,maxParts,bounds:{minX:-96,maxX:96,minY:-50,maxY:65},normalize,stats,defaultDraft:()=>clone(templates.balanced),createVehicle,step,terrain,height:terrain,groundNormal,worldPoint,recover,clone};
})();
