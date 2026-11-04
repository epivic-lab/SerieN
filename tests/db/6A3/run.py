"""Disposable PostgreSQL17 test runner. No URLs/production credentials accepted. Docker local daemon only."""
import subprocess,json,os,sys,hashlib,difflib,time,uuid,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
os.chdir(ROOT)
OUT=Path(os.environ.get('SERIEN_DB_EVIDENCE','/workspace/work/serien-6A3/results'));OUT.mkdir(parents=True,exist_ok=True)
ENV={k:v for k,v in os.environ.items() if k not in ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']}
NAME='serien-6a3-'+uuid.uuid4().hex[:10]
D=['docker','--host=unix:///var/run/docker.sock']
IMAGE='postgres:17@sha256:3b0cda93be7c8dba2ed484d19393d93845dc3dafb88973e248ba8e6d99d784e1'
rows=[]
def docker(args,**kw):return subprocess.run(D+args,env=ENV,capture_output=True,text=True,**kw)
def sql(q,ok=True):
 user='postgres'
 m=re.search(r'SET ROLE (serien_test_[ab]);',q)
 if m:
  user=m[1];q=q[:m.start()]+q[m.end():]
 r=docker(['exec','-i',NAME,'psql','-X','-q','-A','-t','-U',user,'-d','postgres','-v','ON_ERROR_STOP=1'],input=q)
 if ok and r.returncode:raise RuntimeError(r.stderr)
 return r

def file(p):return sql(Path(p).read_text())
def legacy_equal(a,b):
 return {t:[{k:v for k,v in row.items() if k!='updated_at'} for row in json.loads(data)] for t,data in a.items()}=={t:[{k:v for k,v in row.items() if k!='updated_at'} for row in json.loads(data)] for t,data in b.items()}
def check(label,q,expected='t'):
 r=sql(q);value=r.stdout.strip();assert value==expected,(label,value,expected)
 rows.append({'test':label,'expected':expected,'observed':value,'result':'PASS'})
def deny(label,q,state='23503'):
 before=original_data()
 r=sql('\\set VERBOSITY verbose\n'+q,False)
 assert r.returncode and state in r.stderr,(label,r.stderr)
 assert original_data()==before,label+' changed legacy values'
 rows.append({'test':label,'expectedSQLSTATE':state,'observedSQLSTATE':state,'legacyValuesUnchanged':True,'result':'PASS'})
cols={}
def original_data():
 if not cols:return {}
 parts=["select '"+t+"' as name,coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) as data from (select "+','.join(cs)+' from public.'+t+') t' for t,cs in cols.items()]
 value=sql("select jsonb_object_agg(name,data) from ("+' UNION ALL '.join(parts)+') x;').stdout.strip()
 return {k:json.dumps(v,sort_keys=True) for k,v in json.loads(value).items()}
A='00000000-0000-4000-8000-0000000000a0';B='00000000-0000-4000-8000-0000000000b0';L='00000000-0000-4000-8000-000000000040';O='00000000-0000-4000-8000-000000000001';S='00000000-0000-4000-8000-000000000050';C='00000000-0000-4000-8000-000000000030'
try:
 r=docker(['run','-d','--name',NAME,'--network','none','--tmpfs','/var/lib/postgresql/data:rw','-e','POSTGRES_HOST_AUTH_METHOD=trust',IMAGE,'-c','listen_addresses=']);assert r.returncode==0,r.stderr
 for _ in range(50):
  if 'PostgreSQL init process complete' in docker(['logs',NAME]).stdout and docker(['exec',NAME,'pg_isready','-U','postgres']).returncode==0:break
  time.sleep(.2)
 check('PostgreSQL17 real engine',"select current_setting('server_version_num')::int between 170000 and 179999;")
 file('tests/db/6A3/bootstrap.sql')
 for p in sorted(Path('tests/db/6A3').glob('2026*.sql')):file(p)
 file('tests/db/6A3/fixture.sql')
 for line in sql("select table_name,string_agg(column_name,',' order by ordinal_position) from information_schema.columns where table_schema='public' group by table_name order by table_name;").stdout.splitlines():
  t,cs=line.split('|');cols[t]=cs.split(',')
 before=original_data();assert len(before)==10 and all(x!='[]' for x in before.values())
 OUT.joinpath('legacy-before.json').write_text(json.dumps(before,indent=2)+'\n')
 def dump():
  r=docker(['exec',NAME,'pg_dump','-U','postgres','--schema-only','--no-owner','--schema=public','--schema=serien_internal','--schema=serien_capability']);assert not r.returncode,r.stderr
  return '\n'.join(l for l in r.stdout.splitlines() if not l.startswith(('\\restrict','\\unrestrict','-- Dumped','-- Started','-- Completed'))).rstrip()+'\n'
 baseline=dump();OUT.joinpath('schema-before.sql').write_text(baseline)
 migration=next(Path('supabase/migrations').glob('*serien_workspace_expand.sql')).read_text()
 # Inject failure before COMMIT: transactional DDL must leave baseline/roles/data unchanged.
 r=sql(migration.replace('COMMIT;','SELECT 1/0;\nCOMMIT;'),False);assert r.returncode
 assert dump()==baseline and original_data()==before
 check('rollback removed partially created roles',"select not exists(select from pg_roles where rolname='serien_tm_worker');")
 rows.append({'test':'injected migration fault, DDL rollback/schema/data identical','result':'PASS'})
 sql(migration)
 assert original_data()==before
 rows.append({'test':'nonempty baseline, all original columns in ten tables unchanged after expand','result':'PASS'})
 OUT.joinpath('legacy-after-expand.json').write_text(json.dumps(original_data(),indent=2)+'\n')
 after=dump();OUT.joinpath('schema-after.sql').write_text(after)
 OUT.joinpath('schema.diff').write_text(''.join(difflib.unified_diff(baseline.splitlines(True),after.splitlines(True),fromfile='baseline',tofile='expand',n=0)))
 check('no unvalidated FK',"select not exists(select from pg_constraint where contype='f' and not convalidated);")
 check('no invalid indexes',"select not exists(select from pg_index where not indisvalid);")
 check('worker cannot bypass RLS/create roles or DB',"select not (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolcanlogin) from pg_roles where rolname='serien_tm_worker';")
 for role in ['anon','authenticated']:
  deny(role+' read private registry',f'SET ROLE {role}; select * from serien_capability.devices;','42501')
  deny(role+' read application',f'SET ROLE {role}; select * from public.stock_items;','42501')
  deny(role+' write application',f"SET ROLE {role}; update public.stock_items set display_name='no';",'42501')
 sql(f"insert into serien_capability.workspaces(id) values('{A}'),('{B}');")
 # Backfill is deferred atomically; owner IDs, positions, payloads stay unchanged.
 sql('BEGIN; SET CONSTRAINTS ALL DEFERRED;'+''.join(f"update public.{t} set workspace_id='{A}';" for t in cols if t not in ['stock_models','layout_segments','operation_receipts'])+'COMMIT;')
 check('backfill preserves semantic legacy values (touch timestamps may advance)', 'select true;')
 assert legacy_equal(original_data(),before)
 sql(f"update public.layout_snapshots set payload_digest=repeat('a',64); update public.operation_receipts set workspace_id='{A}',layout_id='{L}',snapshot_id='{S}',revision=1;")
 # This adds provenance; original receipt columns and snapshot payload still unchanged.
 assert legacy_equal(original_data(),before)
 sql(f"insert into serien_capability.session_heads(workspace_id,layout_id) values('{A}','{L}');")
 sql(f"update serien_capability.session_heads set revision=1,snapshot_id='{S}',receipt_request_id='00000000-0000-4000-8000-000000000060',payload_digest=repeat('a',64);")
 deny('head monotone rejects decreasing revision',f"update serien_capability.session_heads set revision=0;",'23514')
 deny('head wrong digest cannot reference snapshot',f"update serien_capability.session_heads set revision=2,payload_digest=repeat('b',64);",'23503')
 deny('head foreign workspace valid UUID',f"insert into serien_capability.session_heads(workspace_id,layout_id) values('{B}','{L}');")
 deny('snapshot foreign workspace',f"insert into public.layout_snapshots(owner_id,workspace_id,layout_id,revision,payload) select owner_id,'{B}',layout_id,2,payload from public.layout_snapshots;")
 deny('placement foreign workspace',f"update public.layout_placements set workspace_id='{B}';")
 deny('NULL workspace cannot bypass domain FK',"update public.layout_placements set workspace_id=null;")
 deny('member foreign workspace',f"update public.consist_members set workspace_id='{B}';")
 deny('loose foreign workspace',f"update public.loose_stock_placements set workspace_id='{B}';")
 deny('legacy FK still rejects different owner',"update public.stock_items set owner_id='00000000-0000-4000-8000-000000000099';")
 deny('membership/loose exclusive',f"insert into public.loose_stock_placements(stock_item_id,owner_id,workspace_id,layout_id,edge_id,s_mm,heading) values('00000000-0000-4000-8000-000000000020','{O}','{A}','{L}','T47',100,1);",'23514')
 deny('position outside canonical edge',"update public.loose_stock_placements set s_mm=249;",'23514')
 deny('ready member ordinal must remain contiguous',"update public.consist_members set ordinal=2;",'23514')
 deny('snapshot requires STOPPED',"update public.layout_snapshots set payload=jsonb_set(payload,'{resumePolicy}','\"RUNNING\"');",'23514')
 deny('snapshot requires eight switches',"update public.layout_snapshots set payload=payload #- '{layout,switches,Y-4}';",'23514')
 deny('snapshot hash must match topology',"update public.layout_snapshots set payload=jsonb_set(payload,'{topologyHash}','\"wrong\"');",'23514')
 sql(f"CREATE ROLE serien_test_a LOGIN IN ROLE serien_tm_worker; CREATE ROLE serien_test_b LOGIN IN ROLE serien_tm_worker; insert into serien_capability.worker_bindings values('serien_test_a','{A}'),('serien_test_b','{B}');")
 sql(f"insert into public.layouts(id,owner_id,workspace_id,name,topology_hash) values('00000000-0000-4000-8000-000000000041','{O}','{B}','B',repeat('b',64)); insert into public.layout_segments(layout_id,edge_id,length_mm) values('00000000-0000-4000-8000-000000000041','T47',248); insert into public.stock_items(id,owner_id,workspace_id,model_id) values('00000000-0000-4000-8000-000000000022','{O}','{B}','00000000-0000-4000-8000-000000000011');")
 check('worker B reads its own mapped item',"SET ROLE serien_test_b; select count(*)=1 from public.stock_items;")
 check('worker A reads mapped items',"SET ROLE serien_test_a; select count(*)=2 from public.stock_items;")
 check('worker B cannot see A even with forged GUC',f"SET ROLE serien_test_b; SET app.workspace_id='{A}'; select count(*)=0 from public.stock_items where workspace_id='{A}';")
 check('worker B cannot see A head',"SET ROLE serien_test_b; select count(*)=0 from serien_capability.session_heads;")
 check('worker B cannot see A segments',"SET ROLE serien_test_b; select count(*)=0 from public.layout_segments where layout_id='00000000-0000-4000-8000-000000000040';")
 deny('worker cannot write authorization registry',f"SET ROLE serien_test_a; insert into serien_capability.worker_bindings values('forged','{A}');",'42501')
 deny('worker cannot read device keys',"SET ROLE serien_test_a; select * from serien_capability.devices;",'42501')
 deny('worker cannot grant itself admin',"SET ROLE serien_test_a; SET ROLE serien_tm_authorizer;",'42501')
 deny('worker cannot disable RLS',"SET ROLE serien_test_a; ALTER TABLE public.stock_items DISABLE ROW LEVEL SECURITY;",'42501')
 deny('worker cannot write snapshots before 6A.4',"SET ROLE serien_test_a; update public.layout_snapshots set payload_digest=repeat('b',64);",'42501')
 deny('authorizer cannot write snapshots',"SET ROLE serien_tm_authorizer; update public.layout_snapshots set payload_digest=repeat('b',64);",'42501')
 check('registry RLS/FORCE all tables',"select bool_and(relrowsecurity and relforcerowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='serien_capability' and c.relkind='r';")
 check('no new security definer functions',"select not exists(select from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','serien_capability','serien_internal') and p.prosecdef);")
 check('no publicly executable private functions',"select not exists(select from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='serien_capability' and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute')));")
 # Registry structure checks: public keys only, cross-workspace refs, nonce uniqueness.
 key=json.dumps({'kty':'EC','crv':'P-256','x':'A'*43,'y':'B'*43})
 sql(f"SET ROLE serien_tm_authorizer; insert into serien_capability.devices(id,workspace_id,public_key,scope) values('00000000-0000-4000-8000-000000000070','{A}','{key}','owner');")
 sql(f"insert into serien_capability.device_locks(workspace_id,device_id) values('{A}','00000000-0000-4000-8000-000000000070');")
 check('worker may update only coordination marker',"SET ROLE serien_test_a; update serien_capability.device_locks set marker=marker+1; select marker=1 from serien_capability.device_locks;")
 deny('worker cannot change lock identity',f"SET ROLE serien_test_a; update serien_capability.device_locks set workspace_id='{B}';",'42501')
 deny('device private key material rejected',f"insert into serien_capability.devices(id,workspace_id,public_key,scope) values(gen_random_uuid(),'{A}',jsonb_set('{key}'::jsonb,'{{d}}','\"not-a-secret-fixture\"'),'reader');",'23514')
 deny('device missing curve rejected',f"insert into serien_capability.devices(id,workspace_id,public_key,scope) values(gen_random_uuid(),'{A}','{key}'::jsonb-'crv','reader');",'23514')
 sql(f"insert into serien_capability.replay_nonces values('{A}','00000000-0000-4000-8000-000000000070',1,1,repeat('c',32),now()+interval '5 minutes');")
 deny('nonce duplicate rejected',"insert into serien_capability.replay_nonces select * from serien_capability.replay_nonces;",'23505')
 deny('nonce cross-workspace device rejected',f"update serien_capability.replay_nonces set workspace_id='{B}';")
 deny('invalid UUID type input rejected',"select '------------------------------------'::uuid;",'22P02')
 sql(f"delete from public.stock_items where workspace_id='{B}'; delete from public.layout_segments where layout_id='00000000-0000-4000-8000-000000000041'; delete from public.layouts where workspace_id='{B}';")
 # Prepare/undo backfill: no columns dropped, original legacy data and references recover exactly.
 sql('BEGIN; SET CONSTRAINTS ALL DEFERRED; delete from serien_capability.session_heads; update public.operation_receipts set workspace_id=null;'+''.join(f"update public.{t} set workspace_id=null;" for t in cols if t not in ['stock_models','layout_segments','operation_receipts'])+'COMMIT;')
 assert legacy_equal(original_data(),before)
 rows.append({'test':'undo backfill preserves original semantic data; updated_at follows existing touch trigger','result':'PASS'})
 advisor=sql("select jsonb_build_object('rls',(select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'enabled',c.relrowsecurity,'force',c.relforcerowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','serien_capability') and c.relkind='r'),'roles',(select jsonb_agg(jsonb_build_object('name',rolname,'bypassrls',rolbypassrls,'superuser',rolsuper,'createRole',rolcreaterole)) from pg_roles where rolname in ('serien_tm_worker','serien_tm_authorizer')),'constraints',(select count(*) from pg_constraint where contype='f' and not convalidated),'invalidIndexes',(select count(*) from pg_index where not indisvalid));").stdout.strip()
 OUT.joinpath('local-advisor.json').write_text(json.dumps(json.loads(advisor),indent=2)+'\n')
 OUT.joinpath('results.json').write_text(json.dumps({'engine':sql('select version();').stdout.strip(),'image':IMAGE,'cases':rows,'result':'PASS','production':'untouched; local Docker --network none; no published ports'},indent=2)+'\n')
 print(json.dumps({'checks':len(rows),'result':'PASS','evidence':str(OUT)}))
finally:
 docker(['rm','-f',NAME])
