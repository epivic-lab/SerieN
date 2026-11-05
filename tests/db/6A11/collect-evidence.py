"""Collect the recorded isolated runs; never operates services or contacts remote sources."""
import json,shutil,hashlib,math,collections,base64
from pathlib import Path
root=Path(__file__).resolve().parents[3];work=Path('/workspace/work/6A11');out=root/'docs/_active/train-management/evidence/6A11';out.mkdir(parents=True,exist_ok=True)
def copy(src,dst):
 p=out/dst;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(work/src,p)
def write(name,value):(out/name).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
# Full successful integrated/ownerless run, including states and request-correlated audit.
for p in (work/'final').iterdir():
 if p.suffix=='.json' and p.name!='resources.json':copy('final/'+p.name,p.name)
copy('final.txt','integrated.txt')
for which,src in [('red','red-pinned'),('green','green')]:
 copy(src+'/reproduced-defects.json','defects-'+which+'.json')
 copy(src+'.txt','defects-'+which+'.txt')
copy('legacy-red/legacy-nonce.json','legacy-nonce-red.json')
copy('legacy-green-final/legacy-nonce.json','legacy-nonce-green.json')
copy('legacy-green-final.txt','legacy-nonce-green.txt')
rawFailure=(work/'regression-6A6-disk-failure.txt').read_bytes()
(out/'harness-disk-failure.txt').write_bytes(rawFailure.rstrip(b'\n')+b'\n')
write('harness-disk-failure-raw.json',dict(sha256=hashlib.sha256(rawFailure).hexdigest(),base64=base64.b64encode(rawFailure).decode(),readableCopy='harness-disk-failure.txt',normalization='only redundant terminal LF removed from readable copy for git diff --check; exact raw bytes preserved here'))
copy('unsupported-multi-plan.txt','unsupported-multi-plan.txt')
copy('regression-progress.txt','regression-progress.txt')
for name in ['docker-layer-inventory.json','docker-own-orphan-cleanup.txt','final-startup-disk-failure.txt']:copy(name,name)
copy('final-startup-disk-failure/cleanup.json','startup-disk-cleanup.json')
result=json.loads((out/'results.json').read_text());assert sum(t['result']=='PASS' for t in result['tests'])==111
assert sum(t['result']=='LIMITATION_REPRODUCED' for t in result['tests'])==1
assert len(json.loads((out/'ownerless-sql.json').read_text())['tests'])==185

reg=[]
for phase,key,num in [('6A3','cases',51),('6A4','cases',45),('6A5','cases',141),('6A8','tests',97),('6A6-final','cases',72),('6A9','tests',50),('6A10','tests',50)]:
 directory='regression-'+phase
 src=work/directory/'results.json';data=json.loads(src.read_text());assert len(data[key])==num
 assert all(t.get('result')=='PASS' for t in data[key]),phase
 copy(directory+'/results.json','regression-'+phase+'.json');copy(directory+'.txt','regression-'+phase+'.txt')
 reg.append(dict(phase=phase,checks=num,result='PASS',evidence='regression-'+phase+'.json'))
 if phase=='6A10':
  for n in ['ownerless-sql','zero-auth-proof','cleanup']:copy(directory+'/'+n+'.json','regression-6A10-'+n+'.json')
  assert len(json.loads((work/directory/'ownerless-sql.json').read_text())['tests'])==185
  reg.append(dict(phase='6A10 SQL O01–O14',checks=185,result='PASS',evidence='regression-6A10-ownerless-sql.json'))
