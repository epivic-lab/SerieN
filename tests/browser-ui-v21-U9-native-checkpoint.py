"""Final U9 native scenario, batched DOM commands plus trusted pointer/keyboard.
Real production renderer/engine; original browser RAF never replaced or stepped.
Previously executed full native scenarios remain separate evidence.
"""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U9_NATIVE_OUTPUT','work/u9-native-checkpoint'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8035/')
r={'status':'RUNNING','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'cssSHA256':hashlib.sha256(Path('ui/css/serien-ui-integration.css').read_bytes()).hexdigest(),'method':'unchanged native RAF; batched actual DOM commands; trusted Dock keyboard/TM pointer/Depot touch; no manual frame or simulation step','checks':[],'checkpoints':[],'errors':[],'httpFailures':[],'external':[]}
def save():(out/'results.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':650,'height':700},has_touch=True);p.set_default_timeout(120000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)));p.on('response',lambda q:r['httpFailures'].append([q.url,q.status])if q.status>=400 else None);p.on('request',lambda q:r['external'].append(q.url)if q.url.startswith('http')and not q.url.startswith(base)else None)
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 p.add_init_script("window.__originalRAF=requestAnimationFrame;window.__frames=[];function observe(t){__frames.push(t);requestAnimationFrame(observe)}requestAnimationFrame(observe);document.addEventListener('DOMContentLoaded',()=>{document.getElementById('quality').value='low'},{once:true});")
 def js(s,a=None):return p.evaluate(s,a)
 def check(n):r['checks'].append(n);save();print('PASS '+n,flush=True)
 def snap(name,moving):
  d=js('''()=>{const s=__serienDiagnostics.snapshot();return {native:requestAnimationFrame===__originalRAF&&requestAnimationFrame.toString().includes('[native code]'),visible:!document.hidden,stock:s.stock.map(t=>({id:t.id,speed:t.speed,velocity:t.velocity,travel:t.journey.travel,vehicles:t.vehicles})),identities:__serienDiagnostics.railwayState().identities,render:s.render,canvasCount:document.querySelectorAll('canvas').length,inventory:[...document.querySelectorAll('[data-depot-id]')].map(e=>({id:e.dataset.depotId,state:e.dataset.depotState})),slots:[...document.querySelectorAll('[data-depot-planned-id]')].map(e=>e.dataset.depotPlannedId),generation:[...document.querySelectorAll('[data-generation]')].map(e=>e.dataset.generation)}}''')
  assert d['native'] and d['visible'] and d['canvasCount']==1
  assert sum(t['velocity']>.1 for t in d['stock'])==moving,d
  for t in d['stock']:
   for v in t['vehicles']:assert abs(v['x']-v['rendered']['x'])<1e-8 and abs(v['z']-v['rendered']['z'])<1e-8
  d['name']=name;r['checkpoints'].append(d);save();return d
 try:
  p.goto(base+'?diagnostics=1',wait_until='domcontentloaded');p.wait_for_function('Boolean(window.__serienDiagnostics)')
  assert hashlib.sha256(p.request.get(base+'dist/game.js').body()).hexdigest()==r['bundleSHA256']
  js('''()=>{window.q=s=>document.querySelector(s);window.click=s=>q(s).click();window.speeds=v=>v.forEach((n,i)=>{const e=q('[data-console-train="'+i+'"] input');e.value=n;e.dispatchEvent(new Event('input'))});window.__trusted=[];document.addEventListener('click',e=>{if(e.isTrusted)__trusted.push(e.pointerType)},true);speeds([15,15,15]);}''')
  p.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.velocity>.1)');three=snap('three-moving',3)
  js("click('#addTrain');speeds([15,15,15,15])");p.wait_for_function('__serienDiagnostics.snapshot().stock.length===4&&__serienDiagnostics.snapshot().stock.every(t=>t.velocity>.1)');four=snap('four-moving',4);assert four['identities']['trains'][:3]==three['identities']['trains'];check('three-moving-real-trains-permitted-fourth-and-exact-scene-identity')
  p.locator('#trainDeck').focus();p.keyboard.press('Space');assert js('__serienDiagnostics.snapshot().stock.map(t=>t.speed)')==[15,15,15,0]
  js("click('#lights');click('#reverse');click('#reverse');click('#stopAll')");stopped=snap('all-stopped',0);assert all(t['speed']==0 for t in stopped['stock'])
  js("speeds([15,15,15,0])");p.wait_for_function('__serienDiagnostics.snapshot().stock.slice(0,3).every(t=>t.velocity>.1)')
  pause=js("()=>{click('#pause');return {frames:__frames.length,travel:__serienDiagnostics.snapshot().stock.map(t=>t.journey.travel)}}")
  p.wait_for_function('n=>__frames.length>n+2',arg=pause['frames']);assert js('__serienDiagnostics.snapshot().stock.map(t=>t.journey.travel)')==pause['travel']
  js("click('#pause')");p.wait_for_function('x=>__serienDiagnostics.snapshot().stock[0].journey.travel>x',arg=pause['travel'][0]);check('Dock-Space-individual-controls-momentary-STOP-ALL-restart-and-Pause-Resume')
  r['cameraSwitch']=js('''()=>{const button=q('#switchList button:not(:disabled)'),id=button.dataset.switchId,before=__serienDiagnostics.indicatorState().states.find(x=>x.id===id).on;button.click();const after=__serienDiagnostics.indicatorState().states.find(x=>x.id===id).on;button.click();click('#camt');click('[data-preset=follow]');const follow=__serienDiagnostics.snapshot().camera.preset;return {id,before,after,follow,hud:!!q('.nextSwitchHUD')}}''');assert r['cameraSwitch']['before']!=r['cameraSwitch']['after'] and r['cameraSwitch']['follow']=='follow' and r['cameraSwitch']['hud'];p.keyboard.press('Escape');js("click('#viewHome')")
  p.locator('#trainManagement').click()
  js('''()=>{click('[data-view=layout]');click('[data-composition="0"]');click('[data-view=projects]');click('[data-project-action=new]');for(const m of ['native-steam','native-tank','native-tank']){q('[aria-label="Catalog model"]').value=m;click('[data-project-action=add]')}click('[data-project-action=link]');click('[data-project-action=confirm]');click('[data-view=depot]');const model=q('[aria-label="Inventory model"]');model.value='native-tank';model.dispatchEvent(new Event('change'));click('[data-depot-action=add]');click('[data-depot-action=add]');for(const card of [...document.querySelectorAll('[data-depot-id]')])click('[data-depot-action="assign-'+card.dataset.depotId+'"]')}''')
  saved=snap('Composer-Depot-three-moving',3);assert len(saved['slots'])==3 and len(saved['inventory'])==2 and all(i['state']=='reserved'for i in saved['inventory']);assert saved['identities']==four['identities'];assert all(saved['stock'][i]['travel']>three['stock'][i]['travel']for i in range(3))
  p.locator('[data-depot-action=add]').tap()
  js('''()=>{const id=[...document.querySelectorAll('[data-depot-id]')].at(-1).dataset.depotId;click('[data-depot-action="remove-'+id+'"]');if(document.querySelectorAll('[data-depot-id]').length!==3)throw Error('premature removal');click('.u6-guard [data-cancel]');if(document.querySelectorAll('[data-depot-id]').length!==3)throw Error('cancel mutated');click('[data-depot-action="remove-'+id+'"]');click('.u6-guard [data-confirm]')}''')
  assert snap('virtual-consent-cancel',3)['inventory']==saved['inventory'];p.screenshot(path=str(out/'native-depot.png'));check('real-switch-HUD-camera-TM-Composer-Depot-trusted-mouse-touch-consent-and-virtual-reservations')
  js("click('dialog.trainManagement [data-close]');click('#trainManagement');click('[data-view=depot]')");assert snap('close-reopen',3)['inventory']==saved['inventory']
  js("click('dialog.trainManagement [data-close]');click('#reset');click('.u5-guard [data-cancel]');click('#reset');click('.u5-guard [data-confirm]');click('#trainManagement');click('[data-view=depot]')")
  reset=snap('reset-generation',0);assert reset['inventory']==saved['inventory'] and reset['slots']==saved['slots'] and set(reset['generation'])=={'1'}
  js("click('[data-view=projects]')");assert p.locator('[data-comparison]').get_attribute('data-comparison')=='stale';p.screenshot(path=str(out/'reset-stale.png'));check('reset-cancel-confirm-generation-STALE-virtual-UUIDs-reservations-and-single-renderer')
  r['trusted']=js('__trusted');r['frames']=js('__frames');assert 'touch'in r['trusted'] and 'mouse'in r['trusted'];assert not r['errors'] and not r['httpFailures'] and not r['external'];assert not js("q('canvas').getContext('webgl2').isContextLost()")
  r['hardware']='SwiftShader functional validation only; physical GPU/FPS/audio/touch NOT VERIFIED';r['status']='PASS';save()
 except Exception as e:r['status']='FAIL';r['failure']=str(e);save();raise
 finally:b.close()
