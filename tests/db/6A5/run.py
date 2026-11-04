"""Only ephemeral PostgreSQL17 over local Docker socket. No external DSN or credentials.
Trusted Node adapter -> one private SQL operation as real workspace/device LOGIN.
"""
import concurrent.futures as futures
import copy,json,os,subprocess,time,uuid,hashlib
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker
ROOT=Path(__file__).resolve().parents[3];os.chdir(ROOT)
OUT=Path(os.environ.get('SERIEN_DB_EVIDENCE','/workspace/work/serien-6A5/results'));OUT.mkdir(parents=True,exist_ok=True)
ENV={k:v for k,v in os.environ.items() if k not in ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']}
D=['docker','--host=unix:///var/run/docker.sock'];NAME='serien-6a5-'+uuid.uuid4().hex[:10]
IMAGE='postgres:17@sha256:3b0cda93be7c8dba2ed484d19393d93845dc3dafb88973e248ba8e6d99d784e1'
rows=[]
INPUT={}
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
 global INPUT
 INPUT=dict(user=user,request_id=req,envelope=e)
 p=prepared(e);q=f"select serien_capability.save_checkpoint({quote(req or str(uuid.uuid4()))},{quote(p['wire'])},{quote(digest or p['digest'])});"
 return sql(q,user,False,app)

def durable():
 tables=['public.layout_snapshots','public.operation_receipts','serien_capability.session_heads','public.layout_placements','public.loose_stock_placements']
 return {t:json.loads(sql(f"select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from {t} t;").stdout) for t in tables}

def rev():return int(sql(f"select revision from serien_capability.session_heads where layout_id='{L}';").stdout)
def check(label,action,expect='success',unchanged=False):
 global INPUT
 INPUT={}
 before=durable();r=action();inputs=copy.deepcopy(INPUT) or {'operation':label};after=durable()
 if expect=='success':assert not r.returncode,(label,r.stderr)
 else:assert r.returncode and expect in r.stderr,(label,r.stderr)
 if unchanged:assert before==after,label+' durable state changed'
 rows.append(dict(test=label,input=inputs,initial=before,operation=label,expected=expect,observed=r.stdout.strip() if not r.returncode else r.stderr.strip(),final=after,result='PASS'))
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
 sql('GRANT SELECT(payload) ON public.layout_snapshots TO tm_a; GRANT SELECT ON public.layouts TO tm_a2;')
 assert sql('select count(payload) from public.layout_snapshots;','tm_a').stdout.strip()=='0'
 # Seed actual old-version workspace receipts before applying 6A.5.
 old_req=str(uuid.uuid4());old_envelope=envelope(0)
 old_receipt=json.loads(call(old_envelope,old_req).stdout)
 second=envelope(1);second['state']['ui']['day']=1
 assert call(second).returncode==0
 assert call(envelope(0,json.loads(sql(f"select template from serien_capability.candidate_profiles where layout_id='{LB}';").stdout),B,LB),user='tm_b').returncode==0
 migration=Path('supabase/migrations/20261104175236_serien_history_integrity.sql').read_text()
 explicit_before=json.loads(sql("select jsonb_agg(to_jsonb(x)) from information_schema.column_privileges x where grantee in('tm_a','tm_a2','serien_tm_worker');").stdout)
 before_schema=schema_dump();before_data=durable();before_priv=privilege_matrix()
 check('21 injected 6A.5 migration failure preserves all checkpoints',lambda:sql(migration.replace('COMMIT;','SELECT 1/0; COMMIT;'),ok=False),'division by zero',True)
 assert schema_dump()==before_schema and durable()==before_data and privilege_matrix()==before_priv
 sql('CREATE ROLE tm_unapproved_reader NOLOGIN; GRANT tm_unapproved_reader TO tm_a;')
 check('21 unsafe extra inherited role blocks migration safely',lambda:sql(migration,ok=False),'UNSAFE_WORKER_BINDING',True)
 sql('REVOKE tm_unapproved_reader FROM tm_a; DROP ROLE tm_unapproved_reader;')
 sql(f"update public.operation_receipts set result=jsonb_set(result,'{{digest}}',to_jsonb(repeat('f',64))) where request_id='{old_req}';")
 check('21 corrupted old receipt is not silently certified by migration',lambda:sql(migration,ok=False),'UNVERIFIABLE_6A4_CHECKPOINT',True)
 sql(f"update public.operation_receipts set result={quote(json.dumps(old_receipt))}::jsonb where request_id='{old_req}';")
 sql(migration)
 # Capture actual privileges after revoking inherited table access, not just function ACLs.
 OUT.joinpath('privileges.json').write_text(json.dumps(dict(before=before_priv,after=privilege_matrix(),explicitBefore=explicit_before,explicitAfter=json.loads(sql("select coalesce(jsonb_agg(to_jsonb(x)),'[]') from information_schema.column_privileges x where grantee in('tm_a','tm_a2','serien_tm_worker');").stdout),executorColumns=json.loads(sql("select coalesce(jsonb_agg(to_jsonb(x)),'[]') from information_schema.column_privileges x where grantee='serien_tm_executor';").stdout)),indent=2))
 # Versioned canonicalization matches real JavaScript JCS for every accepted profile value.
 canonical_vectors=[]
 for s in [state(),second['state']]:
  p=prepared(envelope(0,s));wire=sql(f"select serien_capability.profile_canonical_v1({quote(p['wire'])}::jsonb);").stdout.strip()
  assert wire==p['wire']
  canonical_vectors.append(dict(canonicalVersion='jcs-profile-v1',stateDigest=sql(f"select serien_capability.state_hash({quote(json.dumps(s))}::jsonb);").stdout.strip(),envelopeDigest=p['digest'],postgresEqualsJavaScriptJCS=True))
  assert sql(f"select serien_capability.state_hash({quote(p['wire'])}::jsonb);").stdout.strip()==p['digest']
 OUT.joinpath('canonical-vectors.json').write_text(json.dumps(canonical_vectors,indent=2)+'\n')
 def api(q,user='tm_a',app=''):
  global INPUT
  INPUT=dict(user=user,sql=q)
  return sql(q,user,False,app)
 def head(user='tm_a',w=A,l=L):return api(f"select serien_capability.read_head('{w}','{l}');",user)
 def snapshot(r,user='tm_a',w=A,l=L):return api(f"select serien_capability.read_snapshot('{w}','{l}',{r});",user)
 def history(after=0,size=2,horizon='NULL',user='tm_a',w=A,l=L):return api(f"select serien_capability.list_history('{w}','{l}',{after},{size},{horizon});",user)
 def recovery(expected,source,req=None,user='tm_a',w=A,l=L,app=''):
  return api(f"select serien_capability.recover_revision('{w}','{l}',{expected},{source},'{req or uuid.uuid4()}');",user,app)
 def rec_read(req,user='tm_a'):return api(f"select serien_capability.read_receipt('{A}','{L}','{req}');",user)
 def decoded(r):assert r.returncode==0,r.stderr;return json.loads(r.stdout)
 r=check('01 authorized ReadHead',head,unchanged=True);assert decoded(r)['revision']=='2'
 s1=decoded(check('02 authorized ReadSnapshot historical 1',lambda:snapshot(1),unchanged=True))
 assert s1['state']==old_envelope['state'] and s1['stateDigest']!=s1['envelopeDigest']
 # Independent Node verification requires only snapshot payload + its own digest metadata.
 OUT.joinpath('snapshot-response.json').write_text(json.dumps(s1,indent=2)+'\n')
 node=run(['node','prototypes/train-management/history-access/protocol.js'],input=json.dumps(s1));assert not node.returncode,node.stderr
 page=decoded(check('03 history page1',lambda:history(size=1),unchanged=True))
 page2=decoded(check('03 history stable cursor page2',lambda:history(int(page['nextCursor']),1,page['throughRevision']),unchanged=True))
 assert [x['revision'] for x in page['items']+page2['items']]==['1','2'] and page2['nextCursor'] is None
 for fn in [lambda:head('tm_b'),lambda:snapshot(1,'tm_b'),lambda:history(user='tm_b'),lambda:rec_read(old_req,'tm_b')]:check('04 cross-workspace private read denied',fn,'FORBIDDEN',True)
 check('04 unknown workspace not enumerable',lambda:head(w=uid(9999)),'FORBIDDEN',True)
 for prop,value,reset in [('revoked_at','now()','null'),('expires_at',"now()-interval '1 second'",'null'),('epoch','epoch+1','epoch-1'),('key_version','key_version+1','key_version-1')]:
  sql(f"SET ROLE serien_tm_authorizer; update serien_capability.devices set {prop}={value} where id='{DA}';")
  for fn in [head,lambda:snapshot(1),history,lambda:rec_read(old_req)]:check('05/06 current device rejected after '+prop,fn,'FORBIDDEN',True)
  for table in ['layout_snapshots','operation_receipts','layouts','stock_items','layout_placements']:
   check('08 revoked/stale login direct SELECT '+table,lambda table=table:api(f'select * from public.{table};'),'permission denied',True)
  sql(f"SET ROLE serien_tm_authorizer; update serien_capability.devices set {prop}={reset} where id='{DA}';")
 sql(f"SET ROLE serien_tm_authorizer; update serien_capability.workspaces set auth_epoch=auth_epoch+1 where id='{A}';")
 check('05 stale workspace epoch rejected',head,'FORBIDDEN',True)
 sql(f"SET ROLE serien_tm_authorizer; update serien_capability.workspaces set auth_epoch=auth_epoch-1 where id='{A}';")
 check('07 reader reads head',lambda:head('tm_reader'),unchanged=True)
 check('07 reader reads snapshot',lambda:snapshot(1,'tm_reader'),unchanged=True)
 check('07 reader cannot write',lambda:call(envelope(rev()),user='tm_reader'),'FORBIDDEN',True)
 check('07 reader cannot recover',lambda:recovery(rev(),1,user='tm_reader'),'FORBIDDEN',True)
 # Every direct application/registry read path is closed, even before revocation.
 for table in ['public.'+x for x in ['stock_models','stock_items','consists','consist_members','layouts','layout_segments','layout_placements','loose_stock_placements','layout_snapshots','operation_receipts']]+['serien_capability.'+x for x in ['session_heads','worker_bindings','device_bindings','devices','candidate_profiles','audit_events','api_windows','api_limits']]:
  check('08 SQL direct read denied '+table,lambda table=table:api(f'select * from {table};'),'permission denied',True)
 check('08 preexisting column SELECT grant removed',lambda:api('select payload from public.layout_snapshots;'),'permission denied',True)
 check('08 preexisting per-login table grant removed',lambda:api('select * from public.layouts;','tm_a2'),'permission denied',True)
 # Exact 6A.4 retry response is reconstructed from immutable snapshot, not stored envelope.
 legacy_retry=decoded(check('18 pre-6A.5 receipt compatible exact retry',lambda:call(old_envelope,old_req),unchanged=True));assert legacy_retry==old_receipt
 assert decoded(check('18 read legacy receipt exact response',lambda:rec_read(old_req),unchanged=True))==old_receipt
 assert sql("select bool_and(not result ? 'envelope' and not request_context ? 'state') from public.operation_receipts where workspace_id is not null;").stdout.strip()=='t'
 # Existing authenticated SQL session is rechecked after a committed revocation.
 def persistent_read_revoke():
  p=subprocess.Popen(D+['exec','-i',NAME,'psql','-XqAt','-U','tm_a','-d','postgres','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=ENV)
  p.stdin.write(f"SET application_name='existing_session'; select serien_capability.read_head('{A}','{L}'); select pg_sleep(3); select serien_capability.read_head('{A}','{L}');\n");p.stdin.close()
  deadline=time.monotonic()+10
  while time.monotonic()<deadline:
   if sql("select count(*) from pg_stat_activity where application_name='existing_session' and wait_event='PgSleep';").stdout.strip()=='1':break
   time.sleep(.05)
  else:raise AssertionError('existing session did not reach inter-request pause')
  sql(f"SET ROLE serien_tm_authorizer; update serien_capability.devices set revoked_at=now() where id='{DA}';")
  p.wait();out=p.stdout.read();err=p.stderr.read();assert p.returncode and 'FORBIDDEN' in err and 'revision' in out
  return subprocess.CompletedProcess([],0,'same SQL session read before revocation; next read FORBIDDEN after commit','')
 check('05 persistent SQL session cannot retain read access after revocation',persistent_read_revoke,unchanged=True)
 sql(f"SET ROLE serien_tm_authorizer; update serien_capability.devices set revoked_at=null where id='{DA}';")
 p=prepared(envelope(rev()))
 for altered in [' '+p['wire'],p['wire'].replace('"operation":"SaveCheckpoint"','"operation":"SaveCheckpoint","operation":"SaveCheckpoint"')]:
  raw_digest=hashlib.sha256(altered.encode()).hexdigest()
  check('19 raw SQL envelope must be canonical without duplicate keys',lambda altered=altered,raw_digest=raw_digest:api(f"select serien_capability.save_checkpoint('{uuid.uuid4()}',{quote(altered)},{quote(raw_digest)});"),'DIGEST_OR_CANONICAL_MISMATCH',True)
 # Fault-only corruption by admin: immutable triggers must be disabled explicitly in this local test.
 def damage(revision,assignment):
  sql(f"BEGIN; ALTER TABLE public.layout_snapshots DISABLE TRIGGER USER; UPDATE public.layout_snapshots SET {assignment} WHERE workspace_id='{A}' AND layout_id='{L}' AND revision={revision}; ALTER TABLE public.layout_snapshots ENABLE TRIGGER USER; COMMIT;")
 original=sql(f"select payload from public.layout_snapshots where layout_id='{L}' and revision=2;").stdout.strip()
 damage(2,"payload=jsonb_set(payload,'{ui,day}','0')")
 check('09 corrupt payload with old state digest rejected',lambda:snapshot(2),'INTEGRITY_ERROR',True)
 check('09 corrupt current head rejected',head,'INTEGRITY_ERROR',True)
 pages=decoded(check('09 previous intact revision discoverable without automatic recovery',history,unchanged=True))
 assert [x['status'] for x in pages['items']]==['VALID','CORRUPT']
 prior=durable();rr=str(uuid.uuid4())
 recovered=decoded(check('11 controlled recovery of intact revision 1',lambda:recovery(2,1,rr)))
 assert recovered['revision']=='3' and recovered['recoverySourceRevision']=='1'
 assert prior['public.layout_snapshots']==durable()['public.layout_snapshots'][:len(prior['public.layout_snapshots'])] or all(x in durable()['public.layout_snapshots'] for x in prior['public.layout_snapshots'])
 retry=decoded(check('15 recovery retry after response discarded',lambda:recovery(2,1,rr),unchanged=True));assert recovered==retry
 check('12 recovery nonexistent source',lambda:recovery(rev(),999),'NOT_FOUND',True)
 check('13 recovery foreign workspace',lambda:recovery(rev(),1,user='tm_b'),'FORBIDDEN',True)
 check('11 corrupt source never recovered',lambda:recovery(rev(),2),'INTEGRITY_ERROR',True)
 # Restore only test damage and exercise independently incompatible metadata.
 damage(2,'payload='+quote(original)+'::jsonb')
 for assignment in ["topology_hash='wrong'","snapshot_schema=2","engine_revision='wrong-engine'","canonical_version='wrong-canonical'"]:
  # canonical CHECK would reject arbitrary protocol: test payload-side schema/topology first.
  if 'canonical_version' in assignment:continue
  damage(2,assignment)
  check('10 incompatible stored version/hash rejected '+assignment,lambda:snapshot(2),'INCOMPATIBLE_SNAPSHOT',True)
  damage(2,"topology_hash=payload->>'topologyHash',snapshot_schema=1,engine_revision=payload->>'engineRevision'")
 damage(2,"state_digest=repeat('f',64)")
 check('09 stored state digest mismatch rejected',lambda:snapshot(2),'INTEGRITY_ERROR',True)
 damage(2,'state_digest=serien_capability.state_hash(payload)')
 damage(2,"asset_refs='[]'")
 check('09 stored asset reference mismatch rejected',lambda:snapshot(2),'INTEGRITY_ERROR',True)
 damage(2,'asset_refs=serien_capability.manifest_refs(payload)')
 saved_context=sql(f"select request_context from public.operation_receipts where layout_id='{L}' and revision=2;").stdout.strip()
 sql(f"BEGIN; ALTER TABLE public.operation_receipts DISABLE TRIGGER USER; update public.operation_receipts set request_context=jsonb_set(request_context,'{{expectedRevision}}','\"666\"') where layout_id='{L}' and revision=2; ALTER TABLE public.operation_receipts ENABLE TRIGGER USER; COMMIT;")
 check('09 compact context tamper breaks envelope digest verification',lambda:snapshot(2),'INTEGRITY_ERROR',True)
 sql(f"BEGIN; ALTER TABLE public.operation_receipts DISABLE TRIGGER USER; update public.operation_receipts set request_context={quote(saved_context)}::jsonb where layout_id='{L}' and revision=2; ALTER TABLE public.operation_receipts ENABLE TRIGGER USER; COMMIT;")
 saved_result=sql(f"select result from public.operation_receipts where layout_id='{L}' and revision=2;").stdout.strip()
 req2=sql(f"select request_id from public.operation_receipts where layout_id='{L}' and revision=2;").stdout.strip()
 sql(f"BEGIN; ALTER TABLE public.operation_receipts DISABLE TRIGGER USER; update public.operation_receipts set result=jsonb_set(result,'{{digest}}',to_jsonb(repeat('f',64))) where layout_id='{L}' and revision=2; ALTER TABLE public.operation_receipts ENABLE TRIGGER USER; COMMIT;")
 check('09 tampered receipt digest rejected before returning receipt',lambda:rec_read(req2),'INTEGRITY_ERROR',True)
 sql(f"BEGIN; ALTER TABLE public.operation_receipts DISABLE TRIGGER USER; update public.operation_receipts set result={quote(saved_result)}::jsonb where layout_id='{L}' and revision=2; ALTER TABLE public.operation_receipts ENABLE TRIGGER USER; COMMIT;")
 # Deterministic real overlap: two recovery calls wait under an external head lock.
 def race_recovery(identical=False):
  revision=rev();request=str(uuid.uuid4())
  blocker=subprocess.Popen(D+['exec','-i',NAME,'psql','-XqAt','-U','postgres'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=ENV)
  blocker.stdin.write(f"BEGIN; select 1 from serien_capability.session_heads where layout_id='{L}' FOR UPDATE; select pg_sleep(3); COMMIT;\n");blocker.stdin.close();time.sleep(.2)
  with futures.ThreadPoolExecutor(2) as pool:
   a=pool.submit(recovery,revision,1,request,'tm_a',A,L,'recover_a')
   b=pool.submit(recovery,revision,1,request if identical else str(uuid.uuid4()),'tm_a',A,L,'recover_b')
   deadline=time.monotonic()+2;overlap=False
   while time.monotonic()<deadline:
    if sql("select count(*) from pg_stat_activity where application_name in('recover_a','recover_b') and wait_event_type='Lock';").stdout.strip()=='2':overlap=True;break
    time.sleep(.05)
   ra,rb=a.result(),b.result()
  blocker.wait();assert overlap and rev()==revision+1
  if identical:assert decoded(ra)==decoded(rb)
  else:assert sum(r.returncode==0 for r in [ra,rb])==1 and 'REVISION_CONFLICT' in ra.stderr+rb.stderr
  return subprocess.CompletedProcess([],0,json.dumps(dict(overlappingConnections=2,results=[r.stdout or r.stderr for r in [ra,rb]])),'')
 check('14 two genuinely concurrent recovery CAS requests',race_recovery)
 check('14/15 concurrent identical recovery idempotency',lambda:race_recovery(True))
 # Real read/revoke ordering: an authorized read transaction holds the coordinator.
 def read_revoke_race():
  p=subprocess.Popen(D+['exec','-i',NAME,'psql','-XqAt','-U','tm_a','-d','postgres'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=ENV)
  p.stdin.write(f"SET application_name='read_holds_lock'; BEGIN; select serien_capability.read_head('{A}','{L}'); select pg_sleep(3); COMMIT;\n");p.stdin.close()
  deadline=time.monotonic()+10
  while time.monotonic()<deadline:
   if sql("select count(*) from pg_stat_activity where application_name='read_holds_lock' and wait_event='PgSleep';").stdout.strip()=='1':break
   time.sleep(.05)
  else:raise AssertionError('read did not reach held lock')
  with futures.ThreadPoolExecutor(1) as pool:
   future=pool.submit(sql,f"SET ROLE serien_tm_authorizer; update serien_capability.devices set revoked_at=now() where id='{DA}';",'postgres',True,'revokes_read')
   deadline=time.monotonic()+2;blocked=False
   while time.monotonic()<deadline:
    if sql("select count(*) from pg_stat_activity where application_name='revokes_read' and wait_event_type='Lock';").stdout.strip()=='1':blocked=True;break
    time.sleep(.05)
   p.wait();assert p.returncode==0,p.stderr.read();assert blocked and future.result().returncode==0
  return subprocess.CompletedProcess([],0,'read authorized before revoke; revoke waited on coordinator','')
 check('05 real read/revoke race linearizes before revocation commit',read_revoke_race,unchanged=True)
 check('05 new read after concurrent revoke denied',head,'FORBIDDEN',True)
 check('08 old column grant cannot bypass concurrent revoke',lambda:api('select payload from public.layout_snapshots;'),'permission denied',True)
 sql(f"SET ROLE serien_tm_authorizer; update serien_capability.devices set revoked_at=null where id='{DA}';")
 # Same synthetic legacy owner, same intentional request_id, independent workspace success.
 shared_req=str(uuid.uuid4());n=rev();ca=decoded(check('17 shared request key workspace A',lambda:call(envelope(n),shared_req)))
 sb=json.loads(sql(f"select template from serien_capability.candidate_profiles where layout_id='{LB}';").stdout)
 cb=decoded(check('17 same owner/request key workspace B',lambda:call(envelope(1,sb,B,LB),shared_req,user='tm_b')))
 assert decoded(check('17 workspace B reads its independent same-id receipt',lambda:api(f"select serien_capability.read_receipt('{B}','{LB}','{shared_req}');",'tm_b'),unchanged=True))==cb
 assert ca['snapshotId']!=cb['snapshotId'] and ca['workspaceId']!=cb['workspaceId']
 assert sql(f"select count(*)=2 and count(distinct owner_id)=1 from public.operation_receipts where request_id='{shared_req}';").stdout.strip()=='t'
 assert decoded(check('18 compact receipt retry unchanged',lambda:call(envelope(n),shared_req),unchanged=True))==ca
 assert 'envelope' not in ca and len(json.dumps(ca))<1500
 different=envelope(n);different['state']['ui']['day']=1
 check('18 same workspace reused request id rejects changed envelope',lambda:call(different,shared_req),'IDEMPOTENCY_KEY_REUSED',True)
 check('18 reused request id by different device rejected',lambda:call(envelope(n),shared_req,user='tm_a2'),'IDEMPOTENCY_KEY_REUSED',True)
 check('19 request byte limit SQL',lambda:api("select serien_capability.save_checkpoint(gen_random_uuid(),repeat('x',2097153),'bad');"),'PAYLOAD_TOO_LARGE',True)
 check('19 excessive page size',lambda:history(size=21),'INVALID_PAGE',True)
 sql(f"update serien_capability.api_limits set max_response_bytes=100 where workspace_id='{A}';")
 check('19 snapshot response byte limit',lambda:snapshot(1),'RESPONSE_TOO_LARGE',True)
 check('19 response limit aborts oversized save result atomically',lambda:call(envelope(rev())),'RESPONSE_TOO_LARGE',True)
 sql(f"update serien_capability.api_limits set max_response_bytes=262144 where workspace_id='{A}';")
 sql(f"update serien_capability.api_limits set max_checkpoints=(select count(*) from public.layout_snapshots where workspace_id='{A}') where workspace_id='{A}';")
 check('20 revision count quota preserves checkpoints',lambda:call(envelope(rev())),'QUOTA_EXCEEDED',True)
 check('20 quota does not erase idempotent retry',lambda:call(envelope(n),shared_req),unchanged=True)
 sql(f"update serien_capability.api_limits set max_checkpoints=100,max_storage_bytes=serien_capability.storage_usage('{A}') where workspace_id='{A}';")
 check('20 next checkpoint would cross exact current storage budget',lambda:call(envelope(rev())),'QUOTA_EXCEEDED',True)
 sql(f"update serien_capability.api_limits set max_checkpoints=100,max_storage_bytes=1 where workspace_id='{A}';")
 check('20 storage quota rolls back all save substeps',lambda:call(envelope(rev())),'QUOTA_EXCEEDED',True)
 sql(f"update serien_capability.api_limits set max_storage_bytes=16777216 where workspace_id='{A}';")
 sql(f"update serien_capability.api_limits set max_audit_events=(select count(*) from serien_capability.audit_events where workspace_id='{A}') where workspace_id='{A}';")
 check('20 audit growth quota bounds repeated reads without deleting data',head,'QUOTA_EXCEEDED',True)
 sql(f"update serien_capability.api_limits set max_audit_events=5000 where workspace_id='{A}';")
 # Rate budgets commit successful private operations; failures roll back counters.
 sql(f"delete from serien_capability.api_windows; update serien_capability.api_limits set device_budget=2,workspace_budget=3 where workspace_id='{A}';")
 check('API device budget request1',head,unchanged=True);check('API device budget request2',head,unchanged=True)
 check('API device budget exceeded',head,'RATE_LIMITED',True)
 check('API other device workspace budget request3',lambda:head('tm_reader'),unchanged=True)
 check('API workspace aggregate budget exceeded',lambda:head('tm_a2'),'RATE_LIMITED',True)
 sql("update serien_capability.api_windows set started_at=started_at-interval '61 seconds';")
 check('API budget reset after window/backoff',head,unchanged=True)
 sql(f"update serien_capability.api_limits set device_budget=60,workspace_budget=120 where workspace_id='{A}'; delete from serien_capability.api_windows;")
 # Repeat malformed private inputs; no partial checkpoint writes or cross-workspace results.
 for q in [f"select serien_capability.list_history('{A}','{L}',-1,1,NULL);",f"select serien_capability.save_checkpoint(gen_random_uuid(),'{{}}','bad');",f"select serien_capability.read_snapshot('{A}','{L}',-1);"]:
  r=check('API malformed request denied',lambda q=q:api(q), 'INVALID_PAGE' if 'list_history' in q else ('INVALID_ENVELOPE' if 'save_checkpoint' in q else 'NOT_FOUND'),True)
 for role in ['anon','authenticated']:
  check('API no public execute '+role,lambda role=role:sql(f"SET ROLE {role}; select serien_capability.read_head('{A}','{L}');",ok=False),'permission denied',True)
 for q in ['SET ROLE serien_tm_executor;',"SET SESSION AUTHORIZATION tm_b;",f"SET app.workspace_id='{B}'; select * from public.layout_snapshots;",f"select serien_capability.authorize('{A}','{L}');"]:
  check('SQL forged authorization/helper access denied',lambda q=q:api(q),'permission denied',True)
 # Reapply the 6A.4 fault oracles against the new 6A.5 save implementation.
 sql('''CREATE SCHEMA tm_fault5; CREATE TABLE tm_fault5.points(stage text primary key,mode text);
 CREATE FUNCTION tm_fault5.inject() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE m text; BEGIN SELECT mode INTO m FROM tm_fault5.points WHERE stage=TG_ARGV[0];
 IF m='error' THEN RAISE EXCEPTION 'SIMULATED_SQL_FAULT:%',TG_ARGV[0]; END IF;
 IF m='pause' THEN PERFORM pg_sleep(6); END IF;
 IF m='railway' THEN DELETE FROM public.consist_members WHERE consist_id=NEW.consist_id; END IF;
 RETURN NEW; END $$; REVOKE ALL ON SCHEMA tm_fault5 FROM PUBLIC; REVOKE ALL ON FUNCTION tm_fault5.inject() FROM PUBLIC;''')
 for stage,when,table,event in [('before_snapshot','BEFORE','public.layout_snapshots','INSERT'),('after_snapshot','AFTER','public.layout_snapshots','INSERT'),('during_projection','AFTER','public.layout_placements','UPDATE'),('during_loose','AFTER','public.loose_stock_placements','UPDATE'),('before_head','BEFORE','serien_capability.session_heads','UPDATE'),('before_receipt','BEFORE','public.operation_receipts','INSERT')]:
  sql(f"CREATE TRIGGER fault_{stage} {when} {event} ON {table} FOR EACH ROW EXECUTE FUNCTION tm_fault5.inject('{stage}'); insert into tm_fault5.points values('{stage}','error');")
  check('6A.4 post-upgrade SQL rollback '+stage,lambda:call(envelope(rev())),'SIMULATED_SQL_FAULT',True)
  sql('delete from tm_fault5.points;')
 sql("insert into tm_fault5.points values('during_projection','railway');")
 check('6A.4 post-upgrade deferred railway rollback',lambda:call(envelope(rev())),'Ready consist needs',True)
 sql("delete from tm_fault5.points; insert into tm_fault5.points values('after_snapshot','pause');")
 before=durable()
 with futures.ThreadPoolExecutor(1) as pool:
  pending=pool.submit(call,envelope(rev()),None,'tm_a',None,'kill_v5')
  deadline=time.monotonic()+10;pid=None
  while time.monotonic()<deadline:
   p=sql("select pid from pg_stat_activity where application_name='kill_v5' and wait_event='PgSleep';").stdout.strip()
   if p:pid=int(p);break
   time.sleep(.05)
  assert pid
  sql(f'select pg_terminate_backend({pid});');killed=pending.result();assert killed.returncode and 'terminating connection' in killed.stderr
 assert durable()==before
 rows.append(dict(test='6A.4 post-upgrade real backend termination rollback',input='pg_terminate_backend after snapshot insert',initial=before,operation='terminate actual SQL backend',expected='all checkpoint components unchanged',observed=killed.stderr,final=durable(),result='PASS'))
 sql('delete from tm_fault5.points;')
 check('C3 legacy partial unique owner/request remains enforced',lambda:sql("insert into public.operation_receipts(owner_id,request_id,op_type,payload_digest) select owner_id,request_id,op_type,payload_digest from public.operation_receipts where workspace_id is null;",ok=False),'receipts_legacy_request',True)
 # No mutability/retention privilege was introduced.
 check('confirmed snapshot update blocked even admin accidentally',lambda:sql(f"update public.layout_snapshots set payload=payload where layout_id='{L}';",ok=False),'IMMUTABLE_CHECKPOINT',True)
 check('confirmed receipt delete blocked even admin accidentally',lambda:sql(f"delete from public.operation_receipts where workspace_id='{A}';",ok=False),'IMMUTABLE_CHECKPOINT',True)
 for table,data in legacy_all.items():
  for row in data:assert sql(f"select count(*)=1 from public.{table} t where to_jsonb(t) @> {quote(json.dumps(row))}::jsonb;").stdout.strip()=='t',(table,'legacy changed')
 rows.append(dict(test='22 original nonempty ten-table legacy preserved',input='all original columns/rows',initial=legacy_all,operation='all migration and API tests',expected='identical',observed='all rows matched including timestamps',final=legacy_all,result='PASS'))
 # Immutable source and all history revisions survive recovery. Only explicit corruption tests changed/restored bytes.
 assert decoded(snapshot(1))['state']==old_envelope['state']
 assert sql(f"select (select count(*) from public.layout_snapshots where workspace_id='{A}')=(select revision from serien_capability.session_heads where layout_id='{L}');").stdout.strip()=='t'
 audit=json.loads(sql("select coalesce(jsonb_agg(to_jsonb(t) order by occurred_at),'[]') from serien_capability.audit_events t;").stdout)
 assert all(set(x)=={'id','workspace_id','device_id','event','request_id','revision','occurred_at'} for x in audit)
 OUT.joinpath('audit.json').write_text(json.dumps(audit,indent=2)+'\n')
 OUT.joinpath('final-state.json').write_text(json.dumps(durable(),indent=2)+'\n')
 OUT.joinpath('legacy.json').write_text(json.dumps(legacy_all,indent=2)+'\n')
 OUT.joinpath('results.json').write_text(json.dumps(dict(engine=sql('select version();').stdout.strip(),cases=rows,result='PASS',production='untouched'),indent=2)+'\n')
 from compact import compact
 compact(OUT/'results.json')
 print(json.dumps(dict(checks=len(rows),result='PASS',evidence=str(OUT))))
finally:
 docker(['rm','-f',NAME])
