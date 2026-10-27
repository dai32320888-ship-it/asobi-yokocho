import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer((req,res)=>{
 try{
  const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(route==='/'?'/index.html':route));
  if(!file.startsWith(root+sep)||!statSync(file).isFile())throw Error('Not found');
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(file));
 }catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(readFileSync(resolve(root,'404.html')));}
});
const port=Number(process.argv[2]||4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview port');
server.listen(port,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:'+port));
