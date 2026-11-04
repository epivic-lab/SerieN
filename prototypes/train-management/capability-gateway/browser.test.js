// Uses an existing test-only Playwright installation; no production dependency added.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {startGateway} from './gateway.js';
import {generateDevice,signed} from './protocol.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const g=await startGateway(),owner=await generateDevice(),ws=crypto.randomUUID(),layout=crypto.randomUUID();
g.bootstrap(ws,layout,owner);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const rows=[];
try{
 const context=await browser.newContext();const page=await context.newPage();
 await page.goto(g.origin);await page.waitForFunction(()=>window.lab);
 const device=await page.evaluate(()=>lab.create());
 // Controlled test operator binds the browser key through owner-approved one-time pairing.
 const {fingerprint}=await import('./protocol.js');
 const invitePath=`/v1/workspaces/${ws}/layouts/${layout}/invite`;
 const req=await signed(owner,g.origin,'POST',invitePath,ws,layout,'invite',{...device,scope:'reader',fingerprint:await fingerprint(device.publicKey)});
 const invitation=await fetch(g.origin+invitePath,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(req)});assert.equal(invitation.status,200);
 const {token}=await invitation.json();
 const paired=await page.evaluate(async({ws,layout,token})=>{
  // Read CryptoKey from IndexedDB, sign the pairing proof in the real browser.
  const {signed}=await import('/protocol.js');
  const db=await new Promise(resolve=>{const r=indexedDB.open('serien-capability-lab',1);r.onsuccess=()=>resolve(r.result);});
  const d=await new Promise(resolve=>{const r=db.transaction('keys').objectStore('keys').get('device');r.onsuccess=()=>resolve(r.result);});db.close();
  const e=await signed(d,location.origin,'POST','/v1/pair',ws,layout,'pair',{token,deviceId:d.deviceId,publicKey:d.publicKey});
  const r=await fetch('/v1/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(e)});return r.status;
 },{ws,layout,token});assert.equal(paired,200);
 rows.push({test:'browser generation, owner-approved pairing',expected:200,observed:paired});
 const check=await page.evaluate(()=>lab.check());assert.deepEqual(check,{extractable:false,exportRejected:true});rows.push({test:'private CryptoKey non-exportable',observed:check,expected:check});
 await page.reload();await page.waitForFunction(()=>window.lab);
 assert.deepEqual(await page.evaluate(()=>lab.check()),check);
 const r=await page.evaluate(({ws,layout})=>lab.call(ws,layout),{ws,layout});assert.equal(r.status,200);assert.equal(r.body.value,'private-fixture');rows.push({test:'IndexedDB key after reload signs real HTTP read',expected:200,observed:r.status});
 const revokePath=`/v1/workspaces/${ws}/layouts/${layout}/revoke`;
 const rev=await signed(owner,g.origin,'POST',revokePath,ws,layout,'revoke',{deviceId:device.deviceId});
 assert.equal((await fetch(g.origin+revokePath,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(rev)})).status,200);
 const denied=await page.evaluate(({ws,layout})=>lab.call(ws,layout),{ws,layout});assert.deepEqual(denied,{status:403,body:{error:'DENIED'}});rows.push({test:'revoked browser key returns no protected data',expected:403,observed:denied});
 await page.evaluate(()=>lab.lose());await page.reload();await page.waitForFunction(()=>window.lab);
 assert.deepEqual(await page.evaluate(()=>lab.check()),{missing:true});assert.deepEqual(await page.evaluate(({ws,layout})=>lab.call(ws,layout),{ws,layout}),{missing:true});rows.push({test:'missing key after deletion/reload does not send unsigned fallback',expected:{missing:true},observed:{missing:true}});
 const fresh=await context.newPage();await fresh.goto(g.origin);await fresh.waitForFunction(()=>window.lab);assert.deepEqual(await fresh.evaluate(()=>lab.check()),{missing:true});
 if(process.env.CAPABILITY_BROWSER_EVIDENCE)await writeFile(process.env.CAPABILITY_BROWSER_EVIDENCE,JSON.stringify({browser:await browser.version(),cases:rows,result:'PASS',limitations:'Chromium headless only; no Safari/Firefox/mobile, OS recovery, power-loss durability or XSS resistance certification.'},null,2)+'\n');
 console.log(`${rows.length} browser scenarios PASS; Chromium ${await browser.version()}`);
}finally{await browser.close();await g.close();}
