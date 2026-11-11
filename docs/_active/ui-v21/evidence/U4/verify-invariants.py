"""U4 read-only architecture/source audit against approved U3, with explicit UI-only inversion."""
import hashlib,json,re,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[5]
out=Path(__file__).resolve().parent
base='907a9ec4a9d570f03af9ab77d39269ff49787256'
def old(path):return subprocess.check_output(['git','show',base+':'+path],cwd=root)
def data(path):return (root/path).read_bytes()
def sha(value):return hashlib.sha256(value).hexdigest()

app=data('app.js').decode().replace("import {mountSidebar} from './src/ui/sidebar.js';\n",'')
app=app.replace('viewportOverlays = null, sidebarUI = null;', 'viewportOverlays = null;')
app=''.join(line for line in app.splitlines(keepends=True) if line.strip() not in ['sidebarUI?.update();','sidebarUI?.dispose();'])
binding="""sidebarUI=mountSidebar({host:document.querySelector('.sidebar'),network,controlOrder,
  getSwitches:()=>switchSpecs.map(({id,on})=>({id,on})),getTrains:()=>trains,getSelected:()=>selected,
  onFocus:(id)=>{select(id);nav.focus(trains[id].journey.locate());$('cameraView').value='manual';}
});
"""
assert binding in app
app=app.replace(binding,'').replace('nextSwitchHUD?.refresh(true);sidebarUI?.update();updateRouteHighlight(true);','nextSwitchHUD?.refresh(true);updateRouteHighlight(true);')
assert app.encode()==old('app.js'),'Non-UI app.js delta'
assert data('ui/css/serien-ui-integration.css').startswith(old('ui/css/serien-ui-integration.css')),'U3 CSS prefix changed'
baseline=json.loads((root/'docs/_active/ui-v21/evidence/U3/invariants.json').read_text())['files']
receipts=[]
for entry in baseline:
    path=entry['path'];before=old(path);after=data(path)
    assert before==after or path=='app.js',path
    receipts.append({'path':path,'sha256':sha(after),'approvedU3sha256':sha(before),'unchangedFromU3':before==after})
protected=subprocess.check_output(['git','ls-tree','-r','--name-only',base,'--','src','ui','tests'],cwd=root,text=True).splitlines()
for path in protected:
    if path!='ui/css/serien-ui-integration.css':assert data(path)==old(path),path
source=data('src/ui/sidebar.js').decode()
assert 'railwayMapPath(network)' in source and 'locomotivePoint(train)' in source
assert not re.search(r'\.(?:on|velocity|speed|journey)\s*=(?!=)',source)
assert not any(s in source for s in ['createTurnoutCommands','requestToggle(','setMuted(','new THREE','createGuardedBell','window.addEventListener','innerHTML'])
inputs=json.loads((out/'bundle-inputs.json').read_text())['inputs']
assert all(not any(s in p.lower() for s in ['design-baseline','tm-reference','tm-shell-v21','tm-catalog','tests/','evidence/']) for p in inputs)
assert 'src/ui/sidebar.js' in inputs
for manifest in ['docs/_active/ui-v21/evidence/U3/EVIDENCE_SHA256.json','docs/_active/ui-v21/evidence/U2/recovery/PRIOR_EVIDENCE_SHA256.json']:
    for entry in json.loads((root/manifest).read_text()):assert sha(data(entry['path']))==entry['sha256'],entry['path']
sources=['app.js','src/ui/sidebar.js','ui/css/serien-ui-integration.css','src/train-deck.js','src/train-deck-state.js','src/next-switch-view.js','src/guarded-stop-scene.js','src/ui/overlays.js','src/ui/shell.js','src/turnout-interaction.js','src/turnout-commands.js','index.html','tests/browser-ui-v21-U4.py','tests/browser-ui-v21-U4-safety.py']
(out/'source-hashes.json').write_text(json.dumps([{'path':p,'bytes':len(data(p)),'sha256':sha(data(p))} for p in sources],indent=2)+'\n')
result={'status':'PASS','baseline':base,'unchangedManifestFiles':sum(r['unchangedFromU3'] for r in receipts),'manifestFiles':len(receipts),'authorizedExistingRuntimeFiles':['app.js','ui/css/serien-ui-integration.css'],'checks':['app.js inverses byte-for-byte to U3 after removing only mount/update/dispose/map focus binding','all existing src/ui/tests files unchanged','all existing UI assets/fonts/licenses unchanged','U3 integration CSS retained as exact prefix','no domain state assignment/new dispatcher/Bell/renderer/global key handler in new adapter','production bundle excludes mocks/reference/test observers','all previous U2/U3 evidence manifest hashes still match'],'files':receipts}
(out/'invariants.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='files'},indent=2))
