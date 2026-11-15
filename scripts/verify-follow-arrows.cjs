const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const output = 'docs/_active/follow-train';

async function verify(browser, scenario) {
  const p = await browser.newPage({viewport:{width:1280,height:800}});
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.route('**/auth-gate.js*', r => r.fulfill({contentType:'text/javascript', body:
    "document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"}));
  await p.goto('http://127.0.0.1:8394/?diagnostics=1&scenario=' + scenario);
  await p.waitForFunction(() => window.__serienDiagnostics);
  const snapshot = () => p.evaluate(() => __serienDiagnostics.snapshot());
  const cam = async () => (await snapshot()).camera;
  const hold = async (key, ms) => {
    await p.keyboard.down(key);
    await p.waitForTimeout(ms);
    await p.keyboard.up(key);
  };
  const offset = camera => camera.position.map((v,i) => v-camera.target[i]);
  const initial = await snapshot();
  assert.equal(initial.scenario.id, scenario);
  const follow = p.locator('[data-preset=follow]');
  await p.locator('#camt').click();
  await follow.click();
  await p.waitForTimeout(600);
  const standard = await cam();
  for (const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']) {
    const before = await cam();
    await hold(key,500);
    const after = await cam();
    const a = offset(before), b = offset(after);
    if (key === 'ArrowUp') assert.ok(b[1] > a[1]+1);
    else if (key === 'ArrowDown') assert.ok(b[1] < a[1]-1);
    else {
      const turn = Math.atan2(b[0]*a[2]-b[2]*a[0],b[0]*a[0]+b[2]*a[2]);
      assert.ok(key === 'ArrowRight' ? turn > .01 : turn < -.01);
    }
    await p.waitForTimeout(250);
    assert.deepEqual((await cam()).position,after.position);
  }
  const select = p.locator('#cameraView');
  await select.focus();
  const selectorOwnsArrow = await select.evaluate(el => el.dispatchEvent(
    new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true})));
  assert.ok(selectorOwnsArrow);
  await select.selectOption('overview');
  await p.waitForFunction(()=>__serienDiagnostics.snapshot().camera.preset === 'overview');
  await follow.click();
  await p.waitForTimeout(400);
  assert.deepEqual((await cam()).position, standard.position);
  console.log(scenario,'four arrows, keyup and re-entry passed');
  const speed = p.locator('[data-console-train="0"] input');
  await speed.focus();
  await p.keyboard.press('ArrowRight');
  assert.ok(Number(await speed.inputValue())>0);
  await speed.fill('0');
  await p.locator('[data-console-train="0"] [data-command=stop]').click();
  const menu = p.locator('.hc').getByRole('button',{name:'Menu',exact:true});
  await menu.click();
  const inDialog = await cam();
  await hold('ArrowDown',400);
  assert.deepEqual((await cam()).position,inDialog.position);
  await p.locator('#dlg').getByRole('button',{name:'Close',exact:true}).click();

  console.log(scenario,'UI guards passed');
  await speed.fill('38');
  await follow.click();
  await p.waitForFunction(()=>__serienDiagnostics.snapshot().stock[0].velocity>0);
  if (scenario === 'v06') await p.evaluate(() => {
    const canvas = document.querySelector('#view3d canvas');
    const recorder = new MediaRecorder(canvas.captureStream(24),{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:3000000});
    const chunks=[];
    window.stopFilm=()=>new Promise(resolve=>{
      recorder.onstop=async()=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(new Blob(chunks));
        recorder.stream.getTracks().forEach(track=>track.stop());
      };
      recorder.stop();
    });
    recorder.ondataavailable=e=>chunks.push(e.data);
    recorder.start();
  });
  const centered = async () => {
    const s = await snapshot(), engine = s.stock.find(t=>t.id===s.consoles.active).vehicles[0];
    assert.equal(s.camera.preset,'follow');
    assert.ok(Math.hypot(engine.x-s.camera.target[0], engine.z-s.camera.target[2])<1);
    return s;
  };
  const start = await centered();
  await hold('ArrowRight',1500);
  await hold('ArrowUp',800);
  await hold('ArrowLeft',1100);
  await hold('ArrowDown',700);
  assert.ok((await centered()).stock[0].odometer > start.stock[0].odometer);
  if (scenario==='v06') fs.writeFileSync(output+'/br01-follow.webm', Buffer.from(await p.evaluate(()=>stopFilm()),'base64'));
  // Advance along the actual route until the tender is on a different bearing from the start.
  const heading = s => {
    const [a,b]=s.stock[0].vehicles;
    return Math.atan2(a.z-b.z,a.x-b.x);
  };
  let curved=false;
  for(let i=0;i<50 && !curved;i++){
    await p.evaluate(()=>__serienDiagnostics.step(.5));
    await p.evaluate(()=>new Promise(requestAnimationFrame));
    curved=Math.cos(heading(await centered())-heading(start))<.96;
  }
  assert.ok(curved,'curve reached');
  await p.evaluate(()=>document.activeElement.blur());
  await p.keyboard.press('Space');
  assert.equal((await centered()).stock[0].velocity,0);
  await p.locator('[data-console-train="0"] [data-command=reverse]').click();
  await speed.fill('25');
  await p.waitForFunction(()=>__serienDiagnostics.snapshot().stock[0].velocity<0);
  await centered();
  await p.locator('[data-console-train="0"] [data-command=stop]').click();
  await menu.click();
  const click = name => p.getByRole('button',{name,exact:true}).click();
  await click('Train Management');
  await click('Add BR 01 + tender');
  await p.evaluate(()=>new Promise(requestAnimationFrame));
  assert.equal((await centered()).consoles.active,1);
  for(const id of [1,0]){
    await click('Remove from layout');
    await click('Remove composition');
    assert.equal((await snapshot()).stock.length,id);
  }
  await p.locator('#tmD [data-close]').click();
  await p.locator('#dlg').getByRole('button',{name:'Close',exact:true}).click();
  await follow.click();
  const empty = await cam();
  await hold('ArrowRight',300);
  assert.ok((await cam()).position.every((v,i)=>Math.abs(v-empty.position[i])<1e-6));
  await p.locator('[data-preset=station]').click();
  await p.waitForFunction(()=>Math.abs(__serienDiagnostics.snapshot().camera.position[0]-990)<0.001);
  await p.evaluate(()=>document.activeElement.blur());
  const station = await cam();
  await hold('ArrowRight',400);
  assert.ok((await cam()).position.every((v,i)=>Math.abs(v-station.position[i])<0.01));
  assert.deepEqual(errors,[]);
  console.log(scenario,'PASS');
  await p.close();
}

(async()=>{
  const browser = await chromium.launch({executablePath:process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-unsafe-swiftshader']});
  try { for(const scenario of ['v06','legacy']) await verify(browser,scenario); }
  finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
