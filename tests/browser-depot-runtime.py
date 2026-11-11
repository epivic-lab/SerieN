"""M3 co-existence on the minified production build with native RAF.
Local auth-free HTML harness; no render/timer overrides, pause or manual steps.
Core depot actions use DOM commands plus trusted CDP mouse and touch input.
"""
import hashlib,json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('M3_RUNTIME_OUTPUT','work/m3-native'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
html=Path('index.html').read_text();html,n=re.subn(r'<script type="module">\s*import\("\./auth-gate\.js\?v=1"\).*?</script>','<script type="module" src="./dist/game.js"></script>',html,flags=re.S);assert n==1
html=html.replace('<head>','<head><base href="'+base+'">',1).replace('<body class="auth-locked">','<body>',1).replace('<section id="authGate"','<section hidden id="authGate"',1);Path('work/m3-native.html').write_text(html)
r={'status':'IN PROGRESS','codeCheckpoint':os.popen('git rev-parse HEAD').read().strip(),'bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'method':'native RAF; no pause/manual steps; DOM commands and trusted CDP mouse/touch; local auth fixture','checks':{},'checkpoints':[],'pageErrors':[],'consoleErrors':[],'failedRequests':[],'httpFailures':[]}
def save():(out/'result.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':800,'height':700},device_scale_factor=1);page.set_default_timeout(120000)
 page.on('pageerror',lambda e:r['pageErrors'].append(str(e)));page.on('console',lambda e:r['consoleErrors'].append(e.text) if e.type=='error' else None);page.on('requestfailed',lambda e:r['failedRequests'].append(e.url));page.on('response',lambda e:r['httpFailures'].append({'url':e.url,'status':e.status}) if e.status>=400 else None)
 page.add_init_script("window.__originalRAF=requestAnimationFrame;document.addEventListener('DOMContentLoaded',()=>{const e=document.getElementById('quality');e.value='low';e.dispatchEvent(new Event('change'));},{once:true});")
 def check(name):r['checks'][name]='PASS';save()
 def snapshot(name,moving=3):
  s=page.evaluate("""()=>{const s=__serienDiagnostics.snapshot();return {nativeRAF:requestAnimationFrame===window.__originalRAF&&requestAnimationFrame.toString().includes('[native code]'),hidden:document.hidden,stock:s.stock.map(t=>({id:t.id,velocity:t.velocity,travel:t.journey.travel,vehicles:t.vehicles.map(v=>({x:v.x,z:v.z,rendered:v.rendered}))})),identities:__serienDiagnostics.railwayState().identities,render:s.render,inventory:[...document.querySelectorAll('[data-depot-id]')].map(e=>({id:e.dataset.depotId,state:e.dataset.depotState})),plans:[...document.querySelectorAll('[data-depot-planned-id]')].map(e=>e.dataset.depotPlannedId),detached:[...document.querySelectorAll('[data-depot-physical-state="detached-on-track"]')].map(e=>e.dataset.depotPhysicalId)};}""")
  assert s['nativeRAF'] and not s['hidden'] and sum(t['velocity']>.1 for t in s['stock'])==moving
  for t in s['stock']:
   for v in t['vehicles']:assert abs(v['x']-v['rendered']['x'])<1e-8 and abs(v['z']-v['rendered']['z'])<1e-8
  s['name']=name;r['checkpoints'].append(s);save();return s
 def click_native(selector,touch=False):
  xy=page.locator(selector).evaluate("""e=>{e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(e.disabled||!e.contains(document.elementFromPoint(x,y)))throw Error('Unavailable native target');return {x,y};}""")
  if touch:cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[xy]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  else:
   cdp.send('Input.dispatchMouseEvent',{'type':'mouseMoved',**xy});cdp.send('Input.dispatchMouseEvent',{'type':'mousePressed','button':'left','clickCount':1,**xy});cdp.send('Input.dispatchMouseEvent',{'type':'mouseReleased','button':'left','clickCount':1,**xy})
 try:
  page.goto(base+'work/m3-native.html?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
  assert hashlib.sha256(page.request.get(base+'dist/game.js').body()).hexdigest()==r['bundleSHA256']
  page.evaluate("""()=>{window.__m3Frames=[];function frame(t){__m3Frames.push(t);requestAnimationFrame(frame);}requestAnimationFrame(frame);window.__depotEvents=[];document.addEventListener('click',e=>{const b=e.target.closest('[data-depot-action]');if(b)__depotEvents.push({action:b.dataset.depotAction,trusted:e.isTrusted,pointerType:e.pointerType});},true);for(const [id,value] of [[0,25],[1,30],[2,20]]){const e=document.querySelector('[data-console-train="'+id+'"] input');e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));}}""")
  page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.velocity>.1)');initial=snapshot('three-moving-before-depot')
  page.evaluate("""()=>{const q=s=>document.querySelector(s),click=s=>q(s).click();click('#trainManagement');click('[data-composition="0"]');click('[data-view="projects"]');click('[data-project-action="new"]');for(const m of ['native-steam','native-tank','native-tank']){q('[aria-label="Catalog model"]').value=m;click('[data-project-action="add"]');}click('[data-project-action="confirm"]');click('[data-view="depot"]');q('[aria-label="Inventory model"]').value='native-tank';q('[aria-label="Inventory model"]').dispatchEvent(new Event('change'));click('[data-depot-action="add"]');click('[data-depot-action="add"]');for(const card of [...document.querySelectorAll('[data-depot-id]')])q('[data-depot-action="assign-'+card.dataset.depotId+'"]').click();}""")
  page.wait_for_timeout(3000);created=snapshot('virtual-inventory-reserved-three-moving');assert created['identities']==initial['identities'] and len(created['inventory'])==2 and all(i['state']=='reserved' for i in created['inventory']);assert len(created['plans'])==3;assert all(t['travel']>initial['stock'][i]['travel'] for i,t in enumerate(created['stock']));check('CreateReserveVirtualDepotAndM2ProjectWhileThreeAdvanceWithoutPhysicalMutation')
  cdp=page.context.new_cdp_session(page);item=created['inventory'][0]['id'];click_native('[data-depot-action="release-'+item+'"]');assert page.locator('[data-depot-id="'+item+'"]').get_attribute('data-depot-state')=='available'
  cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5});click_native('[data-depot-action="add"]',True);third=page.locator('[data-depot-id]').last.get_attribute('data-depot-id');click_native('[data-depot-action="remove-'+third+'"]',True)
  after_input=snapshot('trusted-mouse-touch-inventory-three-moving');assert after_input['identities']==initial['identities'] and after_input['plans']==created['plans'] and len(after_input['inventory'])==2
  r['trustedEvents']=page.evaluate('__depotEvents.filter(e=>e.trusted)');assert any(e['pointerType']=='mouse' for e in r['trustedEvents']) and sum(e['pointerType']=='touch' for e in r['trustedEvents'])>=2;check('TrustedNativeMouseReleaseAndTouchCreateRemoveDuringMovement')
  page.evaluate("""()=>{document.querySelector('[data-console-train="0"] [data-command="uncouple"]').click();document.querySelector('[data-console-train="0"] [data-command="couple"]').click();}""");guarded=snapshot('R1-moving-commands-refused');assert guarded['identities']==initial['identities'] and guarded['inventory']==after_input['inventory'];assert 'Stop the train' in page.locator('#log').inner_text();check('R1CoupleUncoupleRefusedInMotionWithDepotOpen')
  page.evaluate("document.querySelector('[data-console-train=\"0\"] [data-command=\"stop\"]').click();document.querySelector('[data-console-train=\"0\"] [data-command=\"uncouple\"]').click()")
  dropped=snapshot('real-wagon-detached-two-moving',2);assert dropped['detached']==[initial['identities']['trains'][0][-1]] and dropped['inventory']==after_input['inventory'] and dropped['plans']==created['plans']
  page.evaluate("document.querySelector('[data-console-train=\"0\"] [data-command=\"couple\"]').click()")
  recoupled=snapshot('same-wagon-recoupled-two-moving',2);assert recoupled['identities']==initial['identities'] and recoupled['inventory']==after_input['inventory'] and not recoupled['detached'];assert all(recoupled['stock'][i]['travel']>dropped['stock'][i]['travel'] for i in (1,2));check('R1UncoupleRecoupleOtherTwoMovingNeverConvertsPhysicalStockToDepot')
  page.evaluate("const e=document.querySelector('[data-console-train=\"0\"] input');e.value='25';e.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('dialog [data-close]').click();document.getElementById('trainManagement').click()")
  page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.velocity>.1)');final=snapshot('reopened-depot-final-three-moving');assert final['inventory']==after_input['inventory'] and final['plans']==created['plans'] and final['identities']==initial['identities'];assert all(t['travel']>initial['stock'][i]['travel'] for i,t in enumerate(final['stock']));check('SessionM2AndDepotSurviveCloseReopenWithThreeMoving')
  page.locator('.managementDepot').evaluate('(e)=>e.scrollIntoView({block:"start"})');page.screenshot(path=str(out/'native-depot.png'),timeout=120000)
  frames=page.evaluate('__m3Frames');assert len(frames)>5;(out/'frames.json').write_text(json.dumps(frames)+'\n');r['frameStats']={'frames':len(frames),'durationMs':frames[-1]-frames[0],'fps':1000*(len(frames)-1)/(frames[-1]-frames[0])};r['contextLost']=page.evaluate("document.querySelector('#view3d>canvas').getContext('webgl2').isContextLost()")
  assert not r['contextLost'] and not r['pageErrors'] and not r['consoleErrors'] and not r['failedRequests'] and not r['httpFailures'];check('NativeRAFSceneSynchronizationAndNoRuntimeErrors');r['status']='PASS';r['hardware']='NOT VERIFIED: software worker, not physical GPU/tablet or a fluidity benchmark.'
 except Exception as e:r['status']='FAIL';r['failure']=str(e)
 finally:save();b.close()
 print(json.dumps({'status':r['status'],'checks':r['checks'],'failure':r.get('failure'),'frameStats':r.get('frameStats')},indent=2),flush=True)
if r['status']!='PASS':raise SystemExit(1)
