"""Production UI lifecycle, lazy loading and GPU allocation checks."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(os.environ.get('SERIEN_EVIDENCE','docs/_active/rolling-stock/evidence/L02-G'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),headless=True)
 page=browser.new_page(viewport={'width':1440,'height':950},service_workers='block');requests=[];errors=[]
 page.on('request',lambda r:requests.append(r.url));page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
 page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8027/')+'?scenario=legacy&diagnostics=1');page.wait_for_function('window.__serienDiagnostics',timeout=120000)
 page.click('#pause');page.evaluate("()=>{const q=document.getElementById('quality');q.value='low';q.dispatchEvent(new Event('change'));}")
 assert not any('/big-boy/model.glb' in r for r in requests),'Big Boy loaded before user selection'
 page.locator('.top').get_by_role('button',name='Menu',exact=True).click();page.click('#dlg #trainManagement')
 page.click('dialog.trainManagement [data-view="catalog"]');assert page.locator('[data-model-id="native-big-boy"]').count()==1
 page.evaluate("async()=>{await Promise.all([...document.querySelectorAll('.managementModel img')].map(img=>img.decode()));}")
 preview=page.locator('.managementModel[data-model-id="native-big-boy"] img').evaluate('(img)=>({width:img.naturalWidth,src:img.getAttribute("src")})')
 assert preview['width']==320 and preview['src']=='./assets/rolling-stock/big-boy/thumbnail.png',preview
 page.screenshot(path=str(OUT/'catalog.png'))
 page.click('dialog.trainManagement [data-view="layout"]');memory=[];timing=[]
 for cycle in range(2):
  page.click('button[data-model-id="native-big-boy"]');page.wait_for_function("__serienDiagnostics.snapshot().stock.some(t=>t.modelKey==='big-boy')",timeout=120000)
  state=page.evaluate('__serienDiagnostics.snapshot()');stock=next(t for t in state['stock'] if t['modelKey']=='big-boy');assert len(stock['animation']['wheels'])==19
  timing.append(page.evaluate('''()=>{const t=[];for(let i=0;i<120;i++){const a=performance.now();__serienDiagnostics.step(1/60);t.push(performance.now()-a);}t.sort((a,b)=>a-b);return {p50:t[60],p95:t[114]};}'''))
  page.screenshot(path=str(OUT/('lifecycle-'+str(cycle)+'.png')))
  page.get_by_role('button',name='Remove from layout',exact=True).click();page.get_by_role('button',name='Remove composition',exact=True).click()
  page.wait_for_function('__serienDiagnostics.snapshot().stock.length===1');page.wait_for_timeout(200)
  memory.append(page.evaluate('__serienDiagnostics.snapshot().render'))
 assert memory[1]['geometries']<=memory[0]['geometries']+2,memory
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(OUT/'mobile-management.png'))
 assert not errors,errors
 (OUT/'lifecycle.json').write_text(json.dumps({'lazyLoad':True,'cycles':2,'afterRemovalMemory':memory,'idleStepCpuMs':timing,'errors':errors},indent=2)+'\n')
 browser.close()
