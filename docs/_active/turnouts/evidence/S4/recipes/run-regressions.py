import subprocess,os,json
from pathlib import Path
root=Path('/workspace/SerieN');work=Path('/workspace/work/s4');env={**os.environ,'SERIEN_URL':'http://127.0.0.1:8003/'}
cases=[('arrows','browser-turnout-arrows.py',root,{'S4_BUNDLE':str(work/'s4-profile.js'),'S3_BASELINE_BUNDLE':'/workspace/work/s3/s3-profile.js','S4_OUTPUT':str(work/'browser')}),('contract','browser-turnout-contract.py',root,{'S1_BUNDLE':str(work/'s4-observer.js'),'S1_OUTPUT':str(work/'browser-contract')}),('interaction','browser-turnout-interaction.py',root,{'S2_BUNDLE':str(work/'s4-profile.js'),'S2_OUTPUT':str(work/'browser-interaction')}),('5c','browser-phase-five-close.py',work/'close',{}),('phase0','browser-phase-zero.py',work/'zero',{})]
results={}
for name,script,cwd,extra in cases:
 cwd.mkdir(parents=True,exist_ok=True)
 with (work/f'{name}.txt').open('w') as log:r=subprocess.run(['python3',str(root/'tests'/script)],cwd=cwd,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT)
 results[name]={'script':script,'exitCode':r.returncode,'cwd':str(cwd),'env':extra};(work/'regressions.json').write_text(json.dumps(results,indent=2)+'\n');print(name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
