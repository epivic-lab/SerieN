"""Run from repo root. Read-only source/scope checks; writes evidence only."""
import subprocess,json,hashlib,re
from pathlib import Path
base='f64bdc8291a9c51a29c60076bae303e91e6e1d26'
allowed={'AGENTS.md','PROGRESS.md','docs/_active/README.md','docs/_active/train-management/STATUS.md'}
prototype={f'prototypes/train-management/capability-gateway/{p}' for p in ['gateway.js','protocol.js','security.test.js']}
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base],text=True).splitlines()
count=0
for p in paths:
 if p in allowed|prototype:continue
 assert Path(p).read_bytes()==subprocess.check_output(['git','show',base+':'+p]),p
 count+=1
for line in subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=all'],text=True).splitlines():
 p=line[3:];assert p in allowed|prototype or p=='docs/_active/train-management/6A3_SCHEMA.md' or p.startswith(('docs/_active/train-management/evidence/6A3/','tests/db/6A3/','supabase/migrations/')),line
for p in list(Path('tests/db/6A3').glob('*'))+list(Path('supabase/migrations').glob('*')):
 if p.is_file():
  assert not re.search(r'\b(?:sb_secret_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)',p.read_text()),p
for p in [Path('docs/_active/train-management/6A3_SCHEMA.md'),Path('docs/_active/train-management/evidence/6A3/REPORT.md')]:
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if not target.startswith(('https:','#')):assert (p.parent/target).exists(),(p,target)
r={'baseline':base,'unchangedBaselineFiles':count,'runtimeAndAssets':'byte identical','canonicalSHA256':hashlib.sha256(Path('src/canonical-layout.json').read_bytes()).hexdigest(),'bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'productionMutations':'none; remote list/SELECT/advisors only','newProductionDependencies':False,'scope':'PASS'}
assert r['canonicalSHA256']=='e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc'
assert r['bundleSHA256']=='0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b'
Path('docs/_active/train-management/evidence/6A3/invariants.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps(r))
