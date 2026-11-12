"""Final U9 production bundle. The browser's native RAF function is never replaced.
Independent RAF observer only counts frames. No manual simulation/render steps.
"""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U9_NATIVE_OUTPUT','work/u9-native'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8035/')
r={'status':'RUNNING','method':'unaltered native RAF, production minified bundle, local Auth boundary','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'cssSHA256':hashlib.sha256(Path('ui/css/serien-ui-integration.css').read_bytes()).hexdigest(),'inputMethod':'selected trusted mouse/touch/keyboard + DOM activation' if os.environ.get('U9_NATIVE_FAST_INPUT') else 'trusted CDP pointer activation','checks':[],'checkpoints':[],'errors':[],'httpFailures':[],'external':[],'consoleErrors':[]}
def save():(out/'results.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':800,'height':700},has_touch=True);p.set_default_timeout(120000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)));p.on('console',lambda e:r['consoleErrors'].append(e.text) if e.type=='error' else None)
 p.on('response',lambda q:r['httpFailures'].append([q.url,q.status]) if q.status>=400 else None)
 p.on('request',lambda q:r['external'].append(q.url) if q.url.startswith('http') and not q.url.startswith(base) else None)
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 p.add_init_script("window.__originalRAF=requestAnimationFrame;window.__nativeFrames=[];function observe(t){__nativeFrames.push(t);requestAnimationFrame(observe)}requestAnimationFrame(observe);window.__trusted=[];document.addEventListener('click',e=>{if(e.isTrusted)__trusted.push({target:e.target.closest('button')?.textContent,pointerType:e.pointerType})},true);document.addEventListener('DOMContentLoaded',()=>{const e=document.getElementById('quality');e.value='low';e.dispatchEvent(new Event('change'))},{once:true});")
 cdp=p.context.new_cdp_session(p)
 def js(s,a=None):return p.evaluate(s,a)
 def click(s,touch=False):
  print('ACTION '+s,flush=True)
  if os.environ.get('U9_NATIVE_FAST_INPUT') and not touch and s not in ['[data-train="3"]','#trainManagement']:
   p.locator(s).first.evaluate("e=>{if(e.disabled)throw Error('Disabled command');e.click()}");return
  xy=p.locator(s).first.evaluate("e=>{e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(e.disabled||!e.contains(document.elementFromPoint(x,y)))throw Error('Native target covered: '+e.outerHTML);return {x,y}}")
  if touch:
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[xy]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  else:
   cdp.send('Input.dispatchMouseEvent',{'type':'mouseMoved',**xy});cdp.send('Input.dispatchMouseEvent',{'type':'mousePressed','button':'left','clickCount':1,**xy});cdp.send('Input.dispatchMouseEvent',{'type':'mouseReleased','button':'left','clickCount':1,**xy})
 def pa(n):click('[data-project-action="'+n+'"]')
 def tab(n):click('[data-view="'+n+'"]')
 def speeds(values):js("v=>{v.forEach((n,i)=>{const e=document.querySelector('[data-console-train=\"'+i+'\"] input');e.value=n;e.dispatchEvent(new Event('input',{bubbles:true}))})}",values)
 def check(n):r['checks'].append(n);save();print('PASS '+n,flush=True)
 def snap(n,moving=None):
  d=js('''()=>{const s=__serienDiagnostics.snapshot();return {native:requestAnimationFrame===__originalRAF&&requestAnimationFrame.toString().includes('[native code]'),visible:!document.hidden,stock:s.stock.map(t=>({id:t.id,speed:t.speed,velocity:t.velocity,travel:t.journey.travel,vehicles:t.vehicles})),identities:__serienDiagnostics.railwayState().identities,render:s.render,camera:s.camera.preset,canvasCount:document.querySelectorAll('canvas').length,inventory:[...document.querySelectorAll('[data-depot-id]')].map(e=>({id:e.dataset.depotId,state:e.dataset.depotState})),slots:[...document.querySelectorAll('[data-depot-planned-id]')].map(e=>e.dataset.depotPlannedId),generation:[...document.querySelectorAll('[data-generation]')].map(e=>e.dataset.generation)}}''')
  assert d['native'] and d['visible'] and d['canvasCount']==1,d
  if moving is not None:assert sum(t['velocity']>.1 for t in d['stock'])==moving,d
  for t in d['stock']:
   for v in t['vehicles']:assert abs(v['x']-v['rendered']['x'])<1e-8 and abs(v['z']-v['rendered']['z'])<1e-8
  d['name']=n;r['checkpoints'].append(d);save();return d
 try:
  p.goto(base+'?diagnostics=1',wait_until='domcontentloaded');p.wait_for_function('Boolean(window.__serienDiagnostics)');print('BOOT ready',flush=True);assert hashlib.sha256(p.request.get(base+'dist/game.js').body()).hexdigest()==r['bundleSHA256']
  speeds([15,15,15]);p.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.velocity>.1)');initial=snap('three-moving',3)
  click('#addTrain');speeds([15,15,15,15]);p.wait_for_function('__serienDiagnostics.snapshot().stock.length===4&&__serienDiagnostics.snapshot().stock.every(t=>t.velocity>.1)');four=snap('four-moving',4);assert four['identities']['trains'][:3]==initial['identities']['trains'];check('three-native-moving-real-trains-and-permitted-fourth-insertion')
  click('[data-train="3"]');p.locator('#trainDeck').focus();p.keyboard.press('Space');assert js('__serienDiagnostics.snapshot().stock.map(t=>t.speed)')==[15,15,15,0]
  click('#stopAll');snap('STOP-ALL',0);assert js('__serienDiagnostics.snapshot().stock.every(t=>!t.speed&&!t.velocity)')
  # STOP ALL is momentary; individual controls can immediately restart.
  speeds([15,15,15,0]);p.wait_for_function('__serienDiagnostics.snapshot().stock.slice(0,3).every(t=>t.velocity>.1)');before=snap('restart-after-STOP-ALL',3)
  click('#pause');paused=js('__serienDiagnostics.snapshot().stock.map(t=>t.journey.travel)');count=js('__nativeFrames.length');p.wait_for_function('n=>__nativeFrames.length>n+2',arg=count);assert paused==js('__serienDiagnostics.snapshot().stock.map(t=>t.journey.travel)');p.screenshot(path=str(out/'pause.png'));click('#pause');p.wait_for_function('a=>__serienDiagnostics.snapshot().stock[0].journey.travel>a',arg=paused[0]);check('Dock-selected-Space-individual-restart-momentary-STOP-ALL-Pause-Resume')
  # A real, unoccupied turnout through its original protected UI binding.
  switches=p.locator('#switchList button:not(:disabled)');assert switches.count()>0;switches.first.click();assert p.locator('.nextSwitchHUD').count()==1
  click('#camt');click('[data-preset=follow]');p.keyboard.press('Escape');p.wait_for_function('__serienDiagnostics.snapshot().camera.preset==="follow"');click('#viewHome');check('real-protected-switch-HUD-and-original-camera-Follow-Home')
  click('#trainManagement');tab('layout');click('[data-composition="0"]');click('[data-copy-train="0"]');pa('confirm');tab('depot');p.get_by_label('Inventory model',exact=True).select_option('native-tank');click('[data-depot-action=add]');saved=snap('Composer-and-Depot-during-native-motion',3)
  # Cancel and double confirmation, using trusted mouse/touch on the real native dialog.
  click('[data-depot-action^=remove-]');assert snap('pending-remove',3)['inventory']==saved['inventory'];click('.u6-guard [data-cancel]');assert snap('cancel-remove',3)['inventory']==saved['inventory']
  click('[data-depot-action=add]',True);extra=p.locator('[data-depot-id]').last.get_attribute('data-depot-id');click('[data-depot-action="remove-'+extra+'"]');click('.u6-guard [data-confirm]');assert snap('confirmed-remove',3)['inventory']==saved['inventory']
  tab('projects');pa('edit');p.get_by_label('Project name',exact=True).fill('U9 pending draft');pa('new');p.keyboard.press('Escape');assert p.get_by_label('Project name',exact=True).input_value()=='U9 pending draft'
  pa('cancel');click('.u6-guard [data-confirm]');tab('depot');p.screenshot(path=str(out/'native-depot.png'));click('dialog.trainManagement [data-close]');click('#trainManagement');tab('depot');reopened=snap('reopen-session-three-moving',3);assert reopened['inventory']==saved['inventory'] and reopened['slots']==saved['slots'];assert reopened['identities']==four['identities'];check('TM-Composer-Depot-trusted-mouse-touch-pending-Cancel-consent-session-and-identities')
  # Real reset is issued after closing the modal; virtual records and planned UUIDs survive.
  click('dialog.trainManagement [data-close]');click('#reset');p.screenshot(path=str(out/'reset-guard.png'));click('.u5-guard [data-confirm]');click('#trainManagement');tab('depot');reset=snap('reset-generation-virtual-data-retained',0);assert reset['inventory']==saved['inventory'] and reset['slots']==saved['slots'] and set(reset['generation'])=={'1'}
  tab('projects');assert p.locator('[data-comparison]').get_attribute('data-comparison')=='stale';p.screenshot(path=str(out/'reset-stale.png'));check('atomic-reset-generation-STALE-and-coherent-virtual-records-slots')
  r['frames']=js('__nativeFrames');r['trusted']=js('__trusted');assert any(e['pointerType']=='touch' for e in r['trusted']);assert not r['errors'] and not r['consoleErrors'] and not r['httpFailures'] and not r['external'],r
  assert not js("document.querySelector('canvas').getContext('webgl2').isContextLost()")
  r['frameStats']={'frames':len(r['frames']),'durationMs':r['frames'][-1]-r['frames'][0],'limit':'SwiftShader; functional evidence only, no hardware FPS/fluidity certification'};check('one-renderer-actual-geometric-scene-synchronization-native-RAF-no-runtime-errors');r['status']='PASS';save()
 except Exception as e:r['status']='FAIL';r['failure']=str(e);save();raise
 finally:b.close()
