// Real Chromium cache check; local mode also renders the simulator with a test-only entry.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),out='docs/_active/browser-cache/evidence/release/';
const manifest=JSON.parse(fs.readFileSync('dist/cache-manifest.json'));
const requests=[];let fixtureVersion=1;
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const fixtureFiles=()=>[{path:'index.html',body:`<!doctype html><title>release ${fixtureVersion}</title><p>release ${fixtureVersion}</p>`,core:true},{path:'asset.glb',body:'unchanged-model',core:false}].map(({body,...f})=>({...f,bytes:Buffer.byteLength(body),sha256:digest(body)}));
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');requests.push(url.pathname);
 if(url.pathname.startsWith('/fixture/')) {
  if(url.pathname.endsWith('service-worker.js')) {res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync('scripts/cache/worker.js','utf8').replace('__SERIEN_MANIFEST__',JSON.stringify({files:fixtureFiles()})));return;}
  res.setHeader('Content-Type',url.pathname.endsWith('.glb')?'application/octet-stream':'text/html');
  res.end(url.pathname.endsWith('.glb')?'unchanged-model':`<!doctype html><title>release ${fixtureVersion}</title><p>release ${fixtureVersion}</p>`);return;
 }
 const relative=decodeURIComponent(url.pathname).replace(/^\/SerieN\//,'')||'index.html';
 const filename=path.resolve(root,relative==='service-worker.js'?'dist/service-worker.js':relative);
 if(!filename.startsWith(root+'/')){res.writeHead(403).end();return;}
 try {
  const stat=fs.statSync(filename);if(!stat.isFile())throw Error();
  const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
  res.setHeader('Content-Type',mime[path.extname(filename)]||'application/octet-stream');res.setHeader('Content-Length',stat.size);
  fs.createReadStream(filename).pipe(res);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local=`http://127.0.0.1:${server.address().port}`;
const base=process.argv[2]||local+'/SerieN/';
const remote=!!process.argv[2],label=remote?'public':'local';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try {
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
 await page.goto(base+'?diagnostics=1',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>navigator.serviceWorker.controller,{timeout:60000});
 const phases=[], workerRequests=[];
 context.on('request', request => {if(request.serviceWorker() && request.url().startsWith(base)) workerRequests.push(request.url());});
 for(const phase of ['cold','warm']){
  const count=requests.length, workerCount=workerRequests.length;
  const values=await page.evaluate(async files=>{
   const results=[];for(const f of files){const url=new URL(f.path,document.baseURI).href;const r=await fetch(url);const b=await r.arrayBuffer();const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');const e=performance.getEntriesByName(url).at(-1);results.push({path:f.path,status:r.status,bytes:b.byteLength,hashMatch:hash===f.sha256,transferSize:e?.transferSize,workerStart:e?.workerStart});}return results;
  },manifest.files);
  assert.ok(values.every(v=>v.status===200&&v.hashMatch));
  const networkRequests=requests.slice(count).filter(p=>p.startsWith('/SerieN/'));
  const workerNetworkRequests=workerRequests.slice(workerCount);
  phases.push({phase,values,networkRequests,workerNetworkRequests});
  if(phase==='warm') {assert.ok(values.every(v=>v.transferSize===0));assert.equal(workerNetworkRequests.length,0);if(!remote)assert.equal(networkRequests.length,0);}
 }
 assert.ok(phases[0].workerNetworkRequests.length>0, 'Observe worker network traffic on cold run before asserting warm reuse');
 await page.reload({waitUntil:'domcontentloaded'});
 assert.ok(await page.evaluate(()=>!!navigator.serviceWorker.controller));
 await page.waitForFunction(()=>document.getElementById('authStatus')?.textContent.includes('Accedi'),{timeout:30000});
 assert.equal(await page.evaluate(()=>document.body.classList.contains('auth-locked')),true);
 await page.screenshot({path:out+label+'-access.png'});
 const data={base,browser:browser.version(),manifestVersion:manifest.version,phases,authRemainsLocked:true};
 if(!remote){
  // Test-only local boot: no authentication code or production gate is changed.
  await page.evaluate(async()=>{document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js?v=v06-track-20261115');});
  await page.waitForFunction(()=>window.__serienDiagnostics,{timeout:180000});
  data.scene=await page.evaluate(()=>{document.getElementById('pause').click();return window.__serienDiagnostics.snapshot().scenario;});
  assert.equal(data.scene.id,'v06');
  await page.screenshot({path:out+'local-scene.png'});
  const p=await context.newPage();await p.goto(local+'/fixture/');
  await p.evaluate(async()=>{await navigator.serviceWorker.register('./service-worker.js');await navigator.serviceWorker.ready;});
  await p.reload();assert.equal(await p.title(),'release 1');
  await p.evaluate(()=>fetch('./asset.glb').then(r=>r.text()));
  fixtureVersion=2;
  await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  await p.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
  await p.reload();assert.equal(await p.title(),'release 1');
  const p2=await context.newPage();await p2.goto(local+'/fixture/');assert.equal(await p2.title(),'release 1');
  await p.close();await p2.close();
  await page.waitForFunction(async()=>{const regs=await navigator.serviceWorker.getRegistrations();const r=regs.find(r=>r.scope.endsWith('/fixture/'));return r&&!r.waiting&&r.active?.state==='activated';});
  const p3=await context.newPage();await p3.goto(local+'/fixture/');assert.equal(await p3.title(),'release 2');
  const before=requests.filter(p=>p==='/fixture/asset.glb').length;
  assert.equal(await p3.evaluate(()=>fetch('./asset.glb').then(r=>r.text())),'unchanged-model');
  assert.equal(requests.filter(p=>p==='/fixture/asset.glb').length,before);
  data.update={twoTabsPinned:true,activationAfterClosing:true,unchangedModelReused:true};
 }
 fs.writeFileSync(out+label+'-browser.json',JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({label,files:manifest.files.length,warmTransfer:phases[1].values.reduce((s,v)=>s+v.transferSize,0),warmWorkerRequests:phases[1].workerNetworkRequests.length,coldWorkerRequests:phases[0].workerNetworkRequests.length,scene:data.scene?.id,update:data.update,authRemainsLocked:true}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
