import subprocess,os,json
from pathlib import Path
root=Path('/workspace/SerieN');w=Path('/workspace/work/s6');env={**os.environ,'SERIEN_URL':'http://127.0.0.1:8003/'};results={}
cases=[('S4','browser-turnout-arrows.py',root,{'S4_BUNDLE':str(w/'profile.js'),'S3_BASELINE_BUNDLE':'/workspace/work/s3/s3-profile.js','S4_OUTPUT':str(w/'arrows')}),('S2','browser-turnout-interaction.py',root,{'S2_BUNDLE':str(w/'profile.js'),'S2_OUTPUT':str(w/'interaction')}),('5C','browser-phase-five-close.py',w/'legacy',{})]
for name,file,cwd,extra in cases:
 cwd.mkdir(parents=True,exist_ok=True)
 with(w/(name+'.txt')).open('w')as log:r=subprocess.run(['python3',str(root/'tests'/file)],cwd=cwd,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT)
 results[name]={'script':file,'exitCode':r.returncode};(w/'regressions.json').write_text(json.dumps(results,indent=2)+'\n');print(name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
