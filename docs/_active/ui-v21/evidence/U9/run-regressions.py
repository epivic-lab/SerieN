"""Current production UI suites; approved historical adapters retain domain assertions."""
import os,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent
jobs=[(n,['python3',f'tests/browser-ui-v21-{n}.py'],{n+'_OUTPUT':str(ev/n)}) for n in ['U2','U3','U4','U8']]
jobs += [(n,['python3',str(ev/'run-adapted.py'),n],{}) for n in ['U5','U6','U7','depot','lifecycle']]
jobs += [('intents',['python3','tests/browser-ui-v21-U8-intents.py'],{'U8_INTENTS_OUTPUT':str(ev/'intents')}),('M1',['python3','tests/browser-train-management.py'],{'M1_OUTPUT':str(ev/'M1')}),('side',['python3','tests/run-train-side-regression.py'],{'M11_OUTPUT':str(ev/'side')})]
failed=[]
for name,cmd,env in jobs:
 print('RUN '+name,flush=True)
 code=subprocess.run(['python3',str(ev/'run-command.py'),'regression-'+name,*cmd],cwd=root,env={**os.environ,'SERIEN_URL':'http://127.0.0.1:8035/',**env}).returncode
 if code:failed.append(name)
print('Failures:',failed,flush=True);sys.exit(bool(failed))
