from pathlib import Path
import json,time,traceback
from playwright.sync_api import sync_playwright
out=Path('/workspace/work/v06/browser-final-3');out.mkdir(exist_ok=True)
result={'status':'RUNNING','checks':[],'errors':[],'failedRequests':[],'auth':'local fixture only','renderer':'Chromium SwiftShader'}
def check(name,detail=True): result['checks'].append({'name':name,'detail':detail});print(name,flush=True);(out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':390,'height':844})
 context.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
 context.add_init_script("const raf=requestAnimationFrame.bind(window);window.__nativeRaf=raf;window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__smokeFrame=cb;return 1;}return raf(cb);};")
 p=context.new_page();p.set_default_timeout(30000)
 p.on('pageerror',lambda e:result['errors'].append(str(e)));p.on('console',lambda m:result['errors'].append(m.text) if m.type=='error' else None)
 p.on('requestfailed',lambda r:result['failedRequests'].append({'url':r.url.split('?')[0],'reason':r.failure}))
 def js(code,arg=None): return p.evaluate(code,arg)
 def snap(): return js('__serienDiagnostics.snapshot()')
 def rail():
  s=snap();return {'stock':[{k:t[k] for k in ['id','speed','requestedSpeed','velocity','dir','journey','odometer','modelKey']}|{'count':len(t['vehicles'])} for t in s['stock']],'switches':s['switchIndicators']['states'],'detached':s['detached']}
 def frame(): js('__smokeFrame(performance.now())')
 def shot(name): p.screenshot(path=str(out/(name+'.png')))
 def menu():
  if not p.locator('#dlg').evaluate('(e)=>e.open'):p.get_by_role('button',name='Menu',exact=True).first.click()
 def close_menu():
  if p.locator('#dlg').evaluate('(e)=>e.open'):p.locator('#dlg').get_by_role('button',name='Close',exact=True).click()
 def boot(profile):
  p.goto('http://127.0.0.1:8022/?diagnostics=1&scenario='+profile,wait_until='domcontentloaded')
  p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__smokeFrame)',timeout=240000)
  js("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__smokeFrame(performance.now())")
  p.wait_for_load_state('networkidle');p.wait_for_timeout(200)
 try:
  started=time.time();boot('v06');initial=snap();session=initial['scenario']['sessionId']
  assert initial['scenario']['edges']==79 and len(initial['scenario']['controllers'])==7 and len(initial['stock'])==3
  assert len(initial['scenario']['scenery']['modules'])==12 and initial['scenario']['scenery']['originalRailwayAttached'] is False
  assert all(t['speed']==t['velocity']==0 for t in initial['stock']);assert not initial['scenario']['scenery']['technical']
  check('V06 cold load and coherent identities',{'seconds':time.time()-started,'scenario':initial['scenario'],'render':initial['render']})
  shot('v06-mobile-low');p.set_viewport_size({'width':1440,'height':900});p.wait_for_timeout(200);frame();shot('v06-overview-low')
  assert js('document.documentElement.scrollWidth<=innerWidth');check('mobile and desktop surfaces')
  for id in initial['scenario']['controllers']:
   button=p.locator('button[data-switch-id="'+id+'"]');assert not button.is_disabled(),id
   button.click();assert next(s for s in snap()['switchIndicators']['states'] if s['id']==id)['on'] is True
   button.click();assert next(s for s in snap()['switchIndicators']['states'] if s['id']==id)['on'] is False
  check('seven trusted panel controls, both states')
  picks=[]
  for id in initial['scenario']['controllers']:
   paths=js('(id)=>__serienDiagnostics.turnoutView(id).paths',id);found=False
   for path in paths:
    for frac in [.35,.65,.5,.2,.8]:
     point=path['points'][int((len(path['points'])-1)*frac)]
     pixel=js('(p)=>__serienDiagnostics.projectPoint(p.x,8.53,p.z)',point)
     if not (0<pixel['x']<1440 and 0<pixel['y']<900):continue
     p.mouse.move(pixel['x'],pixel['y']);p.wait_for_timeout(30)
     if js('__serienDiagnostics.turnoutInteractionState().active')==id:
      p.mouse.click(pixel['x'],pixel['y']);p.wait_for_timeout(30)
      if next(s for s in snap()['switchIndicators']['states'] if s['id']==id)['on']:
       p.mouse.click(pixel['x'],pixel['y']);picks.append({'id':id,'point':point,'pixel':pixel});found=True;break
    if found:break
   assert found,('picking unavailable',id)
  frame();shot('v06-turnout-glow');check('seven trusted device picks',picks)
  p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(200);frame()
  cdp=context.new_cdp_session(p);cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':1})
  js("window.__touchEvents=[];document.addEventListener('pointerup',e=>__touchEvents.push({trusted:e.isTrusted,type:e.pointerType}),{capture:true})")
  point=picks[-1]['point'];pixel=js('(p)=>__serienDiagnostics.projectPoint(p.x,8.53,p.z)',point)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':pixel['x'],'y':pixel['y']}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});p.wait_for_timeout(100)
  assert any(e['trusted'] and e['type']=='touch' for e in js('__touchEvents'))
  assert next(s for s in snap()['switchIndicators']['states'] if s['id']=='WX-B')['on'] is True
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':pixel['x'],'y':pixel['y']}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});p.wait_for_timeout(100)
  assert next(s for s in snap()['switchIndicators']['states'] if s['id']=='WX-B')['on'] is False
  cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':False});cdp.detach();p.set_viewport_size({'width':1440,'height':900});p.wait_for_timeout(200);frame();check('trusted mobile touch device command',{'point':point,'pixel':pixel})
  before=rail();menu();p.locator('#scenarioTechnical').check();close_menu();frame();shot('v06-technical')
  assert rail()==before and snap()['scenario']['scenery']['technical'];menu();p.locator('#scenarioTechnical').uncheck();close_menu();frame();assert rail()==before
  check('technical toggle preserves railway state')
  for id in [0,1,2]:p.locator('[data-console-train="'+str(id)+'"] input.thr').fill('80')
  js('__serienDiagnostics.step(60)');moving=snap();assert all(t['odometer']>4000 for t in moving['stock']),[(t['odometer'],t.get('guard')) for t in moving['stock']]
  check('three native consists moving on real browser core', [{'id':t['id'],'odometer':t['odometer'],'vehicles':len(t['vehicles']),'guard':t.get('guard')} for t in moving['stock']])
  native=js('''async()=>{const values=[];for(let i=0;i<4;i++)await new Promise(resolve=>__nativeRaf(now=>{__smokeFrame(now);values.push({now,odometer:__serienDiagnostics.snapshot().stock[0].odometer});resolve();}));return values;}''')
  assert native[-1]['odometer']>native[0]['odometer'];check('four native RAF callbacks advance the engine',native)
  p.locator('#stopAll').click();assert all(t['velocity']==t['speed']==0 for t in snap()['stock'])
  # Each rendered vehicle and minimap is at the current Journey location.
  assert all(abs(v['x']-v['rendered']['x'])<1e-8 and abs(v['z']-v['rendered']['z'])<1e-8 for t in snap()['stock'] for v in t['vehicles'])
  check('STOP ALL, vehicles, Journey and minimaps coherent')
  ids_before=js('__serienDiagnostics.railwayState().identities')
  card=p.locator('[data-console-train="0"]');count=len(snap()['stock'][0]['vehicles']);card.locator('[data-command="uncouple"]').click();assert len(snap()['stock'][0]['vehicles'])==count-1 and len(snap()['detached'])==1
  card.locator('[data-command="couple"]').click();assert len(snap()['stock'][0]['vehicles'])==count and not snap()['detached'];assert js('__serienDiagnostics.railwayState().identities')==ids_before
  card.locator('[data-command="reverse"]').click();assert snap()['stock'][0]['dir']==-1
  card.locator('input.thr').fill('35');js('__serienDiagnostics.step(3)');p.locator('#stopAll').click();check('uncouple/couple identity and reverse')
  # Occupancy setup uses only the existing diagnostic fixture; the command is protected.
  js("__serienDiagnostics.placeTrain(0,'V06-P059',150)");before=rail();r=js("__serienDiagnostics.requestToggle('WX-A','device')")
  assert r['changed'] is False and r['reason']=='occupied' and rail()==before
  assert p.locator('button[data-switch-id="WX-A"]').is_disabled()
  check('occupied WX rejects device command and disables panel',r)
  # Reset via the existing guarded UI; then test all four real compositions.
  p.locator('#reset').click()
  if p.locator('.u5-guard[open]').count():p.locator('.u5-guard [data-confirm]').click()
  p.locator('#addTrain').click();assert len(snap()['stock'])==4 and p.locator('#addTrain').is_disabled()
  p.locator('[data-console-train="3"] input.thr').fill('35');js('__serienDiagnostics.step(3)');extra=snap()['stock'][3];assert extra['odometer']>0;p.locator('#stopAll').click();check('fourth locomotive moves through the real browser core',{'odometer':extra['odometer'],'guard':extra.get('guard')})
  p.locator('#reset').click()
  if p.locator('.u5-guard[open]').count():p.locator('.u5-guard [data-confirm]').click()
  assert len(snap()['stock'])==4 and all(t['speed']==t['velocity']==0 for t in snap()['stock'])
  check('fourth complete locomotive and reset on V06')
  # Real Train Management data exercises the reload guard, not a mock store.
  before=rail();menu();p.locator('#trainManagement').click();p.locator('[data-view="depot"]').click();p.get_by_label('Inventory model',exact=True).select_option('native-tank');p.locator('[data-depot-action="add"]').click();assert p.locator('[data-depot-id]').count()==1
  p.locator('[data-view="layout"]').click();p.locator('[data-composition="0"]').click();p.locator('[data-copy-train="0"]').click();p.get_by_label('Project name',exact=True).fill('V06 verified composition');p.locator('[data-project-action="confirm"]').click()
  p.locator('dialog.trainManagement [data-close]').click();close_menu();assert rail()==before
  check('Train Management project and Depot preserve physical fleet')
  # Rendering High is inspected separately from Low; no physical GPU promise.
  menu();p.locator('#quality').select_option('high');close_menu();beg=time.time();frame();shot('v06-overview-high');high=snap();check('High rendering',{'secondsForFrameAndCapture':time.time()-beg,'render':high['render'],'scenery':high['scenario']['scenery']})
  menu();p.locator('#quality').select_option('low');close_menu();frame()
  menu();p.locator('#scenarioProfile').select_option('legacy');assert p.locator('.scenario-guard[open]').is_visible();p.locator('.scenario-guard [data-cancel]').click();assert snap()['scenario']['sessionId']==session;assert rail()==before
  check('profile reload cancellation preserves session data')
  p.locator('#scenarioProfile').select_option('legacy')
  with p.expect_navigation(wait_until='domcontentloaded'):p.locator('.scenario-guard [data-confirm]').click()
  p.wait_for_function("Boolean(window.__serienDiagnostics&&window.__smokeFrame)&&__serienDiagnostics.snapshot().scenario.id==='legacy'",timeout=120000)
  js("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__smokeFrame(performance.now())")
  legacy=snap();assert legacy['scenario']['sessionId']!=session and len(legacy['stock'])==3 and legacy['scenario']['edges']==75
  assert legacy['scenario']['controllers']==['WX-A','WX-B','Y-IN','Y-2','Y-3','Y-R1','Y-R2','Y-4'];assert all(not v['edge'].startswith('V06-') for t in legacy['stock'] for v in t['vehicles'])
  shot('legacy-rollback');check('confirmed reload returns to coherent Legacy',legacy['scenario'])
  menu();p.locator('#trainManagement').click();p.locator('[data-view="depot"]').click();assert p.locator('[data-depot-id]').count()==0;p.locator('[data-view="projects"]').click();assert p.locator('[data-project-id]').count()==0
  p.locator('dialog.trainManagement [data-close]').click();close_menu();check('confirmed session-data loss is explicit and complete')
  assert not result['errors'],result['errors'];assert not result['failedRequests'],result['failedRequests']
  # Deliberate bad input cannot attach a partial V06 or silently start Legacy.
  failure=context.new_page();failure.route('**/assets/scenario-v06/dataset.json',lambda r:r.fulfill(status=200,content_type='application/json',body='{}'))
  failure.goto('http://127.0.0.1:8022/?scenario=v06',wait_until='domcontentloaded');failure.wait_for_function("document.getElementById('loadMsg').textContent.includes('could not')")
  assert not failure.evaluate('Boolean(window.__serienDiagnostics)') and failure.locator('#view3d canvas').count()==0
  failure.screenshot(path=str(out/'v06-integrity-failure.png'));failure.close();check('integrity failure has recovery and no partial runtime')
  result['status']='PASS'
 except Exception as e:
  result['status']='FAIL';result['failure']=repr(e);result['traceback']=traceback.format_exc();print(result['traceback'],flush=True)
  try:shot('failure');result['lastSnapshot']=snap()
  except Exception:pass
 finally:
  (out/'results.json').write_text(json.dumps(result,indent=2)+'\n');browser.close()
if result['status']!='PASS':raise SystemExit(1)
