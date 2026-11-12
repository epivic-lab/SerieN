"""Observable unload guards and disposal for the standalone M2 window.
DOM/SVG only: no simulator, auth or WebGL. Synthetic cancelable beforeunload
checks listener behavior; browser-specific native prompt presentation is excluded.
"""
from pathlib import Path
import hashlib,json,os,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('M2_LIFECYCLE_OUTPUT',root/'work/m2-lifecycle'));out.mkdir(parents=True,exist_ok=True)
entry=root/'work/m2-lifecycle-entry.js';entry.write_text("""import {mountTrainManagement} from '../src/train-management.js';
const button=document.createElement('button');button.id='open';button.textContent='Open';document.body.append(button);
window.mountProjectWindow=()=>mountTrainManagement({button,getTrains:()=>[],getDetached:()=>[],getSelected:()=>null,getImportedCatalog:()=>[],onSelect:()=>{},onFocus:()=>{}});
window.projectWindow=mountProjectWindow();window.lifecycleReady=true;
""")
subprocess.run([str(root/'node_modules/.bin/esbuild'),str(entry),'--bundle','--minify','--format=esm','--outfile='+str(root/'work/m2-lifecycle-bundle.js')],check=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/work/m2-lifecycle.html',lambda r:r.fulfill(content_type='text/html',body='<html><head><base href="'+base+'"><link rel="stylesheet" href="style.css"></head><body><script type="module" src="work/m2-lifecycle-bundle.js"></script></body></html>'))
 page.goto(base+'work/m2-lifecycle.html');page.wait_for_function('window.lifecycleReady')
 guard="()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;}"
 assert not page.evaluate(guard)
 page.locator('#open').click();page.locator('[data-view="projects"]').click();page.locator('[data-project-action="new"]').click();assert page.evaluate(guard)
 page.once('dialog',lambda d:d.accept());page.locator('[data-project-action="cancel"]').click();assert not page.evaluate(guard)
 page.locator('[data-project-action="new"]').click();page.get_by_label('Catalog model',exact=True).select_option('native-steam');page.locator('[data-project-action="add"]').click();page.locator('[data-project-action="confirm"]').click();assert page.evaluate(guard)
 page.evaluate('projectWindow.dispose()');assert not page.evaluate(guard);assert page.locator('dialog.trainManagement').count()==0
 for _ in range(25):page.evaluate('projectWindow=mountProjectWindow();document.getElementById("open").click();projectWindow.dispose()')
 assert not page.evaluate(guard);page.locator('#open').click();assert page.locator('dialog.trainManagement').count()==0
 assert not errors,errors
 result={'result':'PASS','checks':['no unload guard before edits','dirty draft guarded','discard removes draft guard','session-only confirmed projects guarded','dispose removes unload handler, dialog and launcher action','25 mount/open/dispose cycles leave no observable guard or dialog residue'],'pageErrors':errors,'limit':'Synthetic cancelable beforeunload verifies handler behavior, not native browser prompt presentation.'}
 (out/'browser.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));b.close()
