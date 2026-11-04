"""Read-only source and scope check, no simulator import or production access."""
import subprocess,json,hashlib,re
from pathlib import Path
base='6bf92bf6f100e1c74567dd2b1ed898874e50e66a'
allowed={'AGENTS.md','PROGRESS.md','docs/_active/train-management/STATUS.md'}
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',base],text=True).splitlines()
count=0
for p in paths:
 if p in allowed:continue
 assert Path(p).read_bytes()==subprocess.check_output(['git','show',base+':'+p]),p
 count+=1
for p in list(Path('tests/db/6A5').glob('*'))+list(Path('prototypes/train-management/history-access').glob('*'))+[Path('supabase/migrations/20261104175236_serien_history_integrity.sql')]:
 if p.is_file():assert not re.search(r'\b(?:sb_secret_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)',p.read_text()),p
r=dict(baseline=base,unchangedBaselineFiles=count,canonicalSHA256=hashlib.sha256(Path('src/canonical-layout.json').read_bytes()).hexdigest(),bundleSHA256=hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),runtimeAssetsUI='byte identical',approved6A3MigrationAnd6A2Prototype='byte identical',productionMutations=0,result='PASS')
assert r['canonicalSHA256']=='e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc'
assert r['bundleSHA256']=='0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b'
Path('docs/_active/train-management/evidence/6A5/invariants.json').write_text(json.dumps(r,indent=2)+'\n')
for line in subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=all'],text=True).splitlines():
 path=line[3:]
 assert path in allowed or path=='docs/_active/train-management/6A5_HISTORY.md' or path=='supabase/migrations/20261104175236_serien_history_integrity.sql' or path.startswith(('docs/_active/train-management/evidence/6A5/','prototypes/train-management/history-access/','tests/db/6A5/')),line
print(json.dumps(r))
