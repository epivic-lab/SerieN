"""Creates only network-none/tmpfs PostgreSQL17. Never accepts an external DSN."""
import copy,json,os,subprocess,time,uuid
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker
from profile_fixture import install
ROOT=Path(__file__).resolve().parents[3];os.chdir(ROOT)
OUT=Path(os.environ.get('SERIEN_DB_EVIDENCE','/workspace/work/6A6/results')).resolve();OUT.mkdir(parents=True,exist_ok=True)
ENV={k:v for k,v in os.environ.items() if k not in ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']}
D=['docker','--host=unix:///var/run/docker.sock'];NAME='serien-6a6-'+uuid.uuid4().hex[:10]
IMAGE='postgres:17@sha256:3b0cda93be7c8dba2ed484d19393d93845dc3dafb88973e248ba8e6d99d784e1'
def docker(args,**kw):return subprocess.run(D+args,env=ENV,text=True,capture_output=True,**kw)
def quote(x):return "'"+str(x).replace("'","''")+"'"
def sql(q):
 r=docker(['exec','-i',NAME,'psql','-XqAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],input=q)
 assert r.returncode==0,r.stderr
 return r

def uid(n):return f'10000000-0000-4000-8000-{n:012x}'
A,B,L,LB=[uid(i) for i in range(1,5)]
BASE=json.loads(Path('docs/_active/train-management/evidence/6A1/schema-fixture.json').read_text())
def state(w,l):
 s=copy.deepcopy(BASE);s.update(workspaceId=w,layoutId=l);return s
validator=Draft202012Validator(json.loads(Path('docs/_active/train-management/STATE_SCHEMA.json').read_text()),format_checker=FormatChecker())
try:
 r=docker(['run','-d','--name',NAME,'--network','none','--tmpfs','/var/lib/postgresql/data:rw','-e','POSTGRES_HOST_AUTH_METHOD=trust',IMAGE,'-c','listen_addresses=']);assert not r.returncode,r.stderr
 for _ in range(100):
  if 'PostgreSQL init process complete' in docker(['logs',NAME]).stdout and docker(['exec',NAME,'pg_isready','-U','postgres']).returncode==0:break
  time.sleep(.2)
 assert 170000<=int(sql("select current_setting('server_version_num');").stdout)<180000
 for p in [Path('tests/db/6A3/bootstrap.sql'),*sorted(Path('tests/db/6A3').glob('2026*.sql')),Path('tests/db/6A3/fixture.sql'),*sorted(Path('supabase/migrations').glob('20261104*.sql'))]:sql(p.read_text())
 sql(f"insert into serien_capability.workspaces(id) values('{A}'),('{B}'); insert into serien_capability.workspace_locks(workspace_id) values('{A}'),('{B}');")
 sql(f"insert into serien_capability.api_limits(workspace_id) values('{A}'),('{B}');")
 install(sql,uid,state,validator,A,B,L,LB,quote)
 profiles={w:json.loads(sql(f"select template from serien_capability.candidate_profiles where workspace_id='{w}';").stdout) for w in [A,B]}
 (OUT/'profiles.json').write_text(json.dumps(profiles))
 (OUT/'environment.json').write_text(json.dumps(dict(engine=sql('select version();').stdout.strip(),image=IMAGE,network='none',storage='tmpfs',ownerAuth='shared synthetic legacy owner; NOT proof of ownerless persistence',productionQueries=0),indent=2)+'\n')
 result=subprocess.run(['node','tests/db/6A6/integration.test.js',NAME,str(OUT)],env=ENV)
 if result.returncode:raise SystemExit(result.returncode)
finally:
 docker(['rm','-f',NAME])
