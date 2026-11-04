import subprocess,json,hashlib,re
from pathlib import Path
base='348bfeff12c4005657098d89ea1d3c2ccdda9910'
allowed={'AGENTS.md','PROGRESS.md','docs/_active/README.md'}
checked=[]
for p in filter(None,subprocess.check_output(['git','ls-files','-z']).decode().split('\0')):
 if p.startswith('docs/') or p in allowed:continue
 assert subprocess.check_output(['git','show',base+':'+p])==Path(p).read_bytes(),p
 checked.append(p)
for line in subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=all']).decode().splitlines():
 assert line[3:] in allowed or line[3:].startswith('docs/_active/train-management/'),line
artifact=Path('docs/_active/train-management/evidence/6A1/invariants.json')
artifact.write_text('{}\n')
links=[]
for p in [Path(p) for p in allowed]+[p for p in Path('docs/_active/train-management').rglob('*') if p.is_file()]:
 t=p.read_text()
 assert not re.search(r'\b(?:sb_secret_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)',t),p
 if p.suffix=='.md':
  for target in re.findall(r'\]\(([^)]+)\)',t):
   if target.startswith(('http','/','#')):continue
   assert (p.parent/target.split('#')[0]).exists(),(p,target)
   links.append(str(p)+':'+target)
r={'baseline':base,'branch':subprocess.check_output(['git','branch','--show-current'],text=True).strip(),'nonDocumentationTrackedFilesByteIdentical':len(checked),'canonicalSHA256':hashlib.sha256(Path('src/canonical-layout.json').read_bytes()).hexdigest(),'productionBundleSHA256':hashlib.sha256(Path('dist/game.js').read_bytes()).hexdigest(),'scope':'Only AGENTS.md, PROGRESS.md, docs/_active/README.md, and docs/_active/train-management/','checkedLocalMarkdownLinks':len(links),'credentialPatternScan':'PASS (bounded pattern scan; not full security audit)','dbMutations':'none; connector SELECT/list calls only','browserPerformanceHardware':'NOT VERIFIED; no new runs for documentary change','newAuthorityOnGeometryOrMotion':False}
artifact.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
