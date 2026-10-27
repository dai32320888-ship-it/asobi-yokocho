import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base=new URL(process.argv[2]);
if(base.protocol!=='https:')throw Error('Use the verified HTTPS production URL');
const dist=resolve(root,'dist');
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(resolve(directory,entry.name)):[resolve(directory,entry.name)]);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const results=[];
for(const file of walk(dist)){
 const path=relative(dist,file).replaceAll('\\','/');if(['_headers','_routes.json','_worker.js'].includes(path))continue;
 const response=await fetch(new URL(path==='index.html'?'':path,base),{signal:AbortSignal.timeout(20000)});
 const bytes=Buffer.from(await response.arrayBuffer());
 const match=digest(bytes)===digest(readFileSync(file));
 results.push({path,status:response.status,bytes:bytes.length,sha256:digest(bytes),matchesBuild:match});
 if(!response.ok||!match)throw Error('Deployment differs from tested build: '+path);
}
const response=await fetch(base,{signal:AbortSignal.timeout(20000)});
const csp=response.headers.get('content-security-policy');
if(!csp?.includes("script-src 'self'")||!csp.includes("connect-src 'self'"))throw Error('Missing production CSP');
const missing=await fetch(new URL('nonexistent-release-check',base),{signal:AbortSignal.timeout(20000)});
if(missing.status!==404)throw Error('Missing route must return HTTP 404');
const report={publicUrl:base.href,verifiedAt:new Date().toISOString(),result:'PASS',files:results,headers:{csp,nosniff:response.headers.get('x-content-type-options'),frame:response.headers.get('x-frame-options')},missingRouteStatus:missing.status};
writeFileSync(resolve(root,'tests/live-results.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS: '+results.length+' live files match the tested build; security headers and 404 verified.');
