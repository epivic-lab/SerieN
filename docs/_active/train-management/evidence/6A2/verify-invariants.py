"""Run from repository root; checks 6A.2 scope and R1 preservation, writes local evidence only."""
import subprocess,hashlib,json,re
from pathlib import Path
base='4c90f1520ce6cd1cc7c1e9a538f819c135c45a82'
allowed={'AGENTS.md','PROGRESS.md','docs/_active/README.md','docs/_active/train-management/STATUS.md'}
newdocs={'docs/_active/train-management/6A2_PROTOTYPE.md','docs/_active/train-management/R0_ACCEPTANCE_MAPPING.md'}
files=list(filter(None,subprocess.check_output(['git','ls-tree','-r','--name-only',base],text=True).splitlines()))
count=0
for p in files:
 if p in allowed:continue
 assert Path(p).read_bytes()==subprocess.check_output(['git','show',base+':'+p]),p
 count+=1
for line in subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=all'],text=True).splitlines():
 p=line[3:];assert p in allowed|newdocs or p.startswith(('prototypes/train-management/capability-gateway/','docs/_active/train-management/evidence/6A2/')),line
sources=list(Path('prototypes/train-management/capability-gateway').glob('*'))
assert not any(p.name in ['package.json','package-lock.json'] for p in sources)
for p in sources:
 s=p.read_text()
 assert not re.search(r'\b(?:sb_secret_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)',s),p
assert "server.listen(0,'127.0.0.1'" in Path('prototypes/train-management/capability-gateway/gateway.js').read_text()
result={'baseline':base,'unchangedBaselineFiles':count,'canonicalSHA256':hashlib.sha256(Path('src/canonical-layout.json').read_bytes()).hexdigest(),'bundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'scope':'PASS','productionDependencies':'unchanged','secrets':'bounded pattern scan PASS; fixtures ephemeral only','SupabaseMutations':'none; no calls or credentials','runtimeIntegration':'none'}
assert result['canonicalSHA256']=='e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc'
assert result['bundleSHA256']=='0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b'
Path('docs/_active/train-management/evidence/6A2/invariants.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
