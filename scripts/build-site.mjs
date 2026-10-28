import { mkdirSync, copyFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
// dist is a fixed child of this project; no paths are read from external input.
rmSync(dist, { recursive:true, force:true });
mkdirSync(join(dist,'games'), { recursive:true });
mkdirSync(join(dist,'assets'), { recursive:true });
const games = runInNewContext(readFileSync(join(root,'catalog.js'),'utf8')+';GAMES');
if (!games.length || new Set(games.map(g=>g.id)).size!==games.length) throw Error('Invalid game catalog');
const dependencies=[...new Set(games.flatMap(game=>game.scripts||[]))].map(id=>{
 if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid game dependency');
 return 'games/'+id+'.js';
});
const files=['index.html','style.css','i18n.js','catalog.js','app.js','privacy.html','404.html','_headers','_routes.json',...['trio','duo','mole','bodybuilder','mouse-evolution','kotoba-garden'].map(id=>'games/'+id+'.css'),...dependencies,...games.map(g=>{
 if(!/^[a-z0-9-]+$/.test(g.id)) throw Error('Invalid game ID');
 return 'games/'+g.id+'.js';
}),...readdirSync(join(root,'assets')).map(name=>'assets/'+name)];
for(const file of files) copyFileSync(join(root,file),join(dist,file));
copyFileSync(join(root,'backend/worker.mjs'),join(dist,'_worker.js'));
console.log(`Built ${games.length} games, ${files.length} static files in dist/`);
