"""Verify public release bytes and untouched authentication shell. No login bypass."""
import os,json,hashlib,time
from pathlib import Path
from urllib.request import urlopen,Request
from playwright.sync_api import sync_playwright
BASE=os.environ.get('SERIEN_URL','https://epivic-lab.github.io/SerieN/')
OUT=Path(os.environ.get('SERIEN_EVIDENCE','dist/l02-h-public'));OUT.mkdir(parents=True,exist_ok=True)
local=json.loads(Path('dist/cache-manifest.json').read_text())
def get(path):
 with urlopen(Request(BASE+path,headers={'Cache-Control':'no-cache'}),timeout=90) as r:return r.status,r.read()
status,raw=get('dist/cache-manifest.json');remote=json.loads(raw);assert status==200 and remote['version']==local['version'],'Published cache manifest differs'
checked=[]
for path in ['dist/game.js','assets/rolling-stock/big-boy/model.glb','assets/rolling-stock/big-boy/side.png','assets/rolling-stock/big-boy/thumbnail.png','auth-gate.js','auth-gate-core.js']:
 expected=next(f for f in local['files'] if f['path']==path);status,body=get(path);digest=hashlib.sha256(body).hexdigest()
 assert status==200 and digest==expected['sha256'] and len(body)==expected['bytes'],path
 checked.append({'path':path,'status':status,'bytes':len(body),'sha256':digest})
status,worker=get('service-worker.js');assert status==200 and worker==Path('dist/service-worker.js').read_bytes()
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),headless=True)
 page=browser.new_page(viewport={'width':1440,'height':950},service_workers='block');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE,wait_until='domcontentloaded');page.wait_for_selector('#authGate:visible',timeout=60000)
 assert page.evaluate("document.body.classList.contains('auth-locked')")
 page.screenshot(path=str(OUT/'public-auth-shell.png'));browser.close()
 assert not errors,errors
(OUT/'public-verification.json').write_text(json.dumps({'base':BASE,'verifiedAtUnix':time.time(),'cacheVersion':remote['version'],'files':checked,'serviceWorkerMatches':True,'authGateVisible':True,'pageErrors':errors,'loginPerformed':False},indent=2)+'\n')
print('Public manifest, bundle, Big Boy assets, service worker and untouched Auth shell PASS')
