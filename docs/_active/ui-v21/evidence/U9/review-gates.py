"""Review checkpoint completeness and provenance; no browser rerun or product mutation."""
import hashlib,json,re,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent
def read(n):return json.loads((ev/n).read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
required=['results.json','commands.json','invariants.json','source-hashes.json','control-coverage.json','screen-coverage.json','adapter-coverage.json','accessibility-matrix.json','responsive-matrix.json','lifecycle-matrix.json','regression-matrix.json','release-readiness.json','metafile-final.json','bundle.json','issues.json','failure-recovery.json','gate-test-coverage.json','header-evidence-reuse.json','recovery-state.json']
for n in required:assert (ev/n).is_file(),n
result=read('results.json');bundle=read('bundle.json');a=read('acceptance-checkpoint/results.json');n=read('native-checkpoint-recovery/results.json')
assert result['proposedVerdict']=='READY WITH DOCUMENTED LIMITATIONS' and result['regiaApproval']=='PENDING_INDEPENDENT_REVIEW'
assert a['status']==n['status']=='PASS'
assert a['bundleSHA256']==n['bundleSHA256']==bundle['sha256']==sha(root/'dist/game.js')
assert a['cssSHA256']==n['cssSHA256']==bundle['cssSHA256']==sha(root/'ui/css/serien-ui-integration.css')
assert read('header-engraved-plaque/delivery/results.json')['status']=='PASS'
assert read('header-evidence-reuse.json')['finalBundle']==bundle['sha256']
assert len(a['screenshots'])==111 and len(a['accessibility'])==6
assert not any(x['violations']for x in a['accessibility'])
assert not any(v['id']=='aria-prohibited-attr'for x in a['accessibility']for v in x['incomplete'])
assert not a['errors']and not a['external']and not a['httpFailures']
assert not n['errors']and not n['external']and not n['httpFailures']
assert all(x['canvasCount']==1 and x['native']for x in n['checkpoints'])
c=read('control-coverage.json')['controls'];s=read('screen-coverage.json')['screens'];ad=read('adapter-coverage.json')['adapters']
assert [x['id']for x in c]==[f'CTRL-{i:03}'for i in range(1,67)]
registry=json.load(open(root/'docs/_active/ui-v21/SCREENS.json'))['screens'];assert {x['id']for x in s}=={x['id']for x in registry} and len(s)==31
assert [x['id']for x in ad]==[f'A{i:02}'for i in range(1,14)]
for x in c:
 p=ev/x['functionalEvidence']['path'];assert p.is_file()and sha(p)==x['functionalEvidence']['sha256'],p
for x in s:
 if x['visualEvidence']:assert (ev/x['visualEvidence']).is_file(),x
for x in a['screenshots']:assert (ev/'acceptance-checkpoint'/x['file']).is_file()
for x in read('lifecycle-matrix.json')['checks']:assert (ev/x['evidence']).is_file(),x
for p,record in read('source-hashes.json').items():assert sha(root/p)==record['sha256'],p
for p,digest in read('header-engraved-plaque/source-hashes.json').items():assert sha(root/p)==digest,p
commands=read('commands.json');names={x['name']:x['exitCode']for x in commands}
for name in ['node-checkpoint','python','canonical','canonical-diff','header-after','shell-header-final','acceptance-checkpoint','native-checkpoint-recovery','phase-zero-final','train-deck-final','picking-final','M2-lifecycle-final','M3-lifecycle-final','regression-M2','regression-intents','source-inventory-final','assemble-final-matrices-recovered']:assert names[name]==0,name
assert 'tests 254'in (ev/'tests/node-checkpoint.txt').read_text()and 'fail 0'in (ev/'tests/node-checkpoint.txt').read_text()
assert 'Ran 9 tests'in (ev/'tests/python.txt').read_text()
release=read('release-readiness.json');assert release['status']=='RELEASE_BLOCKED'and not release['deploymentPerformed']and release['workflowUnchangedSinceU8']
assert sha(root/'.github/workflows/pages.yml')==release['workflowSHA256']
for doc in ['U9_REPORT.md','STATUS.md','README.md']:
 p=root/'docs/_active/ui-v21'/doc
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if '://'not in target:assert (p.parent/target.split('#')[0]).exists(),(p,target)
assert subprocess.check_output(['git','branch','--show-current'],cwd=root,text=True).strip()=='codex/ui-v2-integration'
print('PASS review package: final bundle/CSS/native/111 captures,66 controls,31 screens,A01–A13,source hashes,real paths,receipts,release separation; Regia pending')
