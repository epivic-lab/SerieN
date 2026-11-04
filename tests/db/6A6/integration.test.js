// Real Chromium -> actual HTTP proof -> fixed device LOGIN -> PG17 -> committed reply.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import {startLab} from '../../../prototypes/train-management/integration-lab/gateway.js';
import {transport,dockerArgs} from '../../../prototypes/train-management/integration-lab/sql-transport.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE??'/workspace/work/6A6/tools/node_modules/playwright');
const [container,out]=process.argv.slice(2);assert.match(container,/^serien-6a6-[a-f0-9]+$/);
const profiles=JSON.parse(await readFile(out+'/profiles.json'));
const [A,B]=Object.keys(profiles),L=profiles[A].layoutId,LB=profiles[B].layoutId;
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
const run=promisify(execFile),q=x=>"'"+String(x).replaceAll("'","''")+"'";
async function sql(query,role='postgres') {
 // Query via stdin, no shell interpolation; privileged path exists only in this test operator.
 const {spawn}=await import('node:child_process');
 return new Promise((resolve,reject)=>{const p=spawn('docker',[...dockerArgs,'exec','-i',container,'psql','-XqAt','-U',role,'-d','postgres','-v','ON_ERROR_STOP=1'],{env});let stdout='',stderr='';p.stdout.on('data',s=>stdout+=s);p.stderr.on('data',s=>stderr+=s);p.on('error',reject);p.on('close',code=>code?reject(Error(stderr)):resolve(stdout.trim()));p.stdin.end(query);});
}
const bindings=new Map(),logs=[],connections=[],rows=[],metrics=[],wireMetrics=[],states={};
let beforeHook=async()=>{},afterHook=async()=>{};
const t=transport(container,bindings,{observe:r=>connections.push(r),before:c=>beforeHook(c),after:(c,r)=>afterHook(c,r)});
async function provision(d,recovery=false) {
 const role='lab_'+randomUUID().replaceAll('-','').slice(0,16);
 const revoke=recovery?`SET LOCAL ROLE serien_tm_authorizer; UPDATE serien_capability.devices SET revoked_at=now() WHERE workspace_id=${q(d.workspaceId)}; RESET ROLE;`:'';
 await sql(`BEGIN; ${revoke} CREATE ROLE ${role} LOGIN IN ROLE serien_tm_worker; INSERT INTO serien_capability.worker_bindings VALUES(${q(role)},${q(d.workspaceId)}); INSERT INTO serien_capability.devices(id,workspace_id,public_key,scope) VALUES(${q(d.deviceId)},${q(d.workspaceId)},${q(JSON.stringify(d.publicKey))},${q(d.scope)}); INSERT INTO serien_capability.device_locks(workspace_id,device_id) VALUES(${q(d.workspaceId)},${q(d.deviceId)}); INSERT INTO serien_capability.device_bindings(role_name,workspace_id,device_id) VALUES(${q(role)},${q(d.workspaceId)},${q(d.deviceId)}); COMMIT;`);
 bindings.set(d.deviceId,{role,workspaceId:d.workspaceId,layoutId:d.layoutId});return {};
}
const g=await startLab({provision:d=>provision(d),recover:d=>provision(d,true),revoke:id=>sql(`SET ROLE serien_tm_authorizer; UPDATE serien_capability.devices SET revoked_at=now() WHERE id=${q(id)};`),execute:(c,b)=>t.execute(c,b),emit:r=>logs.push(r)});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const contexts=[];
async function device(scope,w=A,l=L,paired=true,engine=browser) {
 const context=await engine.newContext();contexts.push(context);const page=await context.newPage();page.on('request',r=>{if(r.method()==='POST')wireMetrics.push({operation:new URL(r.url()).pathname.split('/').at(-1),requestBytes:r.postDataBuffer()?.length??0});});await page.goto(g.origin);await page.waitForFunction(()=>window.lab);
 const d=await page.evaluate(()=>lab.create());Object.assign(d,{context,page,workspaceId:w,layoutId:l,scope});
 if(paired){const token=g.approve({...d});const r=await call(d,'pair',{token,deviceId:d.deviceId,publicKey:d.publicKey});assert.equal(r.status,200);}
 return d;
}
async function call(d,op,b={},overrides={},w=d.workspaceId,l=d.layoutId) {
 const start=performance.now();const r=await d.page.evaluate(async({w,l,op,b,overrides})=>lab.call(w,l,op,b,overrides),{w,l,op,b,overrides});
 metrics.push({operation:op,status:r.status??0,latencyMs:performance.now()-start,bodyBytes:Buffer.byteLength(JSON.stringify(b)),responseBytes:Buffer.byteLength(JSON.stringify(r.body??{}))});return r;
}
async function envelope(d,op,b={},overrides={}){return d.page.evaluate(({w,l,op,b,overrides})=>lab.envelope(w,l,op,b,overrides),{w:d.workspaceId,l:d.layoutId,op,b,overrides});}
const send=(d,e)=>d.page.evaluate(e=>lab.send(e),e);
async function durable() {
 const tables=['public.stock_models','public.stock_items','public.consists','public.consist_members','public.layouts','public.layout_segments','public.layout_snapshots','public.operation_receipts','serien_capability.session_heads','public.layout_placements','public.loose_stock_placements'];const value=JSON.parse(await sql('select jsonb_build_object('+tables.map(table=>q(table)+",(select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from "+table+' t)').join(',')+');'));
 const hash=createHash('sha256').update(JSON.stringify(value)).digest('hex');states[hash]=value;return hash;
}
async function check(name,fn,{unchanged=false}={}) {
 const initial=await durable();const observed=await fn();const final=await durable();if(unchanged)assert.equal(final,initial,name);
 rows.push({test:name,initial,final,observed:observed??true,result:'PASS'});console.log(name+': PASS');return observed;
}
async function denied(name,fn,code='FORBIDDEN',http=403) {
 return check(name,async()=>{
  const auth=async()=>sql("select jsonb_build_object('devices',(select jsonb_agg(to_jsonb(x) order by id) from serien_capability.devices x),'bindings',(select jsonb_agg(to_jsonb(x) order by role_name) from serien_capability.device_bindings x),'workers',(select jsonb_agg(to_jsonb(x) order by role_name) from serien_capability.worker_bindings x),'workspaces',(select jsonb_agg(to_jsonb(x) order by id) from serien_capability.workspaces x));");
  const before=await auth();const r=await fn();assert.deepEqual(r,{status:http,body:{error:code}});assert.equal(await auth(),before);return {...r,authorizationRowsSHA256:createHash('sha256').update(before).digest('hex')};
 },{unchanged:true});
}
const saveBody=(rev,day=0)=>({operation:'SaveCheckpoint',workspaceId:A,layoutId:L,expectedRevision:String(rev),recoverySourceRevision:null,state:{...structuredClone(profiles[A]),ui:{...profiles[A].ui,day}}});
const head=async()=>Number(await sql(`select revision from serien_capability.session_heads where layout_id=${q(L)};`));
const waitFor=async(fn)=>{const until=Date.now()+10000;while(Date.now()<until){if(await fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('test rendezvous timeout');};
try {
 const owner=await check('01 first controlled owner pairing',()=>device('owner'));
 // Do not serialize Playwright objects into evidence.
 rows.at(-1).observed={deviceId:owner.deviceId,scope:'owner'};
 const editor=await check('02 second device editor pairing',()=>device('editor'));rows.at(-1).observed={deviceId:editor.deviceId,scope:'editor'};
 const reader=await device('reader'),other=await device('owner',B,LB),unknown=await device('reader',A,L,false),stale=await device('editor'),revoked=await device('editor');
 await check('03 non-exportable CryptoKey persisted across reload',async()=>{const a=await owner.page.evaluate(()=>lab.check());assert.equal(a.extractable,false);assert.equal(a.exportRejected,true);await owner.page.reload();await owner.page.waitForFunction(()=>window.lab);assert.deepEqual(await owner.page.evaluate(()=>lab.check()),a);return a;},{unchanged:true});
 await check('04 signed empty head read',async()=>{const r=await call(owner,'ReadHead');assert.equal(r.status,200);return r;},{unchanged:true});
 await denied('05 no authorized capability',()=>call(unknown,'ReadHead'));
 const e=await envelope(owner,'ReadHead');e.signature='0'.repeat(128);await denied('06 forged actual HTTP signature',()=>send(owner,e));
 const replay=await envelope(owner,'ReadHead');assert.equal((await send(owner,replay)).status,200);await denied('07 actual HTTP nonce replay',()=>send(owner,replay),'REPLAY',409);
 await denied('08 cross-workspace signed request',()=>call(owner,'ReadHead',{}, {},B,LB));
 await check('09 reader signed read',async()=>{const r=await call(reader,'ReadHead');assert.equal(r.status,200);return r;},{unchanged:true});
 await denied('09 reader cannot save',()=>call(reader,'SaveCheckpoint',saveBody(0)));
 await denied('09 reader cannot recover',()=>call(reader,'RecoverRevision',{expectedRevision:'0',sourceRevision:'1'}));
 await sql(`SET ROLE serien_tm_authorizer; UPDATE serien_capability.devices SET epoch=epoch+1 WHERE id=${q(stale.deviceId)};`);
 await denied('10 SQL stale device epoch despite valid gateway proof',()=>call(stale,'ReadHead'));
 await denied('10 SQL stale epoch cannot save',()=>call(stale,'SaveCheckpoint',saveBody(0)));
 const expired=await device('editor');await sql(`SET ROLE serien_tm_authorizer; UPDATE serien_capability.devices SET expires_at=now()-interval '1 second' WHERE id=${q(expired.deviceId)};`);
 await denied('10 expired SQL device denies read',()=>call(expired,'ReadHead'));
 await denied('10 expired SQL device denies write',()=>call(expired,'SaveCheckpoint',saveBody(0)));
 await sql(`SET ROLE serien_tm_authorizer; UPDATE serien_capability.workspaces SET auth_epoch=auth_epoch+1 WHERE id=${q(A)};`);
 await denied('10 stale SQL workspace epoch denies read',()=>call(owner,'ReadHead'));
 await denied('10 stale SQL workspace epoch denies write',()=>call(owner,'SaveCheckpoint',saveBody(0)));
 await sql(`SET ROLE serien_tm_authorizer; UPDATE serien_capability.workspaces SET auth_epoch=auth_epoch-1 WHERE id=${q(A)};`);
 // Revoke directly in SQL to prove the gateway cache cannot authorize a stale DB binding.
 assert.equal((await call(revoked,'ReadHead')).status,200);const oldPid=connections.at(-1).pid;
 await sql(`SET ROLE serien_tm_authorizer; UPDATE serien_capability.devices SET revoked_at=now() WHERE id=${q(revoked.deviceId)};`);
 await denied('11 revoked live SQL session denies read',()=>call(revoked,'ReadHead'));
 assert.equal(await sql(`select count(*) from pg_stat_activity where pid=${oldPid};`),'0');
 await denied('11 revoked device denies save',()=>call(revoked,'SaveCheckpoint',saveBody(0)));
 // Token grants are server-bound: body scope injection cannot escalate pairing.
 const unpaired=await device('reader',A,L,false);const token=g.approve({...unpaired});
 await denied('12 forged scope in pairing',()=>call(unpaired,'pair',{token,deviceId:unpaired.deviceId,publicKey:unpaired.publicKey,scope:'owner'}));
 assert.equal((await call(unpaired,'pair',{token,deviceId:unpaired.deviceId,publicKey:unpaired.publicKey})).status,200);
 const req=randomUUID(),body=saveBody(0);
 const first=await check('13 first signed SaveCheckpoint real commit',async()=>{const r=await call(owner,'SaveCheckpoint',body,{request_id:req});assert.equal(r.status,200);assert.equal(r.body.revision,'1');return r.body;});
 await check('14 browser independently verifies identical persisted snapshot',async()=>{const r=await call(owner,'ReadSnapshot',{revision:'1'});assert.equal(r.verified,true);assert.deepEqual(r.body.state,body.state);return {stateDigest:r.body.stateDigest,verified:r.verified};},{unchanged:true});
 await check('15 subsequent save',async()=>{const r=await call(editor,'SaveCheckpoint',saveBody(1,1));assert.equal(r.status,200);assert.equal(r.body.revision,'2');return r.body;});
 await check('16 retry identical request id after newer head',async()=>{const r=await call(owner,'SaveCheckpoint',body,{request_id:req});assert.deepEqual(r.body,first);return r.body;},{unchanged:true});
 const different=saveBody(0,1);await denied('16 reused id different digest',()=>call(owner,'SaveCheckpoint',different,{request_id:req}),'IDEMPOTENCY_KEY_REUSED',409);
 await check('17 compact receipt owned by actor',async()=>{const r=await call(owner,'ReadReceipt',{requestId:req});assert.equal(r.status,200);assert.deepEqual(r.body,first);assert.equal('envelope' in r.body,false);return {bytes:JSON.stringify(r.body).length};},{unchanged:true});
 await denied('17 another actor cannot read receipt',()=>call(editor,'ReadReceipt',{requestId:req}),'NOT_FOUND',404);
 // A real lost HTTP response AFTER COMMIT: abort the browser fetch while server delivery is held.
 await check('18 lost HTTP response then idempotent retry',async()=>{
  const rid=randomUUID(),b=saveBody(2);let reached=false,release;const gate=new Promise(r=>release=r);
  afterHook=async c=>{if(c.requestId===rid){reached=true;await gate;}};
  await owner.page.evaluate(async({w,l,b,rid})=>{const e=await lab.envelope(w,l,'SaveCheckpoint',b,{request_id:rid});window.abort6=new AbortController();window.pending6=fetch(e.proof.path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(e),signal:abort6.signal}).then(()=>false).catch(e=>e.name);},{w:A,l:L,b,rid});
  await waitFor(()=>reached);assert.equal(await head(),3);assert.equal(await owner.page.evaluate(async()=>{abort6.abort();return pending6;}),'AbortError');release();afterHook=async()=>{};
  const r=await call(owner,'SaveCheckpoint',b,{request_id:rid});assert.equal(r.status,200);assert.equal(r.body.revision,'3');assert.equal(await head(),3);return {httpAbort:true,retryRevision:r.body.revision};
 });
 await check('19 two browsers simultaneous CAS exactly one winner',async()=>{
  let entered=0,release;const gate=new Promise(r=>release=r);beforeHook=async c=>{if(c.operation==='SaveCheckpoint'){entered++;await gate;}};
  const a=call(owner,'SaveCheckpoint',saveBody(3)),b=call(editor,'SaveCheckpoint',saveBody(3,1));await waitFor(()=>entered===2);
  const blocker=sql(`BEGIN; SELECT workspace_id FROM serien_capability.workspace_locks WHERE workspace_id=${q(A)} FOR UPDATE; SELECT pg_sleep(2); COMMIT;`);
  await waitFor(async()=>Number(await sql("select count(*) from pg_stat_activity where usename='postgres' and wait_event='PgSleep';"))>0);
  release();beforeHook=async()=>{};
  const roles=[owner,editor].map(d=>q(bindings.get(d.deviceId).role)).join(',');
  await waitFor(async()=>Number(await sql(`select count(*) from pg_stat_activity where usename in (${roles}) and wait_event_type='Lock';`))===2);
  await blocker;
  const results=await Promise.all([a,b]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(await head(),4);return results.map(r=>({status:r.status,revision:r.body.revision,error:r.body.error}));
 });
 await check('20 recovery creates revision, preserves source',async()=>{const r=await call(owner,'RecoverRevision',{expectedRevision:'4',sourceRevision:'1'});assert.equal(r.status,200);assert.equal(r.body.revision,'5');const snap=await call(owner,'ReadSnapshot',{revision:'1'});assert.equal(snap.verified,true);return r.body;});
 await check('21 history keyset pagination',async()=>{const found=[];let after='0',through=null;do{const r=await call(owner,'ListHistory',{after,pageSize:'2',through});assert.equal(r.status,200);const b=r.body;through=b.throughRevision??b.through;const entries=b.entries??b.items??b.history;assert.ok(Array.isArray(entries),JSON.stringify(b));found.push(...entries.map(x=>x.revision));after=entries.at(-1)?.revision??after;if(entries.length<2)break;}while(found.length<10);assert.deepEqual(found,['1','2','3','4','5']);return found;},{unchanged:true});
 const original=await sql(`select payload from public.layout_snapshots where layout_id=${q(L)} and revision=2;`);
 await sql(`BEGIN; ALTER TABLE public.layout_snapshots DISABLE TRIGGER USER; UPDATE public.layout_snapshots SET payload=jsonb_set(payload,'{ui,day}','0') WHERE layout_id=${q(L)} AND revision=2; ALTER TABLE public.layout_snapshots ENABLE TRIGGER USER; COMMIT;`);
 await denied('22 corrupted snapshot not returned',()=>call(owner,'ReadSnapshot',{revision:'2'}),'INTEGRITY_ERROR',422);
 await denied('22 corrupted historical recovery rejected',()=>call(owner,'RecoverRevision',{expectedRevision:'5',sourceRevision:'2'}),'INTEGRITY_ERROR',422);
 await sql(`BEGIN; ALTER TABLE public.layout_snapshots DISABLE TRIGGER USER; UPDATE public.layout_snapshots SET payload=${q(original)}::jsonb WHERE layout_id=${q(L)} AND revision=2; ALTER TABLE public.layout_snapshots ENABLE TRIGGER USER; COMMIT;`);
 const bad=saveBody(5);bad.state.topologyHash='f'.repeat(64);
 await check('23 incompatible topology rejected atomically',async()=>{const r=await call(owner,'SaveCheckpoint',bad);assert.ok([400,422].includes(r.status));assert.deepEqual(Object.keys(r.body),['error']);return r;},{unchanged:true});
 await sql(`update serien_capability.api_limits set max_checkpoints=5 where workspace_id=${q(A)};`);
 await denied('24 quota rejects without losing confirmed saves',()=>call(owner,'SaveCheckpoint',saveBody(5)),'QUOTA_EXCEEDED',429);
 await check('24 quota still permits previous idempotent retry',async()=>{const r=await call(owner,'SaveCheckpoint',body,{request_id:req});assert.deepEqual(r.body,first);return r.status;},{unchanged:true});
 await sql(`update serien_capability.api_limits set max_checkpoints=100,max_storage_bytes=1 where workspace_id=${q(A)};`);
 await denied('24 storage quota rejects and preserves history',()=>call(owner,'SaveCheckpoint',saveBody(5)),'QUOTA_EXCEEDED',429);
 await sql(`update serien_capability.api_limits set max_storage_bytes=16777216 where workspace_id=${q(A)};`);
 await check('25 browser rejects corrupted actual HTTP response',async()=>{
  afterHook=async(c,r)=>{if(c.operation==='ReadSnapshot')r.state.ui.day=r.state.ui.day===0?1:0;};
  await assert.rejects(call(owner,'ReadSnapshot',{revision:'1'}),/INTEGRITY_ERROR/);afterHook=async()=>{};return {browserRejected:true};
 },{unchanged:true});
 const inFlight=await device('editor');
 await check('26 revocation commits while HTTP request is in flight',async()=>{
  let reached=false,release;const gate=new Promise(r=>release=r);beforeHook=async c=>{if(c.deviceId===inFlight.deviceId){reached=true;await gate;}};
  const pending=call(inFlight,'SaveCheckpoint',saveBody(5));await waitFor(()=>reached);await g.revoke(inFlight.deviceId);release();beforeHook=async()=>{};
  const r=await pending;assert.deepEqual(r,{status:403,body:{error:'FORBIDDEN'}});return r;
 },{unchanged:true});
 await denied('26 revoked device subsequent read',()=>call(inFlight,'ReadHead'));
 await denied('26 revoked device subsequent write',()=>call(inFlight,'SaveCheckpoint',saveBody(5)));
 // Real SQL exception vs backend termination: distinct faults, same atomicity oracle.
 await sql(`CREATE SCHEMA lab_fault; CREATE TABLE lab_fault.control(mode text); INSERT INTO lab_fault.control VALUES('error'); CREATE FUNCTION lab_fault.inject() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN IF (SELECT mode FROM lab_fault.control)='error' THEN RAISE EXCEPTION 'LAB_SQL_FAULT'; ELSE PERFORM pg_sleep(3); END IF; RETURN NEW; END $$; REVOKE ALL ON SCHEMA lab_fault FROM PUBLIC; REVOKE ALL ON FUNCTION lab_fault.inject() FROM PUBLIC; CREATE TRIGGER lab_fault AFTER INSERT ON public.layout_snapshots FOR EACH ROW EXECUTE FUNCTION lab_fault.inject();`);
 await denied('27 real SQL fault after snapshot insert rolls back HTTP save',()=>call(owner,'SaveCheckpoint',saveBody(5)),'RETRYABLE_UNAVAILABLE',503);
 await sql("update lab_fault.control set mode='pause';");
 await check('28 real SQL connection termination rolls back',async()=>{
  const role=bindings.get(editor.deviceId).role;const pending=call(editor,'SaveCheckpoint',saveBody(5));let pid;
  await waitFor(async()=>{pid=await sql(`select pid from pg_stat_activity where usename=${q(role)} and wait_event='PgSleep';`);return Boolean(pid);});
  await sql(`select pg_terminate_backend(${Number(pid)});`);const r=await pending;assert.deepEqual(r,{status:503,body:{error:'RETRYABLE_UNAVAILABLE'}});return {backendTerminated:true,response:r};
 },{unchanged:true});
 await sql("update lab_fault.control set mode='timeout'; CREATE OR REPLACE FUNCTION lab_fault.inject() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN PERFORM pg_sleep(6); RETURN NEW; END $$;");
 await denied('28 statement timeout rolls back without retrying a changed request',()=>call(owner,'SaveCheckpoint',saveBody(5)),'RETRYABLE_UNAVAILABLE',503);
 await sql('DROP TRIGGER lab_fault ON public.layout_snapshots; DROP SCHEMA lab_fault CASCADE;');
 await check('29 browser page termination after commit then retry with persisted key',async()=>{
  const b=saveBody(5),rid=randomUUID();let reached=false,release;const gate=new Promise(r=>release=r);afterHook=async c=>{if(c.requestId===rid){reached=true;await gate;}};
  const pending=call(owner,'SaveCheckpoint',b,{request_id:rid}).catch(()=>null);await waitFor(()=>reached);await owner.page.close();await pending;release();afterHook=async()=>{};
  owner.page=await owner.context.newPage();await owner.page.goto(g.origin);await owner.page.waitForFunction(()=>window.lab);assert.equal((await owner.page.evaluate(()=>lab.check())).deviceId,owner.deviceId);
  const r=await call(owner,'SaveCheckpoint',b,{request_id:rid});assert.equal(r.status,200);assert.equal(r.body.revision,'6');assert.equal(await head(),6);return {pageTerminated:true,revision:r.body.revision,wholeBrowserProcessTermination:'NOT VERIFIED'};
 });
 await check('30 missing browser key has no unsigned fallback',async()=>{await unknown.page.evaluate(()=>lab.lose());await unknown.page.reload();await unknown.page.waitForFunction(()=>window.lab);assert.deepEqual(await call(unknown,'ReadHead'),{missing:true});return {missing:true};},{unchanged:true});
 const linear=await device('editor');
 await check('30 SQL authorized read linearizes before overlapping revoke',async()=>{
  const role=bindings.get(linear.deviceId).role;
  await sql(`CREATE FUNCTION public.lab_pause_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN IF NEW.device_id=${q(linear.deviceId)}::uuid THEN PERFORM pg_sleep(2); END IF; RETURN NEW; END $$; REVOKE ALL ON FUNCTION public.lab_pause_audit() FROM PUBLIC; CREATE TRIGGER lab_pause_audit AFTER INSERT ON serien_capability.audit_events FOR EACH ROW EXECUTE FUNCTION public.lab_pause_audit();`);
  const pending=call(linear,'ReadHead');
  await waitFor(async()=>Number(await sql(`select count(*) from pg_stat_activity where usename=${q(role)} and wait_event='PgSleep';`))===1);
  const revocation=sql(`SET application_name='lab_revoke_overlap'; SET ROLE serien_tm_authorizer; UPDATE serien_capability.devices SET revoked_at=now() WHERE id=${q(linear.deviceId)};`);
  await waitFor(async()=>Number(await sql("select count(*) from pg_stat_activity where application_name='lab_revoke_overlap' and wait_event_type='Lock';"))===1);
  const r=await pending;assert.equal(r.status,200);await revocation;
  await sql('DROP TRIGGER lab_pause_audit ON serien_capability.audit_events; DROP FUNCTION public.lab_pause_audit();');
  return {authorizedRead:200,revokeObservedWaitingOnSQLLock:true};
 },{unchanged:true});
 await denied('30 after overlapping revoke zero new reads',()=>call(linear,'ReadHead'));
 await denied('30 after overlapping revoke zero new writes',()=>call(linear,'SaveCheckpoint',saveBody(6)));
 // Proof expiry/audience/method/path/body digest are checked on actual received envelopes.
 for(const [field,value] of [['issuedAt',Date.now()-240000],['audience','http://invalid.local'],['method','GET'],['path','/wrong'],['epoch',99],['bodyDigest','0'.repeat(64)]])await denied('31 proof '+field+' rejected',()=>call(owner,'ReadHead',{}, {[field]:value}),field==='path'?'NOT_FOUND':'FORBIDDEN',field==='path'?404:403);
 const wrongTarget=await envelope(owner,'ReadHead');await denied('31 signed proof sent to a different actual operation path',()=>owner.page.evaluate(async({e,path})=>{const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(e)});return {status:r.status,body:await r.json()};},{e:wrongTarget,path:`/v1/workspaces/${A}/layouts/${L}/ReadSnapshot`}));
 const mutated=await envelope(owner,'ReadHead');mutated.body={injected:true};await denied('31 altered wire body digest',()=>send(owner,mutated));
 await denied('32 SQL role injection ignored by closed operation schema',()=>call(owner,'ReadHead',{role:'postgres'}),'INVALID_REQUEST',400);
 await denied('32 unknown admin endpoint unavailable',async()=>{const r=await fetch(g.origin+'/admin');return {status:r.status,body:await r.json()};},'NOT_FOUND',404);
 await denied('32 Origin absent is no authentication',async()=>{const r=await fetch(g.origin+`/v1/workspaces/${A}/layouts/${L}/ReadHead`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});return {status:r.status,body:await r.json()};},'INVALID_REQUEST',400);
 await denied('33 oversized request',()=>call(owner,'ReadHead',{pad:'x'.repeat(2097152)}),'PAYLOAD_TOO_LARGE',413);
 await denied('33 excessive history page size',()=>call(owner,'ListHistory',{after:'0',pageSize:'21',through:null}),'INVALID_PAGE',400);
 await sql(`update serien_capability.api_limits set max_response_bytes=100 where workspace_id=${q(A)};`);
 await denied('33 SQL response bound prevents delivery',()=>call(owner,'ReadSnapshot',{revision:'1'}),'RESPONSE_TOO_LARGE',413);
 await sql(`update serien_capability.api_limits set max_response_bytes=262144,device_budget=1 where workspace_id=${q(A)}; delete from serien_capability.api_windows;`);
 assert.equal((await call(reader,'ReadHead')).status,200);await denied('34 DB rate limit and stable retry code',()=>call(reader,'ReadHead'),'RATE_LIMITED',429);
 await sql(`update serien_capability.api_limits set device_budget=60 where workspace_id=${q(A)}; delete from serien_capability.api_windows;`);
 // Same request id in B is independent of A despite shared synthetic legacy owner.
 await check('35 workspace B save independent same request id',async()=>{const b={...saveBody(0),workspaceId:B,layoutId:LB,state:profiles[B]};const r=await call(other,'SaveCheckpoint',b,{request_id:req});assert.equal(r.status,200);assert.equal(r.body.workspaceId,B);return r.body;});
 await check('35 actual Chromium process SIGKILL after commit',async()=>{
  const server=await chromium.launchServer({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  let release;try {
   const engine=await chromium.connect(server.wsEndpoint());const d=await device('editor',A,L,true,engine),rid=randomUUID();let reached=false;const gate=new Promise(r=>release=r);
   afterHook=async c=>{if(c.requestId===rid){reached=true;await gate;}};
   const pending=call(d,'SaveCheckpoint',saveBody(6),{request_id:rid}).catch(()=>null);
   await waitFor(()=>reached);assert.equal(await head(),7);
   server.process().kill('SIGKILL');await pending;release();afterHook=async()=>{};
   assert.equal(await head(),7);assert.equal(await sql(`select count(*) from public.operation_receipts where request_id=${q(rid)} and result->>'actor'=${q(d.deviceId)};`),'1');
   return {signal:'SIGKILL',target:'actual Chromium browser process',revision:'7',receiptCount:1,keyDurabilityAfterProcessCrash:'NOT VERIFIED (incognito context)'};
  }finally{release?.();afterHook=async()=>{};await server.close();}
 });
 // Recovery kit is exact-key bound and one use. Revokes existing SQL devices atomically.
 const recovered=await device('owner',A,L,false);const kit=g.approve({...recovered,recovery:true});
 await check('36 recovery kit approved key',async()=>{const r=await call(recovered,'recover',{token:kit,deviceId:recovered.deviceId,publicKey:recovered.publicKey});assert.equal(r.status,200);return r;},{unchanged:true});
 await denied('36 recovery kit reuse denied',()=>call(recovered,'recover',{token:kit,deviceId:recovered.deviceId,publicKey:recovered.publicKey}));
 await denied('36 old owner denied after recovery',()=>call(owner,'ReadHead'));
 await denied('36 old owner cannot save after recovery',()=>call(owner,'SaveCheckpoint',saveBody(6)));
 await check('37 recovered owner reads previous snapshot',async()=>{const r=await call(recovered,'ReadSnapshot',{revision:'1'});assert.equal(r.verified,true);return {verified:true};},{unchanged:true});
 await check('38 denial ingress rate budget counts malformed requests',async()=>{let r;for(let i=0;i<205;i++)r=await fetch(g.origin+'/no-admin');assert.equal(r.status,429);assert.deepEqual(await r.json(),{error:'RATE_LIMITED'});return {status:429,scope:'single process loopback ingress'};},{unchanged:true});
 await t.close();
 assert.equal(await sql("select count(*) from pg_stat_activity where usename like 'lab_%';"),'0');
 assert.ok(connections.length>10);assert.ok(new Set(connections.map(r=>r.sessionUser)).size>=4);
 assert.ok(!JSON.stringify(logs).includes('privateKey'));assert.ok(logs.every(x=>Object.keys(x).every(k=>['operation','outcome'].includes(k))));
 await writeFile(out+'/results.json',JSON.stringify({result:'PASS',browser:await browser.version(),cases:rows,databaseStates:states,connections,cleanup:'zero lab SQL sessions after close',limitations:['Chromium only','No OS crash/PITR','Incognito key durability after browser process crash is not certified','Local Docker supervisor trust, not hosted worker isolation','No ownerless workspace persistence']},null,2)+'\n');
 await writeFile(out+'/metrics.json',JSON.stringify({method:'Chromium headless real local HTTP; wall time includes Playwright and Docker/psql; JSON UTF-8 operation body/response bytes, not full proof/headers; single run no production throughput claim',samples:metrics,actualWireRequests:wireMetrics},null,2)+'\n');
 await writeFile(out+'/audit.json',JSON.stringify({gateway:logs,database:JSON.parse(await sql("select coalesce(jsonb_agg(to_jsonb(a)),'[]') from serien_capability.audit_events a;"))},null,2)+'\n');
 console.log(`${rows.length} integration checks PASS`);
} finally {await browser.close();await t.close();await g.close();}
