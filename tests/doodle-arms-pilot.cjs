/* Public-input policies used only for deterministic balance checks. */
function createPilot(strategy='timed',{skipArt=true}={}){
 return {next(model){const s=model.state;if(skipArt&&(s.mode==='drawing'||s.mode==='editing'))model.fightNow();if(s.mode!=='fighting')return;if(strategy==='idle')return;if(strategy==='timed'&&s.enemy.attack&&s.enemy.attack.time/s.enemy.attack.duration>.20&&s.enemy.attack.time/s.enemy.attack.duration<.40&&s.player.stamina>44&&Math.abs(s.player.x-s.enemy.x)<s.enemy.weapon.stats.reach+35)model.dodge();model.attack();}};
}
module.exports={createPilot};
