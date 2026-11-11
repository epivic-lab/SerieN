"""M3 functional UI on the production minified bundle. Local auth fixture,
on-demand software rendering; the native movement gate is separate.
"""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('M3_OUTPUT','work/m3-browser'));out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
r={'status':'IN PROGRESS','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'method':'production minified, local auth fixture, on-demand renderer','checks':{},'pageErrors':[],'httpFailures':[],'failedRequests':[]}
def save():(out/'result.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':1440,'height':1000},has_touch=True);page.set_default_timeout(30000)
 page.on('pageerror',lambda e:r['pageErrors'].append(str(e)));page.on('requestfailed',lambda e:r['failedRequests'].append(e.url));page.on('response',lambda e:r['httpFailures'].append({'url':e.url,'status':e.status}) if e.status>=400 else None)
 page.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 page.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__m3Frame=cb;return 1;}return raf(cb);};")
 def depot():page.locator('[data-view="depot"]').click()
 def projects():page.locator('[data-view="projects"]').click()
 def da(key):return page.locator('[data-depot-action="'+key+'"]')
 def pa(key):return page.locator('[data-project-action="'+key+'"]')
 def add(model):page.get_by_label('Inventory model',exact=True).select_option(model);da('add').click()
 def planned():return page.locator('[data-planned-vehicle]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.plannedVehicle)')
 def items():return page.locator('[data-depot-id]').evaluate_all('(nodes)=>nodes.map(n=>({id:n.dataset.depotId,state:n.dataset.depotState}))')
 def railway():return page.evaluate('({railway:__serienDiagnostics.railwayState(),stock:__serienDiagnostics.snapshot().stock})')
 def check(name):r['checks'][name]='PASS';save()
 try:
  page.goto(base+'?diagnostics=1',wait_until='domcontentloaded');page.wait_for_function('Boolean(window.__serienDiagnostics&&window.__m3Frame)',timeout=90000)
  page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click();__m3Frame(performance.now())")
  page.locator('#trainManagement').click();depot();initial=railway();assert len(items())==0
  assert page.locator('[data-depot-physical-id]').count()==sum(map(len,initial['railway']['identities']['trains']))
  add('native-tank');add('native-tank');a,bid=[v['id'] for v in items()];assert a!=bid and all(v['state']=='available' for v in items())
  assert da('assign-'+a).is_disabled() and da('enter').is_disabled() and da('exit').is_disabled()
  assert page.evaluate("()=>{const e=new Event('beforeunload',{cancelable:true});dispatchEvent(e);return e.defaultPrevented;}")
  assert railway()==initial;check('duplicateVirtualInventorySeparateFromCatalogPhysicalAndBeforeUnload')
  projects();pa('new').click();page.get_by_label('Project name',exact=True).fill('Depot planning project')
  for model in ['native-steam','native-tank','native-tank']:
   page.get_by_label('Catalog model',exact=True).select_option(model);pa('add').click()
  ids=planned();pa('confirm').click();depot();da('assign-'+a).click();assert da('remove-'+a).is_disabled()
  assert page.get_by_label('Reserve D002 for',exact=True).locator('option').count()==1
  da('assign-'+bid).click();assert all(v['state']=='reserved' for v in items());add('native-tank');extra=items()[-1]['id'];assert da('assign-'+extra).is_disabled();assert railway()==initial
  check('exclusiveMatchingConfirmedSlotsAndReservedRemovalGuard')
  projects();assert planned()==ids;pa('edit').click();pa('down-'+ids[1]).click();pa('confirm').click();depot()
  assert 'vehicle 3' in page.locator('[data-depot-id="'+a+'"]').inner_text();assert all(v['state']=='reserved' for v in items()[:2]);check('M2ReorderKeepsIdentityAndReservation')
  projects();pa('edit').click();pa('remove-'+ids[1]).click();depot();assert page.locator('[data-depot-draft]').count()==1;assert all(v['state']=='reserved' for v in items()[:2])
  projects();page.once('dialog',lambda d:d.accept());pa('cancel').click();depot();assert all(v['state']=='reserved' for v in items()[:2]);check('DraftChangesAndCancellationDoNotReleaseConfirmedReservations')
  projects();pa('edit').click();pa('remove-'+ids[1]).click();page.get_by_label('Catalog model',exact=True).select_option('native-tank');pa('add').click();new_ids=planned();pa('confirm').click();depot()
  assert items()[0]['state']=='available' and items()[1]['state']=='reserved';assert 'removed or changed' in page.locator('[data-depot-id="'+a+'"]').inner_text()
  assert da('assign-'+a).is_enabled();da('remove-'+extra).click();assert len(items())==2
  da('assign-'+a).click();da('release-'+bid).click();saved=items();assert railway()==initial;check('ConfirmationReleasesObsoleteSlotWithoutAutomaticSameModelRebinding')
  page.screenshot(path=str(out/'desktop-depot.png'))
  # Existing real railway commands must never convert the dropped wagon into depot stock.
  page.locator('[data-view="layout"]').click();page.locator('[data-composition="0"]').click();depot()
  tail=initial['railway']['identities']['trains'][0][-1]
  page.evaluate("document.getElementById('uncouple').click();__m3Frame(performance.now())")
  assert page.locator('[data-depot-physical-state="detached-on-track"]').get_attribute('data-depot-physical-id')==tail
  assert items()==saved;page.evaluate("document.getElementById('couple').click();__m3Frame(performance.now())")
  assert page.locator('[data-depot-physical-state="detached-on-track"]').count()==0;assert railway()['railway']==initial['railway'];assert items()==saved;check('R1UncoupleRecoupleKeepsPhysicalIdentityAndDepotUnchanged')
  page.once('dialog',lambda d:d.accept());page.evaluate("document.getElementById('reset').click();__m3Frame(performance.now())")
  assert items()==saved;assert page.locator('[data-depot-physical-id="'+tail+'"]').count()==0
  assert page.locator('[data-depot-physical-id]').evaluate_all('(nodes)=>nodes.every(n=>n.dataset.generation==="1")')
  projects();assert planned()==new_ids;depot();check('ResetRefreshesPhysicalReferencesAndPreservesM2AndVirtualReservations')
  for width,height,name in [(1024,768,'tablet-landscape'),(768,1024,'tablet-portrait')]:
   page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('dialog').evaluate('(d)=>d.scrollWidth<=d.clientWidth')
   page.get_by_label('Inventory model',exact=True).select_option('native-steam');da('add').tap();created=items()[-1]['id'];da('remove-'+created).tap();assert items()==saved
   assert page.locator('.managementDepot button').evaluate_all('(nodes)=>nodes.every(n=>n.getBoundingClientRect().height>=44)')
   page.locator('.managementDepot').evaluate('(e)=>e.scrollIntoView({block:"start"})');page.screenshot(path=str(out/(name+'.png')))
  check('DesktopTabletTouchCreateRemoveAvailabilityAndNoOverflow')
  # Names from M2 are inert text in reservations and planning references.
  projects();pa('edit').click();page.get_by_label('Project name',exact=True).fill('<img src=x onerror=alert(1)>');pa('confirm').click();depot();assert page.locator('.depotPlans img').count()==0;assert '<img src=x' in page.locator('.depotPlans').inner_text();check('M2ProjectNamesRemainTextInDepot')
  assert not r['pageErrors'] and not r['httpFailures'] and not r['failedRequests'],r
  r['status']='PASS';save();print(json.dumps(r))
 except Exception as e:
  r['status']='FAIL';r['failure']=str(e);save();page.screenshot(path=str(out/'failure.png'));raise
 finally:b.close()
