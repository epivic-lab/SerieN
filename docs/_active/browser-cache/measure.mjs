// Static-resource probe, not an authenticated simulator startup benchmark.
// Usage: PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node measure.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base='https://epivic-lab.github.io/SerieN/';
const out='docs/_active/browser-cache/evidence/';
const lock=JSON.parse(fs.readFileSync('assets/scenario-v06/asset-lock.json'));
const optimized=JSON.parse(fs.readFileSync('assets/scenario-v06/optimized-lock.json'));
const modules=lock.files.filter(x=>x.path!=='modules/railway_visual.glb').map(x=>x.path.includes('technical_reference')?x:optimized.files.find(y=>y.original===x.path));
const paths=['index.html','style.css?v=0.12.0','auth-gate.js?v=2','auth-gate-core.js','dist/game.js?v=v06-track-20261115',...['tokens-u2','serien-ui-u2','tokens-tm-u2','serien-ui-train-management-u2','serien-ui-integration'].map(x=>'ui/css/'+x+'.css'),'docs/jmri-layout/minimap-canonical.svg',...['dataset.json','asset-lock.json','optimized-lock.json',...modules.map(x=>x.path)].map(x=>'assets/scenario-v06/'+x)];
const inventory=paths.map(path=>{const bytes=fs.readFileSync(path.split('?')[0]);return {path,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};});
fs.writeFileSync(out+'inventory.json',JSON.stringify({base,modulesBytes:modules.reduce((s,x)=>s+x.bytes,0),resources:inventory},null,2)+'\n');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();
 await page.goto(base,{waitUntil:'networkidle',timeout:90000});
 await page.screenshot({path:out+'public-entry.png'});
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
 const phases=[];let records=new Map();
 cdp.on('Network.responseReceived',({requestId,response})=>{if(response.url.startsWith(base))records.set(requestId,{url:response.url,status:response.status,fromDiskCache:!!response.fromDiskCache,fromServiceWorker:!!response.fromServiceWorker,headers:Object.fromEntries(Object.entries(response.headers).filter(([k])=>['cache-control','etag','last-modified','content-length','content-encoding'].includes(k.toLowerCase())))});});
 cdp.on('Network.loadingFinished',({requestId,encodedDataLength})=>{if(records.has(requestId))records.get(requestId).networkBytes=encodedDataLength;});
 await cdp.send('Network.clearBrowserCache');
 for(const phase of ['cold','warm']) {
  records=new Map();const results=[];
  for(const resource of inventory) {
   const value=await page.evaluate(async({path,expected})=>{
    const url=new URL(path,location.href).href;const start=performance.now();
    const r=await fetch(url);const b=await r.arrayBuffer();
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
    const e=performance.getEntriesByName(url).at(-1);
    return {path,status:r.status,bytes:b.byteLength,sha256:hash,matchesLocal:hash===expected,durationMs:performance.now()-start,transferSize:e?.transferSize,encodedBodySize:e?.encodedBodySize,decodedBodySize:e?.decodedBodySize};
   },{path:resource.path,expected:resource.sha256});results.push(value);
  }
  phases.push({phase,resources:results,network:[...records.values()]});
  fs.writeFileSync(out+'browser-cache.json',JSON.stringify({date:new Date().toISOString(),browser:browser.version(),base,method:'Fresh unauthenticated context; clear HTTP cache; sequential default fetch of explicit public resources twice. No app execution, no request interception. Warm run same tab. Includes hash verification; durations include hashing.',phases},null,2)+'\n');
  console.log(phase,JSON.stringify({count:results.length,bytes:results.reduce((s,x)=>s+x.bytes,0),transferSize:results.reduce((s,x)=>s+x.transferSize,0),allHashesMatch:results.every(x=>x.matchesLocal),all200:results.every(x=>x.status===200)}));
 }
 if(phases.some(p=>p.resources.some(r=>r.status!==200||!r.matchesLocal))) throw new Error('Public resources do not match the local baseline; inspect evidence.');
} finally {await browser.close();}
