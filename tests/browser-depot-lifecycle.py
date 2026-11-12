"""M3 session guard and disposal, standalone DOM/SVG, no simulator or Auth."""
from pathlib import Path
import json,os,subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('M3_LIFECYCLE_OUTPUT',root/'work/m3-lifecycle'));out.mkdir(parents=True,exist_ok=True)
entry=root/'work/m3-lifecycle-entry.js';entry.write_text("""import {mountTrainManagement} from '../src/train-management.js';
const button=document.createElement('button');button.id='open';button.textContent='Open';document.body.append(button);
window.mountDepotWindow=()=>mountTrainManagement({button,getTrains:()=>[],getDetached:()=>[],getSelected:()=>null,getImportedCatalog:()=>[],onSelect:()=>{},onFocus:()=>{}});
window.depotWindow=mountDepotWindow();window.lifecycleReady=true;
""")
subprocess.run([str(root/'node_modules/.bin/esbuild'),str(entry),'--bundle','--minify','--format=esm','--outfile='+str(root/'work/m3-lifecycle-bundle.js')],check=True)
base=os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/work/m3-lifecycle.html',lambda q:q.fulfill(content_type='text/html',body='<html><head><base href="'+base+'"><link rel="stylesheet" href="style.css"></head><body><script type="module" src="work/m3-lifecycle-bundle.js"></script></body></html>'))
 page.goto(base+'work/m3-lifecycle.html');page.wait_for_function('window.lifecycleReady')
 guard="()=>{const e=new Event('beforeunload',{cancelable:true});dispatchEvent(e);return e.defaultPrevented;}"
 assert not page.evaluate(guard)
 page.locator('#open').click();page.locator('[data-view="depot"]').click();page.locator('[data-depot-action="add"]').click();assert page.evaluate(guard)
 page.locator('dialog.trainManagement [data-close]').click();page.locator('#open').click();assert page.locator('[data-depot-id]').count()==1
 page.locator('[data-depot-action^="remove-"]').click();assert not page.evaluate(guard)
 page.locator('[data-depot-action="add"]').click();assert page.evaluate(guard);page.evaluate('depotWindow.dispose()');assert not page.evaluate(guard);assert page.locator('dialog.trainManagement').count()==0
 for _ in range(25):page.evaluate("depotWindow=mountDepotWindow();document.getElementById('open').click();document.querySelector('[data-view=depot]').click();document.querySelector('[data-depot-action=add]').click();depotWindow.dispose()")
 assert not page.evaluate(guard);page.locator('#open').click();assert page.locator('dialog.trainManagement').count()==0;assert not errors,errors
 result={'status':'PASS','checks':['virtual inventory guard without M2 projects','close/reopen preserves records','removing last record clears guard','dispose removes guard and dialog','25 create/open/add/dispose cycles leave no observable residue'],'pageErrors':errors,'limit':'Synthetic cancelable beforeunload tests the handler, not physical browser prompt presentation.'}
 (out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));b.close()
