"""Record actual commands, output and exit codes without modifying older evidence."""
import datetime,fcntl,json,os,subprocess,sys,time
from pathlib import Path
root=Path(__file__).resolve().parents[5];out=Path(__file__).resolve().parent
name=sys.argv[1];cmd=sys.argv[2:];start=time.time()
(out/'tests').mkdir(exist_ok=True)
if (out/'tests'/f'{name}.txt').exists():raise SystemExit('Choose a new command name; existing execution logs must be retained.')
with (out/'tests'/f'{name}.txt').open('w') as log:
 p=subprocess.run(cmd,cwd=root,env=os.environ,stdout=log,stderr=subprocess.STDOUT)
record={'name':name,'command':cmd,'cwd':str(root),'startedUTC':datetime.datetime.fromtimestamp(start,datetime.timezone.utc).isoformat(),'elapsedSeconds':round(time.time()-start,3),'exitCode':p.returncode,'log':f'tests/{name}.txt'}
path=out/'commands.json'
with path.open('a+') as stream:
 fcntl.flock(stream,fcntl.LOCK_EX);stream.seek(0);data=stream.read();records=json.loads(data) if data else [];records.append(record);stream.seek(0);stream.truncate();stream.write(json.dumps(records,indent=2)+'\n')
print(json.dumps(record),flush=True);sys.exit(p.returncode)
