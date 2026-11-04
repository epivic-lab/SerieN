import subprocess,os,json
from pathlib import Path
root=Path('/workspace/SerieN');w=Path('/workspace/work/s7');env={**os.environ,'SERIEN_URL':'http://127.0.0.1:8003/'};results={}
cases=[('contract','turnout-contract',{'S1_BUNDLE':str(w/'observer.js'),'S1_OUTPUT':str(w/'contract')}),('interaction','turnout-interaction',{'S2_BUNDLE':str(w/'profile.js'),'S2_OUTPUT':str(w/'interaction')}),('glow','turnout-glow',{'S3_BUNDLE':str(w/'profile.js'),'S3_OUTPUT':str(w/'glow')}),('arrows','turnout-arrows',{'S4_BUNDLE':str(w/'profile.js'),'S3_BASELINE_BUNDLE':'/workspace/work/s3/s3-profile.js','S4_OUTPUT':str(w/'arrows')}),('guard','railway-guard',{'S5_BUNDLE':str(w/'profile.js'),'S5_OUTPUT':str(w/'guard')}),('stop','guarded-stop',{'S6_BUNDLE':str(w/'profile.js'),'S6_OUTPUT':str(w/'stop')}),('5c','phase-five-close',{}),('phase0','phase-zero',{}),('performance','railway-guard-performance',{'S5_5D_BUNDLE':'/workspace/work/s3/phase5d-profile.js','S4_BASELINE_BUNDLE':'/workspace/work/s4-refine/s4-profile.js','S5_BUNDLE':str(w/'profile.js'),'S5_PERF_OUTPUT':str(w/'performance')})]
for name,script,extra in cases:
 cwd=w/name;cwd.mkdir(exist_ok=True)
 with(w/(name+'.txt')).open('w')as log:r=subprocess.run(['python3',str(root/'tests'/('browser-'+script+'.py'))],cwd=cwd,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT)
 results[name]={'command':script,'exitCode':r.returncode};(w/'results.json').write_text(json.dumps(results,indent=2)+'\n');print(name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
