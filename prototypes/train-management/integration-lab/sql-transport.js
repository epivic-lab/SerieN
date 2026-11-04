// LAB transport: local Docker Unix socket only, fixed container, real LOGIN/session_user.
// Docker is a supervisor privilege: this process is NOT an acceptable hosted worker boundary.
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {prepare} from '../transaction-core/envelope.js';
import {isUUID} from '../capability-gateway/protocol.js';
const q=x=>"'"+String(x).replaceAll("'","''")+"'";
const codes=['FORBIDDEN','NOT_FOUND','REVISION_CONFLICT','IDEMPOTENCY_KEY_REUSED','INTEGRITY_ERROR','INCOMPATIBLE_SNAPSHOT','PAYLOAD_TOO_LARGE','RESPONSE_TOO_LARGE','INVALID_PAGE','RATE_LIMITED','QUOTA_EXCEEDED','INVALID_ENVELOPE','INVALID_STATE_PROFILE','DIGEST_OR_CANONICAL_MISMATCH'];
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
export const dockerArgs=['--host=unix:///var/run/docker.sock'];
export class Session {
 constructor(container,role) {
  if(!/^serien-6a6-[a-f0-9]+$/.test(container)||!/^lab_[a-f0-9]{16}$/.test(role))throw Error('FORBIDDEN');
  this.role=role;this.tail=Promise.resolve();this.pending=null;this.closed=false;
  this.child=spawn('docker',[...dockerArgs,'exec','-i',container,'psql','-XqAt','-U',role,'-d','postgres','-v','ON_ERROR_STOP=1'],{env,stdio:['pipe','pipe','pipe']});
  this.child.stdout.setEncoding('utf8');this.child.stderr.setEncoding('utf8');
  this.child.stdout.on('data',s=>{if(!this.pending)return;this.pending.out+=s;if(this.pending.out.includes(this.pending.marker+'\n')){const p=this.pending;this.pending=null;clearTimeout(p.timer);try{p.resolve(JSON.parse(p.out.slice(0,p.out.indexOf(p.marker)).trim()));}catch{p.reject(Error('RETRYABLE_UNAVAILABLE'));}}});
  this.child.stderr.on('data',s=>{if(this.pending)this.pending.err=(this.pending.err+s).slice(-8192);});
  this.child.on('error',()=>this.finish());this.child.on('exit',()=>this.finish());
  this.child.stdin.on('error',()=>this.finish());
 }
 finish(){this.closed=true;if(this.pending){const p=this.pending;this.pending=null;clearTimeout(p.timer);p.reject(Error(codes.find(c=>new RegExp('ERROR:  '+c+'(?:\\s|$)').test(p.err))??'RETRYABLE_UNAVAILABLE'));}}
 query(expression) {
  const work=()=>new Promise((resolve,reject)=>{
   if(this.closed)return reject(Error('RETRYABLE_UNAVAILABLE'));
   const marker='COMMITTED_'+randomUUID().replaceAll('-','');
   const timer=setTimeout(()=>{this.child.kill();this.finish();},8000);
   this.pending={resolve,reject,marker,out:'',err:'',timer};
   // SELECT is buffered until COMMIT completes and a subsequent psql marker arrives.
   this.child.stdin.write(`BEGIN; SET LOCAL statement_timeout='4s'; SET LOCAL lock_timeout='3s'; SELECT json_build_object('sessionUser',session_user,'pid',pg_backend_pid(),'value',(${expression})); COMMIT;\n\\echo ${marker}\n`);
  });
  const result=this.tail.then(work);this.tail=result.catch(()=>{});return result;
 }
 async close(){if(!this.closed){this.child.stdin.end();await new Promise(r=>{this.child.once('exit',r);setTimeout(()=>{this.child.kill();r();},1000).unref();});}}
}
const integer=(v,nullable=false)=>{if(nullable&&v===null)return 'NULL';if(typeof v!=='string'||!/^([0-9]|[1-9][0-9]*)$/.test(v)||BigInt(v)>9223372036854775806n)throw Error('INVALID_REQUEST');return q(v)+'::bigint';};
const fields=(b,want)=>{if(Object.keys(b).sort().join(',')!==want.split(',').sort().join(','))throw Error('INVALID_REQUEST');};
export function transport(container,bindings,{observe=()=>{},before=async()=>{},after=async()=>{}}={}) {
 const sessions=new Map();
 return {
  async execute(c,b) {
   const binding=bindings.get(c.deviceId);
   if(!binding||binding.workspaceId!==c.workspaceId||binding.layoutId!==c.layoutId)throw Error('FORBIDDEN');
   const w=q(binding.workspaceId),l=q(binding.layoutId);let expression;
   switch(c.operation) {
    case 'ReadHead':fields(b,'');expression=`serien_capability.read_head(${w},${l})`;break;
    case 'ReadSnapshot':fields(b,'revision');expression=`serien_capability.read_snapshot(${w},${l},${integer(b.revision)})`;break;
    case 'ListHistory':fields(b,'after,pageSize,through');expression=`serien_capability.list_history(${w},${l},${integer(b.after)},${integer(b.pageSize)}::integer,${integer(b.through,true)})`;break;
    case 'ReadReceipt':fields(b,'requestId');if(!isUUID(b.requestId))throw Error('INVALID_REQUEST');expression=`serien_capability.read_receipt(${w},${l},${q(b.requestId)})`;break;
    case 'SaveCheckpoint':{const p=prepare(JSON.stringify(b),c);if(b.operation!=='SaveCheckpoint')throw Error('INVALID_REQUEST');expression=`serien_capability.save_checkpoint(${q(c.requestId)},${q(p.wire)},${q(p.digest)})`;break;}
    case 'RecoverRevision':fields(b,'expectedRevision,sourceRevision');expression=`serien_capability.recover_revision(${w},${l},${integer(b.expectedRevision)},${integer(b.sourceRevision)},${q(c.requestId)})`;break;
    default:throw Error('INVALID_REQUEST');
   }
   await before(c);
   let session=sessions.get(binding.role);if(!session||session.closed){session=new Session(container,binding.role);sessions.set(binding.role,session);}
   const r=await session.query(expression);
   if(r.sessionUser!==binding.role)throw Error('FORBIDDEN');
   observe({operation:c.operation,deviceId:c.deviceId,sessionUser:r.sessionUser,pid:r.pid});
   await after(c,r.value);return r.value;
  },async close(){await Promise.all([...sessions.values()].map(s=>s.close()));},
 };
}
