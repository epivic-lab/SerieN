"""6B.1 real browser gate. Run from a scratch cwd; loopback server required.
Auth bootstrap is replaced ONLY in this local harness. No production Auth/DB call.
"""
import json, os, copy
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('SERIEN_EVIDENCE','evidence-6b1'));out.mkdir(parents=True,exist_ok=True)
results=[];errors=[];external=[]
controlled=os.environ.get('SERIEN_CONTROLLED_RAF')=='1'
def check(ok,label):
 if not ok:raise AssertionError(label)
 results.append(label);print(label,flush=True)
def normalize(s):return {k:v for k,v in s.items() if k!='stateId'}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 def setup():
  page=b.new_page(viewport={'width':650,'height':760});page.set_default_timeout(120000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   if not r.request.url.startswith('http://127.0.0.1:8000/'):
    external.append(r.request.url);r.abort();return
   if '/auth-gate.js' in r.request.url:
    scheduler="let time=performance.now(),queue=[];performance.now=()=>time;window.requestAnimationFrame=fn=>(queue.push(fn),queue.length);window.cancelAnimationFrame=()=>{};window.__runTestFrame=ms=>{time+=ms;const batch=queue;queue=[];batch.forEach(fn=>fn(time));};" if controlled else ''
    r.fulfill(content_type='text/javascript',body=scheduler+"document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;import('/dist/game.js');")
   else:r.continue_()
  page.route('**/*',route)
  page.goto('http://127.0.0.1:8000/?diagnostics=1&persistenceTest=1',wait_until='domcontentloaded')
  page.wait_for_function('window.__serienPersistence!==undefined',polling=100)
  page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));window.confirm=()=>true")
  page.wait_for_function('(()=>{try{__serienPersistence.capture();return true;}catch{return false;}})()',polling=100)
  return page
 page=setup()
 # Three real R1 consists; changes use production commands and asset manager.
 page.evaluate('''()=>{const $=id=>document.getElementById(id);$('uncouple').click();$('nextMission').click();$('day').value=81;$('day').dispatchEvent(new Event('input'));document.querySelector('[data-train="1"]').click();$('reverse').click();$('lights').click();$('speed').value=26;$('speed').dispatchEvent(new Event('input'));__serienDiagnostics.step(.2);__serienDiagnostics.setSwitches(['Y-2','Y-R1']);}''')
 initial=page.evaluate("async()=>{document.getElementById('pause').click();const s=__serienPersistence.capture();await __serienPersistence.hydrate(s);return s;}")
 check(len(initial['trains'])==3 and len(initial['looseStock'])==1,'three trains and detached car captured')
 actual=page.evaluate('__serienPersistence.capture()')
 (out/'native-before.json').write_text(json.dumps(initial,indent=2)+'\n');(out/'native-after.json').write_text(json.dumps(actual,indent=2)+'\n')
 check(normalize(initial)==normalize(actual),'native three-train capture/hydrate/capture identical')
 # Corruption must leave all live state and gate intact.
 edits=[('collision',lambda s:s['trains'][1].update(journey=copy.deepcopy(s['trains'][0]['journey']),location=copy.deepcopy(s['trains'][0]['location']),routeContext=copy.deepcopy(s['trains'][0]['routeContext']))),('topology',lambda s:s.update(topologyHash='0'*64)),('schema',lambda s:s.update(schemaVersion=2)),('history',lambda s:s['trains'][0]['journey']['segments'][0].update(id='MISSING')),('orientation',lambda s:s['items'][0].update(orientation=-1)),('geometry',lambda s:s['models'][0]['couplers']['front'].update(x=999)),('unsafe view',lambda s:s['ui']['camera']['position'].__setitem__(1,-500))]
 for label,edit in edits:
  bad=copy.deepcopy(initial);edit(bad)
  error=page.evaluate("async s=>{try{await __serienPersistence.hydrate(s);return null;}catch(e){return e.message;}}",bad)
  check(bool(error),label+' refused')
  check(normalize(initial)==normalize(page.evaluate('__serienPersistence.capture()')),label+' leaves current state intact')
 check(page.evaluate("(()=>{try{__serienDiagnostics.step(1);return false;}catch{return true;}})()"),'diagnostic movement blocked before Resume')
 # Browser clock jump executes RAF across 10 min and 24h without ticking railway.
 if not controlled:page.clock.install()
 for ms in [600000,86400000]:
  if controlled:page.evaluate('ms=>__runTestFrame(ms)',ms)
  else:page.clock.fast_forward(ms)
  check(normalize(initial)==normalize(page.evaluate('__serienPersistence.capture()')),f'zero movement/tick after {ms//1000}s wall time')
 check(not page.evaluate('__serienDiagnostics.guardedStopState().audio.active'),'no bell event during restore')
 page.screenshot(path=str(out/'ready-stopped.png'))
 # Explicit Resume followed by new commands; fourth locomotive and full LRU.
 page.evaluate("document.getElementById('pause').click()")
 if controlled:
  page.evaluate('__runTestFrame(1000/60)')
  resumed=page.evaluate('__serienPersistence.capture()')
  check(resumed['time']['tickCount']-initial['time']['tickCount']<=1,'first Resume frame has no wall-clock catch-up')
 page.evaluate("document.getElementById('pause').click();document.getElementById('stopAll').click();document.getElementById('addTrain').click()")
 page.wait_for_function('(()=>{try{return __serienPersistence.capture().trains.length===4;}catch(e){console.log(e.message);return false;}})()',polling=100)
 page.evaluate("document.querySelector('[data-train=\"1\"]').click();document.querySelector('[data-train=\"2\"]').click();document.querySelector('[data-train=\"3\"]').click()")
 fourth=page.evaluate('__serienPersistence.capture()');page.evaluate('(s)=>__serienPersistence.hydrate(s)',fourth)
 check(normalize(fourth)==normalize(page.evaluate('__serienPersistence.capture()')),'fourth R1 train and full LRU roundtrip identical')
 # Fresh browser page simulates a different device, using an explicitly bound
 # LOCAL test context. This is no ownership proof and grants no cloud access.
 cold=setup();cold.evaluate('(s)=>__serienPersistence.bindLocalContext(s)',fourth)
 cold.evaluate('(s)=>__serienPersistence.hydrate(s)',fourth)
 check(normalize(fourth)==normalize(cold.evaluate('__serienPersistence.capture()')),'fresh page restores stable IDs and device-independent document')
 check(cold.evaluate("document.getElementById('sun').textContent")==('☀' if fourth['ui']['day']<42 else '◐' if fourth['ui']['day']<72 else '☾'),'fresh page regenerates day/night UI label')
 cold.close()
 # Change representation through production controls after explicit resume.
 page.evaluate("document.getElementById('pause').click();document.getElementById('pause').click();document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
 kenney=page.evaluate('__serienPersistence.capture()')
 check(any(m['representation']=='kenney' for m in kenney['models']),'Kenney models really active before capture')
 page.evaluate('(s)=>__serienPersistence.hydrate(s)',kenney)
 check(normalize(kenney)==normalize(page.evaluate('__serienPersistence.capture()')),'Kenney and native builder identity roundtrip identical')
 # A bad GLB response cannot silently fall back to native geometry.
 page.route('**/assets/kenney/train-locomotive-a.glb',lambda r:r.fulfill(body=b'corrupt',content_type='model/gltf-binary'))
 error=page.evaluate('''async s=>{try{await __serienPersistence.hydrate(s);return null;}catch(e){return e.message;}}''',kenney)
 check(bool(error) and 'checksum' in error,'corrupt GLB refused before scene commit')
 check(normalize(kenney)==normalize(page.evaluate('__serienPersistence.capture()')),'asset failure preserves previous fleet')
 page.unroute('**/assets/kenney/train-locomotive-a.glb')
 (out/'four-train-snapshot.json').write_text(json.dumps(fourth,indent=2)+'\n')
 check(not external,'zero external Auth/DB/network requests')
 check(not errors,'zero JavaScript page errors')
 (out/'browser-results.json').write_text(json.dumps({'status':'PASS','checks':results,'errors':errors,'externalRequests':external,'normalization':'stateId only; a new capture identity','scheduler':'controlled real tick/RAF callback' if controlled else 'browser RAF / Playwright clock'},indent=2)+'\n')
 print(json.dumps({'status':'PASS','checks':len(results),'evidence':str(out)}))
 b.close()
