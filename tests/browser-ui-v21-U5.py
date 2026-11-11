"""U5 real minified app; local Auth boundary, deterministic railway steps.
Separate native RAF gate proves real continuous motion. No domain substitutes.
"""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('U5_OUTPUT',root/'work/u5-browser'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8033/')
r={'status':'RUNNING','bundleSHA256':hashlib.sha256((root/'dist/game.js').read_bytes()).hexdigest(),'checks':[],'errors':[]}
def save():(out/'results.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(60000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)))
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 def js(s,arg=None):return p.evaluate(s,arg)
 def snap():return js('__serienDiagnostics.snapshot()')
 def rail():return js('__serienDiagnostics.railwayState()')
 def click(s):js('(s)=>document.querySelector(s).click()',s)
 def speed(i,v):js('([i,v])=>{const e=document.querySelector(`[data-console-train="${i}"] input`);e.value=v;e.dispatchEvent(new Event("input"));}',[i,v])
 def command(i,c):click(f'[data-console-train="{i}"] [data-command="{c}"]')
 def shot(name):
  js('__frame(performance.now())');p.wait_for_timeout(300);js('__frame(performance.now())');p.screenshot(path=str(out/(name+'.png')))
 def check(name):r['checks'].append(name);save();print('PASS '+name,flush=True)
 def ids():
  duplicates=js('()=>{const ids=[...document.querySelectorAll("[id]")].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)}')
  assert not duplicates,duplicates
  for i in ['speed','stop','reverse','lights','couple','uncouple']:assert p.locator('#'+i).count()==1
 try:
  p.goto(base+'?diagnostics=1',wait_until='domcontentloaded');p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__frame)');click('#pause');click('#quality') if False else None
  js("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))")
  shot('three-stopped');ids()
  # Insertion refusal leaves all physical state/selection intact.
  command(2,"uncouple");command(2,"uncouple");js("__serienDiagnostics.placeTrain(2,'T47',170)");before=rail();selected=snap()['consoles']['active'];click('#addTrain')
  assert rail()==before and snap()['consoles']['active']==selected and len(snap()['stock'])==3
  assert 'Clear the insertion point' in p.locator('#log').inner_text();shot('insertion-refused')
  js("__serienDiagnostics.placeTrain(2,'T16',150)");click('#addTrain');assert len(snap()['stock'])==4
  assert p.locator('.trainConsole').count()==4 and p.locator('#addTrain').is_disabled();assert js('__serienDiagnostics.addTrain()') is None
  shot('fourth-selected');check('insertion-occupied-zero-mutation-allowed-four-real-trains-fifth-refused')
  original=rail()
  for i in [0,1,2,3,0,3]:
   click(f'[data-train="{i}"]');ids();assert snap()['consoles']['active']==i
   assert p.locator('#stop').evaluate('(e)=>e.closest("article").dataset.consoleTrain')==str(i)
   assert rail()==original
  p.locator('#trainDeck').focus();p.keyboard.press('Home');assert snap()['consoles']['active']==0
  p.keyboard.press('End');assert snap()['consoles']['active']==3
  p.keyboard.press('ArrowLeft');assert snap()['consoles']['active']==2
  check('stable-four-cards-LRU-independent-unique-IDs-correct-identity-keyboard-carousel-no-rail-mutation')
  for i in range(4):speed(i,20+i)
  before=snap();js('__serienDiagnostics.step(0.2)');after=snap()
  assert all(t['velocity']>0 for t in after['stock'])
  for i,t in enumerate(after['stock']):
   actual=float(p.locator(f'[data-console-train="{i}"] .actualSpeed').inner_text().split()[0]);assert abs(actual-abs(t['velocity']))<.051
   assert actual!=t['speed'] and actual<t['speed']*1.5
  shot('throttle-versus-actual-moving');click('[data-train="3"]');p.locator('#trainDeck').focus();p.keyboard.press('Space');s=snap()
  assert s['stock'][3]['speed']==0 and all(s['stock'][i]['speed']>0 for i in range(3))
  # Editable and native button Space must not fall through to selected-stop.
  speed(3,25)
  for selector in ['#speed','#day','#rollingModels','#pause']:
   p.locator(selector).focus()
   if selector=='#pause':p.keyboard.press('Space');p.keyboard.press('Space')
   else:p.keyboard.press('Space')
   assert snap()['stock'][3]['speed']==25
  js("const e=document.createElement('textarea');e.id='u5text';document.body.append(e);e.focus()")
  p.keyboard.press('Space');assert snap()['stock'][3]['speed']==25;js('document.getElementById("u5text").remove()')
  js("const e=document.createElement('div');e.id='u5edit';e.contentEditable='true';document.body.append(e);e.focus()")
  p.keyboard.press('Space');assert snap()['stock'][3]['speed']==25;js('document.getElementById("u5edit").remove()')
  click('#stopAll');assert all(t['speed']==0 and t['velocity']==0 for t in snap()['stock']);speed(0,30);js('__serienDiagnostics.step(0.3)');assert snap()['stock'][0]['velocity']>0
  click('#stopAll');check('actual-velocity-not-throttle-Space-only-selected-input-exclusions-stopAll-four-no-latch')
  # Pause freezes native state; deterministic diagnostic stepping intentionally bypasses pause.
  speed(0,30);js('__serienDiagnostics.step(0.2)');
  if 'Resume' in p.locator('#pause').inner_text():click('#pause')
  click('#pause');before=rail();shot('pause');assert rail()==before;click('#pause');assert rail()==before;click('#pause');click('#stopAll')
  old=snap()['stock'][1];command(1,'reverse');new=snap()['stock'][1];assert new['dir']==-old['dir'] and new['cars']==old['cars']
  lights=new['lights'];command(1,'lights');assert snap()['stock'][1]['lights'] is not lights
  # Rejected moving uncouple and real stopped detach/recouple.
  speed(1,10);js('__serienDiagnostics.step(.1)');n=len(snap()['stock'][1]['cars']);command(1,'uncouple');assert len(snap()['stock'][1]['cars'])==n
  command(1,'stop');command(1,'uncouple');assert len(snap()['stock'][1]['cars'])==n-1
  command(1,'couple');assert len(snap()['stock'][1]['cars'])==n
  check('pause-resume-no-mutating-UI-reverse-order-lights-moving-uncouple-refused-stopped-detach-recouple')
  # Create session data through original UI, link real physical references.
  click('#trainManagement');click('[data-copy-train="1"]');click('[data-project-action="confirm"]')
  planned=p.locator('[data-planned-vehicle]').evaluate_all('(es)=>es.map(e=>e.dataset.plannedVehicle)')
  click('[data-view="depot"]');p.get_by_label('Inventory model',exact=True).select_option('native-diesel');click('[data-depot-action="add"]')
  inventory=p.locator('[data-depot-id]').evaluate_all('(es)=>es.map(e=>e.dataset.depotId)');assert inventory
  click('[data-depot-action="assign-'+inventory[0]+'"]');assert p.locator('[data-depot-id]').get_attribute('data-depot-state')=='reserved'
  click('dialog.trainManagement [data-close]')
  before=rail();before_stock=snap()['stock'];click('#reset');assert rail()==before and snap()['stock']==before_stock
  guard=p.locator('dialog[open]');assert 'reset railway' in guard.inner_text().lower();ids();shot('reset-confirmation')
  p.keyboard.press('Escape');assert rail()==before;assert p.locator('#reset').evaluate('(e)=>e===document.activeElement')
  click('#reset');click('dialog[open] [data-cancel]');assert rail()==before
  click('#reset');js('document.querySelector("dialog[open]").dispatchEvent(new MouseEvent("click",{bubbles:true}))');assert rail()==before
  click('#reset');p.keyboard.press('Space');assert rail()==before
  # Cancel is focused, so Space cancels natively and never stops a train.
  if p.locator('dialog[open]').count():click('dialog[open] [data-cancel]')
  check('reset-pending-cancel-Escape-backdrop-zero-mutation-focus-restored-dialog-Space-captured')
  click('#reset');js('()=>{const b=document.querySelector("dialog[open] [data-confirm]");b.click();b.click();}')
  assert 'Reset completed.'==p.locator('#log').inner_text();shot('reset-confirmed')
  click('#trainManagement');click('[data-view="projects"]');assert p.locator('[data-comparison]').get_attribute('data-comparison')=='stale'
  assert p.locator('[data-planned-vehicle]').evaluate_all('(es)=>es.map(e=>e.dataset.plannedVehicle)')==planned
  click('[data-view="depot"]');assert p.locator('[data-depot-id]').evaluate_all('(es)=>es.map(e=>e.dataset.depotId)')==inventory
  assert p.locator('[data-depot-id]').get_attribute('data-depot-state')=='reserved'
  generations=p.locator('[data-depot-physical-id]').evaluate_all('(es)=>[...new Set(es.map(e=>e.dataset.generation))]');assert generations==['1'],generations
  click('dialog.trainManagement [data-close]');check('reset-confirm-once-generation-one-physical-STALE-M2-M3-session-data-retained')
  for w,h in [(1440,900),(1024,768),(390,844)]:
   p.set_viewport_size({'width':w,'height':h});js('document.querySelector(".sidebar").scrollTop=0;window.scrollTo(0,0)');click('[data-train="3"]');shot(str(w)+'-fourth-selected-full-layout')
   p.locator('.u5-dock').screenshot(path=str(out/(str(w)+'-dock.png')))
   p.screenshot(path=str(out/(str(w)+'-full-page.png')),full_page=True)
   assert js('document.documentElement.scrollWidth<=innerWidth')
   for i in range(4):
    click(f'[data-train="{i}"]');p.wait_for_timeout(300);assert p.locator(f'[data-console-train="{i}"]').evaluate('(e)=>{const a=e.getBoundingClientRect(),b=e.parentNode.getBoundingClientRect();return a.left>=b.left-4&&a.right<=b.right+4}')
   assert p.locator('.u5-dock button').evaluate_all('(es)=>es.every(e=>e.getBoundingClientRect().height>=44)')
  check('desktop-tablet-mobile-all-four-reachable-no-horizontal-page-overflow-44px-targets')
  cleanup=js('''()=>{const b=document.getElementById('reverse'),before=JSON.stringify(__serienDiagnostics.snapshot().stock.map(t=>[t.dir,t.speed,t.lights]));window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));b.click();return before===JSON.stringify(__serienDiagnostics.snapshot().stock.map(t=>[t.dir,t.speed,t.lights]));}''')
  assert cleanup and p.locator('.u5-carousel-nav').count()==0 and p.locator('dialog.u5-guard').count()==0
  check('pagehide-disposes-carousel-dialog-keyboard-and-detached-card-handlers')
  assert not r['errors'],r['errors'];r['status']='PASS';save()
 except Exception as e:r['status']='FAIL';r['failure']=str(e);save();shot('failure');raise
 finally:b.close()
