"""Run against localhost after bundling scripts/capture-henschel.js to dist/capture-henschel.js.
Captures actual runtime geometry; no synthesis or image retouching.
Requires Python Playwright; optional CHROMIUM_PATH selects a local browser.
"""
import base64, hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('assets/rolling-stock/henschel-dhg-500-c')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH'))
    page=browser.new_page(service_workers='block')
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/capture-henschel.html',lambda route:route.fulfill(content_type='text/html',body='<script type="module" src="./dist/capture-henschel.js"></script>'))
    page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')+'capture-henschel.html')
    page.wait_for_function('!!window.captureHenschel')
    result=page.evaluate('()=>captureHenschel()')
    assert not errors,errors
    browser.close()
for key,capture in result.items():
    png=base64.b64decode(capture.pop('dataURL').split(',',1)[1])
    (out/(key+'.png')).write_bytes(png)
    capture['imageSha256']=hashlib.sha256(png).hexdigest()
manifest=Path('assets/rolling-stock-sides/manifest.json')
entries=json.loads(manifest.read_text())
entries['native-henschel-dhg-500-c']={**result['side'],'url':'./'+str(out/'side.png'),'stock':{'id':'henschel-dhg-500-c','width':19}}
manifest.write_text(json.dumps(entries,indent=2)+'\n')
(out/'captures.json').write_text(json.dumps({'method':'Three.js runtime GLB: orthographic side at 8 px/mm and three-quarter thumbnail; transparent PNG',
    'sourceSha256':hashlib.sha256((out/'model.glb').read_bytes()).hexdigest(),'captures':result},indent=2)+'\n')
print('Captured Henschel side and thumbnail from runtime geometry')
