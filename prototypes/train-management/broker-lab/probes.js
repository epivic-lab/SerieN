// Run only out of band by the test supervisor, under the broker UID. Never an HTTP endpoint.
import pg from 'pg';
import tls from 'node:tls';
import {readFile} from 'node:fs/promises';
import {transaction} from './transport.js';
const cfg=JSON.parse(await readFile('/secrets/config.json','utf8'));
const bindings=Object.values(cfg.devices),a=bindings[0],b=bindings.find(x=>x.workspaceId!==a.workspaceId);
const options=x=>({host:'db',port:5432,database:'postgres',user:x.principal,password:cfg.credentials[x.principal].password,ssl:{ca:cfg.ca,rejectUnauthorized:true},connectionTimeoutMillis:1500});
const results=[];
async function check(name,options,expect,action=async c=>(await c.query('SELECT session_user AS actor')).rows[0]) {
 const client=new pg.Client(options);let result,error;
 client.on('error',()=>{});
 try{await client.connect();result=await action(client);}catch(e){error=e;}
 finally{await client.end().catch(()=>{});}
 if(expect==='success'&&error||expect!=='success'&&!error)throw Error('PROBE_FAILED_'+name);
 results.push({test:name,result:'PASS',accepted:!error,code:error?.code??error?.message??null,observed:result??null});
}
await check('password SCRAM and TLS CA hostname',options(a),'success',async c=>(await c.query('SELECT session_user AS actor,ssl,version,cipher FROM pg_stat_ssl WHERE pid=pg_backend_pid()')).rows[0]);
await check('wrong password rejected',{...options(a),password:'invalid-laboratory-password'},'denied');
await check('plaintext rejected',{...options(a),ssl:false},'denied');
await check('wrong CA rejected',{...options(a),ssl:{ca:cfg.wrongCA,rejectUnauthorized:true}},'denied');
await check('wrong expected hostname rejected',{...options(a),ssl:{ca:cfg.ca,rejectUnauthorized:true,checkServerIdentity:(_,cert)=>tls.checkServerIdentity('wrong.invalid',cert)}},'denied');
await check('session_user different from lease rejected',options(b),'denied',c=>transaction(c,a.principal,'1',[]));
for(const sql of ['SET ROLE serien_tm_authorizer','CREATE ROLE forbidden_test_role','SELECT * FROM serien_capability.devices','UPDATE serien_capability.devices SET scope=\'owner\'','SELECT * FROM public.layout_snapshots'])await check('SQL privilege denied: '+sql.split(' ')[0],options(a),'denied',c=>c.query(sql));
const redeemer=Object.values(cfg.redeemers)[0];
for(const query of ["CREATE ROLE forbidden_redeemer_role","SET ROLE serien_tm_control","SELECT serien_capability.complete_device_job(NULL::uuid)","UPDATE serien_capability.control_bindings SET max_scope='owner'"])await check('redeemer privilege denied: '+query.split(' ')[0],options(redeemer),'denied',c=>c.query(query));
process.stdout.write(JSON.stringify(results)+'\n');
