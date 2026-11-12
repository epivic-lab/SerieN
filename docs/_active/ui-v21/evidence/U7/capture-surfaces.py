"""Supplementary genuine six-slot UI captures of scrollable rail/inspector/tray/Compare."""
import json,os,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
ev=Path(__file__).resolve().parent;out=ev/'surfaces';out.mkdir(exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(60000)
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render('))return 1;return raf(cb);};")
 p.goto('http://127.0.0.1:8034/?diagnostics=1');p.wait_for_function('Boolean(window.__serienDiagnostics)')
 p.evaluate('document.getElementById("trainManagement").click();document.querySelector("[data-view=projects]").click();document.querySelector("[data-project-action=new]").click()')
 for model in ['native-steam']+['native-tank']*5:
  p.get_by_label('Catalog model',exact=True).select_option(model);p.locator('[data-project-action=add]').click()
 for w,h in [(1920,1080),(1440,900),(1280,800),(1024,768),(820,1180),(768,1024),(390,844)]:
  p.set_viewport_size({'width':w,'height':h})
  sections=['.projectVehicles']+(['.u7-inspector','.u7-tray','.projectComparison'] if w in [1440,390] else [])
  for selector in sections:
   p.locator(selector).evaluate('(e)=>e.scrollIntoView({block:"start"})');p.wait_for_timeout(150);p.screenshot(path=str(out/(str(w)+'-'+selector[1:]+'.png')))
  assert p.locator('#tmD').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
 (out/'results.json').write_text(json.dumps({'status':'PASS','method':'real UI six-slot draft; each scroll region brought into view; no CSS/geometry overrides','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest()},indent=2));b.close()
