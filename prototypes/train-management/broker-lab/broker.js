// LAB ONLY. Private Unix HTTP, separate OS identity/container. No Docker or provisioning credentials.
import http from 'node:http';
import {readFile,writeFile,open,readdir,unlink,chmod} from 'node:fs/promises';
import {createHash,createHmac,createPublicKey,verify} from 'node:crypto';
import {canonical,isUUID} from '../capability-gateway/protocol.js';
import {parseStrict} from '../capability-gateway/strict-json.js';
import {FixedPool} from './pool.js';
import {transaction,dataQuery} from './transport.js';
const CONFIG='/secrets/config.json',SOCKET=process.env.LAB_SOCKET??'/ipc/broker.sock';
const hash=s=>createHash('sha256').update(s).digest('hex');
const codes=['FORBIDDEN','NOT_FOUND','REPLAY','REVISION_CONFLICT','IDEMPOTENCY_KEY_REUSED','INTEGRITY_ERROR','INCOMPATIBLE_SNAPSHOT','INVALID_REQUEST','INVALID_NONCE_CONTEXT','NONCE_EXPIRED','NONCE_QUOTA','NONCE_RATE_LIMITED','POOL_QUEUE_FULL','POOL_TIMEOUT','RATE_LIMITED','QUOTA_EXCEEDED','PAYLOAD_TOO_LARGE','RESPONSE_TOO_LARGE','INVALID_PAGE','INVALID_STATE_PROFILE','INVALID_TRANSITION','UNSAFE_PRINCIPAL'];
const code=e=>codes.find(c=>e.message===c)??'RETRYABLE_UNAVAILABLE';
const status=c=>['POOL_QUEUE_FULL','POOL_TIMEOUT','RETRYABLE_UNAVAILABLE'].includes(c)?503:['REPLAY','REVISION_CONFLICT','IDEMPOTENCY_KEY_REUSED'].includes(c)?409:['NONCE_QUOTA','NONCE_RATE_LIMITED','QUOTA_EXCEEDED','RATE_LIMITED'].includes(c)?429:['PAYLOAD_TOO_LARGE','RESPONSE_TOO_LARGE'].includes(c)?413:['INTEGRITY_ERROR','INCOMPATIBLE_SNAPSHOT','INVALID_STATE_PROFILE'].includes(c)?422:c==='NOT_FOUND'?404:c==='FORBIDDEN'?403:400;
const emit=r=>process.stdout.write(JSON.stringify({...r,at:Date.now()})+'\n');
const fail=(c='FORBIDDEN')=>{throw Error(c);};
const sameFields=(o,s)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join(',')!==s.split(',').sort().join(','))fail('INVALID_REQUEST');};
const ops=['ReadHead','ReadSnapshot','ListHistory','ReadReceipt','SaveCheckpoint','RecoverRevision'];
function signature(key,body,sig){if(key?.d||key?.kty!=='EC'||key.crv!=='P-256'||typeof sig!=='string'||!/^[a-f0-9]{128}$/.test(sig))fail();try{if(!verify('sha256',Buffer.from(canonical(body)),{key:createPublicKey({key,format:'jwk'}),dsaEncoding:'ieee-p1363'},Buffer.from(sig,'hex')))fail();}catch{fail();}}
function proof(e,rpc,cfg,b) {
 sameFields(e,'proof,signature,body');sameFields(e.proof,'audience,bodyDigest,deviceId,domain,epoch,issuedAt,keyId,layoutId,method,nonce,operation,path,request_id,version,workspaceId');
 const p=e.proof;
 if(!e.body||typeof e.body!=='object'||Array.isArray(e.body)||p.domain!=='SerieN-capability-v1'||p.version!==1||p.audience!==cfg.origin||p.method!=='POST'||rpc.method!==p.method||rpc.path!==p.path||p.workspaceId!==b.workspaceId||p.layoutId!==b.layoutId||p.deviceId!==b.deviceId||p.keyId!==b.deviceId||![p.workspaceId,p.layoutId,p.deviceId,p.request_id].every(isUUID)||p.epoch!==b.epoch||!Number.isSafeInteger(p.epoch)||!Number.isSafeInteger(p.issuedAt)||Math.abs(Date.now()-p.issuedAt)>120000||!/^[a-f0-9]{32}$/.test(p.nonce)||p.bodyDigest!==hash(canonical(e.body)))fail();
 signature(b.publicKey,p,e.signature);return p;
}
async function lifecycleNonce(p) {
 // Candidate keys cannot yet LOGIN or call claim_nonce (which accepts six DATA ops only).
 // Lifecycle SQL ticket/job consumption is paired with an exclusive, fsynced LAB journal.
 const dir='/journal',now=Date.now();const files=await readdir(dir);
 for(const f of files)if(/^[a-f0-9]{64}$/.test(f)){try{if(JSON.parse(await readFile(dir+'/'+f,'utf8')).expires<now)await unlink(dir+'/'+f);}catch{ /* unreadable/incomplete entries remain fail-closed */ }}
 if((await readdir(dir)).length>=10000)fail('NONCE_QUOTA');
 let handle;try{handle=await open(dir+'/'+hash(p.deviceId+':'+p.nonce),'wx',0o600);}catch(e){if(e.code==='EEXIST')fail('REPLAY');throw e;}
 try{await handle.writeFile(JSON.stringify({expires:now+300000}));await handle.sync();}finally{await handle.close();}
 const parent=await open(dir,'r');try{await parent.sync();}finally{await parent.close();}
}
async function hooks(){try{return JSON.parse(await readFile('/hooks/control.json','utf8'));}catch{return {};}}
async function gate(phase,p){let h=await hooks();if(h[phase]===p.request_id){emit({event:phase,requestId:p.request_id});const deadline=Date.now()+12000;while((await hooks())[phase]===p.request_id){if(Date.now()>deadline)fail('RETRYABLE_UNAVAILABLE');await new Promise(r=>setTimeout(r,20));}}}
async function main() {
 const initial=JSON.parse(await readFile(CONFIG,'utf8'));
 const pool=new FixedPool({...initial.pool,applicationName:'serien-6a9-'+(process.env.LAB_ID??'one')},r=>emit({component:'pool',...r}));
 const connection=cfg=>({host:'db',port:5432,database:'postgres',ssl:{ca:cfg.ca,rejectUnauthorized:true}});
 const credential=(cfg,b)=>{const s=cfg.credentials[b.principal];if(!s||s.version!==b.version)fail();return {principal:b.principal,version:s.version,password:s.password,connection:connection(cfg)};};
 const server=http.createServer(async(req,res)=>{
  let lease,drop=false,p;
  const send=(s,b)=>{if(res.destroyed)return;res.writeHead(s,{'content-type':'application/json'});res.end(JSON.stringify(b));};
  try {
   if(req.url!=='/request'||req.method!=='POST')fail();let size=0;const parts=[];
   for await(const chunk of req){size+=chunk.length;if(size>4400000)fail('PAYLOAD_TOO_LARGE');parts.push(chunk);}
   const rpc=parseStrict(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));sameFields(rpc,'method,path,wire');
   if(typeof rpc.wire!=='string'||Buffer.byteLength(rpc.wire)>2097152)fail('PAYLOAD_TOO_LARGE');
   const cfg=JSON.parse(await readFile(CONFIG,'utf8')),e=parseStrict(rpc.wire);
   await pool.retire(new Set([...Object.values(cfg.devices),...Object.values(cfg.redeemers)].map(b=>b.principal+'@'+b.version)));
   const route=rpc.path.match(/^\/v1\/workspaces\/([a-f0-9-]{36})\/layouts\/([a-f0-9-]{36})\/([A-Za-z]+)$/);
   if(route&&ops.includes(route[3])) {
    const b=cfg.devices[e?.proof?.deviceId];if(!b)fail();p=proof(e,rpc,cfg,b);
    if(p.operation!==route[3]||route[1]!==b.workspaceId||route[2]!==b.layoutId)fail();
    if(b.scope==='reader'&&['SaveCheckpoint','RecoverRevision'].includes(p.operation))fail();
    const query=dataQuery(p,e.body);lease=await pool.acquire(credential(cfg,b),b.workspaceId);
    const claim=await transaction(lease.client,b.principal,'serien_capability.claim_nonce($1)',[{...p,contextVersion:'sql-claim-v1',keyVersion:b.keyVersion,workspaceEpoch:b.workspaceEpoch}]);
    emit({event:'claimCommitted',requestId:p.request_id,principal:b.principal,pid:claim.pid});
    await gate('afterClaim',p);const h=await hooks();if(h.dropAfterClaim===p.request_id){res.destroy();return;}
    const result=await transaction(lease.client,b.principal,...query);
    emit({event:'dataCommitted',operation:p.operation,requestId:p.request_id,principal:b.principal,pid:result.pid});
    await gate('afterData',p);
    if((await hooks()).corruptResponse===p.request_id&&result.value?.state)result.value.state.ui.day=1-result.value.state.ui.day;
    if(Buffer.byteLength(JSON.stringify(result.value))>262144)fail('RESPONSE_TOO_LARGE');send(200,result.value);
   } else if(['/v1/pair','/v1/recover','/v1/rotate'].includes(rpc.path)) {
    const op=rpc.path.split('/').at(-1),j=cfg.jobs[e?.body?.jobId];if(!j)fail();
    const expected=op==='recover'?'jobId,token,deviceId,publicKey,recoveryToken':op==='rotate'?'jobId,token,deviceId,publicKey,oldSignature':'jobId,token,deviceId,publicKey';sameFields(e.body,expected);
    if(j.kind!=={pair:'PAIR',recover:'RECOVER',rotate:'ROTATE'}[op]||canonical(j.publicKey)!==canonical(e.body.publicKey)||e.body.deviceId!==j.deviceId||typeof e.body.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(e.body.token))fail();
    p=proof(e,rpc,cfg,j);if(p.operation!==op)fail();await lifecycleNonce(p);
    const r=cfg.redeemers[j.workspaceId];if(!r)fail();lease=await pool.acquire(credential(cfg,r),j.workspaceId);
    const state=await transaction(lease.client,r.principal,'serien_capability.read_device_job($1)',[e.body.jobId]);
    if(state.value.principal!==j.principal||state.value.deviceId!==j.deviceId||state.value.workspaceId!==j.workspaceId)fail();
    if(op==='rotate'&&state.value.state==='APPROVED')signature(j.previousPublicKey,{domain:'SerieN-rotation-possession-v1',jobId:e.body.jobId,deviceId:j.deviceId,workspaceId:j.workspaceId,layoutId:j.layoutId,publicKey:j.publicKey,nonce:p.nonce},e.body.oldSignature);
    const recovery=op==='recover'?createHmac('sha256',cfg.recoveryPeppers[j.workspaceId]).update(e.body.recoveryToken).digest('hex'):null;
    const result=await transaction(lease.client,r.principal,'serien_capability.redeem_device_job($1,$2,$3,$4)',[e.body.jobId,j.publicKey,hash(e.body.token),recovery]);
    emit({event:'lifecycleCommitted',requestId:p.request_id,jobId:e.body.jobId,state:result.value.state});
    await gate('afterLifecycle',p);send(result.value.state==='ACTIVE'?200:202,result.value);
   } else fail('NOT_FOUND');
  } catch(error){drop=true;const c=code(error);emit({event:'denied',code:c,requestId:p?.request_id});send(status(c),{error:c});}
  finally{if(lease)await lease.release(drop);}
 });
 server.requestTimeout=15000;server.headersTimeout=5000;server.maxConnections=128;
 await unlink(SOCKET).catch(()=>{});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(SOCKET,resolve);});await chmod(SOCKET,0o660);emit({event:'ready',uid:process.getuid(),pid:process.pid});
 const stop=async()=>{server.closeAllConnections();await pool.close();server.close(()=>process.exit(0));};process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
process.on('unhandledRejection',()=>{emit({event:'fatal'});process.exit(1);});
main().catch(()=>{emit({event:'startupFailed'});process.exit(1);});
