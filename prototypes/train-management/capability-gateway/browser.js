import {generateDevice,signed} from './protocol.js';
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('serien-capability-lab',1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function access(mode,fn){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('keys',mode),r=fn(tx.objectStore('keys'));tx.oncomplete=()=>resolve(r?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
window.lab={
 async create(){const d=await generateDevice();await access('readwrite',s=>s.put(d,'device'));return {deviceId:d.deviceId,publicKey:d.publicKey};},
 async check(){const d=await access('readonly',s=>s.get('device'));if(!d)return {missing:true};let exportRejected=false;try{await crypto.subtle.exportKey('jwk',d.privateKey);}catch{exportRejected=true;}return {extractable:d.privateKey.extractable,exportRejected};},
 async call(workspaceId,layoutId){const d=await access('readonly',s=>s.get('device'));if(!d)return {missing:true};const path=`/v1/workspaces/${workspaceId}/layouts/${layoutId}/read`;const envelope=await signed(d,location.origin,'POST',path,workspaceId,layoutId,'read');const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(envelope)});return {status:r.status,body:await r.json()};},
 async lose(){await access('readwrite',s=>s.delete('device'));}
};
