/* Original small rigid-body food simulation. Visible layers are the colliders. */
(function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),finite=Number.isFinite,clone=x=>JSON.parse(JSON.stringify(x));
const ingredients={
 'bun-bottom':{w:96,h:18,mass:.8,friction:.70,value:70},
 'bun-top':{w:94,h:27,mass:.65,friction:.66,value:80},
 patty:{w:84,h:18,mass:1.45,friction:.72,value:180},
 cheese:{w:100,h:7,mass:.30,friction:.95,value:90},
 lettuce:{w:108,h:10,mass:.20,friction:.82,value:70},
 tomato:{w:84,h:13,mass:.65,friction:.25,value:90},
 onion:{w:80,h:9,mass:.25,friction:.40,value:65},
 egg:{w:86,h:17,mass:.75,friction:.55,value:120}
};
const colors=['#ef9958','#67bda8','#f3c65b','#d9859b','#92a6ce','#b99bce'],maxLayers=10,targetDistance=180;
const make=(name,color,types)=>({version:1,name,color,layers:types.map((p,i)=>({id:'l'+i,type:Array.isArray(p)?p[0]:p,x:Array.isArray(p)?p[1]:0}))});
const templates={
 balanced:make('BURGER EXPRESS',colors[0],['bun-bottom','patty','cheese','tomato','lettuce','bun-top']),
 tower:make('MEGA TOWER',colors[2],['bun-bottom','patty','cheese','patty','egg','cheese','tomato','lettuce','onion','bun-top']),
 wet:make('TOMATO SURPRISE',colors[3],['bun-bottom','tomato','tomato','patty','tomato','egg','bun-top']),
 wide:make('GARDEN BURGER',colors[1],['bun-bottom','lettuce','cheese','patty','lettuce','bun-top'])
};
function normalize(input){
 if(!input||input.version!==1||!Array.isArray(input.layers)||input.layers.length>maxLayers)return{ok:false,key:'invalid'};
 const draft={version:1,name:typeof input.name==='string'?[...input.name.replace(/[<>\u0000-\u001f\u007f]/g,'')].slice(0,16).join(''):'',color:colors.includes(input.color)?input.color:colors[0],layers:[]},used=new Set();
 for(let i=0;i<input.layers.length;i++){const p=input.layers[i];if(!p||typeof p.type!=='string'||!Object.hasOwn(ingredients,p.type)||!finite(p.x)||p.x< -48||p.x>48)return{ok:false,key:'invalid'};let id=typeof p.id==='string'&&/^[a-zA-Z0-9_-]{1,24}$/.test(p.id)?p.id:'l'+i;while(used.has(id))id+='x';used.add(id);draft.layers.push({id,type:p.type,x:p.x});}
 return{ok:true,key:draft.layers.length?'valid':'empty',draft};
}
function layout(input){const value=normalize(input);if(!value.ok)return[];let y=0;return value.draft.layers.map(p=>{const d=ingredients[p.type],layer={...p,y:y+d.h/2,...d};y+=d.h;return layer;});}
function stats(input){const layers=layout(input);let mass=0,x=0,y=0,value=0,height=0,left=0,right=0;for(const p of layers){mass+=p.mass;x+=p.x*p.mass;y+=p.y*p.mass;value+=p.value;height=Math.max(height,p.y+p.h/2);left=Math.min(left,p.x-p.w/2);right=Math.max(right,p.x+p.w/2);}return{mass,com:{x:mass?x/mass:0,y:mass?y/mass:0},height,width:right-left,value,layers:layers.length,canCarry:layers.length>0};}
/* The same visible road is used for both deliveries. Slower movement crosses
 * each bump with lower actual vertical acceleration, without a stability stat. */
