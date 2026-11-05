// 6A.6 LAB ONLY. Operator callbacks are injected in-process; never exposed as admin HTTP.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash,createPublicKey,verify,randomBytes} from 'node:crypto';
import {canonical,isUUID} from '../capability-gateway/protocol.js';
import {parseStrict} from '../capability-gateway/strict-json.js';
import {LocalBudget} from '../history-access/protocol.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
const deny=(code='FORBIDDEN')=>{throw Error(code);};
const status={FORBIDDEN:403,INVALID_REQUEST:400,NOT_FOUND:404,REPLAY:409,REVISION_CONFLICT:409,IDEMPOTENCY_KEY_REUSED:409,QUOTA_EXCEEDED:429,RATE_LIMITED:429,PAYLOAD_TOO_LARGE:413,RESPONSE_TOO_LARGE:413,INTEGRITY_ERROR:422,INCOMPATIBLE_SNAPSHOT:422,INVALID_PAGE:400,INVALID_ENVELOPE:400,INVALID_STATE_PROFILE:422,DIGEST_OR_CANONICAL_MISMATCH:400,RETRYABLE_UNAVAILABLE:503};
const ops=['ReadHead','ReadSnapshot','ListHistory','ReadReceipt','SaveCheckpoint','RecoverRevision'];
const key=jwk=>{if(jwk?.d||jwk?.kty!=='EC'||jwk.crv!=='P-256')deny();try{return createPublicKey({key:jwk,format:'jwk'});}catch{deny();}};
export async function startLab({provision,recover,revoke,execute,emit=()=>{},now=Date.now}={}) {
 const devices=new Map(),workspaces=new Map(),tickets=new Map(),nonces=new Map();
 const provisioning=new Set();
 const budget=new LocalBudget({now,device:200,workspace:1000,maxSubjects:1024});
 let origin;
 function authenticate(e,req,workspaceId,layoutId,operation,candidate) {
  const p=e?.proof;
  const fields='audience,bodyDigest,deviceId,domain,epoch,issuedAt,keyId,layoutId,method,nonce,operation,path,request_id,version,workspaceId';
  if(!p||Object.keys(p).sort().join(',')!==fields||p.domain!=='SerieN-capability-v1'||p.version!==1||p.audience!==origin||p.method!==req.method||p.path!==req.url||p.operation!==operation||p.workspaceId!==workspaceId||p.layoutId!==layoutId||![workspaceId,layoutId,p.deviceId,p.request_id].every(isUUID)||p.keyId!==p.deviceId||!Number.isSafeInteger(p.epoch)||!Number.isSafeInteger(p.issuedAt)||Math.abs(now()-p.issuedAt)>120000||typeof p.nonce!=='string'||!/^[a-f0-9]{32}$/.test(p.nonce)||p.bodyDigest!==hash(canonical(e.body)))deny();
  const d=candidate??devices.get(p.deviceId);
  if(!d||d.revoked||d.epoch!==p.epoch||d.workspaceId!==workspaceId||workspaces.get(workspaceId)!==layoutId)deny();
  if(typeof e.signature!=='string'||!/^[a-f0-9]{128}$/.test(e.signature)||!verify('sha256',Buffer.from(canonical(p)),{key:key(d.publicKey),dsaEncoding:'ieee-p1363'},Buffer.from(e.signature,'hex')))deny();
  for(const [k,v] of nonces)if(v<now())nonces.delete(k);
  const n=p.deviceId+':'+p.nonce;if(nonces.has(n))deny('REPLAY');if(nonces.size>=10000)deny('RATE_LIMITED');nonces.set(n,now()+300000);
  return d;
 }
 const server=http.createServer(async(req,res)=>{
  const send=(s,b,type='application/json')=>{if(res.destroyed)return;res.writeHead(s,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(type==='application/json'?JSON.stringify(b):b);};
  try {
   // Bound loopback, exact host/origin as defense in depth. Proof remains mandatory without Origin.
   if(req.headers.host!==new URL(origin).host||req.headers.origin&&req.headers.origin!==origin)deny();
   if(req.method==='GET'&&['/','/client.js','/protocol.js'].includes(req.url)) {
    const path=req.url==='/'?new URL('./index.html',import.meta.url):req.url==='/protocol.js'?new URL('../capability-gateway/protocol.js',import.meta.url):new URL('./client.js',import.meta.url);
    return send(200,await readFile(path),req.url==='/'?'text/html':'text/javascript');
   }
   budget.take({workspaceId:'ingress',deviceId:req.socket.remoteAddress});
   const route=req.url?.match(/^\/v1\/workspaces\/([a-f0-9-]{36})\/layouts\/([a-f0-9-]{36})\/([A-Za-z]+)$/);
   const pair=['/v1/pair','/v1/recover'].includes(req.url);
   if(req.method!=='POST'||!pair&&(!route||!ops.includes(route[3])))deny('NOT_FOUND');
   if(req.headers['content-type']!=='application/json')deny('INVALID_REQUEST');
   let size=0;const chunks=[];
   req.setTimeout(5000,()=>req.destroy());
   for await(const chunk of req){size+=chunk.length;if(size>2097152)deny('PAYLOAD_TOO_LARGE');chunks.push(chunk);}
   let e;try{e=parseStrict(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{deny('INVALID_REQUEST');}
   if(!e||Object.keys(e).sort().join(',')!=='body,proof,signature'||!e.body||Array.isArray(e.body)||typeof e.body!=='object')deny('INVALID_REQUEST');
   if(pair) {
    const t=typeof e.body.token==='string'?tickets.get(hash(e.body.token)):null;
    if(!t||t.pending||provisioning.has(t.workspaceId)||t.expires<now()||t.recovery!==(req.url==='/v1/recover')||devices.has(e.body.deviceId)||e.body.deviceId!==t.deviceId||canonical(e.body.publicKey)!==canonical(t.publicKey)||Object.keys(e.body).sort().join(',')!=='deviceId,publicKey,token')deny();
    authenticate(e,req,t.workspaceId,t.layoutId,t.recovery?'recover':'pair',{...t,epoch:1});
    if(e.proof.deviceId!==t.deviceId)deny();
    t.pending=true;provisioning.add(t.workspaceId);
    try {
     const binding=await (t.recovery?recover(t):provision(t));
     if(t.recovery){for(const d of devices.values())if(d.workspaceId===t.workspaceId)d.revoked=true;for(const [k,v] of tickets)if(v.workspaceId===t.workspaceId)tickets.delete(k);}
     devices.set(t.deviceId,{...t,...binding,epoch:1,revoked:false});tickets.delete(hash(e.body.token));
     emit({outcome:'PAIRED'});return send(200,{deviceId:t.deviceId,epoch:1});
    } finally{t.pending=false;provisioning.delete(t.workspaceId);}
   }
   const [,workspaceId,layoutId,operation]=route;
   const d=authenticate(e,req,workspaceId,layoutId,operation);
   if(d.scope==='reader'&&['SaveCheckpoint','RecoverRevision'].includes(operation))deny();
   const result=await execute({deviceId:e.proof.deviceId,workspaceId,layoutId,operation,requestId:e.proof.request_id},e.body);
   if(Buffer.byteLength(JSON.stringify(result))>262144)deny('RESPONSE_TOO_LARGE');
   emit({operation,outcome:'OK'});send(200,result);
  } catch(e) {const code=Object.hasOwn(status,e.message)?e.message:'FORBIDDEN';emit({outcome:code});send(status[code],{error:code});}
 });
 server.requestTimeout=5000;server.headersTimeout=5000;server.maxConnections=32;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 origin=`http://127.0.0.1:${server.address().port}`;
 return {origin,async close(){server.closeAllConnections();await new Promise(r=>server.close(r));},
  // Controlled test operator approves exact key/device/workspace/scope out of band.
  approve({workspaceId,layoutId,deviceId,publicKey,scope='reader',recovery=false}) {
   for(const [k,t] of tickets)if(t.expires<now())tickets.delete(k);
   if(tickets.size>=64||devices.size>=64)deny('RATE_LIMITED');
   if(![workspaceId,layoutId,deviceId].every(isUUID)||!['owner','editor','reader'].includes(scope)||devices.has(deviceId))deny();key(publicKey);
   if(workspaces.has(workspaceId)&&workspaces.get(workspaceId)!==layoutId)deny();workspaces.set(workspaceId,layoutId);
   const token=randomBytes(32).toString('hex');tickets.set(hash(token),{workspaceId,layoutId,deviceId,publicKey:structuredClone(publicKey),scope:recovery?'owner':scope,recovery,expires:now()+600000});return token;
  },async revoke(deviceId){const d=devices.get(deviceId);if(!d)deny();await revoke(deviceId);d.revoked=true;},
 };
}
