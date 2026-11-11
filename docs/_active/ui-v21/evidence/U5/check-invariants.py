"""Source preservation, actual Git ancestry and production dependency evidence."""
import hashlib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent
base='1d591bbc914f74cf066666522c6692be4132a614'
def git(*args):return subprocess.check_output(['git',*args],cwd=root).decode().strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
allowed={'app.js','index.html','src/train-deck.js','src/ui/guard-modal.js','ui/css/serien-ui-integration.css','tests/browser-train-deck.py','tests/browser-phase-zero.py','tests/browser-ui-v21-U2.py','tests/browser-ui-v21-U4.py','PROGRESS.md','docs/_active/ui-v21/STATUS.md'}
baselineFiles=set(git('ls-tree','-r','--name-only',base).splitlines())
changed=git('diff','--name-only',base).splitlines();assert set(changed)&baselineFiles<=allowed,changed
manifest={}
for name in git('ls-tree','-r','--name-only',base,'src','assets','ui','auth-gate.js','style.css','index.html','app.js','package.json','package-lock.json').splitlines():
 old=subprocess.check_output(['git','show',base+':'+name],cwd=root);now=(root/name).read_bytes()
 if old!=now:assert name in allowed,name
 manifest[name]={'sha256':hashlib.sha256(now).hexdigest(),'sameAsU4':old==now}
for name in ['src/ui/dock.js','src/ui/keyboard.js']:
 manifest[name]={'sha256':sha(root/name),'sameAsU4':False,'newInU5':True}
(ev/'source-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n')
old=git('show',base+':app.js');new=(root/'app.js').read_text()
# Exact preserved railway bodies, including original reset transaction after extraction of confirm.
regions=[('function reset() {','function setTrainSpeed'),('function setTrainSpeed','$("routePreview").onclick'),('$("pause").onclick = () => {','$("reset").onclick = reset;')]
for start,end in regions:
 a=old[old.index(start):old.index(end,old.index(start))]
 if start=='function reset() {':a=a.replace('  if (!confirm("Reset locomotives, switches and missions?")) return;\n','')
 b=new[new.index(start):new.index(end,new.index(start))] if end in new else new[new.index(start):new.index('// Reset intent is mounted',new.index(start))]
 assert a==b,start
css=(root/'ui/css/serien-ui-integration.css').read_bytes();previous=subprocess.check_output(['git','show',base+':ui/css/serien-ui-integration.css'],cwd=root);assert css.startswith(previous)
meta=json.load(open(ev/'artifacts/production-meta.json'));inputs=list(meta['inputs']);assert not any(any(x in p.lower() for x in ['reference','frozen','test','work/']) for p in inputs)
records=[]
for ancestor in ['907a9ec4a9d570f03af9ab77d39269ff49787256','184cc9ba93a6b35493f365b2ffcb20ef0645963d',base]:
 code=subprocess.run(['git','merge-base','--is-ancestor',ancestor,'HEAD'],cwd=root).returncode;assert code==0;records.append({'ancestor':ancestor,'exitCode':code})
result={'status':'PASS','HEAD':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'upstream':git('rev-parse','--abbrev-ref','@{upstream}'),'ancestry':records,'bundleSHA256':sha(root/'dist/game.js'),'bundleInputs':inputs,'changedPreexistingFiles':changed,'preservedFiles':sum(m['sameAsU4'] for m in manifest.values()),'sourceCount':len(manifest),'railwayBodies':'exact including reset after removal of confirm only','CSS':'U4 prefix byte identical','railwayState':'no domain module modified','security':'Auth, Supabase, workflow, dependencies, asset files unchanged; no reference/test module bundled'}
(ev/'invariants.json').write_text(json.dumps(result,indent=2)+'\n');print('PASS')
