import json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('docs/_active/ui-v21/evidence/U9/header-engraved-plaque');r={'phase':'BEFORE','bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'screenshots':[],'observations':[]}
if (out/'before.json').exists():raise SystemExit('Preserve recorded before evidence; reproduce in a separate baseline checkout/output.')
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page();p.set_default_timeout(60000)
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 p.goto('http://127.0.0.1:8035/?diagnostics=1');p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__frame)');p.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'))");p.wait_for_load_state('networkidle')
 for width,height in [(1920,1080),(1440,900),(1024,768),(768,1024),(390,844)]:
  p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(150);p.evaluate('__frame(performance.now())');p.screenshot(path=str(out/f'{width}-before.png'));p.locator('.top').screenshot(path=str(out/f'{width}-before-header.png'))
  r['screenshots'] += [f'{width}-before.png',f'{width}-before-header.png'];r['observations'].append(p.evaluate('''()=>{const e=document.querySelector('.u2-edition'),s=getComputedStyle(e);return {width:innerWidth,text:e.textContent,display:s.display,font:s.font,background:s.backgroundImage,visiblePlate:document.querySelectorAll('.top .edp').length}}'''))
 b.close()
(out/'before.json').write_text(json.dumps(r,indent=2)+'\n')
