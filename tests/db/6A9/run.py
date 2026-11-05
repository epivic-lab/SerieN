"""6A.9 supervisor: isolated internal networks, real PG/SCRAM/TLS and separate data containers.
Only this out-of-band process can use Docker/DDL. Never accepts a remote DSN.
"""
import copy,json,os,subprocess,time,uuid
from pathlib import Path
import importlib.util
from jsonschema import Draft202012Validator,FormatChecker

ROOT=Path(__file__).resolve().parents[3];os.chdir(ROOT)
OUT=Path(os.environ.get('SERIEN_DB_EVIDENCE','/workspace/work/6A9/results')).resolve();OUT.mkdir(parents=True,exist_ok=True)
TMP=OUT.parent/('private-'+uuid.uuid4().hex[:8]);TMP.mkdir(mode=0o700)
ENV={k:v for k,v in os.environ.items() if k not in ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']}
D=['docker','--host=unix:///var/run/docker.sock'];prefix='serien-6a9-'+uuid.uuid4().hex[:8]
PG=prefix+'-db';INGRESS=prefix+'-ingress';BROKER=prefix+'-broker';OTHER=prefix+'-second'
PGIMAGE='postgres:17@sha256:3b0cda93be7c8dba2ed484d19393d93845dc3dafb88973e248ba8e6d99d784e1'
NODEIMAGE='node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c'
nets=[prefix+'-sql',prefix+'-http'];vols={n:prefix+'-'+n for n in ['secrets','public','hooks','ipc','journal']}
def docker(args,**kw):return subprocess.run(D+args,env=ENV,text=True,capture_output=True,**kw)
def command(args):
 r=subprocess.run(args,env=ENV,text=True,capture_output=True);assert not r.returncode,'fixture command failed';return r
def sql(q):
 r=docker(['exec','-i',PG,'psql','-XqAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],input=q)
 assert not r.returncode,'fixture SQL failed: '+next((x for x in r.stderr.splitlines() if 'ERROR:' in x),'transport');return r
def put(path,data):
 permissions=' && chmod 644 '+path if path.startswith(('/operator/public/','/operator/hooks/')) else ''
 r=docker(['exec','-i','-u','0',PG,'sh','-c','cat > '+path+permissions],input=data);assert not r.returncode,'fixture file write failed'
def uid(n):return f'10000000-0000-4000-8000-{n:012x}'
A,B,L,LB=[uid(i) for i in range(1,5)]
try:
 assert docker(['network','create','--internal',nets[0]]).returncode==0
 # Docker28 does not publish ports on an internal-only bridge. Only the HTTP ingress
 # uses a separate ordinary bridge, published on 127.0.0.1; PG remains internal/unpublished.
 assert docker(['network','create',nets[1]]).returncode==0
 for v in vols.values():assert docker(['volume','create',v]).returncode==0
 mounts=sum((['--mount','type=volume,src='+v+',dst=/operator/'+k] for k,v in vols.items()),[])
 # Bootstrap network has only this container, no published port. Require SCRAM/TLS before starting any peer.
 r=docker(['run','-d','--name',PG,'--network',nets[0],'--network-alias','db','--tmpfs','/var/lib/postgresql/data:rw','-e','POSTGRES_HOST_AUTH_METHOD=trust',*mounts,PGIMAGE,'-c','listen_addresses=*','-c','password_encryption=scram-sha-256','-c','log_min_error_statement=panic','-c','log_error_verbosity=terse']);assert not r.returncode,'PG start failed'
 for _ in range(100):
  if 'PostgreSQL init process complete' in docker(['logs',PG]).stdout and docker(['exec',PG,'pg_isready','-U','postgres']).returncode==0:break
  time.sleep(.2)
 assert docker(['exec',PG,'pg_isready','-U','postgres']).returncode==0,'PG bootstrap did not become ready'
 # CA and server private key exist only in supervisor scratch/PG, never in data-plane mounts.
 for ca in ['ca','other']:
  command(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(TMP/(ca+'.key')),'-out',str(TMP/(ca+'.crt')),'-days','2','-subj','/CN=SerieN '+ca])
 command(['openssl','req','-newkey','rsa:2048','-nodes','-keyout',str(TMP/'server.key'),'-out',str(TMP/'server.csr'),'-subj','/CN=db'])
 (TMP/'ext').write_text('subjectAltName=DNS:db\nextendedKeyUsage=serverAuth\n')
 command(['openssl','x509','-req','-in',str(TMP/'server.csr'),'-CA',str(TMP/'ca.crt'),'-CAkey',str(TMP/'ca.key'),'-set_serial','1','-out',str(TMP/'server.crt'),'-days','2','-extfile',str(TMP/'ext')])
 for f in ['server.key','server.crt']:
  cert=docker(['exec','-i','-u','postgres',PG,'sh','-c','umask 077; cat > /var/lib/postgresql/data/'+f],input=(TMP/f).read_text())
  assert not cert.returncode,'TLS fixture file permission: '+cert.stderr
 sql("ALTER SYSTEM SET ssl=on; ALTER SYSTEM SET ssl_cert_file='/var/lib/postgresql/data/server.crt'; ALTER SYSTEM SET ssl_key_file='/var/lib/postgresql/data/server.key';")
 put('/var/lib/postgresql/data/pg_hba.conf','local all all trust\nhostssl all all 0.0.0.0/0 scram-sha-256\nhostnossl all all 0.0.0.0/0 reject\n')
 sql('SELECT pg_reload_conf();')
 for p in [Path('tests/db/6A3/bootstrap.sql'),*sorted(Path('tests/db/6A3').glob('2026*.sql')),Path('tests/db/6A3/fixture.sql'),*sorted(Path('supabase/migrations').glob('20261104*.sql'))]:sql(p.read_text())
 sql(f"INSERT INTO serien_capability.workspaces(id) VALUES('{A}'),('{B}'); INSERT INTO serien_capability.workspace_locks(workspace_id) VALUES('{A}'),('{B}'); INSERT INTO serien_capability.api_limits(workspace_id) VALUES('{A}'),('{B}'); INSERT INTO serien_capability.lifecycle_limits(workspace_id) VALUES('{A}'),('{B}');")
 spec=importlib.util.spec_from_file_location('approved_profile',ROOT/'tests/db/6A6/profile_fixture.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 base=json.loads(Path('docs/_active/train-management/evidence/6A1/schema-fixture.json').read_text())
 validator=Draft202012Validator(json.loads(Path('docs/_active/train-management/STATE_SCHEMA.json').read_text()),format_checker=FormatChecker())
 def state(w,l):s=copy.deepcopy(base);s.update(workspaceId=w,layoutId=l);return s
 module.install(sql,uid,state,validator,A,B,L,LB,lambda x:"'"+str(x).replace("'","''")+"'")
 # Observe session_user/current_user within existing definer APIs via an invoker audit trigger.
 sql("""CREATE SCHEMA lab_observer; CREATE TABLE lab_observer.actors(actor name,executor name,pid int);
 GRANT USAGE ON SCHEMA lab_observer TO serien_tm_executor; GRANT INSERT ON lab_observer.actors TO serien_tm_executor;
 CREATE FUNCTION lab_observer.record() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN INSERT INTO lab_observer.actors VALUES(session_user,current_user,pg_backend_pid()); RETURN NEW; END $$;
 REVOKE ALL ON SCHEMA lab_observer FROM PUBLIC; REVOKE ALL ON FUNCTION lab_observer.record() FROM PUBLIC;
 CREATE TRIGGER observe_definer AFTER INSERT ON serien_capability.audit_events FOR EACH ROW EXECUTE FUNCTION lab_observer.record();""")
 # Permissions are enforced across containers/UIDs, not by a JS class boundary.
 permissions=docker(['exec','-u','0',PG,'sh','-c','chown 10002:10009 /operator/ipc && chmod 750 /operator/ipc && chown 10002:10002 /operator/secrets /operator/journal && chmod 700 /operator/secrets /operator/journal && chmod 755 /operator/public /operator/hooks'])
 assert not permissions.returncode,'IPC fixture permissions: '+permissions.stderr
 put('/operator/hooks/control.json','{}');put('/operator/public/origin.json','{}')
 # Checkout permissions are owner-only. Publish a read-only code copy, never private keys/configs.
 import shutil
 runtime=TMP/'runtime';shutil.copytree(ROOT/'prototypes/train-management',runtime)
 for p in [runtime,*runtime.rglob('*')]:p.chmod(0o755 if p.is_dir() else 0o644)
 code='type=bind,src='+str(runtime)+',dst=/app,readonly'
 def service(name,user,network,args,extra):
  return docker(['run','-d','--name',name,'--user',user,'--network',network,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','128','--memory','256m','--mount',code,*extra,NODEIMAGE,*args])
 ingress_mounts=['--mount','type=volume,src='+vols['ipc']+',dst=/ipc,readonly','--mount','type=volume,src='+vols['public']+',dst=/public-config,readonly','-p','127.0.0.1::8080']
 assert service(INGRESS,'10001:10009',nets[1],['node','/app/broker-lab/ingress.js'],ingress_mounts).returncode==0
 port=docker(['port',INGRESS,'8080/tcp']).stdout.strip().split(':')[-1]
 if not port.isdigit():
  info=json.loads(docker(['inspect',INGRESS]).stdout)[0]
  raise AssertionError('ingress start/port: '+json.dumps(dict(state=info['State']['Status'],error=info['State']['Error'],network=info['HostConfig']['NetworkMode'],bindings=info['HostConfig']['PortBindings'],ports=info['NetworkSettings']['Ports']))+' '+docker(['logs',INGRESS]).stderr+docker(['logs',INGRESS]).stdout)
 origin='http://127.0.0.1:'+port
 put('/operator/public/origin.json',json.dumps(dict(origin=origin)))
 sql(f"INSERT INTO serien_capability.nonce_limits(workspace_id,audience) VALUES('{A}','{origin}'),('{B}','{origin}');")
 profiles={w:json.loads(sql(f"SELECT template FROM serien_capability.candidate_profiles WHERE workspace_id='{w}';").stdout) for w in [A,B]}
 (OUT/'profiles.json').write_text(json.dumps(profiles))
 manifest=dict(prefix=prefix,pg=PG,ingress=INGRESS,broker=BROKER,other=OTHER,nets=nets,volumes=vols,nodeImage=NODEIMAGE,origin=origin,ca=(TMP/'ca.crt').read_text(),wrongCA=(TMP/'other.crt').read_text(),codeMount=code)
 # Contains public CA and resource names, no private key/password.
 (OUT/'resources.json').write_text(json.dumps(manifest))
 result=subprocess.run(['node','tests/db/6A9/integration.test.js',str(OUT)],env=ENV)
 if result.returncode:raise SystemExit(result.returncode)
finally:
 for name in [OTHER,BROKER,INGRESS,PG]:docker(['rm','-f',name])
 for n in nets:docker(['network','rm',n])
 for v in vols.values():docker(['volume','rm',v])
 cleanup=dict(containers={n:docker(['inspect',n]).returncode!=0 for n in [OTHER,BROKER,INGRESS,PG]},networks={n:docker(['network','inspect',n]).returncode!=0 for n in nets},volumes={v:docker(['volume','inspect',v]).returncode!=0 for v in vols.values()})
 (OUT/'cleanup.json').write_text(json.dumps(cleanup,indent=2)+'\n')
 assert all(all(values.values()) for values in cleanup.values()),'incomplete cleanup'
 import shutil
 shutil.rmtree(TMP,ignore_errors=True)
