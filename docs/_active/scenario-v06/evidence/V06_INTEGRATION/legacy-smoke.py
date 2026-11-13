from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path('/workspace/work/v06'); result={'profile':'legacy','checks':[],'pageErrors':[],'consoleErrors':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 p=b.new_page(viewport={'width':1440,'height':900})
 p.on('pageerror',lambda e:result['pageErrors'].append(str(e)))
 p.on('console',lambda m:result['consoleErrors'].append(m.text) if m.type=='error' else None)
 p.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__smokeFrame=cb;return 1;}return raf(cb);};")
 p.goto('http://127.0.0.1:8022/?diagnostics=1',wait_until='domcontentloaded')
 p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__smokeFrame)',timeout=60000)
 p.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click();__smokeFrame(performance.now())")
 p.wait_for_load_state('networkidle')
 for w,h in [(1440,900),(390,844)]:
  p.set_viewport_size({'width':w,'height':h});p.evaluate('__smokeFrame(performance.now())');p.wait_for_timeout(500)
  s=p.evaluate('__serienDiagnostics.snapshot()')
  assert len(s['stock'])==3 and len(s['switchIndicators']['states'])==8
  assert p.locator('canvas').first.is_visible()
  result['checks'].append({'viewport':[w,h],'trains':len(s['stock']),'controllers':len(s['switchIndicators']['states']),'render':s['render']})
  p.screenshot(path=str(out/f'legacy-{w}.png'))
 assert not result['pageErrors'] and not result['consoleErrors'],result
 result['status']='PASS_LEGACY_ONLY';b.close()
(out/'legacy-smoke.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
