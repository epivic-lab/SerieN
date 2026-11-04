"""Only ephemeral PostgreSQL17 over local Docker socket. No external DSN or credentials.
Trusted Node adapter -> one private SQL operation as real workspace/device LOGIN.
"""
import concurrent.futures as futures
import copy,json,os,subprocess,time,uuid,hashlib
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker
ROOT=Path(__file__).resolve().parents[3];os.chdir(ROOT)
OUT=Path(os.environ.get('SERIEN_DB_EVIDENCE','work/6A4/results'));OUT.mkdir(parents=True,exist_ok=True)
ENV={k:v for k,v in os.environ.items() if k not in ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']}
D=['docker','--host=unix:///var/run/docker.sock'];NAME='serien-6a4-'+uuid.uuid4().hex[:10]
IMAGE='postgres:17@sha256:3b0cda93be7c8dba2ed484d19393d93845dc3dafb88973e248ba8e6d99d784e1'
rows=[]
def run(args,**kw):return subprocess.run(args,env=ENV,text=True,capture_output=True,**kw)
def docker(args,**kw):return run(D+args,**kw)
def sql(q,user='postgres',ok=True,app=''):
 r=docker(['exec','-i',NAME,'psql','-XqAt','-U',user,'-d','postgres','-v','ON_ERROR_STOP=1'],input="SET application_name="+quote(app)+";\n"+q)
 if ok and r.returncode:raise RuntimeError(r.stderr)
 return r
def quote(s):return "'"+str(s).replace("'","''")+"'"
def file(p):return sql(Path(p).read_text())
def uid(n):return f'10000000-0000-4000-8000-{n:012x}'
A,B,L,LB,O,DA,DA2,DR,DB=[uid(i) for i in range(1,10)]
BASE=json.loads(Path('docs/_active/train-management/evidence/6A1/schema-fixture.json').read_text())
validator=Draft202012Validator(json.loads(Path('docs/_active/train-management/STATE_SCHEMA.json').read_text()),format_checker=FormatChecker())
def state(w=A,l=L):
 s=copy.deepcopy(BASE);s.update(workspaceId=w,layoutId=l);return s

def envelope(rev,s=None,w=A,l=L,op='SaveCheckpoint',source=None):
 return dict(operation=op,workspaceId=w,layoutId=l,expectedRevision=str(rev),state=s or state(w,l),recoverySourceRevision=source)

def prepared(e):
 r=run(['node','prototypes/train-management/transaction-core/envelope.js',json.dumps(dict(workspaceId=e['workspaceId'],layoutId=e['layoutId']))],input=json.dumps(e));assert r.returncode==0,r.stderr
 return json.loads(r.stdout)

def call(e,req=None,user='tm_a',digest=None,app=''):
 p=prepared(e);q=f"select serien_capability.save_checkpoint({quote(req or str(uuid.uuid4()))},{quote(p['wire'])},{quote(digest or p['digest'])});"
 return sql(q,user,False,app)

def durable():
 tables=['public.layout_snapshots','public.operation_receipts','serien_capability.session_heads','public.layout_placements','public.loose_stock_placements']
 return {t:json.loads(sql(f"select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from {t} t;").stdout) for t in tables}

def rev():return int(sql(f"select revision from serien_capability.session_heads where layout_id='{L}';").stdout)
def check(label,action,expect='success',unchanged=False):
 before=durable();r=action();after=durable()
 if expect=='success':assert not r.returncode,(label,r.stderr)
 else:assert r.returncode and expect in r.stderr,(label,r.stderr)
 if unchanged:assert before==after,label+' durable state changed'
 rows.append(dict(test=label,initial=before,operation=label,expected=expect,observed=r.stdout.strip() if not r.returncode else r.stderr.strip(),final=after,result='PASS'))
 print(label+': PASS',flush=True)
 return r

def schema_dump():
 r=docker(['exec',NAME,'pg_dump','-U','postgres','--schema-only','--no-owner']);assert not r.returncode,r.stderr
 return '\n'.join(x for x in r.stdout.splitlines() if not x.startswith(('\\restrict','\\unrestrict')))

def privilege_matrix():
 return json.loads(sql("""select jsonb_agg(jsonb_build_object('role',r,'table',t,'select',has_table_privilege(r,t,'SELECT'),'insert',has_table_privilege(r,t,'INSERT'),'update',has_table_privilege(r,t,'UPDATE'),'delete',has_table_privilege(r,t,'DELETE'))) from unnest(ARRAY['anon','authenticated','serien_tm_worker','serien_tm_authorizer']::text[]) r cross join unnest(ARRAY['public.layout_snapshots','public.operation_receipts','serien_capability.session_heads','serien_capability.devices','serien_capability.worker_bindings']) t;""").stdout)

try:
 r=docker(['run','-d','--name',NAME,'--network','none','--tmpfs','/var/lib/postgresql/data:rw','-e','POSTGRES_HOST_AUTH_METHOD=trust',IMAGE,'-c','listen_addresses=']);assert not r.returncode,r.stderr
 for _ in range(100):
  if 'PostgreSQL init process complete' in docker(['logs',NAME]).stdout and docker(['exec',NAME,'pg_isready','-U','postgres']).returncode==0:break
  time.sleep(.2)
 assert 170000<=int(sql("select current_setting('server_version_num');").stdout)<180000
 file('tests/db/6A3/bootstrap.sql')
 for p in sorted(Path('tests/db/6A3').glob('2026*.sql')):file(p)
 file('tests/db/6A3/fixture.sql')
 legacy_all={}
 for t in sql("select table_name from information_schema.tables where table_schema='public' order by table_name;").stdout.splitlines():
  legacy_all[t]=json.loads(sql(f"select jsonb_agg(to_jsonb(t)) from public.{t} t;").stdout)
 assert len(legacy_all)==10 and all(legacy_all.values())

 file('supabase/migrations/20261104165408_serien_workspace_expand.sql')
 before=schema_dump();priv_before=privilege_matrix()
 migration=Path('supabase/migrations/20261104172819_serien_atomic_checkpoint.sql').read_text()
 check('24 failed additive migration rolls back schema/data/role',lambda:sql(migration.replace('COMMIT;','SELECT 1/0; COMMIT;'),ok=False),'division by zero',True)
 assert schema_dump()==before
 assert sql("select count(*) from pg_roles where rolname='serien_tm_executor';").stdout.strip()=='0'
 sql(migration)
 legacy=durable()
 OUT.joinpath('privileges.json').write_text(json.dumps(dict(before=priv_before,after=privilege_matrix(),columns=json.loads(sql("select coalesce(jsonb_agg(to_jsonb(x)),'[]') from information_schema.column_privileges x where grantee='serien_tm_executor';").stdout)),indent=2))
 assert sql("select not (rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolcanlogin) from pg_roles where rolname='serien_tm_executor';").stdout.strip()=='t'
 assert sql("select count(*)=0 from pg_class where relowner='serien_tm_executor'::regrole;").stdout.strip()=='t'
 assert sql("select not has_function_privilege('anon','serien_capability.save_checkpoint(uuid,text,text)','EXECUTE') and not has_function_privilege('authenticated','serien_capability.save_checkpoint(uuid,text,text)','EXECUTE');").stdout.strip()=='t'
 # Keep original legacy entirely unmapped; additional local fixture uses its synthetic owner only.
 sql(f"insert into serien_capability.workspaces(id) values('{A}'),('{B}'); insert into serien_capability.workspace_locks(workspace_id) values('{A}'),('{B}');")
 key=json.dumps(dict(kty='EC',crv='P-256',x='A'*43,y='B'*43))
 for role,w,d,scope in [('tm_a',A,DA,'editor'),('tm_a2',A,DA2,'editor'),('tm_reader',A,DR,'reader'),('tm_b',B,DB,'owner')]:
  sql(f"CREATE ROLE {role} LOGIN IN ROLE serien_tm_worker; insert into serien_capability.worker_bindings values('{role}','{w}'); insert into serien_capability.devices(id,workspace_id,public_key,scope) values('{d}','{w}',{quote(key)},'{scope}'); insert into serien_capability.device_locks(workspace_id,device_id) values('{w}','{d}'); insert into serien_capability.device_bindings values('{role}','{w}','{d}');")
 for w,l,offset in [(A,L,100),(B,LB,200)]:
  s=state(w,l)
  # Remap model/item/consist identifiers to independent fixture graph; train identity stays DTO-only.
  mapping={s['models'][0]['id']:uid(offset),s['items'][0]['id']:uid(offset+1),s['consists'][0]['id']:uid(offset+2)}
  text=json.dumps(s)
  for old,new in mapping.items():text=text.replace(old,new)
  s=json.loads(text)
  s['models']=s['models'][:1];s['items']=s['items'][:1];s['looseStock']=[]
  wagon=copy.deepcopy(s['models'][0]);wagon.update(id=uid(offset+3),runtimeKey='closed',kind='wagon')
  wagon['couplers']['front']['x']=10;wagon['couplers']['back']['x']=-10
  wi=copy.deepcopy(s['items'][0]);wi.update(id=uid(offset+4),modelId=wagon['id'],nativeModelId=wagon['id'],nativeKind='closed')
  s['models'].append(wagon);s['items'].append(wi)
  loose=dict(itemId=wi['id'],journey=dict(segments=copy.deepcopy(s['trains'][0]['journey']['segments']),position=220,travel=0,lastBlock=None),location=dict(edge='T47',s=220,heading=1),animationDistanceMm=0)
  s['looseStock'].append(loose);validator.validate(s)
  sql(f"insert into public.stock_models(id,kind,name,metadata) values('{uid(offset)}','locomotive','synthetic profile',{quote(json.dumps(s['models'][0]))}); insert into public.stock_items(id,owner_id,workspace_id,model_id,display_name) values('{uid(offset+1)}','{uid(0)}','{w}','{uid(offset)}','fixture');".replace(uid(0),'00000000-0000-4000-8000-000000000001'))
  owner='00000000-0000-4000-8000-000000000001'
  sql(f"insert into public.layouts(id,owner_id,workspace_id,name,topology_hash) values('{l}','{owner}','{w}','fixture','{s['topologyHash']}'); insert into public.layout_segments values('{l}','T47',248,'{{}}'); insert into public.consists(id,owner_id,workspace_id,name) values('{uid(offset+2)}','{owner}','{w}','fixture'); insert into public.consist_members(consist_id,stock_item_id,owner_id,workspace_id,ordinal) values('{uid(offset+2)}','{uid(offset+1)}','{owner}','{w}',0); update public.consists set status='ready' where id='{uid(offset+2)}'; insert into public.layout_placements(consist_id,owner_id,workspace_id,layout_id,edge_id,s_mm,heading,journey_state) values('{uid(offset+2)}','{owner}','{w}','{l}','T47',120,1,{quote(json.dumps(s['trains'][0]['journey']))}); insert into serien_capability.session_heads(workspace_id,layout_id) values('{w}','{l}'); insert into serien_capability.candidate_profiles values('{w}','{l}',{quote(json.dumps(s))});")
  sql(f"insert into public.stock_models(id,kind,name,metadata) values('{wagon['id']}','wagon','synthetic loose',{quote(json.dumps(wagon))}); insert into public.stock_items(id,owner_id,workspace_id,model_id,display_name) values('{wi['id']}','{owner}','{w}','{wagon['id']}','fixture'); insert into public.loose_stock_placements(stock_item_id,owner_id,workspace_id,layout_id,edge_id,s_mm,heading,journey_state,state_version) values('{wi['id']}','{owner}','{w}','{l}','T47',220,1,{quote(json.dumps(loose['journey']))},0);")
  if w==A:BASE=s
 # SQL fault hooks are test-only, admin-installed, absent from the migration/function.
 sql("""CREATE SCHEMA tm_fault;
 CREATE TABLE tm_fault.points(stage text primary key,mode text);
 CREATE FUNCTION tm_fault.inject() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE m text; BEGIN
 SELECT mode INTO m FROM tm_fault.points WHERE stage=TG_ARGV[0];
 IF m='error' THEN RAISE EXCEPTION 'SIMULATED_SQL_FAULT:%',TG_ARGV[0]; END IF;
 IF m='pause' THEN PERFORM pg_sleep(6); END IF;
 IF m='railway' THEN DELETE FROM public.consist_members WHERE consist_id=NEW.consist_id; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
 END $$;
 REVOKE ALL ON SCHEMA tm_fault FROM PUBLIC;
 REVOKE ALL ON FUNCTION tm_fault.inject() FROM PUBLIC;
 CREATE TRIGGER fault_before_snapshot BEFORE INSERT ON public.layout_snapshots FOR EACH ROW EXECUTE FUNCTION tm_fault.inject('before_snapshot');
 CREATE TRIGGER fault_after_snapshot AFTER INSERT ON public.layout_snapshots FOR EACH ROW EXECUTE FUNCTION tm_fault.inject('after_snapshot');
 CREATE TRIGGER fault_during_projection AFTER UPDATE ON public.layout_placements FOR EACH ROW EXECUTE FUNCTION tm_fault.inject('during_projection');
 CREATE TRIGGER fault_during_loose AFTER UPDATE ON public.loose_stock_placements FOR EACH ROW EXECUTE FUNCTION tm_fault.inject('during_loose');
 CREATE TRIGGER fault_before_head BEFORE UPDATE ON serien_capability.session_heads FOR EACH ROW EXECUTE FUNCTION tm_fault.inject('before_head');
 CREATE TRIGGER fault_before_receipt BEFORE INSERT ON public.operation_receipts FOR EACH ROW EXECUTE FUNCTION tm_fault.inject('before_receipt');
 """)
 req=str(uuid.uuid4());e1=envelope(0)
 first=check('01 first checkpoint head 0 -> 1',lambda:call(e1,req));receipt=json.loads(first.stdout)
 assert rev()==1
 immediate=check('03 identical retry immediately after first commit',lambda:call(e1,req),unchanged=True);assert json.loads(immediate.stdout)==receipt
 e2=envelope(1);e2['state']['ui']['day']=1
 check('02 second checkpoint 1 -> 2',lambda:call(e2));assert rev()==2
 r=check('03/04 identical retry after commit and later head advance',lambda:call(e1,req),unchanged=True);assert json.loads(r.stdout)==receipt
 r=check('03 repeat identical retry',lambda:call(e1,req),unchanged=True);assert json.loads(r.stdout)==receipt
 changed=copy.deepcopy(e1);changed['state']['ui']['day']=1
 check('05 request id with changed digest/envelope',lambda:call(changed,req),'IDEMPOTENCY_KEY_REUSED',True)
 check('06 same request id different authorized device',lambda:call(e1,req,'tm_a2'),'IDEMPOTENCY_KEY_REUSED',True)
 # Deterministic overlap: admin holds the head lock until both real LOGIN connections block.
 def race(identical):
  expected=rev();rid=str(uuid.uuid4());ea=envelope(expected);eb=copy.deepcopy(ea);eb['state']['ui']['day']=1
  p=subprocess.Popen(D+['exec','-i',NAME,'psql','-XqAt','-U','postgres'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=ENV)
  p.stdin.write(f"BEGIN; select 1 from serien_capability.session_heads where layout_id='{L}' FOR UPDATE; select pg_sleep(3); COMMIT;\n");p.stdin.close()
  time.sleep(.25)
  with futures.ThreadPoolExecutor(2) as pool:
   fa=pool.submit(call,ea,rid,'tm_a',None,'race_a');fb=pool.submit(call,ea if identical else eb,rid if identical else str(uuid.uuid4()),'tm_a',None,'race_b')
   deadline=time.monotonic()+2;overlap=False
   while time.monotonic()<deadline:
    n=int(sql("select count(*) from pg_stat_activity where application_name in ('race_a','race_b') and wait_event_type='Lock';").stdout)
    if n==2:overlap=True;break
    time.sleep(.05)
   ra,rb=fa.result(),fb.result()
  p.wait();assert overlap,'race connections did not actually overlap on head lock'
  assert rev()==expected+1
  if identical:assert not ra.returncode and not rb.returncode and json.loads(ra.stdout)==json.loads(rb.stdout)
  else:assert sum(x.returncode==0 for x in [ra,rb])==1 and 'REVISION_CONFLICT' in (ra.stderr+rb.stderr)
  return subprocess.CompletedProcess([],0,json.dumps(dict(overlappingBlockedConnections=2,responses=[x.stdout or x.stderr for x in [ra,rb]])),'')
 check('07 real concurrent CAS only one winner',lambda:race(False))
 check('08 concurrent identical request returns one original receipt',lambda:race(True))
 for n,stage in [(9,'before_snapshot'),(10,'after_snapshot'),(11,'during_projection'),(12,'before_head'),(13,'before_receipt'),(11,'during_loose')]:
  sql(f"insert into tm_fault.points values('{stage}','error');")
  check(f'{n:02} SQL exception at {stage}',lambda:call(envelope(rev())),'SIMULATED_SQL_FAULT',True)
  sql('delete from tm_fault.points;')
 # Genuine backend termination after snapshot insertion, before transaction commit.
 sql("insert into tm_fault.points values('after_snapshot','pause');")
 before=durable()
 with futures.ThreadPoolExecutor(1) as pool:
  pending=pool.submit(call,envelope(rev()),None,'tm_a',None,'terminate_me')
  pid=None;deadline=time.monotonic()+15
  while time.monotonic()<deadline:
   value=sql("select pid from pg_stat_activity where application_name='terminate_me' and wait_event='PgSleep';").stdout.strip()
   if value:pid=int(value);break
   time.sleep(.05)
  assert pid,'fault pause not reached'
  sql(f'select pg_terminate_backend({pid});');killed=pending.result();assert killed.returncode and 'terminating connection' in killed.stderr
 assert durable()==before
 rows.append(dict(test='actual backend termination after snapshot',initial=before,operation='pg_terminate_backend at PgSleep test hook',expected='connection terminated, exact rollback',observed=killed.stderr,final=durable(),result='PASS'))
 sql('delete from tm_fault.points;')
 lost=str(uuid.uuid4());elost=envelope(rev());committed=call(elost,lost);assert not committed.returncode
 r=check('14 committed response discarded, retry recovers exact receipt',lambda:call(elost,lost),unchanged=True);assert json.loads(r.stdout)==json.loads(committed.stdout)
 for n,mutation in [(15,lambda s:s.update(topologyHash='bad')),(16,lambda s:s['layout']['switches'].pop('Y-4')),(17,lambda s:s.update(resumePolicy='RUNNING'))]:
  s=state();mutation(s)
  check(f'{n} invalid candidate topology/switch/resume',lambda s=s:call(envelope(rev(),s)),'INVALID_STATE_PROFILE' if n!=16 else 'Eight switches required',True)
 check('18 cross-workspace write by real B login',lambda:call(envelope(rev()),user='tm_b'),'FORBIDDEN',True)
 check('19 bound device reader has no write scope',lambda:call(envelope(rev()),user='tm_reader'),'FORBIDDEN',True)
 for role in ['anon','authenticated']:
  check('20 '+role+' write denied',lambda role=role:sql(f"SET ROLE {role}; select serien_capability.save_checkpoint(gen_random_uuid(),'{{}}','bad');",ok=False),'permission denied',True)
 check('21 forged SQL context cannot cross workspace',lambda:sql(f"SET app.workspace_id='{A}'; SET request.jwt.claim.sub='{A}'; select count(*)=0 from public.layout_snapshots where workspace_id='{A}';",'tm_b'),unchanged=True)
 assert sql(f"select count(*) from public.layout_snapshots where workspace_id='{A}';",'tm_b').stdout.strip()=='0'
 for q in ["SET ROLE serien_tm_executor;", "SET ROLE serien_tm_authorizer;",f"update serien_capability.device_bindings set workspace_id='{B}';", "update public.layout_snapshots set payload='{}';", "select public_key from serien_capability.devices;"]:
  check('21 forbidden privilege escalation '+q,lambda q=q:sql(q,'tm_a',False),'permission denied',True)
 # Deferred railway failure inside same transaction after save staged all components.
 # A pre-existing ready consist loses its sole member; SET CONSTRAINTS in function detects it.
 sql("insert into tm_fault.points values('during_projection','railway');")
 check('22 deferred railway constraint rolls back all checkpoint components',lambda:call(envelope(rev())),'Ready consist needs',True)
 sql('delete from tm_fault.points;')
 check('server independently rejects wrong digest',lambda:call(envelope(rev()),digest='f'*64),'DIGEST_MISMATCH',True)
 for key,value in [('stateId',None),('schemaVersion',2)]:
  bad=state();bad[key]=value
  check('invalid candidate '+key,lambda bad=bad:call(envelope(rev(),bad)),'INVALID_STATE_PROFILE',True)
 check('session_user cannot be forged',lambda:sql('SET SESSION AUTHORIZATION tm_b;','tm_a',False),'permission denied',True)
 # Recovery is another CAS revision; it cannot copy a foreign workspace revision.
 check('recover committed revision as new checkpoint',lambda:call(envelope(rev(),receipt['envelope']['state'],op='RecoverRevision',source='1')))
 check('recovery source must exist in own layout',lambda:call(envelope(rev(),op='RecoverRevision',source='999')),'INVALID_RECOVERY',True)
 # Inherited read privileges remain bound to actual login, not arbitrary workspace GUCs.
 sb=json.loads(sql(f"select template from serien_capability.candidate_profiles where layout_id='{LB}';").stdout)
 check('workspace B independent first checkpoint',lambda:call(envelope(0,sb,B,LB),user='tm_b'))
 check('foreign recovery via B SQL login',lambda:call(envelope(rev(),op='RecoverRevision',source='1'),user='tm_b'),'FORBIDDEN',True)
 # Local SQL revocation coordination only; no gateway/distributed revocation claim.
 sql(f"SET ROLE serien_tm_authorizer; update serien_capability.devices set revoked_at=now() where id='{DA}';")
 check('locally revoked device cannot retry old receipt',lambda:call(e1,req),'FORBIDDEN',True)
 sql(f"SET ROLE serien_tm_authorizer; update serien_capability.devices set revoked_at=null,expires_at=now()-interval '1 second' where id='{DA}';")
 check('expired device cannot save',lambda:call(envelope(rev())),'FORBIDDEN',True)
 sql(f"SET ROLE serien_tm_authorizer; update serien_capability.devices set expires_at=null where id='{DA}';")
 for target in ['devices','workspaces']:
  q=f"SET ROLE serien_tm_authorizer; update serien_capability.{target} set "+('revoked_at=now()' if target=='devices' else "status='suspended'")+f" where id='{DA if target=='devices' else A}';"
  # A real in-flight save holds workspace coordination, so revoke must wait for it.
  sql("insert into tm_fault.points values('after_snapshot','pause');")
  before_revision=rev()
  with futures.ThreadPoolExecutor(2) as pool:
   saver=pool.submit(call,envelope(before_revision),None,'tm_a',None,'save_before_revoke')
   deadline=time.monotonic()+10
   while time.monotonic()<deadline:
    if sql("select count(*) from pg_stat_activity where application_name='save_before_revoke' and wait_event='PgSleep';").stdout.strip()=='1':break
    time.sleep(.05)
   else:raise AssertionError('save lock not reached')
   revoke=pool.submit(sql,q,'postgres',True,'revoke_waits')
   deadline=time.monotonic()+10
   while time.monotonic()<deadline:
    if revoke.done():raise AssertionError(revoke.result().stderr+' revocation ended before coordination observation')
    if sql("select count(*) from pg_stat_activity where application_name='revoke_waits' and wait_event_type='Lock';").stdout.strip()=='1':break
    time.sleep(.05)
   else:raise AssertionError('revocation did not coordinate')
   # End the pause early by canceling only the sleep would abort save; let its finite wait finish.
   assert not saver.result().returncode
   assert not revoke.result().returncode
  assert rev()==before_revision+1
  sql('delete from tm_fault.points;')
  check('local '+target+' revocation waited behind committed save',lambda:call(envelope(rev())),'FORBIDDEN',True)
  sql(f"SET ROLE serien_tm_authorizer; update serien_capability.{target} set "+('revoked_at=null' if target=='devices' else "status='active'")+f" where id='{DA if target=='devices' else A}';")
 original_layout='00000000-0000-4000-8000-000000000040'
 for t,data in legacy.items():
  legacy_rows=[r for r in durable()[t] if (r.get('layout_id')==original_layout or r.get('request_id')=='00000000-0000-4000-8000-000000000060')]
  assert data==legacy_rows,(t,'legacy changed')
 for table,data in legacy_all.items():
  for row in data:
   assert sql(f"select count(*)=1 from public.{table} t where to_jsonb(t) @> {quote(json.dumps(row))}::jsonb;").stdout.strip()=='t',(table,'original legacy values changed')
 OUT.joinpath('legacy-before-and-after.json').write_text(json.dumps(dict(before=legacy_all,after=legacy_all,verification='every original row matched with all original columns including timestamps in ten tables'),indent=2)+'\n')
 rows.append(dict(test='23 nonempty original legacy exact preservation',initial=legacy,operation='all tests',expected='identical',observed='identical',final=legacy,result='PASS'))
 for w,l in [(A,L),(B,LB)]:
  assert sql(f"select h.revision=count(s.*), min(s.revision)=1, max(s.revision)=h.revision from serien_capability.session_heads h join public.layout_snapshots s on s.layout_id=h.layout_id where h.layout_id='{l}' group by h.revision;").stdout.strip()=='t|t|t'
  assert sql(f"select bool_and(p.state_version=h.revision) from public.layout_placements p join serien_capability.session_heads h using(workspace_id,layout_id) where p.layout_id='{l}';").stdout.strip()=='t'
  assert sql(f"select (select count(*) from public.operation_receipts where layout_id='{l}')=(select count(*) from public.layout_snapshots where layout_id='{l}');").stdout.strip()=='t'
  assert sql(f"select bool_and(p.state_version=h.revision) from public.loose_stock_placements p join serien_capability.session_heads h using(workspace_id,layout_id) where p.layout_id='{l}';").stdout.strip()=='t'
 OUT.joinpath('final-state.json').write_text(json.dumps(durable(),indent=2)+'\n')
 OUT.joinpath('results.json').write_text(json.dumps(dict(engine=sql('select version();').stdout.strip(),cases=rows,result='PASS',production='untouched'),indent=2)+'\n')
 from compact import compact
 compact(OUT/'results.json')
 print(json.dumps(dict(checks=len(rows),result='PASS',evidence=str(OUT))))
finally:
 docker(['rm','-f',NAME])