function route(distance){const d=Math.max(0,distance),fade=clamp(d/6,0,1);let height=Math.sin(d*1.25)*1.8*fade;for(const[start,width,h]of[[18,5,7],[40,5,10],[62,6,9],[86,5,12],[112,6,10],[140,5,11],[164,6,12]]){const u=(d-start)/width;if(u>0&&u<1)height+=h*Math.sin(Math.PI*u)**2;}return height;}
const dot=(a,b)=>a.x*b.x+a.y*b.y,cross=(a,b)=>a.x*b.y-a.y*b.x;
function vertices(b){const c=Math.cos(b.angle),s=Math.sin(b.angle);return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:b.x+x*b.w/2*c-y*b.h/2*s,y:b.y+x*b.w/2*s+y*b.h/2*c}));}
function clip(poly,a,b){const edge={x:b.x-a.x,y:b.y-a.y},inside=p=>cross(edge,{x:p.x-a.x,y:p.y-a.y})>=-1e-8,out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],ip=inside(p),iq=inside(q);if(ip)out.push(p);if(ip!==iq){const v={x:q.x-p.x,y:q.y-p.y},den=cross(edge,v);if(Math.abs(den)>1e-9){const t=cross(edge,{x:a.x-p.x,y:a.y-p.y})/den;out.push({x:p.x+v.x*t,y:p.y+v.y*t});}}}return out;}
function collision(a,b){
 if(Math.abs(a.x-b.x)>(a.w+a.h+b.w+b.h)/2+1||Math.abs(a.y-b.y)>(a.w+a.h+b.w+b.h)/2+1)return null;
 const av=vertices(a),bv=vertices(b),axes=[a.angle,a.angle+Math.PI/2,b.angle,b.angle+Math.PI/2];let depth=Infinity,normal=null;
 for(const angle of axes){const axis={x:Math.cos(angle),y:Math.sin(angle)},ap=av.map(v=>dot(v,axis)),bp=bv.map(v=>dot(v,axis)),overlap=Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp));if(overlap<=0)return null;if(overlap<depth){depth=overlap;normal=axis;}}
 if((b.x-a.x)*normal.x+(b.y-a.y)*normal.y<0)normal={x:-normal.x,y:-normal.y};let polygon=av;for(let i=0;i<4&&polygon.length;i++)polygon=clip(polygon,bv[i],bv[(i+1)%4]);if(!polygon.length)return null;
 const tangent={x:-normal.y,y:normal.x},projection=polygon.map(p=>dot(p,tangent)),lo=Math.min(...projection),hi=Math.max(...projection),normalCenter=polygon.reduce((s,p)=>s+dot(p,normal),0)/polygon.length;
 const points=(hi-lo>1?[lo,hi]:[(lo+hi)/2]).map(t=>({x:tangent.x*t+normal.x*normalCenter,y:tangent.y*t+normal.y*normalCenter,n:0,t:0}));return{a,b,normal,depth,points,friction:Math.sqrt(a.friction*b.friction)};
}
function impulse(body,r,x,y){if(!body.invMass)return;body.vx+=x*body.invMass;body.vy+=y*body.invMass;body.omega+=(r.x*y-r.y*x)*body.invI;}
function body(layer,y){return{...clone(layer),y:layer.y+y,vx:0,vy:0,angle:0,omega:0,invMass:1/layer.mass,invI:12/(layer.mass*(layer.w**2+layer.h**2)),lost:false,alive:true,contact:false};}
function createDelivery(input){const checked=normalize(input);if(!checked.ok)throw Error('Invalid burger draft');const draft=checked.draft,tray={id:'tray',type:'tray',x:0,y:100,angle:0,w:128,h:10,friction:.82,mass:0,invMass:0,invI:0,vx:0,vy:0,omega:0};return{draft,stats:stats(draft),bodies:layout(draft).map(p=>body(p,105)),tray,time:0,distance:0,targetDistance,speed:0,chefX:0,moveOffset:0,moveVelocity:0,careful:false,routeY:0,bump:0,remainingValue:stats(draft).value,lostCount:0,surviving:draft.layers.length,landings:0,lastImpact:0,totalWobble:0,arrival:false};}
function step(state,input,dt){
 if(!finite(dt)||dt<=0||!input||!finite(input.move)||!finite(input.careful))return state;dt=Math.min(1/120,dt);const move=clamp(input.move,-1,1),careful=input.careful>0,old=state.tray,previous={x:old.x,y:old.y,angle:old.angle};state.time+=dt;state.careful=careful;
 const desired=careful?1.65:3.15;state.speed+=clamp(desired-state.speed,-3*dt,2.2*dt);state.distance=Math.min(targetDistance,state.distance+state.speed*dt);state.chefX=state.distance*6;state.routeY=route(state.distance);state.bump=state.routeY;
 const target=move*44;state.moveVelocity+=clamp((target-state.moveOffset)*8-state.moveVelocity,-240*dt,240*dt);state.moveVelocity=clamp(state.moveVelocity,-100,100);state.moveOffset=clamp(state.moveOffset+state.moveVelocity*dt,-48,48);
 old.x=state.chefX+state.moveOffset;old.y=100+state.routeY;old.angle=clamp((route(state.distance+.1)-route(state.distance-.1))*.09,-.16,.16);old.vx=(old.x-previous.x)/dt;old.vy=(old.y-previous.y)/dt;old.omega=(old.angle-previous.angle)/dt;
 for(const b of state.bodies.filter(b=>b.lost)){b.vy-=350*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.omega*dt;const lowest=Math.min(...vertices(b).map(p=>p.y));if(lowest<0){b.y-=lowest;b.vy=0;b.vx*=Math.exp(-8*dt);b.omega*=Math.exp(-8*dt);}}
 const active=state.bodies.filter(b=>!b.lost);for(const b of active){b.contact=false;b.groundHit=false;b.vy-=350*dt;b.vx*=Math.exp(-.025*dt);b.omega*=Math.exp(-.35*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.omega*dt;}
 const contacts=[];for(let i=0;i<active.length;i++){const a=active[i],floor={id:'floor',x:a.x,y:-10,angle:0,w:1000,h:20,friction:.7,vx:0,vy:0,omega:0,invMass:0,invI:0};const trayContact=collision(old,a);if(trayContact)contacts.push(trayContact);const floorContact=collision(floor,a);if(floorContact){contacts.push(floorContact);a.groundHit=true;}for(let j=i+1;j<active.length;j++){const c=collision(a,active[j]);if(c)contacts.push(c);}}
 let impact=0;for(let k=0;k<14;k++)for(const contact of contacts){const{a,b,normal:n}=contact,t={x:-n.y,y:n.x};for(const p of contact.points){const ra={x:p.x-a.x,y:p.y-a.y},rb={x:p.x-b.x,y:p.y-b.y},relative=()=>({x:b.vx-b.omega*rb.y-a.vx+a.omega*ra.y,y:b.vy+b.omega*rb.x-a.vy-a.omega*ra.x}),rv=relative(),rnA=cross(ra,n),rnB=cross(rb,n),den=a.invMass+b.invMass+rnA*rnA*a.invI+rnB*rnB*b.invI;if(!den)continue;const vn=dot(rv,n),lambda=-vn/den,next=Math.max(0,p.n+lambda),applied=next-p.n;p.n=next;impulse(a,ra,-n.x*applied,-n.y*applied);impulse(b,rb,n.x*applied,n.y*applied);const rtA=cross(ra,t),rtB=cross(rb,t),td=a.invMass+b.invMass+rtA*rtA*a.invI+rtB*rtB*b.invI,friction=-dot(relative(),t)/td,limit=contact.friction*p.n,newT=clamp(p.t+friction,-limit,limit),delta=newT-p.t;p.t=newT;impulse(a,ra,-t.x*delta,-t.y*delta);impulse(b,rb,t.x*delta,t.y*delta);if(k===0){impact=Math.max(impact,Math.max(0,-vn));a.contact=b.contact=true;}}}
 for(let iteration=0;iteration<5;iteration++){for(const c of contacts){const hit=collision(c.a,c.b);if(!hit)continue;const total=c.a.invMass+c.b.invMass;if(!total)continue;const correction=Math.max(0,hit.depth-.06)*.38/total;c.a.x-=hit.normal.x*correction*c.a.invMass;c.a.y-=hit.normal.y*correction*c.a.invMass;c.b.x+=hit.normal.x*correction*c.b.invMass;c.b.y+=hit.normal.y*correction*c.b.invMass;}}
 for(const b of active){b.vx=clamp(b.vx,-450,450);b.vy=clamp(b.vy,-500,400);b.omega=clamp(b.omega,-10,10);state.totalWobble+=Math.abs(b.angle)*dt;if(!finite(b.x+b.y+b.angle)||b.groundHit||b.y<old.y-50&&Math.abs(b.x-old.x)>85||Math.abs(b.x-old.x)>280){b.lost=true;b.alive=false;b.lostAt=state.time;if(!finite(b.x+b.y+b.angle)){b.x=old.x;b.y=0;b.angle=0;}state.lostCount++;}}
 state.remainingValue=state.bodies.reduce((sum,b)=>sum+(b.lost?0:b.value),0);state.surviving=state.bodies.length-state.lostCount;state.lastImpact=Math.max(impact,state.lastImpact*Math.exp(-dt*12));if(impact>45)state.landings++;state.arrival=state.distance>=targetDistance-.001;return state;
}
window.AsobiBurgerPhysics={ingredients,parts:ingredients,templates,colors,maxLayers,targetDistance,normalize,layout,stats,defaultDraft:()=>clone(templates.balanced),createDelivery,step,route,clone,vertices,collision};
})();
