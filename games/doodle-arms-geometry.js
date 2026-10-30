/* Original ink geometry. A union of visible 4px cells drives mass and contact. */
(function(){
 'use strict';
 const WIDTH=240,HEIGHT=160,CELL=4,SCALE=.66,GRIP={x:40,y:100},INK_LIMIT=650,MAX_STROKES=48,MAX_POINTS=4096;
 const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),clone=v=>JSON.parse(JSON.stringify(v));
 const stroke=(points,width=12,color='#e58d6a')=>({color,width,points:points.map(([x,y])=>({x,y}))});
 const templates={
  saber:{version:1,name:'SABER',strokes:[stroke([[40,100],[193,100]],6,'#58b9b6'),stroke([[64,81],[64,119]],12,'#dcb66e')]},
  hammer:{version:1,name:'HAMMER',strokes:[stroke([[40,100],[139,100]],6,'#dcb66e'),stroke([[138,65],[138,131]],18,'#df8b77'),stroke([[150,65],[150,131]],18,'#df8b77')]},
  hook:{version:1,name:'HOOK',strokes:[stroke([[40,100],[145,100],[172,80],[172,55],[151,43],[130,50]],12,'#8da5dd')]},
  fish:{version:1,name:'FISH',strokes:[stroke([[40,100],[112,100]],6,'#dcb66e'),stroke([[101,100],[126,76],[155,72],[182,94],[158,117],[129,120],[101,100]],12,'#58b9b6'),stroke([[181,94],[205,73],[205,115],[181,94]],6,'#58b9b6')]}
 };
 function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?clamp(((x-a.x)*dx+(y-a.y)*dy)/length,0,1):0;return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
 function sanitize(input){
  if(!input||input.version!==1||!Array.isArray(input.strokes)||input.strokes.length>MAX_STROKES)return null;
  const drawing={version:1,name:typeof input.name==='string'?[...input.name.replace(/[\u0000-\u001f<>]/g,'')].slice(0,20).join(''):'',strokes:[]};let total=0;
  for(const item of input.strokes){if(!item||!/^#[a-f0-9]{6}$/i.test(item.color)||![6,12,18].includes(item.width)||!Array.isArray(item.points)||item.points.length<1||item.points.length>MAX_POINTS)return null;total+=item.points.length;if(total>MAX_POINTS)return null;const points=[];for(const p of item.points){if(!p||!finite(p.x)||!finite(p.y)||p.x<0||p.x>WIDTH||p.y<0||p.y>HEIGHT)return null;const v={x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10},last=points[points.length-1];if(!last||last.x!==v.x||last.y!==v.y)points.push(v);}drawing.strokes.push({color:item.color.toLowerCase(),width:item.width,points});}
  return drawing;
 }
 function compile(input){
  const drawing=sanitize(input);if(!drawing)return {ok:false,key:'invalid'};
  const pixels=new Map();
  for(const item of drawing.strokes){const radius=item.width/2;for(let i=0;i<item.points.length;i++){const a=item.points[i],b=item.points[Math.max(0,i-1)],minX=Math.max(0,Math.floor((Math.min(a.x,b.x)-radius)/CELL)),maxX=Math.min(WIDTH/CELL-1,Math.floor((Math.max(a.x,b.x)+radius)/CELL)),minY=Math.max(0,Math.floor((Math.min(a.y,b.y)-radius)/CELL)),maxY=Math.min(HEIGHT/CELL-1,Math.floor((Math.max(a.y,b.y)+radius)/CELL));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const px=x*CELL+CELL/2,py=y*CELL+CELL/2;if(segmentDistance(px,py,a,b)<=radius)pixels.set(y*(WIDTH/CELL)+x,{x:px,y:py,color:item.color});}}}
  const cells=[...pixels.values()],points=cells.map(c=>({x:(c.x-GRIP.x)*SCALE,y:(c.y-GRIP.y)*SCALE,r:CELL*SCALE*.71})),ink=cells.length;
  let radius2=0,reach=0,forwardReach=0;for(const p of points){const rr=p.x*p.x+p.y*p.y;radius2+=rr;reach=Math.max(reach,Math.sqrt(rr)+p.r);forwardReach=Math.max(forwardReach,p.x+p.r);}
  const mass=.75+ink/190,inertia=ink?mass*radius2/ink/3600:0,swingSeconds=clamp(.30+mass*.065+Math.sqrt(inertia)*.095,.36,1.12),recovery=clamp(.17+mass*.045+Math.sqrt(inertia)*.045,.20,.62);
  const stats={ink,inkLimit:INK_LIMIT,reach:Math.round(reach*10)/10,forwardReach:Math.round(forwardReach*10)/10,mass:Math.round(mass*100)/100,inertia:Math.round(inertia*100)/100,swingSeconds:Math.round(swingSeconds*1000)/1000,recovery:Math.round(recovery*1000)/1000,impact:Math.round((3+mass*2.7+reach*2.9/swingSeconds*.01)*10)/10};
  return {ok:ink>=3&&ink<=INK_LIMIT,key:ink<3?'empty':ink>INK_LIMIT?'inkLimit':'ready',drawing,cells,points,stats};
 }
 function transformPoint(p,pose){const c=Math.cos(pose.angle),s=Math.sin(pose.angle);return {x:pose.x+pose.facing*(p.x*c-p.y*s),y:pose.y+p.x*s+p.y*c,r:p.r||0};}
 function worldPoints(weapon,pose){return weapon.points.map(point=>transformPoint(point,pose));}
 function pointHitsBody(p,body){const r=body.r+p.r;return Math.hypot(p.x-body.x,p.y-body.y)<=r;}
 function contact(weapon,pose,bodies){for(let i=0;i<weapon.points.length;i++){const p=transformPoint(weapon.points[i],pose);for(const body of bodies)if(pointHitsBody(p,body))return {...p,pointIndex:i};}return null;}
 function sweepContact(weapon,from,to,bodies){for(let i=0;i<weapon.points.length;i++){const point=weapon.points[i],a=transformPoint(point,from),b=transformPoint(point,to);for(const body of bodies)if(segmentDistance(body.x,body.y,a,b)<=body.r+point.r)return {...b,pointIndex:i};}return null;}
 window.AsobiDoodleGeometry={width:WIDTH,height:HEIGHT,cellSize:CELL,scale:SCALE,grip:Object.freeze({...GRIP}),inkLimit:INK_LIMIT,maxStrokes:MAX_STROKES,maxPoints:MAX_POINTS,templates,defaultDrawing:()=>clone(templates.saber),sanitize,compile,transformPoint,worldPoints,contact,sweepContact,segmentDistance};
})();
