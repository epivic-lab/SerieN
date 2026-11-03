import subprocess,time
from pathlib import Path
root=Path('/workspace/SerieN');out=Path('/tmp/serien-5d')
def run(name,args,cwd=root):
 print('START',name,flush=True)
 with (out/(name+'.log')).open('w') as log:r=subprocess.run(args,cwd=cwd,stdout=log,stderr=subprocess.STDOUT)
 print('END',name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
# The complete production-mode paired matrix is resumed without changing quality or sample counts.
run('before-normal-resume',['python3','scripts/performance/browser-benchmark.py','--base','http://127.0.0.1:8050/','--output',str(out/'before/normal'),'--mode','normal','--resume'])
run('after-normal',['python3','scripts/performance/browser-benchmark.py','--base','http://127.0.0.1:8051/','--output',str(out/'after/normal'),'--mode','normal'])
for side,port in [('before',8050),('after',8051)]:
 run(side+'-extended',['python3','scripts/performance/browser-benchmark.py','--base',f'http://127.0.0.1:{port}/','--output',str(out/side/'extended'),'--mode','extended','--profile-bundle',str(out/('baseline-visual.js' if side=='before' else 'candidate-visual.js')),'--session-seconds','120','--cycles','6'])
