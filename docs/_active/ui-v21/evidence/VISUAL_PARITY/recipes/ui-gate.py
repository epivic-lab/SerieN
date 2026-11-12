"""Actual current runtime, local Auth boundary and explicit isolated object observer.
Fixtures arrange real railway states; snapshots and guards are never mocked.
"""
import json,hashlib,os
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path('/workspace/SerieN');E=Path('/workspace/work/visual-parity/evidence/ui-gate');E.mkdir(parents=True,exist_ok=True)
r={'status':'RUNNING','productionBundleSHA256':hashlib.sha256((R/'dist/game.js').read_bytes()).hexdigest(),'observerSHA256':hashlib.sha256(Path('/workspace/work/visual-parity/observer.js').read_bytes()).hexdigest(),'checks':[],'errors':[],'httpFailures':[],'states':[],'textures':[],'provenance':'Real current app with local Auth bootstrap. Observer exposes real app objects for isolated fault setup; no production Auth or visual snapshot substitute.'}
def save():(E/'results.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 p=b.new_page(viewport={'width':1692,'height':877},reduced_motion='reduce');p.set_default_timeout(90000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)))
 p.on('response',lambda q:r['httpFailures'].append([q.url,q.status]) if q.status>=400 else None)
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
 p.route('**/dist/game.js*',lambda q:q.fulfill(path='/workspace/work/visual-parity/observer.js',content_type='text/javascript'))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 def js(s,a=None):return p.evaluate(s,a)
 def click(s):js('(s)=>document.querySelector(s).click()',s)
 def check(n):r['checks'].append(n);save();print('PASS '+n,flush=True)
 def frame():js('__frame(performance.now())')
 def menu():
  if not p.locator('#dlg').evaluate('(e)=>e.open'):p.locator('.top').get_by_role('button',name='Menu',exact=True).click()
 def close_menu():
  if p.locator('#dlg').evaluate('(e)=>e.open'):p.locator('#dlg').get_by_role('button',name='Close',exact=True).click()
 def shot(name):frame();p.screenshot(path=str(E/(name+'.png')),full_page=True)
 def bounds(selector):return p.locator(selector).evaluate('(e)=>{const q=e.getBoundingClientRect();return {x:q.x,y:q.y,width:q.width,height:q.height,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,padding:getComputedStyle(e).padding}}')
 def inside(child,parent):return child['x']>=parent['x']-1 and child['y']>=parent['y']-1 and child['x']+child['width']<=parent['x']+parent['width']+1 and child['y']+child['height']<=parent['y']+parent['height']+1
 try:
  p.goto('http://127.0.0.1:8041/?diagnostics=1',wait_until='networkidle');p.wait_for_function('Boolean(window.__u4&&window.__frame)')
  click('#pause');js("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))");frame()
  r['hudInitial']={s:bounds(s) for s in ['#nextSwitchHUD','#nextSwitchHUD>.mi','.nextSwitchHead','#nextSwitchBody','.nextSwitchMinimize']}
  for texture in ['brass-brushed','brass-spun','enamel-green','mahogany','parchment','steel-brushed']:
   response=p.request.get('http://127.0.0.1:8041/ui/assets/textures/'+texture+'.jpg');assert response.status==200;r['textures'].append({'name':texture,'http':response.status,'sha256':hashlib.sha256(response.body()).hexdigest()})
  r['computedMaterials']=js("()=>Object.fromEntries(['.app.st','.top>.mi','.plq','.edp','.m-env>.mi','.mapw','.trainConsole','.u5-gauge image'].map(s=>[s,[...document.querySelectorAll(s)].map(e=>({background:getComputedStyle(e).backgroundImage,href:e.getAttribute('href'),font:getComputedStyle(e).fontFamily}))]))")
  for selector,texture in [('.app.st','steel-brushed'),('.top>.mi','enamel-green'),('.plq','mahogany'),('.edp','brass-brushed'),('.mapw','parchment'),('.trainConsole','enamel-green')]:assert texture in r['computedMaterials'][selector][0]['background'],(selector,r['computedMaterials'][selector])
  assert js("document.querySelector('.railwayDefinitions image').getAttribute('href').includes('brass-spun')")
  check('six-original-textures-HTTP200-hashes-and-computed-runtime-materials')
  # Nothing in view controls/minimizing may acquire railway authority.
  rail=js('__serienDiagnostics.railwayState()')
  for _ in range(4):p.locator('.nextSwitchMinimize').click()
  assert js('__serienDiagnostics.railwayState()')==rail
  if p.locator('.nextSwitchMinimize').get_attribute('aria-expanded')=='false':p.locator('.nextSwitchMinimize').click()
  for w,h in [(1692,877),(1648,895),(1440,900),(1366,768),(1024,768),(390,844),(768,1024)]:
   p.set_viewport_size({'width':w,'height':h});js('window.scrollTo(0,0)');frame()
   p.wait_for_function("()=>{const a=document.querySelector('.trainConsole.is-active').getBoundingClientRect(),b=document.getElementById('trainDeck').getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1}")
   assert not js('document.documentElement.scrollWidth>innerWidth')
   box=bounds('#view3d');hud=bounds('#nextSwitchHUD');assert inside(hud,box),('HUD outside viewport',w,hud,box)
   assert js("[...document.querySelectorAll('.nextSwitchScheme svg')].every(e=>e.getBoundingClientRect().right<=document.getElementById('nextSwitchHUD').getBoundingClientRect().right)")
   p.locator('#camt').click();popup=bounds('#u3CameraTools');assert inside(popup,box),('Camera tools outside viewport',w,popup,box)
   r['states'].append({'state':'expanded-and-camera','viewport':[w,h],'hud':hud,'camera':popup,'world':box})
   p.screenshot(path=str(E/(f'{w}-expanded-camera.png')),full_page=True);p.keyboard.press('Escape')
   # The canvas remains a real, reachable WebGL2 surface.
   assert js("()=>{const c=document.querySelector('canvas'),b=c.getBoundingClientRect();return !!c.getContext('webgl2')&&[.3,.4,.5,.6].some(x=>[.3,.4,.5,.6].some(y=>document.elementFromPoint(b.x+b.width*x,b.y+b.height*y)===c))}")
  check('seven-viewports-expanded-HUD-schematic-camera-popup-contained-and-real-canvas-reachable')
  p.set_viewport_size({'width':1692,'height':877});js('window.scrollTo(0,0)')
  # Sidebar controls retain original callbacks and exact daylight thresholds.
  for label,value in [('Day',0),('Sunset',48),('Night',100)]:
   p.locator('.environment-modes').get_by_role('button',name=label,exact=True).click();assert js('__u4.getDay()')==value
   assert abs(float(js("getComputedStyle(document.querySelector('.app.st')).getPropertyValue('--n')"))-max(0,min(1,(value-35)/65)))<1e-6
  for value in [41,42,71,72]:
   d=js("v=>{const d=document.getElementById('day');d.value=v;d.dispatchEvent(new Event('input'));__frame(performance.now());return {value:__u4.getDay(),glyph:document.getElementById('sun').textContent,intensity:__u4.sun.intensity}}",value)
   expected=2.65+(0.16-2.65)*max(0,min(1,(value-35)/65));assert d['value']==value and abs(d['intensity']-expected)<1e-9
  menu();assert p.locator('#rollingModels').is_visible();p.locator('#rollingModels').focus();p.keyboard.press('Space');close_menu()
  check('real-daylight-presets-thresholds-secondary-settings-in-Menu-original-select-not-clone')
  # Assemble guarded-stop on a real misaligned yard approach, with real train geometry.
  guard=js("""()=>{const a=__serienDiagnostics,$=id=>document.getElementById(id);document.querySelector('[data-train="2"]').click();for(let i=0;i<5;i++)$('uncouple').click();a.setSwitches(['Y-4']);const t=a.snapshot().stock[2];a.placeTrain(2,'T47',-t.vehicles[0].couplers.back.x+80,-1);a.requestToggle('Y-4','panel');$('speed').value=100;$('speed').dispatchEvent(new Event('input'));a.step(5);return a.snapshot().stock[2].guard;}""")
  assert guard['state']=='GUARDED_STOP',guard
  frame();warning=p.locator('[data-ctrl=CTRL-047]').inner_text();assert guard['risk'] in warning and guard['reason'] in warning
  for w,h in [(1692,877),(1024,768),(390,844)]:
   p.set_viewport_size({'width':w,'height':h});js('window.scrollTo(0,0)');frame()
   for expanded in [False,True]:
    if (p.locator('.nextSwitchMinimize').get_attribute('aria-expanded')=='true')!=expanded:p.locator('.nextSwitchMinimize').click()
    assert p.locator('[data-ctrl=CTRL-047]').is_visible()
    assert inside(bounds('#guardedStopStatus'),bounds('#view3d'))
    assert inside(bounds('#nextSwitchHUD'),bounds('#view3d'))
    bell=bounds('#guardedStopStatus');hud=bounds('#nextSwitchHUD');assert bell['x']+bell['width']<=hud['x'] or bell['y']+bell['height']<=hud['y'] or hud['y']+hud['height']<=bell['y'],('Warning hidden by HUD',w,bell,hud)
    p.wait_for_function("()=>{const a=document.querySelector('.trainConsole.is-active').getBoundingClientRect(),b=document.getElementById('trainDeck').getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1}")
    shot(f'{w}-guard-'+('expanded' if expanded else 'minimized'))
    r['states'].append({'state':'guard-warning','viewport':[w,h],'expanded':expanded,'guard':guard,'warning':warning})
  p.set_viewport_size({'width':1440,'height':900});js('window.scrollTo(0,0)');click('#pause');frame()
  menu();p.locator('#bellSeg').click();assert js('__serienDiagnostics.guardedStopState().audio.muted')
  close_menu()
  p.locator('.top').get_by_role('button',name='UI sound, independent from railway warning bell',exact=True).click()
  assert js('__serienDiagnostics.guardedStopState().audio.muted')
  p.locator('#bellChip').click();assert not js('__serienDiagnostics.guardedStopState().audio.muted')
  assert p.locator('[data-ctrl=CTRL-047]').inner_text()==warning
  check('real-GUARDED_STOP-risk-visible-minimized-expanded-mobile-Bell-independent-from-UI-Sound')
  # Terminal/no-next-switch and travel direction are real diagnostic placements.
  js("__serienDiagnostics.placeTrain(2,'T50',100,-1);__serienDiagnostics.step(0)");frame()
  assert js('__serienDiagnostics.snapshot().nextSwitch.stop')=='terminal'
  assert p.locator('.nextSwitchName').inner_text()=='No switches ahead'
  assert 'End of track in' in p.locator('.nextSwitchDistance').inner_text();shot('hud-terminal')
  js("""()=>{window.__prepareParity=()=>{const a=__serienDiagnostics,$=id=>document.getElementById(id);$('reset').click();document.querySelector('.u5-guard [data-confirm]').click();$('pause').click();a.setSwitches([]);['T12','T0','T16'].forEach((e,i)=>a.placeTrain(i,e,150));document.querySelector('[data-train="2"]').click();for(let i=0;i<5;i++)$('uncouple').click();};}""")
  for kind in ['occupied','approaching','unknown']:
   state=js("""kind=>{__prepareParity();const a=__serienDiagnostics,u=__u3,v=__u4,$=id=>document.getElementById(id);let id='Y-4';
    if(kind==='occupied'){a.setSwitches(['Y-4']);a.placeTrain(2,'TO4:AC',100,-1);}
    if(kind==='approaching'){a.setSwitches(['Y-4']);const t=u.trains[2];a.placeTrain(2,'T47',-t.group.userData.couplers.back.x+120,-1);$('speed').value=100;$('speed').dispatchEvent(new Event('input'));t.velocity=-100;}
    if(kind==='unknown'){document.querySelector('[data-train="0"]').click();for(let i=0;i<5;i++)$('uncouple').click();a.placeTrain(0,'T12',150,1);const t=u.trains[0],next=v.getSwitchAssistance().preview.next;t.journey.ensure(t.journey.position+5000,v.route);t.journey.move(next.distance-150,0,v.route,t.group.userData.couplers.front.x);u.renderVehicles();id=next.site.controls[0];const control=v.switchSpecs.find(s=>s.id===id);control.on=!control.on;t.velocity=150;}
    v.ui();u.nextSwitchHUD.refresh(true);v.sidebarUI.update();return {id,safety:v.getSwitchAssistance().safetyByControl.get(id),preview:v.getSwitchAssistance().preview.stop};}""",kind)
   assert state['safety']['blocked'] and state['safety']['kind']==kind,state
   tile=p.locator('[data-switch][data-switch-id="'+state['id']+'"]');assert tile.is_disabled()
   assert p.locator('#switchReason-'+state['id']).inner_text()==state['safety']['message']
   rail=js('__serienDiagnostics.railwayState()');tile.dispatch_event('click');assert js('__serienDiagnostics.railwayState()')==rail
   if p.locator('.nextSwitchMinimize').get_attribute('aria-expanded')=='false':p.locator('.nextSwitchMinimize').click()
   shot('hud-'+kind);r['states'].append({'state':kind,**state})
  js("""()=>{__prepareParity();document.querySelector('[data-train="0"]').click();const s=document.getElementById('speed');s.value=25;s.dispatchEvent(new Event('input'));__serienDiagnostics.step(.3);document.getElementById('reverse').click();__u3.nextSwitchHUD.refresh(true);}""")
  assert js('__u3.nextSwitchHUD.snapshot.inverting')
  assert 'Braking to reverse' in p.locator('.nextSwitchWarning').inner_text();shot('hud-braking-to-reverse')
  check('occupied-approaching-stale-history-UNKNOWN-and-braking-direction-real-engine-states-visible-and-fail-closed')
  # Full current log is visible in the compact summary and original disclosure.
  preview=p.locator('.u3-log-preview').text_content();full=p.locator('#log').text_content();assert preview==full,{'preview':preview,'full':full}
  p.locator('.u3-operations summary').click();assert p.locator('#log').is_visible();p.locator('.u3-operations summary').click()
  menu();p.locator('#trainManagement').click()
  for view in ['layout','catalog','projects','depot']:p.locator('[data-view='+view+']').click();assert p.locator('#tmD').evaluate('(e)=>e.open')
  p.locator('#tmD [data-close]').click();assert p.locator('#trainManagement').evaluate('(e)=>document.activeElement===e');close_menu()
  check('terminal-HUD-entire-engine-log-disclosure-TM-all-views-and-Menu-focus-return')
  ids=js("()=>{const a=[...document.querySelectorAll('[id]')].map(e=>e.id);return a.filter((x,i)=>a.indexOf(x)!==i)}");assert not ids,ids
  assert p.locator('#view3d canvas').count()==1
  assert not r['errors'] and not r['httpFailures'],r
  r['status']='PASS';save()
 except Exception as e:r['status']='FAIL';r['failure']=str(e);save();raise
 finally:b.close()
