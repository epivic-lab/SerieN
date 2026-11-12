"""Production U8, real M2/M3/R1. Local auth boundary and on-demand RAF; separate native gate."""
import os,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U8_OUTPUT','work/u8-browser'));out.mkdir(parents=True,exist_ok=True)
r={'status':'RUNNING','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'checks':[],'errors':[],'dialogs':[]}
def save():(out/'results.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':900},has_touch=True);p.set_default_timeout(60000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)));p.on('dialog',lambda d:(r['dialogs'].append(d.type),d.dismiss()))
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 def js(s,a=None):return p.evaluate(s,a)
 def click(s):js('(s)=>document.querySelector(s).click()',s)
 def da(n):click('[data-depot-action="'+n+'"]')
 def pa(n):click('[data-project-action="'+n+'"]')
 def tab(n):click('[data-view="'+n+'"]')
 def items():return p.locator('[data-depot-id]').evaluate_all('(es)=>es.map(e=>({id:e.dataset.depotId,state:e.dataset.depotState,text:e.innerText}))')
 def rail():return js('__serienDiagnostics.railwayState()')
 def plans():return p.locator('[data-planned-vehicle]').evaluate_all('(es)=>es.map(e=>e.dataset.plannedVehicle)')
 def add(model):p.get_by_label('Inventory model',exact=True).select_option(model);da('add')
 def shot(n):p.wait_for_timeout(150);p.screenshot(path=str(out/(n+'.png')))
 def check(n):r['checks'].append(n);save();print('PASS '+n,flush=True)
 def consent():click('.u6-guard [data-confirm]')
 def cancel():click('.u6-guard [data-cancel]')
 try:
  p.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8035/')+'?diagnostics=1');p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__frame)');click('#pause');js("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__frame(performance.now())");p.wait_for_load_state('networkidle');p.wait_for_function('__serienDiagnostics.snapshot().stock[1].vehicles[0].couplers?.front?.x===38');baseline=rail();click('#trainManagement');tab('depot');shot('empty')
  assert not items() and p.locator('.depotTransferGate button').count()==0
  add('native-tank');add('native-tank');a,bid=[i['id'] for i in items()];assert a!=bid and all(i['state']=='available' for i in items());assert 'D001' in items()[0]['text'] and 'D002' in items()[1]['text'];assert p.locator('[data-depot-action="assign-'+a+'"]').is_disabled();shot('duplicates-no-compatible-slot');assert rail()==baseline
  check('unique-domain-IDs-progressive-codes-Available-no-slot-and-zero-physical-mutation')
  # Draft-only slots cannot be assigned.
  tab('projects');pa('new');p.get_by_label('Catalog model',exact=True).select_option('native-steam');pa('add')
  for _ in range(2):p.get_by_label('Catalog model',exact=True).select_option('native-tank');pa('add')
  slots=plans();tab('depot');assert p.locator('[data-depot-action="assign-'+a+'"]').is_disabled();shot('draft-only-no-target');tab('projects');pa('confirm');tab('depot')
  da('assign-'+a);assert items()[0]['state']=='reserved' and p.locator('[data-depot-action="remove-'+a+'"]').is_disabled()
  options=p.locator('[data-depot-action="target-'+bid+'"] option').evaluate_all('(es)=>es.map(e=>e.value)');assert len(options)==1 and slots[1] not in options[0]
  da('assign-'+bid);assert all(i['state']=='reserved' for i in items());shot('reserved');saved=items()
  da('release-'+a);assert items()==saved;shot('release-pending');p.keyboard.press('Escape');assert items()==saved
  da('release-'+a);cancel();assert items()==saved
  da('release-'+a);js('()=>{const e=document.querySelector(".u6-guard [data-confirm]");e.click();e.click()}');assert items()[0]['state']=='available' and items()[1]==saved[1];shot('release-confirmed');da('assign-'+a)
  check('confirmed-only-exclusive-assign-Reserved-remove-disabled-release-consent-once-Cancel-Escape-no-mutation')
  # Pending remove protected on Cancel/Escape/backdrop and valid confirm exactly once.
  add('native-flat');extra=items()[-1]['id'];saved=items();da('remove-'+extra);assert items()==saved;shot('remove-pending');cancel();assert items()==saved
  da('remove-'+extra);p.keyboard.press('Escape');assert items()==saved
  da('remove-'+extra);js('document.querySelector(".u6-guard").dispatchEvent(new MouseEvent("click",{bubbles:true}))');assert items()==saved;shot('remove-cancelled')
  da('remove-'+extra);js('()=>{const e=document.querySelector(".u6-guard [data-confirm]");e.click();e.click()}');assert len(items())==2
  assert rail()==baseline;check('Remove-pending-Cancel-Escape-backdrop-no-mutation-and-confirm-once')
  # Original reconciliation uses confirmed slot identities only.
  tab('projects');pa('edit');pa('remove-'+slots[1]);tab('depot');assert all(i['state']=='reserved' for i in items());shot('dirty-draft-reservations-intact');tab('projects');pa('cancel');consent();tab('depot');assert all(i['state']=='reserved' for i in items())
  tab('projects');pa('edit');pa('down-'+slots[1]);p.get_by_label('Project name',exact=True).fill('Renamed with stable slots');pa('flip-'+slots[1]);pa('confirm');tab('depot');assert all(i['state']=='reserved' for i in items())
  tab('projects');pa('edit');pa('remove-'+slots[1]);p.get_by_label('Catalog model',exact=True).select_option('native-tank');pa('add');replacement=plans()[-1];assert replacement!=slots[1];pa('confirm');tab('depot');assert items()[0]['state']=='available' and items()[1]['state']=='reserved';assert 'removed or changed' in items()[0]['text'];shot('reconciliation-notice')
  assert rail()==baseline;check('draft-Cancel-reservations-preserved-reorder-name-flip-same-slot-valid-new-UUID-no-inheritance')
  # Real R1 detached remains on the track and does not become inventory.
  saved=items();click('#uncouple');js('__frame(performance.now())');assert p.locator('[data-depot-physical-state=detached-on-track]').count()==1 and items()==saved;physical=rail();shot('detached-on-track')
  da('remove-'+a);click('#reset');click('.u5-guard [data-confirm]');assert not p.locator('.u6-guard').is_visible() and items()==saved
  assert p.locator('[data-depot-physical-id]').evaluate_all('(es)=>es.every(e=>e.dataset.generation==="1")');assert p.locator('[data-depot-physical-state=detached-on-track]').count()==0
  post_reset=rail();click('dialog.trainManagement [data-close]');click('#trainManagement');tab('depot');assert items()==saved
  check('physical-detached-separate-reset-generation-cancels-pending-retains-inventory-reservations-session')
  for w,h in [(1920,1080),(1440,900),(1280,800),(1024,768),(820,1180),(768,1024),(390,844)]:
   p.set_viewport_size({'width':w,'height':h});js('document.querySelector(".managementBody").scrollTop=0');shot(str(w)+'-depot')
   assert p.locator('#tmD').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
   assert p.locator('.u8-depot button,.u8-depot select').evaluate_all('(es)=>es.every(e=>e.getBoundingClientRect().height>=44)')
   p.locator('.depotRailway').evaluate('(e)=>e.scrollIntoView({block:"start"})');shot(str(w)+'-physical')
  assert rail()==post_reset;assert p.locator('.depotRailway button,.depotPlans button,.depotTransferGate button').count()==0
  da('remove-'+a);js('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}))');assert p.locator('#tmD').count()==0 and p.locator('.u6-guard').count()==0
  assert not r['errors'] and not r['dialogs'],r;check('seven-viewports-targets-readonly-physical-no-transfer-and-pending-dispose')
  r['status']='PASS';save()
 except Exception as e:r['status']='FAIL';r['failure']=str(e);save();shot('failure');raise
 finally:b.close()
