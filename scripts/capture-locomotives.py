"""Prerender the six actual locomotive variants using the app's ONE renderer.
Run against npm start; requires Python Playwright and Chromium.
The returned PNG bytes are written intact, without image synthesis or retouching.
"""
import base64
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

output=Path('assets/locomotive-thumbnails')
output.mkdir(parents=True,exist_ok=True)
sources={'steam':'train-locomotive-a','diesel':'train-diesel-a','shunter':'train-diesel-box-a'}
manifest={'method':'offscreen capture of visible scene models, shared main renderer; transparent RGBA; three-quarter orthographic camera', 'captures':{}}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':650,'height':760});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8000/?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=90000)
    page.evaluate("document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('pause').click()")
    for variant in ['native','kenney']:
        page.evaluate("v=>{document.getElementById('rollingModels').value=v;document.getElementById('rollingModels').dispatchEvent(new Event('change'));}",variant)
        if variant=='kenney':page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles[0].dimensions)',timeout=90000)
        for id,kind in enumerate(['steam','diesel','shunter']):
            capture=page.evaluate('id=>__serienDiagnostics.captureThumbnail(id)',id)
            key=variant+'-'+kind
            png=base64.b64decode(capture.pop('dataURL').split(',',1)[1])
            (output/(key+'.png')).write_bytes(png)
            source=Path('assets/kenney/'+sources[kind]+'.glb') if variant=='kenney' else Path('src/rolling-stock-art.js')
            manifest['captures'][key]={**capture,'modelKind':kind,'variant':variant,'imageSha256':hashlib.sha256(png).hexdigest(),'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()}
            if variant=='native':
                app=Path('app.js').read_text();native=app[app.index('const railWheel ='):app.index('const trains =')]
                manifest['captures'][key]['nativeModelSha256']=hashlib.sha256(native.encode()+Path('src/rolling-stock-art.js').read_bytes()).hexdigest()
            print(key,capture['bounds'],len(png),'bytes',flush=True)
    assert not errors,errors
    assert page.locator('#view3d canvas').count()==1
    browser.close()
(output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
