// Test-only client copied into the private runtime by the supervisor, not an HTTP endpoint.
import pg from 'pg';
import {readFile} from 'node:fs/promises';
let wire='';for await(const part of process.stdin)wire+=part;
const r=JSON.parse(wire),cfg=JSON.parse(await readFile('/secrets/config.json','utf8'));
if(!/^n9_device_[0-9]+$/.test(r.principal)||!/^n9_device_[0-9]+$/.test(r.other))throw Error('TEST_PRINCIPAL');
const c=new pg.Client({host:'db',port:5432,database:'postgres',user:r.principal,password:cfg.credentials[r.principal].password,ssl:{ca:cfg.ca,rejectUnauthorized:true},connectionTimeoutMillis:1500});
c.on('error',()=>{});await c.connect();const tests=[];
try{
 for(const query of ['SELECT * FROM public.stock_items',"UPDATE serien_capability.devices SET scope='owner'",'CREATE ROLE forbidden_client_role','SET ROLE serien_tm_executor','SET ROLE '+r.other,'ALTER ROLE '+r.principal+' BYPASSRLS','GRANT serien_tm_authorizer TO '+r.principal,'SELECT serien_capability.authorize($1,$2,true)']){
  let code;try{await c.query(query,query.includes('$1')?[r.A,r.L]:undefined);}catch(e){code=e.code;}
  if(code!=='42501')throw Error('ACL_PROBE_FAILED');tests.push({operation:query.split(' ')[0],stage:'SQL ACL',code});
 }
 for(const [name,text,values] of [['revoke','SELECT serien_capability.revoke_device($1,$2)',[r.A,r.L]],['approve','SELECT serien_capability.approve_device_job($1,$2::jsonb,$3)',[r.L,{},'owner']]]){
  let code;try{await c.query(text,values);}catch(e){code=e.code;}
  if(code!=='42501')throw Error('CONTROL_ACL_PROBE_FAILED');tests.push({operation:name,stage:'SQL control ACL',code});
 }
 await c.query("SELECT set_config('request.jwt.claim.sub',$1,false)",['00000000-0000-4000-8000-000000000001']);
 await c.query("SELECT set_config('app.workspace_id',$1,false)",[r.B]);
 await c.query('SET ROLE serien_tm_worker');
 const identity=(await c.query('SELECT session_user,current_user')).rows[0];
 if(identity.session_user!==r.principal)throw Error('IDENTITY_CHANGED');
 let code,message;try{await c.query('SELECT serien_capability.read_head($1,$2)',[r.B,r.LB]);}catch(e){code=e.code;message=e.message;}
 if(message!=='FORBIDDEN')throw Error('GUC_SCOPE_BYPASS');
 tests.push({operation:'GUC/worker role',stage:'SQL authorization',identity,code,message});
}finally{await c.end();}
process.stdout.write(JSON.stringify(tests));
