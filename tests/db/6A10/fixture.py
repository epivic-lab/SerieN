"""Mixed synthetic legacy graph; approved DTO profile remains unchanged."""
import copy
import importlib.util
import json
import subprocess
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[3]
TABLES = ['stock_models','stock_items','consists','consist_members','layouts','layout_segments',
          'layout_placements','loose_stock_placements','layout_snapshots','operation_receipts']
OWNED = [t for t in TABLES if t not in ('stock_models','layout_segments')]
def uid(n): return f'10000000-0000-4000-8000-{n:012x}'
A,B,LA,LB,C,D,LC,LD = [uid(i) for i in range(1,9)]
OWNER1 = '00000000-0000-4000-8000-000000000001'
OWNER2 = '20000000-0000-4000-8000-000000000001'
def quote(x): return "'" + str(x).replace("'", "''") + "'"
def rows(sql):
    return json.loads(sql('SELECT jsonb_build_object('+','.join(quote(t)+",(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]') FROM public."+t+' x)' for t in TABLES)+",'session_heads',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]') FROM serien_capability.session_heads x));").stdout)
def seed(sql):
    sql((ROOT/'tests/db/6A3/bootstrap.sql').read_text())
    for p in sorted((ROOT/'tests/db/6A3').glob('2026*.sql')): sql(p.read_text())
    legacy = (ROOT/'tests/db/6A3/fixture.sql').read_text()
    sql(legacy)
    sql(legacy.replace('00000000-0000-4000-8000-', '20000000-0000-4000-8000-'))
    for name in ['20261104165408_serien_workspace_expand.sql','20261104172819_serien_atomic_checkpoint.sql',
                 '20261104175236_serien_history_integrity.sql','20261104231109_serien_capability_lifecycle.sql']:
        sql((ROOT/'supabase/migrations'/name).read_text())
    for w in [A,B]:
        sql(f"INSERT INTO serien_capability.workspaces(id) VALUES('{w}'); INSERT INTO serien_capability.workspace_locks(workspace_id) VALUES('{w}'); INSERT INTO serien_capability.api_limits(workspace_id) VALUES('{w}'); INSERT INTO serien_capability.lifecycle_limits(workspace_id) VALUES('{w}');")
    spec=importlib.util.spec_from_file_location('approved_profile',ROOT/'tests/db/6A6/profile_fixture.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    base=json.loads((ROOT/'docs/_active/train-management/evidence/6A1/schema-fixture.json').read_text())
    validator=Draft202012Validator(json.loads((ROOT/'docs/_active/train-management/STATE_SCHEMA.json').read_text()),format_checker=FormatChecker())
    def state(w,l): s=copy.deepcopy(base);s.update(workspaceId=w,layoutId=l);return s
    def graph(q):return sql(q.replace(OWNER1,OWNER2) if quote(B) in q else q)
    module.install(graph,uid,state,validator,A,B,LA,LB,quote)
    for i,(w,l) in enumerate([(A,LA),(B,LB)]):
        role='n10_seed_'+str(i);device=uid(900+i)
        key=json.dumps(dict(kty='EC',crv='P-256',x='A'*43,y='B'*43))
        sql(f"CREATE ROLE {role} LOGIN IN ROLE serien_tm_worker; INSERT INTO serien_capability.devices(id,workspace_id,public_key,scope) VALUES('{device}','{w}',{quote(key)},'owner'); INSERT INTO serien_capability.device_locks VALUES('{w}','{device}',0); INSERT INTO serien_capability.worker_bindings VALUES('{role}','{w}'); INSERT INTO serien_capability.device_bindings VALUES('{role}','{w}','{device}',1,1,1);")
        profile=json.loads(sql(f"SELECT template FROM serien_capability.candidate_profiles WHERE workspace_id='{w}';").stdout)
        body=dict(operation='SaveCheckpoint',workspaceId=w,layoutId=l,expectedRevision='0',state=profile,recoverySourceRevision=None)
        prepared=json.loads(subprocess.check_output(['node','prototypes/train-management/transaction-core/envelope.js',json.dumps(dict(workspaceId=w,layoutId=l))],input=json.dumps(body).encode(),cwd=ROOT))
        sql(f"SELECT serien_capability.save_checkpoint('{uid(910+i)}',{quote(prepared['wire'])},{quote(prepared['digest'])});",user=role)
