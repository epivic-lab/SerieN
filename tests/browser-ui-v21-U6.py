"""U6 real minified app. Local Auth boundary and on-demand RAF; no engine substitutes."""
import hashlib,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U6_OUTPUT','work/u6-browser'));out.mkdir(parents=True,exist_ok=True)
r={'status':'RUNNING','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'checks':[],'errors':[],'nativeDialogs':[]}
def save():(out/'results.json').write_text(json.dumps(r,indent=2)+'\n')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':900},has_touch=True);p.set_default_timeout(45000)
 p.on('pageerror',lambda e:r['errors'].append(str(e)));p.on('dialog',lambda d:(r['nativeDialogs'].append(d.type),d.dismiss()))
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 def js(s,a=None):return p.evaluate(s,a)
 def click(s):js('(s)=>document.querySelector(s).click()',s)
 def tab(n):click('[data-view="'+n+'"]')
 def pa(n):click('[data-project-action="'+n+'"]')
 def rail():return js('__serienDiagnostics.railwayState()')
 def planned():return p.locator('[data-planned-vehicle]').evaluate_all('(es)=>es.map(e=>e.dataset.plannedVehicle)')
 def draft():return [p.get_by_label('Project name',exact=True).input_value(),planned()]
 def unload():return js('()=>{const e=new Event("beforeunload",{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented}')
 def shot(n):p.wait_for_timeout(150);p.screenshot(path=str(out/(n+'.png')))
 def check(n):r['checks'].append(n);save();print('PASS '+n,flush=True)
 try:
  p.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8033/')+'?diagnostics=1');p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__frame)');click('#pause');js("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__frame(performance.now())");p.wait_for_load_state('networkidle')
  assert not unload();click('#trainManagement');assert p.locator('dialog.trainManagement').count()==1
  before=rail()
  for i in range(3):
   click(f'[data-composition="{i}"]');assert js('__serienDiagnostics.snapshot().consoles.active')==i
   assert p.locator('[data-consist] li').evaluate_all('(es)=>es.map(e=>e.dataset.vehicleId)')==before['identities']['trains'][i]
  assert rail()==before
  p.locator('[data-view="layout"]').focus();p.keyboard.press('ArrowRight');assert p.locator('[data-view="catalog"]').get_attribute('aria-selected')=='true';tab('layout')
  click('dialog.trainManagement [data-close]');assert p.locator('#trainManagement').evaluate('(e)=>e===document.activeElement')
  p.locator('.top').get_by_role('button',name='Menu',exact=True).click();p.locator('#dlg').get_by_role('button',name='Open Train Management').click();assert p.locator('#tmD').evaluate('(d)=>d.open');p.keyboard.press('Escape');assert p.locator('.top').get_by_role('button',name='Menu',exact=True).evaluate('(e)=>e===document.activeElement')
  p.set_viewport_size({'width':390,'height':844});p.locator('.u2-mobile').get_by_role('button',name='Stock',exact=True).click();assert p.locator('#tmD').evaluate('(d)=>d.open');click('dialog.trainManagement [data-close]');assert p.locator('.u2-mobile').get_by_role('button',name='Stock',exact=True).evaluate('(e)=>e===document.activeElement');p.set_viewport_size({'width':1440,'height':900});click('#trainManagement')
  check('three-launchers-one-instance-shared-selection-identities-tab-arrows-and-focus-return')
  tab('layout');click('[data-composition="1"]');click('[data-copy-train="1"]');saved=draft();assert rail()==before and unload()
  for view in ['catalog','depot','layout','projects']:tab(view)
  assert draft()==saved
  # Dirty close: no mutating operation until consent, no native confirmation.
  click('dialog.trainManagement [data-close]');assert p.locator('.u6-guard').is_visible();shot('dirty-close');p.keyboard.press('Escape');assert draft()==saved
  js('document.querySelector("#tmD").dispatchEvent(new MouseEvent("click",{bubbles:true}))');click('.u6-guard [data-cancel]');assert draft()==saved
  tab('layout');click('[data-ctrl="CTRL-029"]');click('.u6-guard [data-cancel]');tab('projects');assert draft()==saved
  tab('layout');click('[data-composition="2"]');click('[data-copy-train="2"]');click('.u6-guard [data-cancel]');tab('projects');assert draft()==saved and rail()==before
  tab('layout');click('[data-composition="2"]');click('[data-copy-train="2"]');js('()=>{const e=document.querySelector(".u6-guard [data-confirm]");e.click();e.click()}');assert planned()!=saved[1] and rail()==before
  pa('confirm');assert unload();ids=planned();project_id=p.locator('.projectList [data-project-id]').get_attribute('data-project-id');click('dialog.trainManagement [data-close]');click('#trainManagement');tab('projects');assert planned()==ids
  check('draft-tab-preservation-close-Escape-backdrop-focus-copy-cancel-and-double-consent-no-physical-mutation')
  # Clean draft close has no guard; confirmed data retained.
  pa('edit');click('dialog.trainManagement [data-close]');assert not p.locator('#tmD').evaluate('(d)=>d.open');click('#trainManagement');tab('projects');assert p.locator('[data-project-id="'+project_id+'"]').count()==1;pa('open-'+project_id);assert planned()==ids
  p.get_by_label('Project name',exact=True).fill('Pending draft');tab('layout');click('[data-composition="0"]');click('[data-copy-train="0"]');assert p.locator('.u6-guard').is_visible()
  # Real reset invalidates pending generation, preserves the draft and session.
  click('#reset');click('.u5-guard [data-confirm]');assert not p.locator('.u6-guard').is_visible();tab('projects');assert p.get_by_label('Project name',exact=True).input_value()=='Pending draft'
  assert p.locator('[data-comparison]').get_attribute('data-comparison')=='stale'
  pa('confirm');click('dialog.trainManagement [data-close]');click('#trainManagement');tab('projects');assert planned()==ids
  check('clean-close-session-beforeunload-reset-generation-STALE-pending-intent-invalidated-with-draft-preserved')
  tab('layout');click('[data-composition="0"]');p.get_by_role('button',name='Focus in 3D').click();assert js('__serienDiagnostics.snapshot().camera.preset')=='manual';click('#trainManagement');tab('layout')
  for width,height in [(1440,900),(1024,768),(820,1180),(768,1024),(390,844)]:
   p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(150);tab('layout');shot(str(width)+'-layout')
   assert p.locator('#tmD').evaluate('(d)=>d.scrollWidth<=d.clientWidth')
   assert p.locator('.u6-view button').evaluate_all('(es)=>es.every(e=>e.getBoundingClientRect().height>=44)')
   slider=p.get_by_label('Side view zoom level',exact=True);slider.fill('6');slider.dispatch_event('input');assert p.locator('.u6-view .sideToolbar output').inner_text()=='600%'
   p.locator('.u6-view .sideViewport').evaluate('(e)=>{e.scrollLeft=e.scrollWidth}');assert p.locator('.u6-view .sideViewport').evaluate('(e)=>e.scrollLeft>0');shot(str(width)+'-zoom-scroll')
   p.locator('.u6-view [data-fit]').tap();assert p.locator('.u6-view .sideViewport').evaluate('(e)=>e.scrollLeft===0&&e.scrollWidth<=e.clientWidth+1')
   tab('catalog');assert p.locator('.managementCatalog article').count()==14;shot(str(width)+'-catalog')
   p.get_by_label('Model role',exact=True).select_option('locomotive');p.get_by_label('Model source',exact=True).select_option('native');assert p.locator('.managementCatalog article').count()==3
   shot(str(width)+'-filtered');p.get_by_label('Model role',exact=True).select_option('all');p.get_by_label('Model source',exact=True).select_option('all')
  check('five-viewports-touch-zoom-1-to-6-Fit-scroll-catalog-role-source-filters-and-no-dialog-overflow')
  # Real model switch, fallback and detached read-only.
  tab('catalog');p.locator('.u6-view').get_by_label('Models on the layout',exact=True).select_option('kenney');tab('layout');assert p.locator('.sideStage image').evaluate_all('(es)=>es.every(e=>e.dataset.sideKey.startsWith("kenney"))')
  tab('catalog');img=p.locator('.managementCatalog img').first;img.evaluate('(e)=>e.dispatchEvent(new Event("error"))');assert 'unavailable' in img.get_attribute('alt');shot('fallback')
  tab('layout');click('dialog.trainManagement [data-close]');click('#uncouple');before=rail();click('#trainManagement');tab('layout');assert p.locator('[data-detached-id]').count()==1;assert rail()==before;shot('detached')
  # Space stays in TM; it cannot stop the selected moving/requested train.
  js("const e=document.getElementById('speed');e.value=20;e.dispatchEvent(new Event('input'))");p.locator('#u6-panel').evaluate('(e)=>{e.tabIndex=0;e.focus()}');p.keyboard.press('Space');assert js('__serienDiagnostics.snapshot().stock[0].speed')==20
  assert not r['nativeDialogs'] and not r['errors'],r
  check('native-Kenney-fallback-detached-read-only-and-TM-Space-isolation')
  # Dispose while dirty consent pending leaves no callback or modal residue.
  tab('layout');click('[data-composition="0"]');click('[data-copy-train="0"]');click('dialog.trainManagement [data-close]');assert p.locator('.u6-guard').is_visible();js('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}))');assert p.locator('#tmD').count()==0 and p.locator('.u6-guard').count()==0
  assert not unload();check('pending-dispose-cleans-TM-guard-and-beforeunload')
  r['status']='PASS';save()
 except Exception as e:r['status']='FAIL';r['failure']=str(e);save();shot('failure');raise
 finally:b.close()
