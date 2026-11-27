"""Capture actual production Big Boy at a straight pose; no generated artwork."""
import base64,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
 page=browser.new_page();errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print(str(e),flush=True)))
 page.goto('http://127.0.0.1:8027/scripts/big-boy/capture-catalog.html');page.wait_for_function('window.catalogCapture',timeout=60000)
 data=page.evaluate('catalogCapture');assert not errors,errors
 out=Path('assets/rolling-stock/big-boy')
 for name,result in data.items():
  image=base64.b64decode(result.pop('dataURL').split(',')[1]);(out/(name+'.png')).write_bytes(image);result['imageSha256']=hashlib.sha256(image).hexdigest()
 side=data['side'];side['url']='./assets/rolling-stock/big-boy/side.png';side['stock']={'id':'big-boy','width':26}
 manifest=Path('assets/rolling-stock-sides/manifest.json');m=json.loads(manifest.read_text());m['native-big-boy']=side;manifest.write_text(json.dumps(m,indent=2)+'\n')
 Path('docs/_active/rolling-stock/evidence/L02-G/catalog-capture.json').write_text(json.dumps(data,indent=2)+'\n');browser.close()
