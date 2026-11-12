import subprocess,json,time,os
from pathlib import Path
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent
jobs=[('node',['npm','test']),('python',['python3','-m','unittest','discover','-s','tests','-p','*_test.py']),('build',['npm','run','build','--','--metafile='+str(ev/'metafile-final.json')]),('canonical',['python3','scripts/build-canonical-layout.py'])]+[(name,['python3',str(ev/'run-adapted.py'),name]) for name in ['depot','lifecycle','U7','U6','U5']]
r=[]
for name,cmd in jobs:
 print(name+' RUNNING',flush=True);start=time.time()
 with (ev/'tests'/(name+'.txt')).open('w') as f:p=subprocess.run(cmd,cwd=root,env={**os.environ,'SERIEN_URL':'http://127.0.0.1:8035/'},stdout=f,stderr=subprocess.STDOUT)
 r.append({'name':name,'command':cmd,'exitCode':p.returncode,'elapsed':time.time()-start});(ev/'commands.json').write_text(json.dumps(r,indent=2)+'\n');print(name+' '+str(p.returncode),flush=True)
