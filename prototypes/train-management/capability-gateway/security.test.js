import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {startGateway} from './gateway.js';
import {generateDevice,signed,fingerprint} from './protocol.js';
const rows=[];
const ws=crypto.randomUUID(),layout=crypto.randomUUID(),other=crypto.randomUUID();
const owner=await generateDevice(),intruder=await generateDevice();
let current=Date.now();
const g=await startGateway({now:()=>current});g.bootstrap(ws,layout,owner);g.bootstrap(other,layout,intruder);
const path=op=>`/v1/workspaces/${ws}/layouts/${layout}/${op}`;
async function send(e,url=path(e.proof.operation),method='POST',headers={}){const r=await fetch(g.origin+url,{method,headers:{'content-type':'application/json',...headers},...(method==='GET'?{}:{body:typeof e==='string'?e:JSON.stringify(e)})});return {status:r.status,body:await r.json()};}
async function envelope(op='read',body={},device=owner){return signed(device,g.origin,'POST',path(op),ws,layout,op,body,{issuedAt:current});}
async function deny(label,input,expected,request){
 await test(label,async()=>{const before=g.inspect(ws),beforeOther=g.inspect(other);const observed=await request();
  assert.equal(observed.status,expected);assert.deepEqual(observed.body,{error:'DENIED'});
  assert.deepEqual(g.inspect(ws),before);assert.deepEqual(g.inspect(other),beforeOther);
  rows.push({test:label,input,expected:{status:expected,noProtectedData:true,noDataMutation:true},observed,result:'PASS'});
 });
}
try{
 await test('valid WebCrypto P-256 signature, P1363 64-byte server verification',async()=>{const e=await envelope();assert.equal(e.signature.length,128);const r=await send(e);assert.equal(r.status,200);assert.equal(r.body.value,'private-fixture');rows.push({test:'valid signature',input:'WebCrypto signature / POST read',expected:200,observed:r.status,result:'PASS'});});
 await deny('no capability','unsigned POST',403,()=>send({proof:{},body:{},signature:''},path('read')));
 await deny('forged signature','64 bytes replaced',403,async()=>{const e=await envelope();e.signature='00'.repeat(64);return send(e);});
 await deny('modified body','change body after signature',403,async()=>{const e=await envelope('write',{value:'tampered'});e.body.value='changed';return send(e);});
 await deny('different method','POST signed, GET sent',404,async()=>send(await envelope(),path('read'),'GET'));
 await deny('different path','read signature used for write',403,async()=>send(await envelope(),path('write')));
 await deny('noncanonical path','percent encoding',404,async()=>send(await envelope(),path('read').replace('read','%72ead')));
 await deny('stale timestamp','issuedAt older than 120s',403,async()=>{const e=await signed(owner,g.origin,'POST',path('read'),ws,layout,'read',{}, {issuedAt:current-120001});return send(e);});
 await deny('future timestamp','issuedAt 120001ms ahead',403,async()=>send(await signed(owner,g.origin,'POST',path('read'),ws,layout,'read',{}, {issuedAt:current+120001})));
 const replay=await envelope('write',{value:'once'});assert.equal((await send(replay)).status,200);
 await deny('nonce replay','same signed write repeated',409,()=>send(replay));
 await deny('concurrent nonce replay','two simultaneous copies',409,async()=>{const e=await envelope();const r=await Promise.all([send(e),send(e)]);assert.equal(r.filter(x=>x.status===200).length,1);return r.find(x=>x.status===409);});
 await deny('cross-workspace','valid device from B reads A',403,async()=>send(await envelope('read',{},intruder)));
 await deny('different workspace binding','signed A proof with B URL',403,async()=>send(await envelope(),path('read').replace(ws,other)));
 await deny('different layout','signed wrong layout with valid device',403,async()=>{const wrong=crypto.randomUUID(),p=path('read').replace(layout,wrong);return send(await signed(owner,g.origin,'POST',p,ws,wrong,'read',{}, {issuedAt:current}),p);});
 for(const malformed of ['-'.repeat(36),'a'.repeat(36),'000000000-000-4000-8000-000000000001','00000000-0000-4000-8000-00000000000z']){
  await deny('strict UUID rejects '+malformed,'signed read with syntactically invalid workspace',malformed.endsWith('z')?404:403,async()=>{const p=path('read').replace(ws,malformed);return send(await signed(owner,g.origin,'POST',p,malformed,layout,'read',{}, {issuedAt:current}),p);});
 }
 await deny('unknown device','valid fresh key not registered',403,async()=>send(await envelope('read',{},await generateDevice())));
 await deny('old epoch','signed epoch 0',403,async()=>send(await signed(owner,g.origin,'POST',path('read'),ws,layout,'read',{}, {issuedAt:current,epoch:0})));
 await deny('wrong audience','signature audience another host',403,async()=>send(await signed(owner,'https://example.invalid','POST',path('read'),ws,layout,'read',{}, {issuedAt:current})));
 await deny('domain separation','different signing domain',403,async()=>send(await signed(owner,g.origin,'POST',path('read'),ws,layout,'read',{}, {issuedAt:current,domain:'other'})));
 const candidate=await generateDevice();
 async function invitation(device=candidate,scope='reader'){
  const r=await send(await envelope('invite',{deviceId:device.deviceId,publicKey:device.publicKey,fingerprint:await fingerprint(device.publicKey),scope}));assert.equal(r.status,200);return r.body.token;
 }
 async function pair(token,device=candidate,patch={}){return send(await signed(device,g.origin,'POST','/v1/pair',ws,layout,'pair',{token,deviceId:device.deviceId,publicKey:device.publicKey,...patch},{issuedAt:current}),'/v1/pair');}
 const expired=await invitation();current+=600001;
 await deny('expired invitation','TTL 10 minutes exceeded',403,()=>pair(expired));
 const token=await invitation();
 await deny('altered invitation','random token',403,()=>pair('00'.repeat(32)));
 await deny('key substitution','redeem bound invitation with another key',403,async()=>pair(token,await generateDevice()));
 await deny('fingerprint mismatch','owner approves wrong fingerprint',403,async()=>send(await envelope('invite',{deviceId:candidate.deviceId,publicKey:candidate.publicKey,fingerprint:'bad',scope:'owner'})));
 await test('simultaneous pairing consumes invite once and ignores body scope escalation',async()=>{const r=await Promise.all([pair(token,candidate,{scope:'owner'}),pair(token,candidate,{scope:'owner'})]);assert.deepEqual(r.map(x=>x.status).sort(),[200,403]);assert.deepEqual(r.find(x=>x.status===403).body,{error:'DENIED'});rows.push({test:'pair race / scope binding',input:'two signed redeems; body claims owner, invite reader',expected:[200,403],observed:r.map(x=>x.status).sort(),result:'PASS'});});
 await deny('consumed invitation','same invitation again',403,()=>pair(token));
 await deny('insufficient write scope','reader claims owner in body',403,async()=>send(await envelope('write',{value:'no',scope:'owner'},candidate)));
 await deny('insufficient pairing scope','reader tries to create invite',403,async()=>send(await envelope('invite',{deviceId:crypto.randomUUID(),publicKey:owner.publicKey,fingerprint:await fingerprint(owner.publicKey),scope:'owner'},candidate)));
 const signedBeforeRevocation=await envelope('read',{},candidate);
 await test('reader positive then owner revokes',async()=>{assert.equal((await send(await envelope('read',{},candidate))).status,200);assert.equal((await send(await envelope('revoke',{deviceId:candidate.deviceId}))).status,200);rows.push({test:'read then revoke',input:'reader request, signed owner revoke',expected:[200,200],observed:[200,200],result:'PASS'});});
 await deny('request signed before revocation','previous valid signature sent after revoke',403,()=>send(signedBeforeRevocation));
 await deny('revoked device','previously paired reader',403,async()=>send(await envelope('read',{},candidate)));
 await deny('malformed JSON','unfinished object',400,()=>send('{',path('write')));
 await deny('duplicate JSON keys','decoded escaped alias',400,()=>send('{"body":{},"bo\\u0064y":{},"proof":{},"signature":""}',path('write')));
 await deny('duplicate nested keys','nested proof epoch repeated',400,()=>send('{"body":{},"proof":{"epoch":1,"epoch":2},"signature":""}',path('read')));
 await deny('nonfinite JSON','numeric overflow',400,()=>send('{"body":{"n":1e999},"proof":{},"signature":""}',path('write')));
 await deny('oversize payload','2MiB+1',413,()=>send(' '.repeat(2*1024*1024+1),path('write')));
 await deny('Origin is not authorization','allowed Origin but unsigned',403,()=>send({proof:{},body:{},signature:''},path('read'),'POST',{Origin:g.origin}));
 await deny('foreign Origin','valid signature from foreign Origin',403,async()=>send(await envelope(),path('read'),'POST',{Origin:'https://evil.invalid'}));
 await deny('CORS preflight cannot authorize','OPTIONS',404,async()=>{const r=await fetch(g.origin+path('read'),{method:'OPTIONS'});assert.equal(r.headers.get('access-control-allow-origin'),null);return {status:r.status,body:await r.json()};});
 await deny('Host rebinding','forged Host header',403,async()=>{const e=await envelope();return new Promise((resolve,reject)=>{const req=http.request(g.origin+path('read'),{method:'POST',headers:{Host:'evil.invalid','content-type':'application/json'}},res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(data)}));});req.on('error',reject);req.end(JSON.stringify(e));});});
 const activeEditor=await generateDevice();assert.equal((await pair(await invitation(activeEditor,'editor'),activeEditor)).status,200);
 const pendingDevice=await generateDevice(),pendingInvite=await invitation(pendingDevice);
 const kit=g.issueRecovery(ws),newOwner=await generateDevice();
 const recover=()=>signed(newOwner,g.origin,'POST','/v1/recover',ws,layout,'recover',{token:kit,deviceId:newOwner.deviceId,publicKey:newOwner.publicKey},{issuedAt:current});
 await test('simulated recovery registers owner and revokes prior owner',async()=>{assert.equal((await send(await recover(),'/v1/recover')).status,200);assert.equal((await send(await envelope('write',{value:'recovered'},newOwner))).status,200);rows.push({test:'recovery',input:'single-use in-process kit + proof of new key',expected:[200,200],observed:[200,200],result:'PASS'});});
 await deny('active editor after recovery','another previously active key',403,async()=>send(await envelope('write',{value:'no'},activeEditor)));
 await deny('pending invite after recovery','old pending pairing is invalidated',403,()=>pair(pendingInvite,pendingDevice));
 await deny('old owner after recovery','old key/epoch read',403,async()=>send(await envelope()));
 await deny('recovery replay','consumed kit',403,async()=>send(await recover(),'/v1/recover'));
 await deny('wrong recovery token','altered kit',403,async()=>{const e=await signed(await generateDevice(),g.origin,'POST','/v1/recover',ws,layout,'recover',{token:'invalid'}, {issuedAt:current});return send(e,'/v1/recover');});
}finally{
 await g.close();
 if(process.env.CAPABILITY_EVIDENCE)await writeFile(process.env.CAPABILITY_EVIDENCE,JSON.stringify({cases:rows,note:'No private keys, signatures, invitations or recovery material retained. Denials assert response has no protected data and both workspace values/counters unchanged.'},null,2)+'\n');
}
