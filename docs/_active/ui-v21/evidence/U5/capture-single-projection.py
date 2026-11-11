"""One-card visual projection from the real physical fleet. Not a one-train engine claim."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('docs/_active/ui-v21/evidence/U5/single-projection-settled');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':900})
 p.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./work/u5-single-projection.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 p.goto('http://127.0.0.1:8033/?diagnostics=1');p.wait_for_function('Boolean(window.__singleProjection)');p.wait_for_load_state('networkidle');p.evaluate('document.getElementById("pause").click();__frame(performance.now())');before=p.evaluate('__serienDiagnostics.railwayState()');p.evaluate('document.getElementById("reset").click()');p.locator('dialog.u5-guard [data-cancel]').click();assert before==p.evaluate('__serienDiagnostics.railwayState()');p.evaluate('__frame(performance.now())');p.screenshot(path=str(out/'reset-cancelled-full.png'));result=p.evaluate('__singleProjection()');assert result=={'unchanged':True,'physicalFleet':3,'cards':1}
 p.evaluate('__frame(performance.now())');p.screenshot(path=str(out/'one-genuine-train-card.png'));(out/'results.json').write_text(json.dumps({'status':'PASS','scope':'one-card view of genuine train0; physical initial fleet remains three, unchanged',**result},indent=2));b.close()
