"""M2 native RAF/railway co-existence gate, real production minified bundle.
Local HTML auth boundary; no RAF/timer overrides, pauses or diagnostic stepping.
Co-existence commands use ordinary DOM events; core editor actions are also
verified with trusted CDP mouse/touch events during continuous movement.
"""
import hashlib,json,os,re,time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('M2_RUNTIME_OUTPUT','work/m2-native-events'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
html=Path('index.html').read_text();html,n=re.subn(r'<script type="module">\s*import\("\./auth-gate\.js\?v=1"\).*?</script>','<script type="module" src="./dist/game.js"></script>',html,flags=re.S);assert n==1
html=html.replace('<head>','<head><base href="'+base+'">',1).replace('<body class="auth-locked">','<body>',1).replace('<section id="authGate"','<section hidden id="authGate"',1)
Path('work/m2-native-runtime.html').write_text(html)
r={'status':'IN PROGRESS','codeCheckpoint':os.popen('git rev-parse HEAD').read().strip(),'bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'method':'native RAF, no pauses/manual steps; DOM commands plus trusted CDP mouse/touch; local auth fixture','checks':{},'checkpoints':[],'pageErrors':[],'consoleErrors':[],'failedRequests':[],'httpFailures':[]}
def save():(out/'result.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1024,'height':768},device_scale_factor=1);page.set_default_timeout(90000)
 page.on('pageerror',lambda e:r['pageErrors'].append(str(e)))
 page.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None)
 page.on('requestfailed',lambda q:r['failedRequests'].append({'url':q.url,'error':q.failure}))
 page.on('response',lambda q:r['httpFailures'].append({'url':q.url,'status':q.status}) if q.status>=400 else None)
 page.add_init_script("window.__nativeRAF=requestAnimationFrame;document.addEventListener('DOMContentLoaded',()=>{const q=document.getElementById('quality');q.value='low';q.dispatchEvent(new Event('change'));},{once:true});")
 def click(selector):page.locator(selector).evaluate('(e)=>{if(e.disabled)throw Error("Disabled control");e.click();}')
 def checkpoint(name,count=3):
  state=page.evaluate("""()=>{const a=__serienDiagnostics,s=a.snapshot();return {nativeRAF:requestAnimationFrame===window.__nativeRAF&&requestAnimationFrame.toString().includes('[native code]'),hidden:document.hidden,stock:s.stock.map(t=>({id:t.id,speed:t.speed,velocity:t.velocity,travel:t.journey.travel,position:t.journey.position,vehicles:t.vehicles.map(v=>({x:v.x,z:v.z,rendered:v.rendered}))})),railway:a.railwayState(),active:s.consoles.active,render:s.render,quality:s.quality,sideIds:[...document.querySelectorAll('.sideStage image')].map(e=>e.dataset.sideVehicle),comparison:document.querySelector('[data-comparison]')?.dataset.comparison};}""")
  assert state['nativeRAF'] and not state['hidden'];assert sum(t['velocity']>.1 for t in state['stock'])==count
  for t in state['stock']:
   for v in t['vehicles']:assert abs(v['x']-v['rendered']['x'])<1e-8 and abs(v['z']-v['rendered']['z'])<1e-8
  state['name']=name;r['checkpoints'].append(state);save();return state
 def advanced(before,after,ids=(0,1,2)):
  assert all(after['stock'][i]['travel']>before['stock'][i]['travel'] for i in ids)
 def check(name):r['checks'][name]='PASS';save()
 try:
  page.goto(base+'work/m2-native-runtime.html?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
  assert hashlib.sha256(page.request.get(base+'dist/game.js').body()).hexdigest()==r['bundleSHA256']
  r['webgl']=page.evaluate("()=>{const gl=document.querySelector('#view3d>canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(e?e.UNMASKED_VENDOR_WEBGL:gl.VENDOR)};}")
  page.evaluate("""()=>{window.__nativeFrames=[];function observe(t){__nativeFrames.push(t);requestAnimationFrame(observe);}requestAnimationFrame(observe);for(const [id,v] of [[0,25],[1,30],[2,20]]){const e=document.querySelector('[data-console-train="'+id+'"] input');e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));}}""")
  page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.velocity>.1)');initial=checkpoint('three-moving-closed');page.wait_for_timeout(5000)
  click('#trainManagement');click('[data-composition="0"]');opened=checkpoint('three-moving-real-view');advanced(initial,opened)
  assert opened['sideIds']==opened['railway']['identities']['trains'][opened['active']];check('threeMovingAndM1IdentitySynchronization')
  click('[data-copy-train="0"]');assert page.locator('[data-comparison="matching"]').count()==1
  planned=page.locator('[data-planned-vehicle]').evaluate_all('(nodes)=>nodes.map(e=>e.dataset.plannedVehicle)');assert not set(planned)&set(initial['railway']['identities']['trains'][0])
  page.get_by_label('Project name',exact=True).evaluate('(e)=>{e.value="Native moving project";e.dispatchEvent(new Event("input",{bubbles:true}));}')
  click('[data-project-action="flip-'+planned[0]+'"]');click('[data-project-action="up-'+planned[2]+'"]');click('[data-project-action="down-'+planned[2]+'"]');click('[data-project-action="confirm"]')
  page.wait_for_timeout(5000);confirmed=checkpoint('project-confirmed-three-moving');advanced(opened,confirmed)
  assert confirmed['railway']['identities']==initial['railway']['identities'];assert confirmed['comparison']=='different';check('copyEditOrderOrientationConfirmWithoutPhysicalEffectsWhileThreeMove')
  click('[data-console-train="0"] [data-command="uncouple"]');click('[data-console-train="0"] [data-command="couple"]')
  guarded=checkpoint('moving-coupling-commands-refused');assert guarded['railway']['identities']==initial['railway']['identities'];assert 'Stop the train' in page.locator('#log').inner_text();assert 'Stop the train' in page.locator('.projectComparison').inner_text();check('actualR1CoupleAndUncoupleRefusedWhileMoving')
  click('[data-project-action="edit"]');click('[data-project-action="flip-'+planned[0]+'"]');click('[data-project-action="confirm"]');assert page.locator('[data-comparison="matching"]').count()==1
  for cycle in range(3):
   before=checkpoint('before-close-'+str(cycle));click('dialog [data-close]');page.wait_for_timeout(2000);click('#trainManagement');after=checkpoint('reopened-'+str(cycle));advanced(before,after)
   assert after['railway']['identities']==initial['railway']['identities']
  check('threeOpenCloseCyclesWithThreeAdvancingTrainsAndConfirmedProject')
  # Trusted mouse/touch bypass only Playwright's saturated input waiter.
  cdp=page.context.new_cdp_session(page)
  page.evaluate("window.__trustedEditorEvents=[];document.addEventListener('click',e=>{const b=e.target.closest('button');if(b)__trustedEditorEvents.push({trusted:e.isTrusted,action:b.dataset.projectAction,zoom:b.dataset.zoom,fit:b.hasAttribute('data-fit'),pointerType:e.pointerType});},true)")
  def native_click(selector,touch=False):
   xy=page.locator(selector).evaluate("""e=>{e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(e.disabled||!e.contains(document.elementFromPoint(x,y)))throw Error('Unavailable native target');return {x,y};}""")
   if touch:
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[xy]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
   else:
    cdp.send('Input.dispatchMouseEvent',{'type':'mouseMoved',**xy});cdp.send('Input.dispatchMouseEvent',{'type':'mousePressed','button':'left','clickCount':1,**xy});cdp.send('Input.dispatchMouseEvent',{'type':'mouseReleased','button':'left','clickCount':1,**xy})
  input_before=checkpoint('before-trusted-native-input')
  native_click('[data-project-action="edit"]');native_click('[data-project-action="flip-'+planned[0]+'"]');native_click('[data-project-action="confirm"]')
  mouse=checkpoint('confirmed-by-trusted-native-mouse');assert mouse['comparison']=='different' and mouse['railway']['identities']==initial['railway']['identities'];advanced(input_before,mouse);check('trustedNativeMouseEditOrientationConfirmWhileThreeMove')
  cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5})
  for width,height,label in [(1024,768,'landscape'),(768,1024,'portrait')]:
   page.set_viewport_size({'width':width,'height':height});native_click('[data-project-action="edit"]',True);native_click('[data-project-action="flip-'+planned[0]+'"]',True);native_click('[data-project-action="confirm"]',True)
   native_click('[data-zoom="in"]',True);native_click('[data-fit]',True)
   assert page.locator('.sideViewport').evaluate('(e)=>e.scrollLeft===0&&e.scrollWidth<=e.clientWidth+1');assert page.locator('dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
   current=checkpoint('confirmed-by-trusted-native-touch-'+label);assert current['railway']['identities']==initial['railway']['identities'];check('trustedNativeTouchEditConfirmZoomFit-'+label)
  r['trustedInputEvents']=page.evaluate('__trustedEditorEvents');assert sum(e['trusted'] for e in r['trustedInputEvents'])>=13;assert any(e['trusted'] and e['pointerType']=='mouse' for e in r['trustedInputEvents']);assert any(e['trusted'] and e['pointerType']=='touch' for e in r['trustedInputEvents'])
  # Restore the planned forward orientation for the physical comparison.
  click('[data-project-action="edit"]');click('[data-project-action="flip-'+planned[0]+'"]');click('[data-project-action="confirm"]');assert page.locator('[data-comparison="matching"]').count()==1
  # The composition stays visible while actual existing R1 commands change it.
  click('[data-console-train="0"] [data-command="stop"]');before_uncouple=checkpoint('one-stopped-two-moving',2)
  click('[data-console-train="0"] [data-command="uncouple"]');uncoupled=checkpoint('actual-tail-uncoupled-two-moving',2)
  assert uncoupled['comparison']=='changed';assert uncoupled['railway']['identities']['detached']==[initial['railway']['identities']['trains'][0][-1]]
  click('[data-console-train="0"] [data-command="couple"]');recoupled=checkpoint('actual-recoupled-two-moving',2)
  assert recoupled['comparison']=='matching' and recoupled['railway']['identities']==initial['railway']['identities'];advanced(before_uncouple,recoupled,(1,2));check('liveUncoupleRecoupleWithOtherTwoMovingAndPhysicalIdentityPreserved')
  page.locator('[data-console-train="0"] input').evaluate('(e)=>{e.value="25";e.dispatchEvent(new Event("input",{bubbles:true}));}');page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.velocity>.1)')
  for width,height,label in [(1024,768,'landscape'),(768,1024,'portrait')]:
   page.set_viewport_size({'width':width,'height':height});click('[data-zoom="in"]')
   page.locator('.sideViewport').evaluate('(e)=>{e.scrollLeft=e.scrollWidth;}');assert page.locator('.sideViewport').evaluate('(e)=>e.scrollLeft>0')
   click('[data-fit]');assert page.locator('.sideViewport').evaluate('(e)=>e.scrollLeft===0&&e.scrollWidth<=e.clientWidth+1')
   assert page.locator('dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth');checkpoint('native-project-'+label)
  page.locator('.projectEditor').evaluate('(e)=>e.scrollIntoView({block:"start"})');page.screenshot(path=str(out/'project-native-portrait.png'),timeout=120000);check('nativeProjectZoomScrollFitAndResponsiveViewsDuringMovement')
  click('[data-view="layout"]')
  for id in [2,0]:
   click('[data-composition="'+str(id)+'"]');state=checkpoint('selected-'+str(id));assert state['sideIds']==state['railway']['identities']['trains'][id];assert page.locator('.trainConsole.is-active').get_attribute('data-console-train')==str(id)
  page.screenshot(path=str(out/'real-trains-native.png'),timeout=120000);check('nativeRealSideConsoleAnd3DPositionsSynchronized')
  click('dialog [data-close]');page.wait_for_timeout(3000);final=checkpoint('final-three-moving');advanced(initial,final)
  frames=page.evaluate('__nativeFrames');(out/'frame-observations.json').write_text(json.dumps(frames)+'\n');assert len(frames)>10
  intervals=sorted(frames[i]-frames[i-1] for i in range(1,len(frames)));r['frameStats']={'frames':len(frames),'durationMs':frames[-1]-frames[0],'fps':1000*(len(frames)-1)/(frames[-1]-frames[0]),'p50Ms':intervals[len(intervals)//2],'p95Ms':intervals[min(len(intervals)-1,round(len(intervals)*.95))]}
  r['contextLost']=page.evaluate("document.querySelector('#view3d>canvas').getContext('webgl2').isContextLost()")
  assert not r['contextLost'] and not r['pageErrors'] and not r['consoleErrors'] and not r['failedRequests'] and not r['httpFailures'];check('continuousNativeRAFContextAndNoRuntimeErrors')
  r['status']='PASS';r['physicalGPUAndTouch']='NOT VERIFIED';r['scopeLimit']='Native RAF and trusted CDP mouse/touch verified in the software worker. Physical GPU/tablet hardware and fluidity remain NOT VERIFIED; DOM events also exercise co-existence and existing railway command handlers.'
 except Exception as e:
  r['status']='FAIL';r['failure']=str(e)
 finally:save();b.close()
 print(json.dumps({'status':r['status'],'checks':r['checks'],'failure':r.get('failure'),'frameStats':r.get('frameStats')},indent=2),flush=True)
if r['status']!='PASS':raise SystemExit(1)
