"""U2 minified app, real TM stores; local auth event boundary fixture, no cloud writes."""
from pathlib import Path
import json,os
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('U2_OUTPUT','work/u2-browser'));out.mkdir(parents=True,exist_ok=True);r={'checks':[],'pageErrors':[],'httpFailures':[],'external':[],'failedRequests':[],'consoleErrors':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(30000)
 p.on('console',lambda m:r['consoleErrors'].append(m.text) if m.type=='error' else None);p.on('request',lambda q:r['external'].append(q.url) if q.url.startswith('http') and not q.url.startswith(os.environ.get('SERIEN_URL','http://127.0.0.1:8022/')) else None);p.on('requestfailed',lambda q:r['failedRequests'].append(q.url));p.on('pageerror',lambda e:r['pageErrors'].append(str(e)));p.on('response',lambda q:r['httpFailures'].append([q.url,q.status]) if q.status>=400 else None)
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;window.__logoutCount=0;document.getElementById('signOut').addEventListener('click',()=>window.__logoutCount++);await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__u2Frame=cb;return 1;}return raf(cb);};")
 p.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8022/')+'?diagnostics=1',wait_until='domcontentloaded');p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__u2Frame)');p.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__u2Frame(performance.now())")
 def check(n):
  r['checks'].append(n);r.setdefault('railwayCheckpoints',{})[n]=p.evaluate('__serienDiagnostics.railwayState()');(out/'checkpoints.json').write_text(json.dumps(r,indent=2))
 def menu():p.locator('.top').get_by_role('button',name='Menu',exact=True).click()
 def close():p.locator('#dlg').get_by_role('button',name='Close',exact=True).click()
 p.wait_for_load_state('networkidle');p.evaluate("document.getElementById('pause').click();__u2Frame(performance.now());__u2Frame(performance.now())");initial=p.evaluate('__serienDiagnostics.railwayState()');(out/'initial-snapshot.json').write_text(json.dumps(initial,indent=2))
 menu()
 for mode in ['auto','low','high','cinema']:p.locator('#quality').select_option(mode);assert p.locator('#quality').input_value()==mode
 p.locator('#quality').select_option('low');bell=p.evaluate('__serienDiagnostics.guardedStopState().audio.muted');p.locator('#dlg').get_by_role('button',name='UI sound: Off',exact=True).click();p.locator('#dlg').get_by_role('button',name='UI sound: On',exact=True).click();assert p.evaluate('__serienDiagnostics.guardedStopState().audio.muted')==bell;check('UI-sound-toggle-independent-from-real-bell-mute');assert p.locator('#dlg').get_by_role('button',name='Exit to title · not available').is_disabled();close();check('four-quality-modes-and-disabled-title');initial=p.evaluate('__serienDiagnostics.railwayState()')
 p.locator('#trainManagement').click();p.locator('[data-view=projects]').click();p.locator('[data-project-action=new]').click();p.locator('[data-project-action=model]').select_option('native-steam');p.locator('[data-project-action=add]').click();p.locator('[data-project-action=confirm]').click();p.locator('[data-view=depot]').click();p.locator('[data-depot-action=add]').click();p.locator('dialog.trainManagement [data-close]').click()
 menu();p.locator('#signOut').click();assert p.locator('.u2-guard').is_visible();assert '1 confirmed project' in p.locator('.u2-guard').inner_text() and '1 Depot record' in p.locator('.u2-guard').inner_text();assert p.evaluate('__logoutCount')==0
 p.locator('.u2-guard [data-cancel]').click();assert p.evaluate('__logoutCount')==0;check('real-session-summary-cancel-zero-logout')
 p.locator('#dlg').get_by_role('button',name='Open Train Management').click();assert p.locator('dialog.trainManagement').count()==1;assert p.locator('[data-depot-id]').count()==1;p.locator('dialog.trainManagement [data-close]').click();check('same-store-and-close-preserves-inventory')
 final=p.evaluate('__serienDiagnostics.railwayState()');(out/'railway-before-after.json').write_text(json.dumps({'before':initial,'after':final},indent=2));assert final==initial;check('dialog-browsing-no-railway-mutation')
 # Visual matrix separately invokes real renderVehicles/Journey.ensure caches; not a read-only action.
 for w,h in [(1440,900),(1024,768),(390,844)]:
  p.set_viewport_size({'width':w,'height':h});
  if w==390:
   stock=p.locator('.u2-mobile').get_by_role('button',name='Stock',exact=True);stock.click();assert p.locator('dialog.trainManagement').count()==1;assert p.locator('[data-depot-id]').count()==1;p.locator('dialog.trainManagement [data-close]').click();assert stock.evaluate('(e)=>document.activeElement===e');check('mobile-stock-same-instance-focus-return')
  p.evaluate('__u2Frame(performance.now())');p.wait_for_timeout(850);p.screenshot(path=str(out/f'{w}-shell.png'))
  menu();p.wait_for_timeout(850);p.screenshot(path=str(out/f'{w}-menu.png'));p.locator('#signOut').click();p.wait_for_timeout(850);p.screenshot(path=str(out/f'{w}-confirm.png'));p.keyboard.press('Escape');assert not p.locator('.u2-guard').is_visible();close()
  for bid,mid,typ in [('helpBtn','helpModal','help'),('planBtn','planModal','plan')]:
   p.evaluate('(id)=>document.getElementById(id).click()',bid);assert p.locator('#'+mid).is_visible();p.wait_for_timeout(850);p.screenshot(path=str(out/f'{w}-{typ}.png'));p.keyboard.press('Escape');assert not p.locator('#'+mid).is_visible()
 check('15-screenshots-shell-menu-help-plan-confirm-and-Escape')
 p.set_viewport_size({'width':1440,'height':900});menu();p.locator('#signOut').click();p.locator('.u2-guard [data-confirm]').click();p.evaluate("document.getElementById('signOut').click();document.getElementById('signOut').click()");assert p.evaluate('__logoutCount')==1;check('confirm-and-double-event-exactly-one-original-listener')
 p.evaluate("async()=>{const {createGuardModal}=await import('./src/ui/guard-modal.js');window.__probeCalls=0;window.__probe=createGuardModal();__probe.request({message:'Obsolete intent',valid:()=>false,confirm:()=>__probeCalls++});}");p.locator('.u2-guard').last.locator('[data-confirm]').click();assert p.evaluate('__probeCalls')==0;p.evaluate("__probe.request({message:'Disposed intent',valid:()=>true,confirm:()=>__probeCalls++});__probe.dispose()");assert p.evaluate('__probeCalls')==0;check('obsolete-and-disposed-intents-no-callback')
 assert not r['pageErrors'] and not r['httpFailures'] and not r['external'] and not r['failedRequests'] and not r['consoleErrors'];r['status']='PASS'
 gate=b.new_page();gate.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.getElementById('googleSignIn').hidden=false;"));gate.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8022/'),wait_until='networkidle');assert gate.locator('body').evaluate('(e)=>e.classList.contains("auth-locked")');assert gate.locator('canvas').count()==0;assert gate.locator('#authGate').is_visible();gate.screenshot(path=str(out/'login-gate.png'));check('locked-boot-and-login-skin-local-auth-boundary');b.close()
(out/'result.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
