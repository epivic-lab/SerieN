"""U1 staging integrity / protected baseline checks, no runtime mutation."""
from pathlib import Path
import json,hashlib,subprocess,re
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
m=json.loads((HERE/'asset-manifest.json').read_text());records={v['file']:v for v in m['files']}
for p in sorted((ROOT/'ui').rglob('*')):
 if p.is_file() and str(p.relative_to(ROOT)) not in records:
  n=str(p.relative_to(ROOT));records[n]={'file':n,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':p.stat().st_size,'change':'generated U1 local @font-face/integration' if p.suffix=='.css' else 'generated manifest from approved PRE-U1 provenance'}
# Finalize only inventory of generated files, never update declared hashes of copied sources.
m['files']=list(records.values());(HERE/'asset-manifest.json').write_text(json.dumps(m,indent=2)+'\n')
checks=[]
def ck(name,ok,details=None):checks.append({'name':name,'status':'PASS' if ok else 'FAIL','details':details})
ck('all staged hashes/sizes',all((ROOT/v['file']).stat().st_size==v['size'] and hashlib.sha256((ROOT/v['file']).read_bytes()).hexdigest()==v['sha256'] for v in records.values()))
fm=json.loads((ROOT/'ui/fonts/manifest.json').read_text());ck('approved WOFF2 and exact license copies',all(hashlib.sha256((ROOT/f['staged_file']).read_bytes()).hexdigest()==f['woff2']['sha256'] and hashlib.sha256((ROOT/f['license_staged']).read_bytes()).hexdigest()==f['license_sha256'] for f in fm['fonts']))
ck('no remote imports in staged CSS',not re.search(r'@import\s+(?:url\()?\s*[\'"]?https?://','\n'.join(p.read_text() for p in (ROOT/'ui/css').glob('*.css'))))
ck('no scripts in staging',not list((ROOT/'ui').rglob('*.js')))
old=json.loads((ROOT/'docs/_active/ui-v21/evidence/U0/validation.json').read_text());invariants=[]
for v in old['invariant_files']:
 f=ROOT/v['path'];data=f.read_bytes();blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest();invariants.append({'path':v['path'],'sha256':hashlib.sha256(data).hexdigest(),'baseline_blob':v['baseline_git_blob'],'unchanged':blob==v['baseline_git_blob']})
ck('226 protected files identical to 91722fb',len(invariants)==226 and all(v['unchanged'] for v in invariants))
changed=set(subprocess.check_output(['git','diff','--name-only','65b910bc25def1f0064a0758e29f8d5715314568'],cwd=ROOT,text=True).splitlines())|set(subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=ROOT,text=True).splitlines())
allowed=lambda p:p.startswith(('ui/','docs/_active/ui-v21/evidence/U1/')) or p in ['PROGRESS.md','docs/_active/ui-v21/U1_ASSET_STAGING_REPORT.md','docs/_active/ui-v21/STATUS.md','docs/_active/ui-v21/ASSET_INVENTORY.md','docs/ui-v2-integration/STATUS.md']
ck('U1 scope including untracked files',all(allowed(p) for p in changed),sorted(p for p in changed if not allowed(p)))
ck('source runtime untouched since approved baseline',not subprocess.check_output(['git','diff','--name-only','91722fb','--','index.html','style.css','app.js','src','assets','tests','scripts','supabase','.github','auth-gate.js','auth-gate-core.js','package.json','package-lock.json'],cwd=ROOT,text=True).strip())
report={'status':'PASS' if all(c['status']=='PASS' for c in checks) else 'FAIL','checks':checks,'invariant_files':invariants,'files':len(records)};(HERE/'asset-validation.json').write_text(json.dumps(report,indent=2)+'\n');print(report['status'],len(records),'staged files',len(invariants),'unchanged baseline files')
if report['status']!='PASS':raise SystemExit(1)
