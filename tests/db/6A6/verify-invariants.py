"""Read-only invariants/scope scan; writes only this phase's evidence JSON."""
import hashlib,json,re,subprocess
from pathlib import Path
BASE='ef36596224133f19ceebeb4de889456c78959515'
allowed={'AGENTS.md','PROGRESS.md','docs/_active/train-management/STATUS.md'}
new_prefixes=('prototypes/train-management/integration-lab/','tests/db/6A6/','docs/_active/train-management/evidence/6A6/')
new_files={'docs/_active/train-management/6A6_INTEGRATION.md','docs/_active/train-management/6A_INTEGRATION_GATE.md'}
def git(*args):return subprocess.check_output(['git',*args],text=True)
paths=git('ls-tree','-r','--name-only',BASE).splitlines()
unchanged=0
for p in paths:
 if p in allowed:continue
 assert Path(p).read_bytes()==subprocess.check_output(['git','show',BASE+':'+p]),p
 unchanged+=1
for line in git('status','--porcelain=v1','--untracked-files=all').splitlines():
 p=line[3:]
 assert p in allowed or p in new_files or p.startswith(new_prefixes),line
scan=[]
for root in ['prototypes/train-management/integration-lab','tests/db/6A6','docs/_active/train-management/evidence/6A6']:
 for p in Path(root).rglob('*'):
  if p.is_file():
   if p.suffix=='.pyc':continue
   text=p.read_text()
   assert not re.search(r'\b(?:sb_secret_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN (?:EC |RSA )?PRIVATE KEY-----)',text),p
   scan.append(str(p))
client=Path('prototypes/train-management/integration-lab/client.js').read_text()
assert not re.search('postgres|service_role|sb_secret|DATABASE_URL|PGPASSWORD',client,re.I)
for name in ['app.js','dist/game.js','package.json','package-lock.json']:
 text=Path(name).read_text()
 assert 'integration-lab' not in text and 'sql-transport' not in text,name
canonical=hashlib.sha256(Path('src/canonical-layout.json').read_bytes()).hexdigest()
bundle=hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest()
assert canonical=='e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc'
assert bundle=='0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b'
result=dict(result='PASS',baseline=BASE,unchangedBaselineFiles=unchanged,canonicalSHA256=canonical,bundleSHA256=bundle,scannedFiles=len(scan),runtimeAssetsUI='byte identical',approvedMigrationsAnd6A2='byte identical',productionQueries=0,newApplicationDependencies=0)
Path('docs/_active/train-management/evidence/6A6/invariants.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
