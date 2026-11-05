"""Read-only whole-base byte checks; write only the new phase's invariant evidence."""
import hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
BASE='de53ba702164428e3b76936dc9791dee4eb1697a'
FIXES={
 'prototypes/train-management/broker-lab/broker.js',
 'prototypes/train-management/broker-lab/ingress.js',
 'prototypes/train-management/capability-gateway/gateway.js',
 'prototypes/train-management/integration-lab/gateway.js',
}
ALLOWED=FIXES|{'PROGRESS.md','docs/_active/train-management/STATUS.md'}
NEW={ 'docs/_active/train-management/'+s for s in ['6A11_ADVERSARIAL_GATE.md','6A11_SECURITY_MATRIX.md','6A11_LOAD_FAULT_RECOVERY.md','6A11_SECURITY_BOUNDARIES.md','6A11_REGRESSION_MATRIX.md']}
PREFIXES=('tests/db/6A11/','docs/_active/train-management/evidence/6A11/')
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args])
paths=git('ls-tree','-r','--name-only',BASE).decode().splitlines()
objects=subprocess.check_output(['git','-C',str(ROOT),'cat-file','--batch'],input=('\n'.join(BASE+':'+p for p in paths)+'\n').encode())
offset=0;unchanged=0
for p in paths:
 end=objects.index(b'\n',offset);size=int(objects[offset:end].split()[-1]);content=objects[end+1:end+1+size];offset=end+size+2
 if p not in ALLOWED:assert (ROOT/p).read_bytes()==content,p;unchanged+=1
changed=set(git('diff','--name-only',BASE).decode().splitlines())
changed.update(line[3:] for line in git('status','--porcelain=v1','--untracked-files=all').decode().splitlines())
for p in changed:
 assert p in ALLOWED|NEW or p.startswith(PREFIXES),p
 assert (ROOT/p).suffix in {'.py','.js','.md','.json','.txt'},p
assert git('branch','--show-current').decode().strip()=='feature/train-management'
subprocess.run(['git','-C',str(ROOT),'merge-base','--is-ancestor',BASE,'HEAD'],check=True)
R1='348bfeff12c4005657098d89ea1d3c2ccdda9910'
runtimePaths=['app.js','index.html','src','assets','asset-library','dist','package.json','package-lock.json','scripts',':(glob)tests/*.test.js']
assert not git('diff','--name-only',R1,'--',*runtimePaths).strip(),'R1 runtime/source/asset diff'
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
canonical=sha('src/canonical-layout.json');bundle=sha('dist/game.js')
assert canonical=='e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc'
assert bundle=='0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b'
# Verify the two older gateways have *only* the red/green-demonstrated type guard.
for name,regex in [('capability-gateway','!/^[0-9a-f]{32}$/.test(p.nonce)'),('integration-lab','!/^[a-f0-9]{32}$/.test(p.nonce)')]:
 p='prototypes/train-management/'+name+'/gateway.js';old=git('show',BASE+':'+p).decode();assert old.count(regex)==1
 assert (ROOT/p).read_text()==old.replace(regex,"typeof p.nonce!=='string'||"+regex)
# No migrations, contract, pool/transport, lock/dependency or R1 file can differ above.
scan_paths={ROOT/p for p in ALLOWED|NEW}
for prefix in PREFIXES:scan_paths.update(p for p in (ROOT/prefix).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
pattern=r'(?:\b(?:sb_secret_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)|-----BEGIN (?:EC |RSA )?PRIVATE KEY-----)'
for p in scan_paths:assert not re.search(pattern,p.read_text()),p
out=ROOT/'docs/_active/train-management/evidence/6A11/invariants.json';links=0
for p in [*(ROOT/'docs/_active/train-management').glob('6A11*.md'),ROOT/'docs/_active/train-management/STATUS.md',ROOT/'PROGRESS.md']:
 text=p.read_text()
 if p.name=='PROGRESS.md':text=text.split('## Train Management — 6A.11 ',1)[1]
 for target in re.findall(r'\]\(([^)]+)\)',text):
  if not target.startswith(('https:','http:','#')):
   dest=(p.parent/target.split('#')[0]).resolve();assert dest.exists() or dest==out,(p,target);links+=1
subprocess.run(['git','-C',str(ROOT),'diff','--check'],check=True)
result=dict(result='PASS',baseline=BASE,r1Baseline=R1,r1RuntimeComparedDirectly=True,unchangedBaselineFiles=unchanged,allowedExistingChanges=sorted(ALLOWED),canonicalSHA256=canonical,bundleSHA256=bundle,scannedFiles=len(scan_paths),localLinksChecked=links,newMigrations=0,approvedSQLContractsR0D09D10PoolTransportRuntimeUIAssetsDependencies='byte identical',productionQueries=0,stagingOperations=0,scope='single broker isolated synthetic PG17; NOT general audit, staging or complete R1 visual/perf certification')
out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
