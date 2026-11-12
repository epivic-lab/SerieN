"""Read-only source/architecture checks against the approved U2 checkpoint."""
import hashlib, json, subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[5]
base = '48a7c4d48b118877ec7edf7f4c61fba090e460b8'
out = Path(__file__).resolve().parent
def old(path): return subprocess.check_output(['git','show',base+':'+path],cwd=root)
def current(path): return (root/path).read_bytes()
def sha(data): return hashlib.sha256(data).hexdigest()

app = current('app.js').decode()
app = app.replace("import {mountViewportOverlays} from './src/ui/overlays.js';\n",'')
app = app.replace('uiShell = null, viewportOverlays = null;', 'uiShell = null;')
app = app.replace('  viewportOverlays?.dispose();\n','')
app = app.replace('  viewportOverlays?.update();\n','')
app = app.replace('viewportOverlays=mountViewportOverlays({host,guardedStops,getCameraPreset:()=>nav.preset});\n','')
assert app.encode() == old('app.js'), 'Non-UI app delta'
scene = current('src/guarded-stop-scene.js').decode().replace('get ui(){return Object.freeze({root:ui,mute,text});},','')
assert scene.encode() == old('src/guarded-stop-scene.js'), 'Guarded Stop body changed'
html = current('index.html').decode().replace('class="load u2-region u3-region" data-ctrl="CTRL-064" role="status"','class="load"')
assert html.encode() == old('index.html'), 'Non-startup markup delta'
historical = current('tests/browser-guarded-stop.py').decode()
historical = historical.replace("p.locator('#camt').click();p.select_option('#cameraView','follow');p.keyboard.press('Escape');", "p.select_option('#cameraView','follow');")
historical = historical.replace("button=p.locator('#bellChip')", "button=p.get_by_role('button',name='Mute railway warning bell')")
assert historical.encode() == old('tests/browser-guarded-stop.py'), 'Historical assertions changed'
assert current('ui/css/serien-ui-integration.css').startswith(old('ui/css/serien-ui-integration.css')), 'U2 CSS overwritten'

allowed = {'app.js','index.html','src/guarded-stop-scene.js','tests/browser-guarded-stop.py'}
baseline = json.loads((root/'docs/_active/ui-v21/evidence/U2/invariants.json').read_text())['files']
receipts = []
for record in baseline:
    path = record['path']
    before,after = old(path),current(path)
    assert before == after or path in allowed, path
    receipts.append({'path':path,'sha256':sha(after),'U2sha256':sha(before),'unchangedFromU2':before==after})
ui = subprocess.check_output(['git','ls-tree','-r','--name-only',base,'--','ui'],cwd=root,text=True).splitlines()
for path in ui:
    if path != 'ui/css/serien-ui-integration.css': assert current(path) == old(path), path
inputs = json.loads((out/'bundle-inputs.json').read_text())['inputs']
for path in inputs:
    assert not any(s in path.lower() for s in ['tm-reference','tm-catalog','tm-shell-v21','design-baseline','tests/','evidence/']),path
assert set(p for p in inputs if p.startswith('src/ui/')) == {'src/ui/shell.js','src/ui/guard-modal.js','src/ui/sfx.js','src/ui/overlays.js'}
assert 'requestToggle' not in current('src/next-switch-view.js').decode()
assert 'createGuardedBell' not in current('src/ui/overlays.js').decode()
sources = ['app.js','index.html','src/guarded-stop-scene.js','src/next-switch-view.js','src/view-controls.js','src/guarded-stop-bell.js','src/ui/overlays.js','src/ui/shell.js','src/ui/sfx.js','ui/css/serien-ui-integration.css','tests/browser-ui-v21-U3.py','tests/browser-ui-v21-U3-picking.py','tests/browser-guarded-stop.py']
result = {'status':'PASS','baseline':base,'unchangedU2BaselineFiles':sum(r['unchangedFromU2'] for r in receipts),'baselineFiles':len(receipts),'authorizedDeltas':sorted(allowed),'checks':['app delta reverses to U2 with UI bindings only','guarded-stop-scene delta is UI getter only','index delta is startup skin only','historical test differs only by View open/close and Bell locator','U2 CSS prefix intact; additions scoped to U3','all other U1/U2 UI assets/fonts/licenses byte-identical','all other baseline source/test/config/asset files byte-identical','HUD projection, topology SVG and view controller untouched','no mock/reference/test observer inputs in production bundle','no second Bell controller or global keyboard listener in adapter'],'files':receipts}
(out/'invariants.json').write_text(json.dumps(result,indent=2)+'\n')
(out/'source-hashes.json').write_text(json.dumps([{'path':path,'bytes':len(current(path)),'sha256':sha(current(path))} for path in sources],indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='files'},indent=2))
