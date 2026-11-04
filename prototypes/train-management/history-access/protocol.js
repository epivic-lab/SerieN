// Isolated server-boundary utilities, no HTTP listener or production configuration.
import { createHash } from 'node:crypto';
import { canonical, isUUID } from '../capability-gateway/protocol.js';
import { parseStrict } from '../capability-gateway/strict-json.js';
export const CANONICAL_VERSION='jcs-profile-v1';
export const stateDigest=state=>createHash('sha256').update(canonical(state)).digest('hex');
export function verifySnapshot(raw,context,maxBytes=262144) {
  if (Buffer.byteLength(raw)>maxBytes) throw Error('RESPONSE_TOO_LARGE');
  const s=parseStrict(raw);
  if(s.canonicalVersion!==CANONICAL_VERSION||s.schemaVersion!==1||s.state.schemaVersion!==1||s.state.engineRevision!==context.engineRevision||s.engineRevision!==context.engineRevision||s.topologyHash!==context.topologyHash||s.state.topologyHash!==context.topologyHash) throw Error('INCOMPATIBLE_SNAPSHOT');
  if(s.state.workspaceId!==context.workspaceId||s.state.layoutId!==context.layoutId) throw Error('FORBIDDEN');
  if(!/^[1-9][0-9]*$/.test(s.revision)||!isUUID(s.snapshotId)||!/^[0-9a-f]{64}$/.test(s.envelopeDigest)||stateDigest(s.state)!==s.stateDigest) throw Error('INTEGRITY_ERROR');
  const refs=s.state.models.map(m=>({modelId:m.id,revision:m.revision,asset:m.asset}));
  if(canonical(refs)!==canonical(s.assetRefs)) throw Error('INTEGRITY_ERROR');
  return s;
}
export class LocalBudget {
  constructor({device=60,workspace=120,windowMs=60000,now=Date.now,maxSubjects=1024}={}) {
    Object.assign(this,{device,workspace,windowMs,now,maxSubjects});this.windows=new Map();
  }
  take(context) {
    const now=this.now();
    for(const [k,v] of this.windows) if(v.until<=now)this.windows.delete(k);
    const keys=[['w:'+context.workspaceId,this.workspace],['d:'+context.workspaceId+':'+context.deviceId,this.device]];
    if(keys.filter(([k])=>!this.windows.has(k)).length+this.windows.size>this.maxSubjects)throw Object.assign(Error('RATE_LIMITED'),{retryAfterMs:this.windowMs});
    let retryAfterMs=0;
    // Count denied/malformed attempts too; this is process-local, independent of SQL rollback.
    for(const [k,cap] of keys){const v=this.windows.get(k)??{count:0,until:now+this.windowMs};v.count++;this.windows.set(k,v);if(v.count>cap)retryAfterMs=Math.max(retryAfterMs,v.until-now);}
    if(retryAfterMs)throw Object.assign(Error('RATE_LIMITED'),{retryAfterMs});
  }
}
export const retryDelay=(error,attempt)=>{
  if(!['RATE_LIMITED','RETRYABLE_UNAVAILABLE'].includes(error.message))return null;
  return Math.max(error.retryAfterMs??0,Math.min(10000,250*2**Math.min(6,Math.max(0,attempt))));
};
export async function guardedRequest(raw,context,transport,budget,emit=()=>{},maxResponseBytes=262144) {
  if(!isUUID(context.deviceId)||!isUUID(context.workspaceId)||!isUUID(context.layoutId))throw Error('FORBIDDEN');
  let parsed;
  try {
    budget.take(context);
    if(Buffer.byteLength(raw)>2097152)throw Error('PAYLOAD_TOO_LARGE');
    try{parsed=parseStrict(raw);}catch{throw Error('INVALID_REQUEST');}
    const response=await transport(parsed,context);
    if(Buffer.byteLength(JSON.stringify(response))>maxResponseBytes)throw Error('RESPONSE_TOO_LARGE');
    emit({outcome:'OK',workspaceId:context.workspaceId,deviceId:context.deviceId});return response;
  } catch(error) {
    // Deliberately omit payload, signature, tokens, keys and raw exception text.
    const codes=['RATE_LIMITED','RETRYABLE_UNAVAILABLE','PAYLOAD_TOO_LARGE','RESPONSE_TOO_LARGE','INVALID_REQUEST','FORBIDDEN','QUOTA_EXCEEDED','INTEGRITY_ERROR','INCOMPATIBLE_SNAPSHOT','REVISION_CONFLICT','IDEMPOTENCY_KEY_REUSED','NOT_FOUND','INVALID_PAGE','INVALID_ENVELOPE','INVALID_STATE_PROFILE','DIGEST_OR_CANONICAL_MISMATCH'];
    const code=codes.includes(error.message)?error.message:'DENIED';
    emit({outcome:code,workspaceId:context.workspaceId,deviceId:context.deviceId});
    throw Object.assign(Error(code),{retryAfterMs:error.retryAfterMs});
  }
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 let raw='';for await(const chunk of process.stdin)raw+=chunk;
 const snapshot=parseStrict(raw);const state=snapshot.state;
 verifySnapshot(raw,{workspaceId:state.workspaceId,layoutId:state.layoutId,engineRevision:'R1-348bfeff12c4005657098d89ea1d3c2ccdda9910',topologyHash:'e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc'});
 process.stdout.write('verified snapshot content independently of envelope\n');
}
// Retry only transient failures. The serialized request (and its request_id) stays identical.
export async function requestWithRetry(raw,context,transport,{budget=new LocalBudget(),emit=()=>{},wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=3}={}) {
  const fixedContext=Object.freeze({...context});
  for(let attempt=0;;attempt++) {
    try{return await guardedRequest(raw,fixedContext,transport,budget,emit);}
    catch(error){const delay=retryDelay(error,attempt);if(delay===null||attempt>=attempts-1)throw error;await wait(delay);}
  }
}
