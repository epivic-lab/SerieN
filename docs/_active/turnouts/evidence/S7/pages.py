from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path('/workspace/work/s7/pages');out.mkdir(exist_ok=True)
with sync_playwright()as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);p=b.new_page();errors=[];failed=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('requestfailed',lambda r:failed.append(r.url))
 p.goto('http://127.0.0.1:8004/SerieN/?diagnostics=1',wait_until='networkidle',timeout=180000);p.wait_for_function('window.__serienDiagnostics',timeout=180000)
 p.evaluate("()=>{document.getElementById('pause').click();const q=document.getElementById('quality');q.value='low';q.dispatchEvent(new Event('change'));}")
 for width,height in [(1280,900),(390,844)]:
  p.set_viewport_size(dict(width=width,height=height));p.wait_for_timeout(500);p.screenshot(path=str(out/f'{width}.png'),timeout=120000);assert p.locator('[data-switch="0"]').count()==1
 assert not errors and not failed,(errors,failed)
 (out/'result.json').write_text(json.dumps(dict(result='PASS',errors=errors,failed=failed,base='/SerieN/',productionBundle=True),indent=2)+'\n');b.close()
