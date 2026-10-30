/* Ordinary-control tile route planner, used only for reproducible balance checks. */
'use strict';
function createPilot(Data,options={}){
 let route=[],targetId=null,target=null,lastTile='',ticks=0;
 const centerTolerance=Number.isFinite(options.centerTolerance)?Math.max(.8,Math.min(2.8,options.centerTolerance)):.8;
 const tile=p=>[Math.floor(p.x/16),Math.floor(p.y/16)],center=p=>({x:p[0]*16+8,y:p[1]*16+8});
 function search(state,goal){
  const map=Data.maps[state.stage],start=tile(state.player),finish=tile(goal),queue=[start],seen=new Set([start.join(',')]),parents=new Map();
  while(queue.length){const at=queue.shift();if(at[0]===finish[0]&&at[1]===finish[1]){const result=[];let key=at.join(',');while(key!==start.join(',')){result.unshift(key.split(',').map(Number));key=parents.get(key);}return result;}
   for(const dir of [[0,-1],[1,0],[0,1],[-1,0]]){const next=[at[0]+dir[0],at[1]+dir[1]],key=next.join(',');if(seen.has(key)||map.tiles[next[1]]?.[next[0]]!=='.')continue;seen.add(key);parents.set(key,at.join(','));queue.push(next);}
  }return null;
 }
 return {next(state){
  if(state.mode!=='playing')return {x:0,y:0,dash:false};
  ticks++;
  const available=state.items.filter(item=>!item.collected&&!item.open&&(item.type==='gem'&&(options.full||state.gems<8)||options.full&&item.type==='key'&&!state.chestOpened||options.full&&item.type==='chest'&&state.key));
  const done=state.gems>=8&&(!options.full||state.gems===10&&state.chestOpened),id=done?'exit':targetId;
  if(!target||id!==targetId||targetId!=='exit'&&!available.some(item=>item.id===targetId)){
   if(done){targetId='exit';target=state.exit;route=search(state,target)||[];}
   else {let best=null;for(const item of available){const path=search(state,item);if(path&&(!best||path.length<best.path.length))best={item,path};}if(!best)return{x:0,y:0,dash:false};target=best.item;targetId=best.item.id;route=best.path;}
  }
  const here=tile(state.player).join(',');if(!route.length&&Math.hypot(state.player.x-target.x,state.player.y-target.y)>1)route=search(state,target)||[];
  let waypoint=route.length?center(route[0]):target;
  if(Math.hypot(state.player.x-waypoint.x,state.player.y-waypoint.y)<centerTolerance){route.shift();waypoint=route.length?center(route[0]):target;}
  const dx=waypoint.x-state.player.x,dy=waypoint.y-state.player.y,distance=Math.hypot(dx,dy);
  // Walk to every center before a turn; a dash is used only down a straight corridor.
  const straight=route.length>=3&&route.slice(0,3).every(p=>p[0]===route[0][0]||p[1]===route[0][1]);
  const danger=state.enemies.some(e=>e.stun<=0&&Math.hypot(e.x-state.player.x,e.y-state.player.y)<21);
  const dash=Boolean(options.dash&&distance>.5&&state.player.dashTime<=0&&state.player.dashCooldown<=0&&(danger||straight)&&ticks%2===0);
  lastTile=here;
  return{x:distance>.2?dx/distance:0,y:distance>.2?dy/distance:0,dash,target:targetId,waypoint};
 },routeTo:search};
}
module.exports={createPilot};