for p in (work/'local-checks').iterdir():copy('local-checks/'+p.name,p.name)
reg.extend([dict(phase=n,checks=c,result='PASS',evidence=f) for n,c,f in [('6A2 HTTP',48,'capability-security.json'),('6A2 browser',5,'capability-browser.json'),('6A4 adapter',12,'adapter6A4.txt'),('6A5 adapter',25,'adapter6A5.txt'),('npm test (file units)',37,'npm-test.txt'),('Python/JMRI',9,'python.txt'),('build',1,'build.txt')]])
write('regression-matrix.json',dict(testsActuallyRerun=reg,note='No aggregate total: SQL/E2E/adapter/test-file units differ; reused fixtures do not count as new scenarios. 6A6-final is the post-fix rerun; old sequential run also passed.'))
# Derived load summaries use measured raw samples; faults never pooled with ordinary traffic.
profiles=json.loads((out/'load-profiles.json').read_text());summary=[]
for p in profiles['profiles']:
 samples=p['samples'];lat=sorted(s['latencyMs'] for s in samples);events=p.get('events',p.get('secondaryEvents',[]));wait=sorted(e['waitMs'] for e in events if isinstance(e.get('waitMs'),(float,int)))
 summary.append(dict(eventScope='secondary process, including preceding nonce race; not aggregate queue/wait' if p['id']=='two-broker-diagnostic' else 'current profile primary process events',id=p['id'],requests=len(samples),statusCounts=dict(collections.Counter(s['status'] for s in samples)),latencyMs=dict(p50=lat[math.ceil(len(lat)*.5)-1],p95=lat[math.ceil(len(lat)*.95)-1],max=max(lat)),observedQueuePeak=max((e.get('queued',0) for e in events),default=0),observedWaitMaxMs=max(wait,default=0),artificialLocks=p['artificialLocks'],faults=p['faults'],eventCounts=dict(collections.Counter(e.get('event') for e in events)),pgPeak=p.get('peakConnections',2),resources=p['resources']))
write('load-summary.json',dict(profiles=summary,globalBudget16='FAIL with two workers: 32 actual SQL connections',supportedMode='single broker',scope='Loopback Chromium/Playwright timing; 1.5s/2.7s operator locks only in spikes; no production SLO or distributed fairness certification. RSS is sampled process memory, not cgroup peak or PostgreSQL memory.'))
# Only source hashes of backup: full original dump retained in Codex work, successful restore is in SQL results.
raw=(work/'final/backup.sql').read_bytes();write('backup-manifest.json',dict(sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),pathInCodex=str(work/'final/backup.sql'),restoreEvidence='ownerless-sql.json / inventory-restored.json',scope='Full local logical rehearsal before post-cutover writes; NOT PITR or DB-loss recovery. Dump not published; synthetic manifests and restore assertions are published.'))
write('run-provenance.json',dict(base='de53ba702164428e3b76936dc9791dee4eb1697a',integrated='final: 185 SQL PASS +111 integrated PASS +1 diagnostic LIMITATION_REPRODUCED',metadataCorrection='Final runner emits explicit single-broker PASS and diagnostic multi-budget FAIL; previous attempt3 summary inherited metadata was corrected without changing assertions',failedHarnessAttempts=[dict(id='H01',cause='Docker reassigned unpinned loopback port across ingress restart',fix='reserve explicit loopback port before starting services',effect='first red header repro invalid; red-pinned rerun demonstrates defect'),dict(id='H02',cause='legacy nonce probe omitted transport.close and held two isolated PG fixtures',fix='close transport in finally, terminate exact test processes and allow supervisor cleanup',effect='first post-fix 6A6 retry ran out of disk; final legacy green and full 6A6 rerun clean'),dict(id='H04',cause='Failed Docker create left unregistered vfs writable/init copies consuming 1.2GiB',fix='Read-only layer metadata inventory, recheck no live image/container reference, empty only exact four current-phase failed-copy directories; leave older/unrelated layers intact',effect='Final first broker start returned125 before HTTP tests; cleanup all registered resources passed, clean rerun required'),dict(id='H03',cause='121s future proof drifted inside 120s validity while test loop ran',fix='future/past invalid proofs 300s from generation',effect='attempt1 failed oracle; no backend change')],productionQueries=0,stagingOperations=0))
print(out)
