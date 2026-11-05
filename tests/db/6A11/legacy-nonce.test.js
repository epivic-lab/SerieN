// Real HTTP/WebCrypto and isolated legacy PG17 adapter; no mocked execute/provision.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {startLab} from '../../../prototypes/train-management/integration-lab/gateway.js';
import {transport,dockerArgs} from '../../../prototypes/train-management/integration-lab/sql-transport.js';
import {startGateway} from '../../../prototypes/train-management/capability-gateway/gateway.js';
import {generateDevice,signed} from '../../../prototypes/train-management/capability-gateway/protocol.js';
const [container,out]=process.argv.slice(2);
const profiles=JSON.parse(await readFile(out+'/profiles.json'));
const A=Object.keys(profiles)[0],L=profiles[A].layoutId;
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
const run=promisify(execFile),q=x=>"'"+String(x).replaceAll("'","''")+"'";
async function sql(query,role='postgres') {
 // Query via stdin, no shell interpolation; privileged path exists only in this test operator.
 const {spawn}=await import('node:child_process');
 return new Promise((resolve,reject)=>{const p=spawn('docker',[...dockerArgs,'exec','-i',container,'psql','-XqAt','-U',role,'-d','postgres','-v','ON_ERROR_STOP=1'],{env});let stdout='',stderr='';p.stdout.on('data',s=>stdout+=s);p.stderr.on('data',s=>stderr+=s);p.on('error',reject);p.on('close',code=>code?reject(Error(stderr)):resolve(stdout.trim()));p.stdin.end(query);});
}

const bindings=new Map(),rows=[];
const t=transport(container,bindings);
async function provision(d,recovery=false) {
 const role='lab_'+randomUUID().replaceAll('-','').slice(0,16);
 const revoke=recovery?`SET LOCAL ROLE serien_tm_authorizer; UPDATE serien_capability.devices SET revoked_at=now() WHERE workspace_id=${q(d.workspaceId)}; RESET ROLE;`:'';
 await sql(`BEGIN; ${revoke} CREATE ROLE ${role} LOGIN IN ROLE serien_tm_worker; INSERT INTO serien_capability.worker_bindings VALUES(${q(role)},${q(d.workspaceId)}); INSERT INTO serien_capability.devices(id,workspace_id,public_key,scope) VALUES(${q(d.deviceId)},${q(d.workspaceId)},${q(JSON.stringify(d.publicKey))},${q(d.scope)}); INSERT INTO serien_capability.device_locks(workspace_id,device_id) VALUES(${q(d.workspaceId)},${q(d.deviceId)}); INSERT INTO serien_capability.device_bindings(role_name,workspace_id,device_id) VALUES(${q(role)},${q(d.workspaceId)},${q(d.deviceId)}); COMMIT;`);
 bindings.set(d.deviceId,{role,workspaceId:d.workspaceId,layoutId:d.layoutId});return {};
}

const g=await startLab({provision:d=>provision(d),execute:(c,b)=>t.execute(c,b)});
const cap=await startGateway();
async function send(server,d,path,op,body={},nonceArray=false){
 const e=await signed(d,server.origin,'POST',path,A,L,op,body,nonceArray?{nonce:['f'.repeat(32)]}:{});
 const r=await fetch(server.origin+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(e)});
 return {status:r.status,body:await r.json()};
}
async function record(test,fn){try{const observed=await fn();rows.push({test,...observed});}catch(e){rows.push({test,result:'FAIL',assertion:e.message});}}
const count=()=>sql('select count(*) from serien_capability.device_bindings;');
try{
 const d=await generateDevice();cap.bootstrap(A,L,d);
 const before=cap.inspect(A);
 await record('D01b capability2 rejects typed-array nonce',async()=>{
  const r=await send(cap,d,`/v1/workspaces/${A}/layouts/${L}/read`,'read',{},true);
  const after=cap.inspect(A);assert.deepEqual(after,before);
  return {expected:{status:403,body:{error:'DENIED'}},observed:r,before,after,result:r.status===403?'PASS':'FAIL'};
 });
 const candidate=await generateDevice(),token=g.approve({workspaceId:A,layoutId:L,...candidate,scope:'owner'});
 await record('D01c integration6 invalid nonce cannot create SQL principal',async()=>{
  const before=await count();const r=await send(g,candidate,'/v1/pair','pair',{token,deviceId:candidate.deviceId,publicKey:candidate.publicKey},true);const after=await count();
  return {expected:{status:403,body:{error:'FORBIDDEN'},sqlBindingsUnchanged:true},observed:r,beforeBindings:Number(before),afterBindings:Number(after),result:r.status===403&&before===after?'PASS':'FAIL'};
 });
 const valid=await generateDevice(),tok=g.approve({workspaceId:A,layoutId:L,...valid,scope:'owner'});
 const pair=await send(g,valid,'/v1/pair','pair',{token:tok,deviceId:valid.deviceId,publicKey:valid.publicKey});assert.equal(pair.status,200);
 const path=`/v1/workspaces/${A}/layouts/${L}/ReadHead`;
 const good=await send(g,valid,path,'ReadHead');assert.equal(good.status,200);
 await record('D01c integration6 invalid nonce cannot read actual SQL head',async()=>{
  const r=await send(g,valid,path,'ReadHead',{},true);
  return {expected:{status:403,body:{error:'FORBIDDEN'}},observed:r,positiveControl:good,result:r.status===403?'PASS':'FAIL'};
 });
}finally{await t.close();await g.close();await cap.close();}
await writeFile(out+'/legacy-nonce.json',JSON.stringify({scope:'isolated legacy 6A.2/6 fixture; not ownerless certification',cases:rows},null,2)+'\n');
for(const r of rows)console.log(r.test+': '+r.result);
if(rows.some(r=>r.result!=='PASS'))process.exitCode=1;
