"""Production U7: real Projects/Depot and railway snapshots; local Auth boundary, on-demand RAF."""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U7_OUTPUT','work/u7-browser'));out.mkdir(parents=True,exist_ok=True)
r={'status':'RUNNING','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'checks':[],'errors':[],'nativeDialogs':[],'compare':{}}
def save():(out/'results.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':900},has_touch=True);p.set_default_timeout(45000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)));p.on('dialog',lambda d:(r['nativeDialogs'].append(d.type),d.dismiss()))
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 def js(s,a=None):return p.evaluate(s,a)
 def click(s):js('(s)=>document.querySelector(s).click()',s)
 def pa(n):click('[data-project-action="'+n+'"]')
 def tab(n):click('[data-view="'+n+'"]')
 def rail():return js('__serienDiagnostics.railwayState()')
 def slots():return p.locator('[data-planned-vehicle]').evaluate_all('(es)=>es.map(e=>e.dataset.plannedVehicle)')
 def state():return [p.get_by_label('Project name',exact=True).input_value(),slots(),p.locator('[data-planned-vehicle] small').all_text_contents()]
 def add(model):p.get_by_label('Catalog model',exact=True).select_option(model);pa('add')
 def comparison(expected):
  assert p.locator('[data-comparison]').get_attribute('data-comparison')==expected
  r['compare'][expected]=p.locator('[data-comparison]').inner_text();shot('compare-'+expected)
 def shot(n):p.wait_for_timeout(100);p.screenshot(path=str(out/(n+'.png')))
 def check(n):r['checks'].append(n);save();print('PASS '+n,flush=True)
 try:
  p.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8034/')+'?diagnostics=1');p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__frame)');click('#pause');js("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__frame(performance.now())");p.wait_for_load_state('networkidle');p.wait_for_function('__serienDiagnostics.snapshot().stock[1].vehicles[0].couplers?.front?.x===38');before=rail();click('#trainManagement');tab('projects');shot('dashboard-empty')
  pa('new');assert p.locator('[data-project-action="confirm"]').is_disabled();shot('composer-empty');p.get_by_label('Project name',exact=True).fill('Six vehicle project');add('native-steam')
  original=state();p.get_by_label('Catalog model',exact=True).evaluate('(e)=>e.value=""');pa('add');assert state()==original and p.locator('[role=alert]').count()==1;shot('atomic-invalid-operation')
  for model in ['native-tank','native-tank','native-flat','native-open','native-coach']:add(model)
  ids=slots();assert len(ids)==6 and len(set(ids))==6 and p.locator('[data-project-action="add"]').is_disabled();shot('six-vehicles');comparison('unlinked')
  pa('down-'+ids[1]);assert slots()==[ids[0],ids[2],ids[1],*ids[3:]];pa('flip-'+ids[2]);assert set(slots())==set(ids);shot('reorder-flip')
  # Rail-local keyboard cannot change a name input; all operations retain slot identities.
  p.get_by_label('Project name',exact=True).focus();old=slots();p.keyboard.press('Alt+ArrowRight');assert slots()==old
  click('[data-select-vehicle="'+ids[1]+'"]');p.keyboard.press('f');assert set(slots())==set(ids)
  click('[data-select-vehicle="'+ids[1]+'"]');p.keyboard.press('Alt+ArrowRight');assert slots().index(ids[1])==3
  # Invalid move of locomotive: real error, no partial state.
  click('[data-select-vehicle="'+ids[0]+'"]');old=state();p.keyboard.press('Alt+ArrowRight');assert state()==old
  r['physicalBefore']=before;r['physicalAfter']=rail();save();assert rail()==before
  check('new-max-six-unique-slots-reorder-flip-local-keyboard-input-exclusion-atomic-error-no-physical-mutation')
  # Dirty New/Cancel/readonly selection guard. No native confirm at any shell/Projects call site.
  saved=state();pa('new');assert p.locator('.u6-guard').is_visible();shot('guard-new');p.keyboard.press('Escape');assert state()==saved
  pa('cancel');shot('guard-cancel');click('.u6-guard [data-cancel]');assert state()==saved
  pa('confirm');pid=p.locator('[data-project-id]').get_attribute('data-project-id');confirmed=slots();assert p.locator('[data-project-action="link"]').count()==0 and p.locator('[data-project-action="name"]').count()==0
  pa('open-'+pid);assert slots()==confirmed and p.locator('[data-project-action="name"]').count()==0;shot('confirmed-readonly')
  pa('edit');p.get_by_label('Project name',exact=True).fill('Unconfirmed rename');pa('open-'+pid);shot('guard-view-confirmed');click('.u6-guard [data-cancel]');assert p.get_by_label('Project name',exact=True).input_value()=='Unconfirmed rename'
  pa('edit-'+pid);shot('guard-edit');click('.u6-guard [data-cancel]');assert p.get_by_label('Project name',exact=True).input_value()=='Unconfirmed rename'
  pa('cancel');js('()=>{const e=document.querySelector(".u6-guard [data-confirm]");e.click();e.click()}');assert slots()==confirmed and p.locator('[data-project-action="name"]').count()==0
  check('confirmed-selection-readonly-explicit-edit-guard-new-view-cancel-Escape-and-once-only-consent')
  # Reservations attach to confirmed slot identities, not equal model names.
  tab('depot');p.get_by_label('Inventory model',exact=True).select_option('native-tank');click('[data-depot-action="add"]');item=p.locator('[data-depot-id]').get_attribute('data-depot-id');click('[data-depot-action="assign-'+item+'"]');assert p.locator('[data-depot-id]').get_attribute('data-depot-state')=='reserved'
  target=p.locator('[data-depot-id]').inner_text();tab('projects');pa('edit');tank=slots()[1];pa('remove-'+tank);tab('depot');assert p.locator('[data-depot-id]').get_attribute('data-depot-state')=='reserved';tab('projects');pa('cancel');click('.u6-guard [data-confirm]');tab('depot');assert p.locator('[data-depot-id]').inner_text()==target
  tab('projects');pa('edit');pa('remove-'+tank);pa('confirm');tab('depot');assert p.locator('[data-depot-id]').get_attribute('data-depot-state')=='available';assert 'removed or changed' in p.locator('[data-depot-id]').inner_text()
  tab('projects');assert rail()==before
  check('Depot-reservation-draft-and-cancel-preserved-confirm-reconciles-by-slot-not-model-no-rail-transfer')
  # Five authentic comparisons, using actual R1 changes, never comparison mocks.
  tab('layout');click('[data-composition="1"]');click('[data-copy-train="1"]');comparison('matching');copy_ids=slots();pa('flip-'+copy_ids[1]);comparison('different')
  pa('flip-'+copy_ids[1]);click('#uncouple');js('__frame(performance.now())');comparison('changed');click('#couple');js('__frame(performance.now())');comparison('matching')
  pa('confirm');click('#reset');click('.u5-guard [data-confirm]');comparison('stale');assert p.locator('[data-project-action="link"]').count()==0
  pa('edit');pa('link');assert p.locator('[data-project-action="name"]').count()==1;assert p.locator('[data-comparison]').get_attribute('data-comparison')!='stale'
  check('five-real-Compare-states-draft-only-link-no-confirmed-relink-real-R1-change-reset-STALE')
  pa('cancel');click('.u6-guard [data-confirm]');pa('new');add('kenney-steam');add('kenney-box');assert p.locator('.sideStage image').evaluate_all('(es)=>es.every(e=>e.dataset.sideKey.startsWith("kenney"))');pa('confirm');pa('new');add('native-steam')
  for _ in range(5):add('native-tank')
  # Seven required viewports. Use genuine six-slot draft and original side preview.
  for w,h in [(1920,1080),(1440,900),(1280,800),(1024,768),(820,1180),(768,1024),(390,844)]:
   p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(150);js('document.querySelector(".managementBody").scrollTop=0');shot(str(w)+'-composer')
   assert p.locator('#tmD').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
   slider=p.locator('.managementProjects').get_by_label('Side view zoom level',exact=True);slider.fill('6');slider.dispatch_event('input');p.locator('.managementProjects .sideViewport').evaluate('(e)=>{e.scrollLeft=e.scrollWidth}');assert p.locator('.managementProjects .sideViewport').evaluate('(e)=>e.scrollLeft>0');shot(str(w)+'-zoom-scroll');click('.managementProjects [data-fit]');assert p.locator('.managementProjects .sideViewport').evaluate('(e)=>e.scrollLeft===0')
   assert p.locator('.u7-projects button').evaluate_all('(es)=>es.every(e=>e.getBoundingClientRect().height>=44)')
  p.locator('.u7-tray img').first.evaluate('(e)=>e.dispatchEvent(new Event("error"))');shot('fallback');assert 'unavailable' in p.locator('.u7-tray img').first.get_attribute('alt')
  pa('confirm');click('dialog.trainManagement [data-close]');click('#trainManagement');tab('projects');assert p.locator('[data-project-id]').count()==4
  pa('edit');js('window.__oldProjectInput=document.querySelector("[data-project-action=name]")');p.get_by_label('Project name',exact=True).fill('Pending disposed');pa('new');assert p.locator('.u6-guard').is_visible();js('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}))');assert p.locator('#tmD').count()==0 and p.locator('.u6-guard').count()==0
  js('__oldProjectInput.value="Late disposed input";__oldProjectInput.dispatchEvent(new Event("input"))')
  assert not r['errors'] and not r['nativeDialogs'],r
  check('seven-viewports-native-Kenney-preview-zoom-Fit-fallback-session-reopen-and-pending-dispose')
  r['status']='PASS';save()
 except Exception as e:r['status']='FAIL';r['failure']=str(e);save();shot('failure');raise
 finally:b.close()
