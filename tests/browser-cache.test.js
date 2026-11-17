import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
const template=readFileSync(new URL('../scripts/cache/worker.js',import.meta.url),'utf8');
const scope='https://example.test/SerieN/';
const file=(path,body,core=false)=>({path,bytes:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex'),core});
function harness(files,{storage=new Map(),bodies={},quota=false,unavailable=false}={}) {
 const events={},calls=[],deleted=[];let claims=0;
 const cache={async match(key){return storage.get(key)?.clone();},async put(key,r){if(quota)throw new Error('QuotaExceededError');storage.set(key,r.clone());},async keys(){return [...storage.keys()].map(url=>({url}));},async delete(key){deleted.push(key.url);return storage.delete(key.url);}};
 const context={URL,Response,Set,Map,Uint8Array,crypto:webcrypto,caches:{async open(name){assert.equal(name,'serien-static-v1-/SerieN/');if(unavailable)throw new Error('Storage unavailable');return cache;}},self:{registration:{scope},clients:{async claim(){claims++;}},addEventListener:(type,fn)=>events[type]=fn},fetch:async(url,options)=>{calls.push({url,options});const path=new URL(url).pathname.slice('/SerieN/'.length);const b=bodies[path];return new Response(b??'missing',{status:b===undefined?404:200,headers:{'Content-Type':'application/octet-stream','Content-Encoding':'gzip'}});}};
 vm.runInNewContext(template.replace('__SERIEN_MANIFEST__',JSON.stringify({version:'test',files})),context);
 return {calls,storage,deleted,get claims(){return claims;},async lifecycle(type){let p;events[type]({waitUntil:v=>p=v});await p;},request(path,init={}){let p;events.fetch({request:{url:new URL(path,scope).href,method:'GET',mode:'cors',headers:new Headers(),...init},respondWith:v=>p=v});return p;}};
}
test('verified lazy cache avoids repeat transfer and coalesces parallel requests',async()=>{
 const body='scenery',h=harness([file('assets/model.glb',body)],{bodies:{'assets/model.glb':body}});
 const responses=await Promise.all([h.request('assets/model.glb'),h.request('assets/model.glb')]);
 assert.deepEqual(await Promise.all(responses.map(r=>r.text())),[body,body]);
 assert.equal(await (await h.request('assets/model.glb?v=old')).text(),body);assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].options.credentials,'omit');assert.equal(h.calls[0].options.cache,'reload');
 assert.equal((await h.request('assets/model.glb')).headers.get('Content-Encoding'),null);
});
test('install caches shell only; activation preserves another application and unchanged resources',async()=>{
 const a=file('index.html','shell',true),b=file('assets/model.glb','model'),h=harness([a,b],{bodies:{'index.html':'shell','assets/model.glb':'model'}});
 await h.lifecycle('install');assert.equal(h.calls.length,1);assert.equal(h.claims,0);
 await h.request('assets/model.glb');
 h.storage.set(scope+'.serien-cache/obsolete',new Response('old'));
 await h.lifecycle('activate');assert.equal(h.claims,1);assert.equal(h.deleted.length,1);assert.equal(h.storage.size,2);
 assert.equal(await (await h.request('?code=private-oauth-value',{mode:'navigate'})).text(),'shell');
 assert.ok([...h.storage.keys()].every(key=>!key.includes('private-oauth-value')));
});
test('new release downloads only changed content; failed update keeps prior shell',async()=>{
 const storage=new Map(),old=harness([file('index.html','old',true),file('assets/model.glb','same')],{storage,bodies:{'index.html':'old','assets/model.glb':'same'}});
 await old.lifecycle('install');await old.request('assets/model.glb');
 const next=harness([file('index.html','new',true),file('assets/model.glb','same')],{storage,bodies:{'index.html':'new'}});
 await next.lifecycle('install');assert.equal(await (await next.request('assets/model.glb')).text(),'same');assert.equal(next.calls.length,1);
 assert.equal(await (await old.request('',{mode:'navigate'})).text(),'old');
 const broken=harness([file('index.html','expected',true)],{storage,bodies:{'index.html':'wrong'}});
 await assert.rejects(broken.lifecycle('install'),/integrity/);assert.equal(await (await old.request('',{mode:'navigate'})).text(),'old');
 await next.lifecycle('activate');assert.equal(storage.size,2);
});
test('bad hashes, missing resources never enter cache; storage failures fall back to verified network',async()=>{
 for(const bodies of [{},{'assets/a.glb':'wrong'}]){
  const h=harness([file('assets/a.glb','valid')],{bodies});await assert.rejects(h.request('assets/a.glb'));assert.equal(h.storage.size,0);
 }
 for(const option of [{quota:true},{unavailable:true}]){
  const h=harness([file('assets/a.glb','valid')],{bodies:{'assets/a.glb':'valid'},...option});assert.equal(await (await h.request('assets/a.glb')).text(),'valid');assert.equal(h.storage.size,0);
 }
 const h=harness([file('index.html','shell',true)],{bodies:{'index.html':'shell'},quota:true});await assert.rejects(h.lifecycle('install'));
});
test('Auth, API, cross-origin, range and unknown query requests bypass cache',()=>{
 const h=harness([file('assets/a.glb','data')]);
 for(const [url,init] of [['https://auth.test/token',{}],['api/private',{}],['assets/a.glb?token=private',{}],['assets/a.glb',{method:'POST'}],['assets/a.glb',{headers:new Headers({range:'bytes=0-1'})}]])assert.equal(h.request(url,init),undefined);
 assert.equal(h.calls.length,0);
});
