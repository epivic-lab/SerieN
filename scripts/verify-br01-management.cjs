const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const out='docs/_active/br01/evidence/BR01-D/';
const base=new URL(process.env.SERIEN_URL||'http://127.0.0.1:8197/');
assert.equal(base.hostname,'127.0.0.1');
const results={};
async function record(page,browser){
  const encoder=await browser.newPage();
  await encoder.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=1120;canvas.height=704;
    const ctx=canvas.getContext('2d'),stream=canvas.captureStream(12),rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];
    window.frame=async jpeg=>{const img=new Image();img.src='data:image/jpeg;base64,'+jpeg;await img.decode();ctx.drawImage(img,0,0,canvas.width,canvas.height);};
    rec.ondataavailable=e=>chunks.push(e.data);
    window.finish=()=>new Promise(resolve=>{rec.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks));};rec.stop();});rec.start();
  });
  await page.bringToFront();
  const cdp=await page.context().newCDPSession(page);let busy=false,frames=0;
  cdp.on('Page.screencastFrame',async e=>{
    await cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});
    if(busy)return;busy=true;
    try{await encoder.evaluate(data=>window.frame(data),e.data);frames++;}finally{busy=false;}
  });
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:75,maxWidth:1120,maxHeight:704,everyNthFrame:1});
  return async()=>{await cdp.send('Page.stopScreencast');assert.ok(frames>10);fs.writeFileSync(out+'cycle.webm',Buffer.from(await encoder.evaluate(()=>window.finish()),'base64'));await encoder.close();};
}
async function run(browser,scenario){
  const page=await browser.newPage({viewport:{width:1400,height:880}});
  page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  await page.route('**/auth-gate.js*',r=>r.fulfill({contentType:'text/javascript',body:"document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"}));
  await page.goto(new URL('?diagnostics=1&scenario='+scenario,base).href);
  await page.waitForFunction(()=>window.__serienDiagnostics);
  const btn=(name)=>page.getByRole('button',{name,exact:true});
  const click=name=>btn(name).click();
  const open=async()=>{await page.locator('.hc').getByRole('button',{name:'Menu',exact:true}).click();await click('Train Management');};
  const close=async()=>{await page.locator('#tmD [data-close]').click();await page.locator('#dlg').getByRole('button',{name:'Close',exact:true}).click();};
  const rail=()=>page.evaluate(()=>__serienDiagnostics.railwayState());
  const snap=()=>page.evaluate(()=>__serienDiagnostics.snapshot());
  const shot=name=>page.screenshot({path:out+name+'.png'});
  const remove=async()=>{await click('Remove from layout');await hold();await click('Remove composition');};
  const hold=()=>scenario==='v06'?page.waitForTimeout(1250):Promise.resolve();
  const finish=scenario==='v06'?await record(page,browser):null;
  await open();
  await page.locator('[data-view=catalog]').click();
  assert.deepEqual(await page.locator('[data-model-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.modelId)),['native-br01-engine','native-br01-tender']);
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-model-id] img')].every(i=>i.complete&&i.naturalWidth&&i.src.includes('/br01/')));
  if(finish)await shot('catalog');await hold();
  await page.locator('[data-view=layout]').click();
  await page.locator('[data-composition="1"]').click();
  const initial=await rail();await click('Remove from layout');await click('Cancel');assert.deepEqual(await rail(),initial);
  await remove();
  const two=await rail();assert.deepEqual(two.identities.trains,[initial.identities.trains[0],initial.identities.trains[2]]);
  if(finish)await shot('two-compositions');await hold();
  await click('Add BR 01 + tender');
  const id=3;
  assert.equal((await snap()).consoles.active,id);
  assert.match(await page.locator('.managementSummary').innerText(),/151\.825 mm/);
  assert.deepEqual(await page.locator('[data-side-key]').evaluateAll(ns=>ns.map(n=>n.dataset.sideKey)),['native-br01-engine','native-br01-tender']);
  await page.locator('[data-composition="0"]').click();await page.locator('[data-composition="3"]').click();
  if(finish)await shot('management');await hold();
  await click('Copy to project');await page.locator('[data-project-action=confirm]').click();
  assert.equal(await page.locator('[data-comparison]').getAttribute('data-comparison'),'matching');
  await page.locator('[data-view=layout]').click();
  await click('◎ Focus in 3D');assert.equal(await page.locator('dialog[open]').count(),0);await hold();
  const card=page.locator('[data-console-train="3"]');
  await card.locator('.railwayMiniMap').click();
  assert.equal(await page.locator('.nextSwitchTrain').textContent(),'BR 01 · 4');
  assert.equal(await page.locator('#sidebarRailwayMap [aria-pressed=true]').getAttribute('data-map-train'),'3');
  const throttle=()=>card.locator('input').fill('35');
  await throttle();
  await page.waitForFunction(()=>__serienDiagnostics.snapshot().stock.find(t=>t.id===3).velocity>0);
  await open();assert.ok(await btn('Remove from layout').isDisabled());await hold();await close();
  await card.locator('[data-command=stop]').click();await hold();await card.locator('[data-command=reverse]').click();await hold();await throttle();
  await page.waitForFunction(()=>__serienDiagnostics.snapshot().stock.find(t=>t.id===3).velocity<0);
  if(finish)await shot('driving');await hold();
  await card.locator('[data-command=stop]').click();
  await open();const before=await rail();await remove();const afterRemoval=await rail();assert.deepEqual(afterRemoval,two);
  assert.equal(await card.count(),0);assert.equal(await page.locator('[data-map-train="3"]').count(),0);
  await page.locator('[data-view=projects]').click();
  assert.equal(await page.locator('[data-comparison]').getAttribute('data-comparison'),'stale');
  await page.locator('[data-view=layout]').click();
  for(let i=0;i<2;i++)await remove();
  const empty=await rail();assert.deepEqual(empty,{occupied:[],identities:{trains:[],detached:[]}});assert.equal((await snap()).consoles.active,null);
  assert.equal(await page.locator('.nextSwitchTrain').textContent(),'No train on the layout');
  if(finish)await shot('empty');await hold();
  await click('Add BR 01 + tender');assert.equal((await snap()).consoles.active,4);await close();
  if(finish)await finish();
  const turnout=page.locator('button[data-switch]:enabled').first(),control=await turnout.getAttribute('data-switch-id');
  const prior=(await snap()).switchIndicators.states.find(s=>s.id===control).on;
  await turnout.click();
  assert.equal((await snap()).switchIndicators.states.find(s=>s.id===control).on,!prior);
  await turnout.click();
  if(scenario==='legacy'){
    await open();await click('Add BR 01 + tender');await close();
    await page.evaluate(()=>{
      const d=__serienDiagnostics;
      d.placeTrain(4,'WIDEN-L:offset',285);d.placeTrain(5,'WIDEN-L:offset',65);
    });
    await page.locator('[data-console-train="5"] input').fill('65');
    await page.waitForFunction(()=>{const t=__serienDiagnostics.snapshot().stock.find(t=>t.id===5);return t.guard?.reason==='train'&&t.velocity===0;},{},{timeout:45000});
    const follower=(await snap()).stock.find(t=>t.id===5);
    const location=follower.journey.position;
    await page.waitForTimeout(500);
    assert.equal((await snap()).stock.find(t=>t.id===5).journey.position,location);
    results.protection={control,guard:follower.guard,position:location};
    await shot('protected-stop');
    await page.locator('[data-console-train="5"] [data-command=stop]').click();
    const wx=page.locator('button[data-switch-id="WX-A"]');
    if(await wx.getAttribute('aria-pressed')==='false')await wx.click();
    await page.evaluate(()=>__serienDiagnostics.placeTrain(5,'T5',165));
    await page.locator('[data-console-train="5"] input').fill('95');
    await page.waitForFunction(()=>__serienDiagnostics.snapshot().stock.find(t=>t.id===5).vehicles[0].edge==='WX-A:down');
    assert.ok(await wx.isDisabled());
    await page.locator('[data-console-train="5"] [data-command=stop]').click();
    const lock=await page.evaluate(()=>__serienDiagnostics.requestToggle('WX-A','device'));
    assert.equal(lock.changed,false);assert.equal(lock.reason,'occupied');
    results.routing={entry:'T5',edge:'WX-A:down',lock};
  }
  assert.deepEqual(errors,[]);
  results[scenario]={initial,two,beforeRemoval:before,afterRemoval,empty,errors};
  await page.close();
}
// An old confirmed project can only exist in RAM. Seed that one record in
// an isolated bundle and exercise the production project view and store.
async function retiredProject(browser){
  const project={id:'prior-project',name:'Prior session project',source:null,vehicles:[{id:'original-slot',modelId:'native-steam',orientation:1}]};
  const seed='const confirmed=new Map();';
  const bundle=await require('esbuild').build({
    stdin:{contents:"import {createTrainProjectsView} from './src/train-projects-view.js';const view=createTrainProjectsView({getTrains:()=>[],getSelected:()=>null,getGeneration:()=>0,onChange:()=>{}});document.body.append(view.root);view.sync();window.readProject=()=>view.snapshot.confirmed[0];",resolveDir:process.cwd()},
    bundle:true,write:false,plugins:[{name:'prior-session-fixture',setup(build){
      build.onLoad({filter:/\/train-projects\.js$/},args=>{
        const source=fs.readFileSync(args.path,'utf8');assert.ok(source.includes(seed));
        return {contents:source.replace(seed,'const confirmed=new Map([['+JSON.stringify(project.id)+','+JSON.stringify(project)+']]);'),resolveDir:require('node:path').dirname(args.path)};
      });
    }}]
  });
  const page=await browser.newPage();
  await page.route('**/fixture.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Prior session fixture</title><body></body>'}));
  await page.goto(new URL('fixture.html',base).href);
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.locator('[data-project-id="prior-project"]').click();
  const warning=await page.getByText(/Unavailable rolling stock: native-steam/).innerText();
  assert.deepEqual(await page.evaluate(()=>window.readProject()),project);
  await page.locator('[data-project-action=new]').click();
  const options=()=>page.locator('[aria-label="Catalog model"] option').evaluateAll(nodes=>nodes.map(n=>n.value));
  assert.deepEqual(await options(),['native-br01-engine']);
  await page.locator('[data-project-action=add]').click();
  assert.deepEqual(await options(),['native-br01-tender']);
  assert.deepEqual(await page.evaluate(()=>window.readProject()),project);
  results.retired={fixture:project,warning,originalPreserved:true};
  await page.close();
}

(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
try{await retiredProject(browser);for(const scenario of ['v06','legacy'])await run(browser,scenario);fs.writeFileSync(out+'browser.json',JSON.stringify(results,null,2)+'\n');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
