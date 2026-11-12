from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path('docs/_active/ui-v21/evidence/U9/baseline');out.mkdir(exist_ok=True)
if (out/'audit.json').exists():raise SystemExit('Baseline already recorded on U8; preserve it. Reproduce only in a separate baseline checkout/output.')
with sync_playwright() as w:
 b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(60000)
 p.route('**/auth-gate.js*',lambda q:q.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;document.getElementById('signOut').hidden=false;await import('./dist/game.js');"))
 p.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>{if(cb.toString().includes('requestAnimationFrame')&&cb.toString().includes('.render(')){window.__frame=cb;return 1;}return raf(cb);};")
 p.goto('http://127.0.0.1:8035/?diagnostics=1');p.wait_for_function('Boolean(window.__serienDiagnostics&&window.__frame)');p.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));__frame(performance.now())");p.wait_for_load_state('networkidle')
 r=[]
 for width,height in [(1440,900),(1024,768),(390,844)]:
  p.set_viewport_size({'width':width,'height':height});p.evaluate('window.scrollTo(0,0)');p.screenshot(path=str(out/f'{width}-shell.png'))
  d=p.evaluate('''()=>({viewport:[innerWidth,innerHeight],bodyWidth:document.documentElement.scrollWidth,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),dock:[...document.querySelectorAll('.trainConsoleName,.trainConsoleDescription,.trainConsoleState,.trainConsoleCars')].map(e=>({text:e.textContent,w:e.clientWidth,scroll:e.scrollWidth,height:e.clientHeight,font:getComputedStyle(e).fontSize})),targets:[...document.querySelectorAll('button,input,select,a,[role=button]')].filter(e=>e.getClientRects().length&&!e.disabled).filter(e=>{let r=e.getBoundingClientRect();return r.width<44||r.height<44}).map(e=>({tag:e.tagName,id:e.id,text:e.textContent.slice(0,70),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))})''');r.append(d)
 p.evaluate("document.getElementById('trainManagement').click();document.querySelector('[data-view=layout]').click();document.querySelector('[data-copy-train]').click()");p.screenshot(path=str(out/'390-composer.png'));p.evaluate("document.querySelector('[data-project-action=confirm]').click();document.querySelector('[data-view=depot]').click();document.querySelector('[data-depot-action=add]').click()");p.screenshot(path=str(out/'390-depot.png'))
 (out/'audit.json').write_text(json.dumps(r,indent=2));b.close()
