"""Read-only baseline/scope/hash/source/secret checks; writes only 6A.10 evidence."""
import hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
BASE='d7075c3a980f554ba8111f5a5478279f5ff6ddbd'
ALLOWED={'PROGRESS.md','docs/_active/train-management/STATUS.md'}
MIGRATION='supabase/migrations/20261105090212_serien_ownerless_cutover.sql'
NEW={MIGRATION,*['docs/_active/train-management/'+x for x in ['6A10_OWNERLESS_GATE.md','6A10_CONSTRAINT_INVENTORY.md','6A10_ACL_MATRIX.md','6A10_ROLLBACK.md']]}
PREFIXES=('tests/db/6A10/','docs/_active/train-management/evidence/6A10/')
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
 assert (ROOT/p).suffix in {'.py','.md','.sql','.json','.txt'},p
assert git('branch','--show-current').decode().strip()=='feature/train-management'
subprocess.run(['git','-C',str(ROOT),'merge-base','--is-ancestor',BASE,'HEAD'],check=True)
def sha(p):return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
canonical=sha('src/canonical-layout.json');bundle=sha('dist/game.js')
assert canonical=='e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc'
assert bundle=='0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b'
migration=(ROOT/MIGRATION).read_text()
assert not re.search(r'\b(?:UPDATE|DELETE\s+FROM)\s+public\.(?:layout_snapshots|operation_receipts)\b',migration,re.I)
assert not re.search(r'\bDISABLE\s+TRIGGER\b|\bINSERT\s+INTO\s+auth\.users\b',migration,re.I)
assert not re.search(r'\bDROP\s+(?:TABLE|SCHEMA|FUNCTION)[^;]*\bCASCADE\b',migration,re.I)
assert not re.search(r'USING\s*\(\s*true\s*\)',migration,re.I)
def save_body(text):
 a=text.index('CREATE OR REPLACE FUNCTION serien_capability.save_checkpoint(')
 return text[a:text.index('END $$;',a)+len('END $$;')]
old=(ROOT/'supabase/migrations/20261104175236_serien_history_integrity.sql').read_text()
old_assignment='SELECT owner_id INTO own FROM public.layouts WHERE id=l AND workspace_id=w;'
new_assignment='own:=NULL; -- 6A.10: provenance is historical; every new workspace checkpoint is ownerless.'
assert save_body(old).count(old_assignment)==1
assert save_body(migration)==save_body(old).replace(old_assignment,new_assignment)
scan_paths={ROOT/p for p in ALLOWED|NEW}
for prefix in PREFIXES:scan_paths.update(p for p in (ROOT/prefix).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
pattern=r'\b(?:sb_secret_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN (?:EC |RSA )?PRIVATE KEY-----)'
for p in scan_paths:assert not re.search(pattern,p.read_text()),p
out=ROOT/'docs/_active/train-management/evidence/6A10/invariants.json';links=0
for p in [*(ROOT/'docs/_active/train-management').glob('6A10*.md'),ROOT/'docs/_active/train-management/STATUS.md',ROOT/'PROGRESS.md']:
 text=p.read_text()
 if p.name=='PROGRESS.md':text=text.split('## Train Management — 6A.10 ',1)[1]
 for target in re.findall(r'\]\(([^)]+)\)',text):
  if not target.startswith(('https:','http:','#')):
   destination=(p.parent/target.split('#')[0]).resolve()
   assert destination.exists() or destination==out,(p,target)
   links+=1
subprocess.run(['git','-C',str(ROOT),'diff','--check'],check=True)
result=dict(result='PASS',baseline=BASE,unchangedBaselineFiles=unchanged,canonicalSHA256=canonical,bundleSHA256=bundle,scannedFiles=len(scan_paths),localLinksChecked=links,newMigrations=1,approvedSQLContractsR0BrokerGatewayRuntimeUIAssetsDependencies='byte identical',saveCheckpointDifference='only assignment for newly inserted owner changed to NULL',historicalUpdatesOrDeletesInMigration=False,productionQueries=0,stagingOperations=0,ownerless=True,limitation='source/pattern checks and generated-value evidence scan; not general security audit or hosting certification')
out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
