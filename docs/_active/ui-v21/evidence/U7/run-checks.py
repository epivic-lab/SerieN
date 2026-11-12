import os,json,subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent
jobs=[('node',['npm','test'],{}),('python',['python3','-m','unittest','discover','-s','tests','-p','*_test.py'],{}),('build',['npm','run','build','--','--metafile='+str(ev/'metafile.json')],{}),('canonical',['python3','scripts/build-canonical-layout.py'],{}),('M1',['python3','tests/browser-train-management.py'],{'M1_OUTPUT':str(ev/'M1')}),('side',['python3','tests/run-train-side-regression.py'],{'M11_OUTPUT':str(ev/'side')}),('projects-lifecycle',['python3','tests/browser-train-project-lifecycle.py'],{'M2_LIFECYCLE_OUTPUT':str(ev/'projects-lifecycle')}),('U6',['python3','tests/browser-ui-v21-U6.py'],{'U6_OUTPUT':str(ev/'U6')}),('U5',['python3','tests/browser-ui-v21-U5.py'],{'U5_OUTPUT':str(ev/'U5')})]
r=[]
for name,cmd,env in jobs:
 print(name+' RUNNING',flush=True);t=time.time()
 with (ev/'tests'/(name+'.txt')).open('w') as f:p=subprocess.run(cmd,cwd=root,env={**os.environ,'SERIEN_URL':'http://127.0.0.1:8034/',**env},stdout=f,stderr=subprocess.STDOUT)
 r.append({'name':name,'command':cmd,'environment':env,'exitCode':p.returncode,'elapsed':time.time()-t});(ev/'commands.json').write_text(json.dumps(r,indent=2)+'\n');print(name+' '+str(p.returncode),flush=True)
