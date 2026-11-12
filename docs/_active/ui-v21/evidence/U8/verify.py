import hashlib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent;base='cca11fb76d36e9688f41392fa1592b9a3514dce9'
def git(*a):return subprocess.check_output(['git',*a],cwd=root,text=True).strip()
allowed={'src/depot-view.js','src/train-management.js','src/ui/guard-modal.js','ui/css/serien-ui-integration.css','PROGRESS.md','docs/_active/ui-v21/STATUS.md'}
baseline=set(git('ls-tree','-r','--name-only',base).splitlines());changed=set(git('diff','--name-only',base).splitlines());assert changed&baseline<=allowed
manifest={}
for name in git('ls-tree','-r','--name-only',base,'src','ui','assets','app.js','index.html','style.css','auth-gate.js','package.json','package-lock.json').splitlines():
 old=subprocess.check_output(['git','show',base+':'+name],cwd=root);data=(root/name).read_bytes()
 if old!=data:assert name in allowed,name
 manifest[name]={'sha256':hashlib.sha256(data).hexdigest(),'sameAsU7':old==data}
css='ui/css/serien-ui-integration.css';assert (root/css).read_bytes().startswith(subprocess.check_output(['git','show',base+':'+css],cwd=root))
old=git('show',base+':src/train-management.js');new=(root/'src/train-management.js').read_text();assert new.replace('depot=createDepotView({guard,inventory,','depot=createDepotView({inventory,').rstrip()==old
meta=json.load(open(ev/'metafile-final.json'));assert not any(any(x in n.lower() for x in ['reference','mock','test','work/']) for n in meta['inputs'])
for a in [base,'6f8a28a4fe49875dc499872454d5128b2860bdfc','184cc9ba93a6b35493f365b2ffcb20ef0645963d']:assert subprocess.run(['git','merge-base','--is-ancestor',a,'HEAD'],cwd=root).returncode==0
(ev/'source-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n')
r={'status':'PASS','baseline':base,'branch':git('branch','--show-current'),'HEADBeforeCheckpoint':git('rev-parse','HEAD'),'upstream':git('rev-parse','@{upstream}'),'changesToExisting':sorted(changed&baseline),'bundleSHA256':hashlib.sha256((root/'dist/game.js').read_bytes()).hexdigest(),'TM_wiring':'exactly one added shared guard argument; other U7 source identical','protectedFiles':'M2, M3, Projects view, catalog, geometry, R1, dispatcher, app/index/Auth, assets/dependencies/workflow unchanged','CSS':'U7 prefix identical','bundleInputs':list(meta['inputs'])};(ev/'invariants.json').write_text(json.dumps(r,indent=2)+'\n');print('PASS')
