from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
front_only='--front-only' in sys.argv
args=[a for a in sys.argv[1:] if a!='--front-only']
out=Path(args[0] if args else '/workspace/work/v06-finalize/closeups');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 c=b.new_context(viewport={'width':1440,'height':900})
 c.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 c.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__smokeFrame=cb;return 1;}return raf(cb);};")
 p=c.new_page();p.set_default_timeout(120000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 try:
  p.goto('http://127.0.0.1:8022/?scenario=v06&diagnostics=1',wait_until='domcontentloaded')
  p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__smokeFrame)')
  assert p.evaluate('__serienDiagnostics.snapshot().quality.profile')=='low'
  def frame():p.evaluate('__smokeFrame(performance.now())')
  frame();p.wait_for_timeout(300)
  views=[]
  if not front_only:
   # Pan the actual OrbitControls view towards the rear devices, then zoom.
   point=p.evaluate("()=>{const pts=['WX-A','WX-B'].flatMap(id=>__serienDiagnostics.turnoutView(id).paths.flatMap(p=>p.points));return {x:pts.reduce((s,p)=>s+p.x,0)/pts.length,z:pts.reduce((s,p)=>s+p.z,0)/pts.length};}")
   pixel=p.evaluate('(q)=>__serienDiagnostics.projectPoint(q.x,8.53,q.z)',point)
   box=p.locator('#view3d canvas').bounding_box();cx=box['x']+box['width']/2;cy=box['y']+box['height']/2
   p.mouse.move(pixel['x'],pixel['y']);p.mouse.down(button='right');p.mouse.move(cx,cy,steps=8);p.mouse.up(button='right')
   for i in range(3):p.locator('#viewZoomIn').click()
   for i in range(3):frame()
   for state in [False,True]:
    if state:
     for id in ['WX-A','WX-B','V06-C12','V06-C13','V06-N14','V06-N07']:p.locator('button[data-switch-id="'+id+'"]').click()
    p.wait_for_timeout(400);frame()
    views.append(p.evaluate('__serienDiagnostics.turnoutArrowsState()'))
    p.screenshot(path=str(out/('rear-S1-X.png' if state else 'rear-S0-N.png')),timeout=180000)
  # The front turnout is separate; use the existing station camera preset.
  p.locator('#camt').click();p.locator('#cameraView').select_option('station');p.locator('#camt').click()
  for i in range(8):p.wait_for_timeout(210);frame()
  for i in range(2):p.locator('#viewZoomOut').click()
  q=p.evaluate("()=>{const pts=__serienDiagnostics.turnoutView('V06-C07').paths.flatMap(p=>p.points);return {x:pts.reduce((s,p)=>s+p.x,0)/pts.length,z:pts.reduce((s,p)=>s+p.z,0)/pts.length};}")
  pixel=p.evaluate('(q)=>__serienDiagnostics.projectPoint(q.x,8.53,q.z)',q)
  box=p.locator('#view3d canvas').bounding_box();cx=box['x']+box['width']/2;cy=box['y']+box['height']/2
  p.mouse.move(cx,cy);p.mouse.down(button='right');p.mouse.move(2*cx-pixel['x'],2*cy-pixel['y'],steps=8);p.mouse.up(button='right')
  for i in range(3):frame()
  for state in [False,True]:
   if state:p.locator('button[data-switch-id="V06-C07"]').click()
   p.wait_for_timeout(400);frame();p.screenshot(path=str(out/('front-S1.png' if state else 'front-S0.png')),timeout=180000)
  # Finish with a separate default Legacy page; no concurrent V06 renderer.
  p.close();p=c.new_page()
  p.on('pageerror',lambda e:errors.append(str(e)))
  p.goto('http://127.0.0.1:8022/?diagnostics=1',wait_until='domcontentloaded')
  p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__smokeFrame)')
  legacy=p.evaluate('__serienDiagnostics.snapshot()');assert legacy['scenario']['id']=='legacy' and len(legacy['stock'])==3 and len(legacy['scenario']['controllers'])==8
  for id in [0,1,2]:p.locator('[data-console-train="'+str(id)+'"] input.thr').fill('35')
  p.evaluate('__serienDiagnostics.step(2)');assert all(t['odometer']>0 for t in p.evaluate('__serienDiagnostics.snapshot().stock'))
  p.locator('#stopAll').click();frame();p.screenshot(path=str(out/'legacy-desktop-smoke.png'),timeout=180000)
  p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(200);frame()
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
  p.screenshot(path=str(out/'legacy-mobile-smoke.png'),timeout=180000)
  assert not errors
  (out/('front-results.json' if front_only else 'results.json')).write_text(json.dumps({'status':'PASS','desktopV06Default':'Auto Low','Legacy':'default, three moving trains, eight controllers, desktop/mobile','views':views,'errors':errors},indent=2)+'\n')
 finally:b.close()
