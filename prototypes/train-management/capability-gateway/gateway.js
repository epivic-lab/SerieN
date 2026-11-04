import http from 'node:http';
import {createHash, createPublicKey, verify, randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {canonical} from './protocol.js';
import {parseStrict} from './strict-json.js';
const hash = value => createHash('sha256').update(value).digest('hex');
const fp = key => hash(canonical(key));
const fail = (status=403) => {throw Object.assign(Error('Denied'),{status});};
const scopes = ['reader','editor','owner'];
const id = v => typeof v==='string' && /^[0-9a-f-]{36}$/.test(v);
const secret = () => randomBytes(32).toString('hex');
const validKey = jwk => {
  if(!jwk||jwk.d||jwk.kty!=='EC'||jwk.crv!=='P-256')fail();
  try{return createPublicKey({key:jwk,format:'jwk'});}catch{fail();}
};
export async function startGateway({now=Date.now}={}) {
  // No persistent storage, credentials, production adapter, configurable bind or outbound requests.
  const devices=new Map(), workspaces=new Map(), invitations=new Map(), recoveries=new Map(), nonces=new Map();
  let origin;
  const register = (workspaceId, device, scope) => {
    if(!workspaces.has(workspaceId)||!id(device.deviceId)||devices.has(device.deviceId)||!scopes.includes(scope))fail();
    validKey(device.publicKey);
    devices.set(device.deviceId,{workspaceId,publicKey:structuredClone(device.publicKey),scope,epoch:1,revoked:false});
    return {deviceId:device.deviceId,epoch:1};
  };
  function invite(workspaceId, body) {
    if(!scopes.includes(body.scope)||!id(body.deviceId)||body.fingerprint!==fp(body.publicKey))fail();
    validKey(body.publicKey);
    const token=secret();invitations.set(hash(token),{workspaceId,deviceId:body.deviceId,publicKey:structuredClone(body.publicKey),scope:body.scope,expires:now()+600000});
    return {token,expiresAt:now()+600000,fingerprint:body.fingerprint};
  }
  function authenticate(envelope,req,path,operation,workspaceId,layoutId,candidate) {
    const {proof:p,signature,body}=envelope;
    const fields=['domain','version','audience','method','path','workspaceId','layoutId','operation','bodyDigest','deviceId','keyId','epoch','request_id','nonce','issuedAt'];
    if(!p||Object.keys(p).length!==fields.length||fields.some(k=>!Object.hasOwn(p,k))||
      p.domain!=='SerieN-capability-v1'||p.version!==1||p.audience!==origin||p.method!==req.method||p.path!==path||
      p.operation!==operation||p.workspaceId!==workspaceId||p.layoutId!==layoutId||
      !id(p.deviceId)||p.keyId!==p.deviceId||!id(p.request_id)||!Number.isSafeInteger(p.epoch)||
      !Number.isSafeInteger(p.issuedAt)||Math.abs(now()-p.issuedAt)>120000||
      !/^[0-9a-f]{32}$/.test(p.nonce)||p.bodyDigest!==hash(canonical(body)))fail();
    const d=candidate??devices.get(p.deviceId);
    if(!d||d.revoked||d.epoch!==p.epoch||d.workspaceId!==workspaceId)fail();
    if(typeof signature!=='string'||!/^[0-9a-f]{128}$/.test(signature))fail();
    if(!verify('sha256',Buffer.from(canonical(p)),{key:validKey(d.publicKey),dsaEncoding:'ieee-p1363'},Buffer.from(signature,'hex')))fail();
    for(const [k,expires] of nonces)if(expires<now())nonces.delete(k);
    const key=p.deviceId+':'+p.nonce;if(nonces.has(key))fail(409);
    if(nonces.size>=10000)fail(429);
    nonces.set(key,now()+300000);
    return d;
  }
  const server=http.createServer(async(req,res)=>{
    const respond=(status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(type==='application/json'?JSON.stringify(body):body);};
    try{
      if(req.headers.host!==new URL(origin).host)fail();
      if(req.headers.origin&&req.headers.origin!==origin)fail();
      if(req.method==='GET'&&['/','/browser.js','/protocol.js'].includes(req.url)){
        const name=req.url==='/'?'browser.html':req.url.slice(1);
        return respond(200,await readFile(new URL(name,import.meta.url)),name.endsWith('.html')?'text/html':'text/javascript');
      }
      const match=req.url?.match(/^\/v1\/workspaces\/([0-9a-f-]{36})\/layouts\/([0-9a-f-]{36})\/(read|write|invite|revoke)$/);
      const special=['/v1/pair','/v1/recover'].includes(req.url);
      if(req.method!=='POST'||(!match&&!special))fail(404);
      if(req.headers['content-type']!=='application/json')fail(400);
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)fail(413);chunks.push(chunk);}
      let envelope;try{envelope=parseStrict(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{fail(400);}
      if(!envelope||Object.keys(envelope).sort().join(',')!=='body,proof,signature'||!envelope.body||typeof envelope.body!=='object'||Array.isArray(envelope.body))fail(400);
      const body=envelope.body;
      if(special){
        const recovery=req.url==='/v1/recover',registry=recovery?recoveries:invitations;
        const entry=typeof body.token==='string'?registry.get(hash(body.token)):null;
        if(!entry||entry.expires<now())fail();
        const ws=workspaces.get(entry.workspaceId);if(!ws)fail();
        const publicKey=recovery?body.publicKey:entry.publicKey;
        if(!recovery&&(body.deviceId!==entry.deviceId||fp(body.publicKey)!==fp(publicKey)))fail();
        if(devices.has(body.deviceId)||!id(body.deviceId))fail();
        authenticate(envelope,req,req.url,recovery?'recover':'pair',entry.workspaceId,ws.layoutId,
          {publicKey,workspaceId:entry.workspaceId,epoch:1});
        if(envelope.proof.deviceId!==body.deviceId)fail();
        // Synchronous critical section after crypto verification: no await between consume/revoke/register.
        if(recovery){for(const d of devices.values())if(d.workspaceId===entry.workspaceId){d.revoked=true;d.epoch++;}
          for(const [k,v] of invitations)if(v.workspaceId===entry.workspaceId)invitations.delete(k);}
        const result=register(entry.workspaceId,{deviceId:body.deviceId,publicKey},recovery?'owner':entry.scope);
        registry.delete(hash(body.token));return respond(200,result);
      }
      const [,workspaceId,layoutId,operation]=match;
      const d=authenticate(envelope,req,req.url,operation,workspaceId,layoutId);
      const ws=workspaces.get(workspaceId);if(!ws||ws.layoutId!==layoutId)fail();
      const required={read:0,write:1,invite:2,revoke:2}[operation];
      if(scopes.indexOf(d.scope)<required)fail();
      if(operation==='read')return respond(200,{value:ws.value,writes:ws.writes});
      if(operation==='write'){
        if(typeof body.value!=='string'||body.value.length>1000)fail(400);
        ws.value=body.value;ws.writes++;return respond(200,{writes:ws.writes});
      }
      if(operation==='invite')return respond(200,invite(workspaceId,body));
      const target=devices.get(body.deviceId);if(!target||target.workspaceId!==workspaceId)fail();
      target.revoked=true;target.epoch++;return respond(200,{revoked:true});
    }catch(e){if(!res.headersSent)respond(e.status??400,{error:'DENIED'});}
  });
  server.requestTimeout=5000;server.headersTimeout=5000;server.maxConnections=32;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;
  return {origin,close:()=>new Promise(resolve=>server.close(resolve)),
    // In-process test operator only: these are NOT HTTP/admin endpoints.
    bootstrap(workspaceId,layoutId,owner){if(workspaces.has(workspaceId)||!id(workspaceId)||!id(layoutId))fail();workspaces.set(workspaceId,{layoutId,value:'private-fixture',writes:0});return register(workspaceId,owner,'owner');},
    issueRecovery(workspaceId){if(!workspaces.has(workspaceId))fail();for(const [k,v] of recoveries)if(v.workspaceId===workspaceId)recoveries.delete(k);
      const token=secret();recoveries.set(hash(token),{workspaceId,expires:now()+600000});return token;},
    inspect(workspaceId){return structuredClone(workspaces.get(workspaceId));}};
}
