import './legacy-client.js';
import {generateDevice,signed,canonical,hex} from './protocol.js';
const original=window.lab;
async function store(mode,fn){const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('serien-integration-lab',1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('keys',mode),r=fn(tx.objectStore('keys'));tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
window.lab9={...original,
 async epoch(epoch){const d=await store('readonly',s=>s.get('device'));d.epoch=epoch;await store('readwrite',s=>s.put(d,'device'));},
 async rotateCandidate(){const old=await store('readonly',s=>s.get('device')),d=await generateDevice();d.deviceId=old.deviceId;d.epoch=(old.epoch??1)+1;await store('readwrite',s=>s.put(d,'candidate'));return {deviceId:d.deviceId,publicKey:d.publicKey};},
 async lifecycle(w,l,operation,body,overrides={}) {
  let d=await store('readonly',s=>s.get(operation==='rotate'?'candidate':'device'));
  const nonce=crypto.randomUUID().replaceAll('-','');
  if(operation==='rotate') {const old=await store('readonly',s=>s.get('device'));const agreement={domain:'SerieN-rotation-possession-v1',jobId:body.jobId,deviceId:d.deviceId,workspaceId:w,layoutId:l,publicKey:d.publicKey,nonce};body={...body,oldSignature:hex(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},old.privateKey,new TextEncoder().encode(canonical(agreement))))};}
  return signed(d,location.origin,'POST','/v1/'+operation,w,l,operation,body,{nonce,...overrides});
 },
 async adoptRotation(){const d=await store('readonly',s=>s.get('candidate'));await store('readwrite',s=>s.put(d,'device'));},
};
