"""DOM/consent boundary with real M2/M3 stores, no physical simulation claim."""
import os,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=Path(os.environ.get('U8_INTENTS_OUTPUT','work/u8-intents'));out.mkdir(parents=True,exist_ok=True)
entry=root/'work/u8-intents.js';entry.parent.mkdir(parents=True,exist_ok=True);entry.write_text('''import {createTrainProjects} from '../src/train-projects.js';import {createDepotInventory} from '../src/depot-inventory.js';import {createDepotView} from '../src/depot-view.js';
const projects=createTrainProjects();projects.begin();projects.add('native-steam');projects.add('native-tank');projects.add('native-tank');const plan=projects.confirm();
const inventory=createDepotInventory({getProjects:()=>projects.projects});let generation=0,calls=0;const a=inventory.add('native-tank'),b=inventory.add('native-tank');
const depot=createDepotView({inventory,getProjects:()=>({confirmed:projects.projects,draft:projects.draft}),getTrains:()=>[],getDetached:()=>[],getGeneration:()=>generation,onChange:()=>calls++});document.body.append(depot.root);depot.sync();
window.probe={inventory,depot,plan,a,b,get calls(){return calls},bump(){generation++}};''')
subprocess.run([str(root/'node_modules/.bin/esbuild'),str(entry),'--bundle','--format=esm','--outfile='+str(root/'work/u8-intents-bundle.js')],check=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);p=b.new_page()
 p.route('**/u8-intents.html',lambda q:q.fulfill(content_type='text/html',body='<html><head><base href="http://127.0.0.1:8035/"></head><body><script type="module" src="work/u8-intents-bundle.js"></script></body></html>'))
 p.goto('http://127.0.0.1:8035/u8-intents.html');p.wait_for_function('Boolean(window.probe)')
 def js(s):return p.evaluate(s)
 def remove():js('document.querySelector(`[data-depot-action="remove-${probe.a.id}"]`).click()')
 def consent():js('document.querySelector("dialog[open] [data-confirm]").click()')
 remove();assert js('probe.calls')==0
 # A pending Available record becomes Reserved through the real domain: obsolete Remove must fail.
 js('probe.inventory.assign(probe.a.id,probe.plan.id,probe.plan.vehicles[1].id)');consent();assert js('probe.inventory.size')==2 and js('probe.calls')==0
 js('probe.depot.sync();document.querySelector(`[data-depot-action="release-${probe.a.id}"]`).click()')
 # Original assignment is replaced by another equal-model slot while consent is pending.
 js('probe.inventory.release(probe.a.id);probe.inventory.assign(probe.a.id,probe.plan.id,probe.plan.vehicles[2].id)');consent();assert js('probe.inventory.items[0].assignment.vehicleId===probe.plan.vehicles[2].id') and js('probe.calls')==0
 js('probe.inventory.release(probe.a.id);probe.depot.sync()');remove();js('probe.bump()');consent();assert js('probe.inventory.size')==2 and js('probe.calls')==0
 remove();js('()=>{const b=document.querySelector("dialog[open] [data-confirm]");b.click();b.click()}');assert js('probe.inventory.size')==1 and js('probe.calls')==1
 js('document.querySelector(`[data-depot-action="remove-${probe.b.id}"]`).click();probe.depot.dispose()');assert p.locator('dialog').count()==0 and js('probe.inventory.size')==1 and js('probe.calls')==1
 (out/'results.json').write_text(json.dumps({'status':'PASS','scope':'real M2/M3 store + DOM adapter; no railway simulation','checks':['no onChange before consent','Available→Reserved invalidates pending Remove','changed assignment invalidates pending Release','generation mismatch refuses operation','double consent exactly one mutation/callback','pending dispose leaves inventory unchanged and removes owned dialog']},indent=2));b.close()
