"""Compare real browser command/state snapshots with the frozen v0.12 build.
Requires baseline at 8001 and candidate at 8000; runs browsers sequentially.
"""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('docs/phase-5b');out.mkdir(parents=True,exist_ok=True)

def exercise(browser,url):
 page=browser.new_page(viewport={'width':650,'height':760});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(url+'?diagnostics=1',wait_until='domcontentloaded')
 page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
 page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
 page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
 page.evaluate("document.getElementById('rollingModels').value='native';document.getElementById('rollingModels').dispatchEvent(new Event('change'));__serienDiagnostics.step(0)")
 result=page.evaluate('''()=>{
  const api=__serienDiagnostics,$=s=>document.querySelector(s),select=id=>$('[data-train="'+id+'"]').click();
  const read=()=>{const s=api.snapshot();return {consoles:s.consoles,nextSwitch:s.nextSwitch,stock:s.stock,detached:s.detached,pendingStops:s.pendingStops,log:$('#log').textContent,cards:[...document.querySelectorAll('.trainConsole')].map(e=>({id:e.dataset.consoleTrain,text:e.innerText})),mission:$('#missionStatus').textContent};};
  const stages={initial:read()};
  for(const id of [0,1,2]){select(id);$('#speed').value=20+id*10;$('#speed').dispatchEvent(new Event('input'));}api.step(1.5);stages.moving=read();
  $('#stopAll').click();select(0);$('#reverse').click();$('#uncouple').click();stages.detached=read();$('#couple').click();$('#lights').click();stages.coupled=read();
  select(1);select(2);$('#addTrain').click();stages.fourth=read();$('#stopAll').click();stages.stopped=read();return stages;
 }''')
 page.wait_for_function('__serienDiagnostics.snapshot().stock[3].vehicles[0].couplers!==null',timeout=90000)
 assert not errors,errors
 page.close();return result

with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 before=exercise(b,os.environ.get('SERIEN_BASELINE_URL','http://127.0.0.1:8001/'))
 print('Baseline captured',flush=True)
 after=exercise(b,os.environ.get('SERIEN_URL','http://127.0.0.1:8000/'))
 # Geometry/hull arrays are compared, not render counters or frame timing.
 if before!=after:
  (out/'comparison-failure.json').write_text(json.dumps({'before':before,'after':after},indent=2)+'\n')
  raise AssertionError('Browser-visible command/state snapshots differ; see comparison-failure.json')
 (out/'browser-comparison.json').write_text(json.dumps({'result':'PASS','baseline':'618f538','stages':list(before),'compared':'full stock/hulls/animation, Journey, consists, HUD, consoles, messages and mission state','errors':[]},indent=2)+'\n')
 b.close();print('5B browser comparison PASS: six command/state snapshots identical',flush=True)
