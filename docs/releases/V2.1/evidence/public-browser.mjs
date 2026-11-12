import {chromium} from '/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const out=process.argv[2] || 'work/release-v21/evidence';
const clean=u=>{try{const x=new URL(u);return x.origin+x.pathname;}catch{return String(u).replace(/\?.*/,'');}};
// Scope Chromium's additional trust to the CA supplied by this managed runtime.
// Do not disable certificate validation globally or alter production TLS.
const ca=process.env.NODE_EXTRA_CA_CERTS;
if(!ca)throw new Error('Managed proxy CA is required');
const publicKey=execFileSync('openssl',['x509','-in',ca,'-pubkey','-noout']);
const der=execFileSync('openssl',['pkey','-pubin','-outform','der'],{input:publicKey});
const spki=createHash('sha256').update(der).digest('base64');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY},args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-certificate-errors-spki-list='+spki]});
const result={capturedAt:new Date().toISOString(),url:'https://epivic-lab.github.io/SerieN/',provenance:'New public URL execution, fresh unauthenticated contexts; no routes, fixtures, session/token injection or login bypass',viewports:[]};
try {
 for (const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport,serviceWorkers:'block'});
  const page=await context.newPage();
  const item={viewport,responses:[],failedRequests:[],pageErrors:[],consoleErrors:[]};
  page.on('response',r=>item.responses.push({url:clean(r.url()),status:r.status()}));
  page.on('requestfailed',r=>item.failedRequests.push({url:clean(r.url()),error:r.failure()?.errorText}));
  page.on('pageerror',e=>item.pageErrors.push(String(e).slice(0,500)));
  page.on('console',m=>{if(m.type()==='error')item.consoleErrors.push(m.text().slice(0,500));});
  try {
   const response=await page.goto(result.url+'?release-audit='+Date.now(),{waitUntil:'networkidle',timeout:45000});
   item.documentHTTP=response.status();
   item.dom=await page.evaluate(()=>({title:document.title,authLocked:document.body.classList.contains('auth-locked'),authGateVisible:document.getElementById('authGate')?.getBoundingClientRect().height>0,authStatus:document.getElementById('authStatus')?.textContent,loginVisible:!document.getElementById('googleSignIn')?.hidden,canvasCount:document.querySelectorAll('canvas').length,localStyles:[...document.styleSheets].map(s=>({href:s.href,rules:(()=>{try{return s.cssRules.length}catch{return null}})()})),fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),appVisible:document.querySelector('.app')?.getBoundingClientRect().height>0,horizontalOverflow:document.documentElement.scrollWidth>innerWidth}));
   item.runtimeAcceptance=item.dom.authLocked?'BLOCKED — authentication/SDK boundary; no application bypass attempted':'Requires authenticated functional checks';
   const name='public-'+viewport.width+'.png';await page.screenshot({path:out+'/'+name,fullPage:true});item.screenshot=name;
  }catch(e){item.navigationError=String(e).slice(0,600);}
  result.viewports.push(item);await context.close();
 }
}finally{await browser.close();await writeFile(out+'/public-browser.json',JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result.viewports.map(x=>({viewport:x.viewport,documentHTTP:x.documentHTTP,dom:x.dom,failedRequests:x.failedRequests,navigationError:x.navigationError})),null,2));
