import subprocess,os,json
from pathlib import Path
root=Path('/workspace/SerieN');w=Path('/workspace/work/r1');env={**os.environ,'SERIEN_URL':'http://127.0.0.1:8003/'};results={}
subprocess.run(['node',str(root/'docs/_active/turnouts/evidence/S4/recipes/build-observer.mjs'),str(root),str(w/'observer.js')],check=True)
cases=[('contract','browser-turnout-contract.py',{'S1_BUNDLE':str(w/'observer.js'),'S1_OUTPUT':str(w/'contract')}),('interaction','browser-turnout-interaction.py',{'S2_BUNDLE':str(w/'profile.js'),'S2_OUTPUT':str(w/'interaction')}),('guard','browser-railway-guard.py',{'S5_BUNDLE':str(w/'profile.js'),'S5_OUTPUT':str(w/'guard')}),('stop','browser-guarded-stop.py',{'S6_BUNDLE':str(w/'profile.js'),'S6_OUTPUT':str(w/'stop')})]
for name,script,extra in cases:
 with(w/(name+'.txt')).open('w')as log:r=subprocess.run(['python3',str(root/'tests'/script)],cwd=root,env={**env,**extra},stdout=log,stderr=subprocess.STDOUT)
 results[name]={'exitCode':r.returncode,'command':script};(w/'results.json').write_text(json.dumps(results,indent=2)+'\n');print(name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
with(w/'pages.txt').open('w')as log:r=subprocess.run(['python3',str(root/'docs/_active/turnouts/evidence/S7/pages.py')],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
results['pages']={'exitCode':r.returncode,'evidence':'/workspace/work/s7/pages (fresh R1 overwrite of scratch only)'};(w/'results.json').write_text(json.dumps(results,indent=2)+'\n');print('pages',r.returncode,flush=True);raise SystemExit(r.returncode)
