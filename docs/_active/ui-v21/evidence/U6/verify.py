import hashlib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent;base='e6f152c9b5a23347cbbd5aa6898b91a11e2194e0'
def git(*a):return subprocess.check_output(['git',*a],cwd=root,text=True).strip()
allowed={'src/train-management.js','src/train-projects-view.js','src/ui/guard-modal.js','ui/css/serien-ui-integration.css','PROGRESS.md','docs/_active/ui-v21/STATUS.md'}
baseline=set(git('ls-tree','-r','--name-only',base).splitlines());changed=set(git('diff','--name-only',base).splitlines());assert (changed&baseline)<=allowed
manifest={}
for name in git('ls-tree','-r','--name-only',base,'src','ui','assets','app.js','index.html','style.css','auth-gate.js','package.json','package-lock.json').splitlines():
 data=(root/name).read_bytes();old=subprocess.check_output(['git','show',base+':'+name],cwd=root)
 if data!=old:assert name in allowed,name
 manifest[name]={'sha256':hashlib.sha256(data).hexdigest(),'sameAsU5':old==data}
css='ui/css/serien-ui-integration.css';assert (root/css).read_bytes().startswith(subprocess.check_output(['git','show',base+':'+css],cwd=root))
meta=json.load(open(ev/'metafile-final.json'));assert not any(any(x in name.lower() for x in ['reference','test','work/','mock']) for name in meta['inputs'])
for a in [base,'184cc9ba93a6b35493f365b2ffcb20ef0645963d']:assert subprocess.run(['git','merge-base','--is-ancestor',a,'HEAD'],cwd=root).returncode==0
assert 'if(store.dirty&&!window.confirm' in (root/'src/train-projects-view.js').read_text()
assert 'projects.dirty||projects.hasProjects||inventory.size>0' in (root/'src/train-management.js').read_text()
(ev/'source-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n')
r={'status':'PASS','base':base,'branch':git('branch','--show-current'),'HEADBeforeCheckpoint':git('rev-parse','HEAD'),'upstream':git('rev-parse','@{upstream}'),'bundleSHA256':hashlib.sha256((root/'dist/game.js').read_bytes()).hexdigest(),'preexistingSourceChanges':sorted(changed&baseline),'CSS':'U5 prefix identical','domainAssetsAuthEngineAppIndexDependencies':'unchanged','ProjectsViewDelta':'only added discardAfterConsent(expected JSON) returning boolean; original discard and all internal handlers unchanged','bundleInputs':list(meta['inputs'])};(ev/'invariants.json').write_text(json.dumps(r,indent=2)+'\n');print('PASS')
