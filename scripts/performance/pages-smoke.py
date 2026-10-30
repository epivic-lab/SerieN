"""Smoke a workflow-equivalent static site mounted under the GitHub Pages subpath."""
import argparse,json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--output',required=True);a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':650,'height':760});errors=[];failed=[];bad_status=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failed.append(r.url));page.on('response',lambda r:bad_status.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
 page.goto(a.base+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.__serienDiagnostics',timeout=180000)
 page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'))")
 page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000);page.wait_for_function("[...document.querySelectorAll('.locomotiveThumbnail')].every(i=>i.complete&&i.naturalWidth===320)",timeout=90000)
 value=page.evaluate("()=>({url:location.href,base:document.baseURI,trains:__serienDiagnostics.snapshot().stock.length,resources:performance.getEntriesByType('resource').map(e=>e.name),thumbnails:[...document.querySelectorAll('.locomotiveThumbnail')].map(i=>({src:i.currentSrc,width:i.naturalWidth}))})")
 value.update(errors=errors,failed=failed,badStatus=bad_status);(out/'pages-subpath.json').write_text(json.dumps(value,indent=2)+'\n')
 assert value['trains']==3 and not errors and not failed and not bad_status,value
 assert all(urlparse(r).path.startswith('/SerieN/') for r in value['resources'] if urlparse(r).scheme in ['http','https']),value['resources']
 b.close();print('PASS: production bundle, actual GLBs and thumbnails served under /SerieN/; no failed requests or HTTP errors',flush=True)
