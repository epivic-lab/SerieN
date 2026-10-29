"""Atomic rejection of model changes and diagnostic placement near a terminal."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':650,'height':760});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8000/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.__serienDiagnostics!==undefined',timeout=120000)
 page.evaluate("document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));document.getElementById('rollingModels').value='kenney';document.getElementById('rollingModels').dispatchEvent(new Event('change'));document.getElementById('addTrain').click()")
 page.wait_for_function('__serienDiagnostics.snapshot().stock.every(t=>t.vehicles.every(v=>v.dimensions))',timeout=90000)
 result=page.evaluate('''()=>{
 const api=__serienDiagnostics;api.placeTrain(3,'T39',42,1);
 const before=api.snapshot();document.getElementById('rollingModels').value='native';document.getElementById('rollingModels').dispatchEvent(new Event('change'));
 const after=api.snapshot();
 if(document.getElementById('rollingModels').value!=='kenney')throw Error('Model change should be blocked');
 if(JSON.stringify(before.stock.map(t=>t.journey))!==JSON.stringify(after.stock.map(t=>t.journey)))throw Error('Model rollback changed history');
 let rejected=false;try{api.placeTrain(3,'T39',62,1);}catch{rejected=true;}
 if(!rejected)throw Error('Invalid placement accepted');
 if(JSON.stringify(api.snapshot().stock[3].journey)!==JSON.stringify(after.stock[3].journey))throw Error('Invalid placement mutated Journey');
 return {modelRollback:true,placementRollback:true};
 }''')
 assert not errors,errors
 out=Path('docs/phase-5c');out.mkdir(parents=True,exist_ok=True);(out/'atomic-browser.json').write_text(json.dumps(result,indent=2)+'\n');print(result,flush=True);b.close()
