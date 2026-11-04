"""Lossless evidence deduplication: every case retains initial/final state references."""
import hashlib,json,sys
from pathlib import Path

def compact(path):
 data=json.loads(path.read_text())
 if 'databaseStates' in data:return
 states={}
 for case in data['cases']:
  for field in ['initial','final']:
   state=case[field]
   digest=hashlib.sha256(json.dumps(state,sort_keys=True,separators=(',',':')).encode()).hexdigest()
   states[digest]=state
   case[field]={'stateRef':digest}
 data['databaseStates']=states
 path.write_text(json.dumps(data,indent=2)+'\n')

if __name__=='__main__':compact(Path(sys.argv[1]))
