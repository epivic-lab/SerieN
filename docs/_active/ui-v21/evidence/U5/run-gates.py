"""Execute pertinent U5 gates sequentially, saving exact commands and exits."""
import json,os,subprocess,time,sys
from pathlib import Path
root=Path(__file__).resolve().parents[5];ev=Path(__file__).resolve().parent
jobs=[('deck',['python3',str(ev/'run-regression.py'),'tests/browser-train-deck.py',str(ev/'final/deck')],{}),('phase-zero',['python3',str(ev/'run-regression.py'),'tests/browser-phase-zero.py',str(ev/'final/phase-zero')],{}),('U2',['python3','tests/browser-ui-v21-U2.py'],{'U2_OUTPUT':str(ev/'final/U2')}),('U3',['python3','tests/browser-ui-v21-U3.py'],{'U3_OUTPUT':str(ev/'final/U3')}),('U4',['python3','tests/browser-ui-v21-U4.py'],{'U4_OUTPUT':str(ev/'final/U4')})]
label=sys.argv[1] if len(sys.argv)>1 else 'first'
selected=sys.argv[2:]
records=[]
for name,cmd,env in jobs:
 if selected and name not in selected:continue
 cmd=[s.replace('/final/', '/'+label+'/') for s in cmd];env={k:v.replace('/final/','/'+label+'/') for k,v in env.items()}
 start=time.time();print(name+' RUNNING',flush=True)
 with (ev/(name+'-'+label+'-gate.log')).open('w') as log:r=subprocess.run(cmd,cwd=root,env={**os.environ,'SERIEN_URL':'http://127.0.0.1:8033/',**env},stdout=log,stderr=subprocess.STDOUT)
 records.append({'name':name,'command':cmd,'environment':env,'exitCode':r.returncode,'elapsedSeconds':time.time()-start});(ev/(label+'-gate-commands.json')).write_text(json.dumps(records,indent=2)+'\n');print(name+' exit '+str(r.returncode),flush=True)
