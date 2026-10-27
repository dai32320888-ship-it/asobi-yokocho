/* Local-only Cloudflare Pages/D1 integration adapter.
 * node tests/integration-server.mjs [--port 4176] [--database path.sqlite]
 * In-memory database is the default. Never exposes an HTTP admin/reset endpoint.
 */
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,promises as fs} from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import worker from '../backend/worker.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export class SQLiteD1{
 constructor(filename=':memory:'){this.sqlite=new DatabaseSync(filename);this.sqlite.exec(readFileSync(path.join(ROOT,'backend/schema.sql'),'utf8'))}
 prepare(sql){const db=this;let values=[];const statement={bind(...args){values=args;return statement},execute(){const result=db.sqlite.prepare(sql).run(...values);return{success:true,meta:{changes:Number(result.changes)}}},async first(){return db.sqlite.prepare(sql).get(...values)??null},async all(){return{success:true,results:db.sqlite.prepare(sql).all(...values)}},async run(){return statement.execute()}};return statement}
 async batch(statements){this.sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(statement=>statement.execute());this.sqlite.exec('COMMIT');return results}catch(error){this.sqlite.exec('ROLLBACK');throw error}}
 close(){this.sqlite.close()}
}
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon','.json':'application/json','.webm':'video/webm','.mp4':'video/mp4'};
export async function startIntegrationServer({port=4176,database=':memory:'}={}){
 if(database!==':memory:')await fs.mkdir(path.dirname(path.resolve(database)),{recursive:true});
 const db=new SQLiteD1(database),pending=new Set();
 const ctx={waitUntil(promise){pending.add(promise);promise.finally(()=>pending.delete(promise))}};
 const env={RANKING_DB:db,ASSETS:{async fetch(request){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  let pathname;try{pathname=decodeURIComponent(new URL(request.url).pathname)}catch{return new Response('Bad path',{status:400})}
  const filename=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if(!filename.startsWith(ROOT+path.sep)||/^\/(?:backend|tests)\//.test(pathname)||pathname.split('/').some(part=>part.startsWith('.')))return new Response('Forbidden',{status:403});
  try{const bytes=await fs.readFile(filename);return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':(MIME[path.extname(filename)]||'application/octet-stream')+'; charset=utf-8','cache-control':'no-store'}})}catch{return new Response('Not found',{status:404})}
 }}};
 const server=http.createServer(async(req,res)=>{
  try{
   const host=req.headers.host;
   if(!host||!/^((127\.0\.0\.1)|(localhost)):\d+$/.test(host)){res.writeHead(400).end('Bad host');return}
   const chunks=[];let length=0;
   for await(const chunk of req){length+=chunk.length;if(length>65536){res.writeHead(413).end('Too large');return}chunks.push(chunk)}
   const headers=new Headers();for(const[key,value]of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
   // The adapter, like Cloudflare, owns this trusted address header.
   headers.set('cf-connecting-ip','127.0.0.1');
   const request=new Request('http://'+host+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
   const response=await worker.fetch(request,env,ctx);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){console.error('Integration adapter error:',error.message);res.writeHead(500,{'content-type':'text/plain'}).end('Integration adapter failed')}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
 return{url:'http://127.0.0.1:'+server.address().port,db,server,async close(){await Promise.allSettled([...pending]);await new Promise(resolve=>server.close(resolve));db.close()}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2),portIndex=args.indexOf('--port'),dbIndex=args.indexOf('--database');
 const instance=await startIntegrationServer({port:portIndex<0?4176:Number(args[portIndex+1]),database:dbIndex<0?':memory:':args[dbIndex+1]});
 console.log('Integration preview: '+instance.url+' (local SQLite, not public data)');
 for(const signal of['SIGINT','SIGTERM'])process.on(signal,async()=>{await instance.close();process.exit(0)});
}
