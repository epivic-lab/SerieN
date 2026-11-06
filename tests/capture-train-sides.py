"""Offline side assets from actual simulator groups; no production auth or code edits.
Start python3 -m http.server 8000 at the repository root before running this.
"""
import base64
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

work=Path('work');work.mkdir(exist_ok=True)
entry=Path('app.js').read_text().replace('"./src/','"../src/').replace("'./src/","'../src/")
entry+='''
import {captureStockSide} from '../scripts/capture-stock-sides.js';
window.__sideAssetsReady=()=>getTrainAssetCatalog().length===6;
window.__captureSides=()=>{
  const result={};
  for(const train of trains)for(const [i,group] of [train.group,...train.carObjs].entries()){
    const data=group.userData,key=data.assetDimensions?`kenney-${data.assetDimensions.type}`:`native-${i===0?train.modelKey:data.stock.kind}`;
    if(!result[key])result[key]=captureStockSide(renderer,group,scene.environment);
  }
  return result;
};
'''
(work/'side-capture-entry.js').write_text(entry)
subprocess.run(['node_modules/.bin/esbuild','work/side-capture-entry.js','--bundle','--format=esm','--outfile=work/side-capture-bundle.js'],check=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
out=Path(os.environ.get('SIDE_OUTPUT','assets/rolling-stock-sides'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    page=browser.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>cb.name==='tick'?1:raf(cb);")
    page.route('**/auth-gate.js*',lambda r:r.fulfill(content_type='text/javascript',body="document.body.classList.remove('auth-locked');document.getElementById('authGate').hidden=true;await import('./dist/game.js');"))
    page.route('**/dist/game.js',lambda r:r.fulfill(path=str(work/'side-capture-bundle.js'),content_type='text/javascript'))
    page.goto(base+'?diagnostics=1',wait_until='domcontentloaded')
    page.wait_for_function('window.__serienDiagnostics&&window.__sideAssetsReady()',timeout=90000)
    page.evaluate('__serienDiagnostics.step(0)')
    assets=page.evaluate('__captureSides()')
    page.select_option('#rollingModels','kenney')
    page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles[0].dimensions)')
    page.evaluate('__serienDiagnostics.step(0)')
    assets.update(page.evaluate('__captureSides()'))
    assert len(assets)==14,assets.keys()
    for key,asset in sorted(assets.items()):
        (out/(key+'.png')).write_bytes(base64.b64decode(asset.pop('dataURL').split(',')[1]))
        asset['url']='./assets/rolling-stock-sides/'+key+'.png'
    assert not errors,errors
    (out/'manifest.json').write_text(json.dumps(dict(sorted(assets.items())),indent=2)+'\n')
    browser.close()
    print('Generated 14 transparent orthographic side assets, 8 px/mm, original origins and mounting heights.')
