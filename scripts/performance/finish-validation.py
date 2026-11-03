"""Sequential 5D regression/measurement runner. Requires two built local sites.
Run visual-regression.py first. Does not push, deploy, or modify production code.
"""
import argparse,json,os,subprocess,time,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--before-base',default='http://127.0.0.1:8050/');p.add_argument('--after-base',default='http://127.0.0.1:8051/');p.add_argument('--stage',choices=['browser','measure','all'],default='all');a=p.parse_args()
root=Path(__file__).resolve().parents[2];out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True)
env={**os.environ,'SERIEN_URL':a.after_base};evidence={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'bundleSha256':hashlib.sha256((root/'dist/game.js').read_bytes()).hexdigest(),'steps':[]}
def run(name,args,cwd=root):
 print('START',name,flush=True);start=time.monotonic()
 with (out/(name+'.txt')).open('w') as log:r=subprocess.run(args,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT)
 evidence['steps'].append({'name':name,'exitCode':r.returncode,'wallSeconds':time.monotonic()-start});(out/'validation-run.json').write_text(json.dumps(evidence,indent=2)+'\n');print('END',name,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
if a.stage in ['all','browser']:
 for suite in ['browser-phase-five-close.py','browser-phase-zero.py','browser-phase-four.py','browser-consist.py','browser-phase-five-c.py']:
  cwd=out/'browser'/suite.removesuffix('.py');cwd.mkdir(parents=True,exist_ok=True);run(suite,['python3',str(root/'tests'/suite)],cwd)
if a.stage in ['all','measure']:
 for side,url in [('before',a.before_base),('after',a.after_base)]:
  run(side+'-normal',['python3',str(root/'scripts/performance/browser-benchmark.py'),'--base',url,'--output',str(out/side/'normal'),'--mode','normal','--resume'])
 for side,url,bundle in [('before',a.before_base,'baseline-visual.js'),('after',a.after_base,'candidate-visual.js')]:
  run(side+'-extended',['python3',str(root/'scripts/performance/browser-benchmark.py'),'--base',url,'--output',str(out/side/'extended'),'--mode','extended','--profile-bundle',str(out/bundle),'--session-seconds','120','--cycles','6'])
