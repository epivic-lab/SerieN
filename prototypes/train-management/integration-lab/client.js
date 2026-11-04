import {generateDevice,signed,digest,canonical,isUUID} from './protocol.js';
const ENGINE='R1-348bfeff12c4005657098d89ea1d3c2ccdda9910';
const TOPOLOGY='e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc';
async function access(mode,fn) {
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('serien-integration-lab',1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('keys',mode),r=fn(tx.objectStore('keys'));tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
export async function verifySnapshot(s,w,l) {
 if(s.canonicalVersion!=='jcs-profile-v1'||s.schemaVersion!==1||s.state?.schemaVersion!==1||s.engineRevision!==ENGINE||s.state.engineRevision!==ENGINE||s.topologyHash!==TOPOLOGY||s.state.topologyHash!==TOPOLOGY)throw Error('INCOMPATIBLE_SNAPSHOT');
 if(s.state.workspaceId!==w||s.state.layoutId!==l||!isUUID(s.snapshotId)||!/^[1-9][0-9]*$/.test(s.revision)||!/^([a-f0-9]{64})$/.test(s.envelopeDigest)||await digest(s.state)!==s.stateDigest||canonical(s.assetRefs)!==canonical(s.state.models.map(m=>({modelId:m.id,revision:m.revision,asset:m.asset}))))throw Error('INTEGRITY_ERROR');
 return true;
}
async function verifyResult(r,e) {
 const op=e.proof.operation,b=e.body,w=e.proof.workspaceId,l=e.proof.layoutId;
 const revision=v=>typeof v==='string'&&/^(0|[1-9][0-9]*)$/.test(v);
 const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 if(op==='ReadSnapshot'){if(r.revision!==b.revision)throw Error('INTEGRITY_ERROR');await verifySnapshot(r,w,l);}
 if(['SaveCheckpoint','RecoverRevision','ReadReceipt'].includes(op)) {
  if(r.receiptVersion!==2||r.schemaVersion!==1||r.canonicalVersion!=='jcs-profile-v1'||r.workspaceId!==w||r.layoutId!==l||r.actor!==e.proof.deviceId||r.request_id!==(op==='ReadReceipt'?b.requestId:e.proof.request_id)||!isUUID(r.snapshotId)||!revision(r.revision)||!hash(r.digest)||!hash(r.stateDigest))throw Error('INTEGRITY_ERROR');
  if(op==='SaveCheckpoint'&&(r.digest!==await digest(b)||r.stateDigest!==await digest(b.state)||r.expectedRevision!==b.expectedRevision||r.operation!==op))throw Error('INTEGRITY_ERROR');
  if(op==='RecoverRevision'&&(r.operation!==op||r.expectedRevision!==b.expectedRevision||r.recoverySourceRevision!==b.sourceRevision))throw Error('INTEGRITY_ERROR');
 }
 if(op==='ReadHead'&&(r.workspaceId!==w||r.layoutId!==l||!revision(r.revision)||r.revision!=='0'&&(!hash(r.stateDigest)||!hash(r.envelopeDigest)||r.canonicalVersion!=='jcs-profile-v1')))throw Error('INTEGRITY_ERROR');
 if(op==='ListHistory') {
  if(!Array.isArray(r.items)||r.items.length>Number(b.pageSize)||!revision(r.throughRevision))throw Error('INTEGRITY_ERROR');
  let previous=BigInt(b.after);for(const item of r.items){if(!revision(item.revision)||BigInt(item.revision)<=previous||BigInt(item.revision)>BigInt(r.throughRevision)||!isUUID(item.snapshotId)||!['VALID','CORRUPT','INCOMPATIBLE'].includes(item.status))throw Error('INTEGRITY_ERROR');previous=BigInt(item.revision);}
 }
}
window.lab={
 async create(){const d=await generateDevice();await access('readwrite',s=>s.put(d,'device'));return {deviceId:d.deviceId,publicKey:d.publicKey};},
 async check(){const d=await access('readonly',s=>s.get('device'));if(!d)return {missing:true};let exportRejected=false;try{await crypto.subtle.exportKey('jwk',d.privateKey);}catch{exportRejected=true;}return {deviceId:d.deviceId,extractable:d.privateKey.extractable,exportRejected};},
 async lose(){await access('readwrite',s=>s.delete('device'));},
 async envelope(w,l,op,body={},overrides={}){const d=await access('readonly',s=>s.get('device'));if(!d)return null;const path=op==='pair'||op==='recover'?'/v1/'+op:`/v1/workspaces/${w}/layouts/${l}/${op}`;return signed(d,location.origin,'POST',path,w,l,op,body,overrides);},
 async send(e){const r=await fetch(e.proof.path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(e)});const text=await r.text();if(new TextEncoder().encode(text).length>262144)throw Error('RESPONSE_TOO_LARGE');return {status:r.status,body:JSON.parse(text)};},
 async call(w,l,op,body={},overrides={}){const e=await this.envelope(w,l,op,body,overrides);if(!e)return {missing:true};const r=await this.send(e);if(r.status===200){await verifyResult(r.body,e);if(op==='ReadSnapshot')r.verified=true;}return r;},
 verifySnapshot,
};
