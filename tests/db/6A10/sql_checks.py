"""Real PostgreSQL assertions; operator/maintenance are isolated fixture identities.
No production DSN, no historical UPDATE/DELETE, no disabled integrity trigger.
"""
import hashlib
import json
import re
import subprocess
from pathlib import Path
from fixture import TABLES, OWNED, A, B, LA, LB, C, D, LC, LD, OWNER1, OWNER2, uid, quote, rows
ROOT=Path(__file__).resolve().parents[3]
MIGRATION=next((ROOT/'supabase/migrations').glob('*_serien_ownerless_cutover.sql'))

class Checks:
    def __init__(self,sql,out):self.sql=sql;self.out=out;self.tests=[];self.states={};self.db='postgres'
    def q(self,q,user='postgres',ok=True):
        if user in ('anon','authenticated'):
            q='SET SESSION AUTHORIZATION '+user+';\n'+q;user='postgres'
        return self.sql(q,user=user,ok=ok,db=self.db)
    def value(self,q):return self.q(q).stdout.strip()
    def data(self):return rows(self.q)
    def snapshot(self):
        data=self.data();digest=hashlib.sha256(json.dumps(data,sort_keys=True).encode()).hexdigest();self.states[digest]=data
        return dict(data=digest,authUsers=int(self.value('SELECT count(*) FROM auth.users;')),database=self.db)
    def record(self,name,action,unchanged=True):
        before=self.snapshot();observed=action();after=self.snapshot()
        if unchanged:assert before['data']==after['data'],name+' changed application data'
        self.tests.append(dict(test=name,expected='all assertions; rejected actions leave application data unchanged',observed=observed or True,before=before,after=after,result='PASS'))
        self.save();print(name+': PASS',flush=True);return observed
    def save(self):
        (self.out/'ownerless-sql.json').write_text(json.dumps(dict(tests=self.tests,states=self.states),indent=2)+'\n')
    def denied(self,name,q,code,fragment='',user='n10_maintenance'):
        def action():
            r=self.q('\\set VERBOSITY verbose\nBEGIN;\n'+q+'\nSET CONSTRAINTS ALL IMMEDIATE; COMMIT;',user=user,ok=False)
            assert r.returncode and code in r.stderr and fragment in r.stderr,(name,r.stdout,r.stderr)
            return dict(code=code,error=r.stderr.strip())
        return self.record(name,action)

def run_checks(sql,docker,pg,out):
    t=Checks(sql,out);original=t.data();inventory=json.loads(t.q((ROOT/'tests/db/6A10/inventory.sql').read_text()).stdout)
    def catalog():return json.loads(t.q((ROOT/'tests/db/6A10/inventory.sql').read_text()).stdout)
    def roles():return t.value("SELECT coalesce(jsonb_agg(jsonb_build_object('role',rolname,'super',rolsuper,'createRole',rolcreaterole,'bypass',rolbypassrls) ORDER BY rolname),'[]') FROM pg_roles;")
    t.record('O01 mixed nonempty ten tables two verified owners and A/B heads',lambda: (
        require(all(original[k] for k in TABLES)),require(len(original['layout_snapshots'])==4),require(len(original['operation_receipts'])==4),
        require(t.value('SELECT count(*) FROM auth.users;')=='2'),dict(counts={k:len(v) for k,v in original.items()},authDependencies=inventory['authEdges']))[-1])
    # Full schema/data dump, restored on a separate database with original object owners/ACL.
    dump=docker(['exec',pg,'pg_dump','-U','postgres','-d','postgres'])
    assert dump.returncode==0,dump.stderr
    (out/'backup.sql').write_text(dump.stdout)
    t.q('CREATE DATABASE n10_restore;')
    assert sql(dump.stdout,db='n10_restore').returncode==0
    restore_rows=rows(lambda q:sql(q,db='n10_restore'))
    assert restore_rows==original
    restored=json.loads(sql((ROOT/'tests/db/6A10/inventory.sql').read_text(),db='n10_restore').stdout)
    (out/'inventory-restored.json').write_text(json.dumps(restored,indent=2)+'\n')
    assert semantic_inventory(restored)==semantic_inventory(inventory),'restored inventory differs: '+','.join(k for k in inventory if semantic_inventory(restored)[k]!=semantic_inventory(inventory)[k])
    t.record('O14 pre-cutover backup restore reproduces schema ACL and every row',lambda:dict(backupSHA256=hashlib.sha256(dump.stdout.encode()).hexdigest(),restoredDatabase='n10_restore',sameInventory=True,sameData=True))
    t.q('DROP DATABASE n10_restore;')
    # Each logical DDL section is faulted AFTER executing it. COMMIT never happens.
    migration=MIGRATION.read_text();base_catalog=catalog();base_roles=roles()
    for step in range(1,15):
        marker=f'-- CUTOVER STEP {step+1:02d}:' if step<14 else 'COMMIT;'
        bad=migration.replace(marker,'SELECT 1/0; -- intentional DDL fault\n'+marker,1)
        def fault(bad=bad):
            r=t.q(bad,ok=False);assert r.returncode and 'division by zero' in r.stderr,r.stderr
            assert catalog()==base_catalog,'DDL catalog did not roll back'
            assert roles()==base_roles,'DDL roles did not roll back'
            return dict(error='division by zero',schemaAndRolesRestored=True)
        t.record(f'O14 DDL rollback after step {step:02d}',fault)
    t.record('O02 atomic DDL preserves all rows and verified provenance',lambda:apply(t,migration,original),True)
    after_catalog=catalog();(out/'inventory-after.json').write_text(json.dumps(after_catalog,indent=2)+'\n')
    (out/'manifest-after-ddl.json').write_text(json.dumps(t.data(),indent=2)+'\n')
    assert not after_catalog['authEdges']
    for table in OWNED:
        owner=next(x for x in after_catalog['columns'] if x['table']==table and x['column']=='owner_id')
        domain=next(x for x in after_catalog['columns'] if x['table']==table and x['column']=='ownership_key')
        assert not owner['notNull'] and owner['default'] is None
        assert domain['notNull'] and domain['generated']=='s'
    assert not any('auth.uid' in json.dumps(p) for p in after_catalog['policies'])
    t.q('CREATE ROLE n10_workspace_operator LOGIN IN ROLE serien_tm_workspace_operator;')
    for w,l,j in [(C,LC,uid(700)),(D,LD,uid(701))]:
        t.q(f"INSERT INTO serien_capability.workspace_creation_jobs(id,operator_role,workspace_id,layout_id,source_workspace_id,source_layout_id,audience,approved) VALUES('{j}','n10_workspace_operator','{w}','{l}','{A}','{LA}','http://127.0.0.1:1',true);")
    def reversible():
        assert int(t.value('SELECT '+ '+'.join(f'(SELECT count(*) FROM public.{x} WHERE owner_id IS NULL)' for x in OWNED)+';'))==0
        assert t.value('SELECT count(*) FROM serien_capability.legacy_owners o LEFT JOIN auth.users a ON a.id=o.id WHERE a.id IS NULL;')=='0'
        t.q('REVOKE EXECUTE ON FUNCTION serien_capability.create_ownerless_workspace(uuid) FROM serien_tm_workspace_operator;')
        r=t.q(f"SELECT serien_capability.create_ownerless_workspace('{uid(700)}');",user='n10_workspace_operator',ok=False)
        assert r.returncode and 'permission denied' in r.stderr
        t.q('GRANT EXECUTE ON FUNCTION serien_capability.create_ownerless_workspace(uuid) TO serien_tm_workspace_operator;')
        return dict(newPathDisabled=True,noOwnerlessRows=True,allOwnersStillResolveAuth=True,restoreAlreadyVerified=True)
    t.record('O14 after DDL before first write path can be disabled and restore conditions hold',reversible)
    t.record('O03 O11 delete all Auth users with no application cascade',lambda:delete_auth(t,original))
    t.record('O04 private creator C D ownerNULL head0 and no fabricated checkpoint',lambda:create(t),False)
    t.record('O04 same approved creation job idempotent',lambda:require(json.loads(t.q(f"SELECT serien_capability.create_ownerless_workspace('{uid(700)}');",user='n10_workspace_operator').stdout)['workspaceId']==C))
    t.q('CREATE DATABASE n10_compat TEMPLATE postgres;');t.db='n10_compat'
    def compatibility():
        receipts=[]
        for i,(w,l) in enumerate([(A,LA),(B,LB)]):
            profile=json.loads(t.value(f"SELECT template FROM serien_capability.candidate_profiles WHERE workspace_id='{w}';"))
            result=json.loads(t.q(save_sql(w,l,profile,1,uid(920+i)),user='n10_seed_'+str(i)).stdout)
            assert result['revision']=='2'
            assert t.value(f"SELECT owner_id IS NULL FROM public.layout_snapshots WHERE id='{result['snapshotId']}';")=='t'
            assert t.value(f"SELECT owner_id IS NULL FROM public.operation_receipts WHERE workspace_id='{w}' AND request_id='{uid(920+i)}';")=='t'
            t.q(f"SELECT serien_capability.read_snapshot('{w}','{l}',1);",user='n10_seed_'+str(i))
            receipts.append(result)
        assert t.value('SELECT count(*) FROM auth.users;')=='0';return receipts
    t.record('O09 O10 existing A B commit new ownerNULL checkpoints and read old snapshots with zero Auth',compatibility,False)
    (out/'manifest-compat-final.json').write_text(json.dumps(t.data(),indent=2)+'\n')
    t.db='postgres';t.q('DROP DATABASE n10_compat;')
    # Prove structure and mutation failure on an independent clone, leaving C/D head0 for browser.
    t.q('CREATE DATABASE n10_struct TEMPLATE postgres;');t.db='n10_struct'
    maintenance(t)
    structural(t)
    t.db='postgres'
    assert historical(t.data(),original)==original
    assert t.value('SELECT count(*) FROM auth.users;')=='0'
    (out/'manifest-before-browser.json').write_text(json.dumps(t.data(),indent=2)+'\n')
    t.save()

def semantic_inventory(v):
    # PostgreSQL regenerates internal RI trigger names from OIDs on restore.
    v=json.loads(re.sub(r'RI_ConstraintTrigger_[ac]_[0-9]+','RI_ConstraintTrigger_INTERNAL',json.dumps(v,sort_keys=True)))
    v=json.loads(re.sub(r'pg_toast_[0-9]+','pg_toast_INTERNAL',json.dumps(v,sort_keys=True)))
    for table in v['tables']:
        table.pop('acl',None) # effectiveAcl remains compared; NULL vs explicit owner-only ACL is equivalent.
    return {k:sorted(rows,key=lambda x:json.dumps(x,sort_keys=True)) if isinstance(rows,list) else rows for k,rows in v.items()}

def require(v):assert v

def apply(t,migration,original):
    t.q(migration);assert t.data()==original
    owners=json.loads(t.value('SELECT jsonb_agg(id ORDER BY id) FROM serien_capability.legacy_owners;'))
    assert owners==sorted([OWNER1,OWNER2]);return dict(legacyOwners=owners,unchangedApplication=True)

def delete_auth(t,original):
    t.q('DELETE FROM auth.users;');assert t.value('SELECT count(*) FROM auth.users;')=='0';assert t.data()==original
    return dict(authUsers=0,unchangedApplication=True)

def create(t):
    result=[]
    for w,l,j in [(C,LC,uid(700)),(D,LD,uid(701))]:
        r=json.loads(t.q(f"SELECT serien_capability.create_ownerless_workspace('{j}');",user='n10_workspace_operator').stdout)
        assert r['workspaceId']==w and r['layoutId']==l and r['revision']=='0';result.append(r)
        assert t.value(f"SELECT revision=0 AND snapshot_id IS NULL AND receipt_request_id IS NULL AND payload_digest IS NULL FROM serien_capability.session_heads WHERE workspace_id='{w}' AND layout_id='{l}';")=='t'
        for tab in OWNED:
            assert t.value(f"SELECT count(*) FROM public.{tab} WHERE workspace_id='{w}' AND (owner_id IS NOT NULL OR ownership_key IS DISTINCT FROM 'workspace:{w}');")=='0'
        for tab in ['layout_snapshots','operation_receipts']:
            assert t.value(f"SELECT count(*) FROM public.{tab} WHERE workspace_id='{w}';")=='0'
    return result

def maintenance(t):
    t.q("CREATE ROLE n10_maintenance LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB; GRANT USAGE ON SCHEMA public,serien_internal,serien_capability TO n10_maintenance; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO n10_maintenance; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA serien_internal TO n10_maintenance; GRANT SELECT,DELETE ON serien_capability.legacy_owners TO n10_maintenance;")
    for tab in TABLES:
        t.q(f"CREATE POLICY fixture_maintenance ON public.{tab} TO n10_maintenance USING(session_user='n10_maintenance') WITH CHECK(session_user='n10_maintenance');")
    t.q("CREATE POLICY fixture_maintenance ON serien_capability.legacy_owners TO n10_maintenance USING(session_user='n10_maintenance') WITH CHECK(session_user='n10_maintenance');")
    for i,(w,l,scope) in enumerate([(C,LC,'owner'),(D,LD,'owner'),(C,LC,'reader'),(C,LC,'editor')]):
        role='n10_device_'+str(i);d=uid(800+i);key=json.dumps(dict(kty='EC',crv='P-256',x='A'*43,y='B'*43))
        t.q(f"CREATE ROLE {role} LOGIN IN ROLE serien_tm_worker; INSERT INTO serien_capability.devices(id,workspace_id,public_key,scope) VALUES('{d}','{w}',{quote(key)},'{scope}'); INSERT INTO serien_capability.device_locks VALUES('{w}','{d}',0); INSERT INTO serien_capability.worker_bindings VALUES('{role}','{w}'); INSERT INTO serien_capability.device_bindings VALUES('{role}','{w}','{d}',1,1,1);")

def prepared(w,l,state,rev):
    body=dict(operation='SaveCheckpoint',workspaceId=w,layoutId=l,expectedRevision=str(rev),recoverySourceRevision=None,state=state)
    return json.loads(subprocess.check_output(['node','prototypes/train-management/transaction-core/envelope.js',json.dumps(dict(workspaceId=w,layoutId=l))],input=json.dumps(body).encode(),cwd=ROOT))

def save_sql(w,l,state,rev,request):
    e=prepared(w,l,state,rev)
    return f"SELECT serien_capability.save_checkpoint('{request}',{quote(e['wire'])},{quote(e['digest'])});"

def structural(t):
    p={w:json.loads(t.value(f"SELECT template FROM serien_capability.candidate_profiles WHERE workspace_id='{w}';")) for w in [A,B,C,D]}
    # Maintenance is NOBYPASSRLS/non-owner and constraints remain enabled. Codes separate FK from ACL.
    def maintenance_identity():
        flags=t.value("SELECT NOT (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb) FROM pg_roles WHERE rolname='n10_maintenance';")
        assert flags=='t'
        assert t.value("SELECT count(*) FROM pg_class WHERE relowner='n10_maintenance'::regrole;")=='0'
        return dict(nonsuperNobypassNoCreateRoleNoCreateDB=True,ownsTables=False,role='n10_maintenance')
    t.record('O12 controlled maintenance has raw ACL but no SQL administrative power',maintenance_identity)
    model=p[C]['items'][0]['modelId'];cons=p[C]['consists'][0]['id'];loose=p[C]['items'][1]['id']
    def item(i=1001,w=C,kind_model=model,code='NULL'):
        return f"INSERT INTO public.stock_items(id,workspace_id,owner_id,model_id,inventory_code) VALUES('{uid(i)}','{w}',NULL,'{kind_model}',{code});"
    def ready(i,w=C):
        return item(i,w)+f"INSERT INTO public.consists(id,workspace_id,owner_id,name) VALUES('{uid(i+1)}','{w}',NULL,'spare'); INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,owner_id,ordinal) VALUES('{uid(i+1)}','{uid(i)}','{w}',NULL,0); UPDATE public.consists SET status='ready' WHERE id='{uid(i+1)}';"
    def rls_auth():
        q="BEGIN; GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated; SET SESSION AUTHORIZATION authenticated; SELECT set_config('request.jwt.claim.sub','"+OWNER1+"',true); SELECT jsonb_build_object("+','.join(quote(tab)+",(SELECT count(*) FROM public."+tab+")" for tab in TABLES)+"); RESET SESSION AUTHORIZATION; ROLLBACK;"
        counts=json.loads(t.q(q).stdout.strip().splitlines()[-1]);assert all(v==0 for v in counts.values());return dict(effectiveAuthOwnerClaim=OWNER1,rowsVisible=counts,temporaryFixtureGrantsRolledBack=True)
    t.record('O12 retired Auth policies deny real legacy owner claim even with SELECT ACL',rls_auth)
    def acl():
        roles=['anon','authenticated','serien_tm_worker','serien_tm_control','serien_tm_redeemer','serien_tm_provisioner','serien_tm_executor','serien_tm_workspace_operator']
        result=json.loads(t.value("SELECT jsonb_agg(jsonb_build_object('role',r,'creator',has_function_privilege(r,'serien_capability.create_ownerless_workspace(uuid)','EXECUTE'),'ledgerRead',has_table_privilege(r,'serien_capability.legacy_owners','SELECT'),'ledgerWrite',has_table_privilege(r,'serien_capability.legacy_owners','INSERT')) ORDER BY r) FROM unnest(ARRAY["+','.join(quote(x) for x in roles)+"]::text[]) r;"))
        assert all(x['creator']==(x['role']=='serien_tm_workspace_operator') and not x['ledgerRead'] and not x['ledgerWrite'] for x in result)
        (t.out/'effective-privileges.json').write_text(json.dumps(result,indent=2)+'\n');return result
    t.record('O12 effective creator provenance ACL and no broker provisioning authority',acl)
    def snapshot_insert(w,l,state,i=1001):
        return f"INSERT INTO public.layout_snapshots(id,owner_id,workspace_id,layout_id,revision,payload,payload_digest,state_digest,canonical_version,engine_revision,topology_hash,asset_refs) VALUES('{uid(i)}',NULL,{quote(w) if w else 'NULL'},'{l}',999,{quote(json.dumps(state))},repeat('a',64),repeat('c',64),'jcs-profile-v1',{quote(state['engineRevision'])},{quote(state['topologyHash'])},'[]');"
    t.denied('O05 root ownerNULL workspaceNULL rejected',f"INSERT INTO public.stock_items(id,owner_id,workspace_id,model_id) VALUES('{uid(1000)}',NULL,NULL,'{model}');",'23502','ownership_key')
    t.denied('O05 workspace FK cannot be NULL bypass for ownerless root',item(1000,uid(99999)),'23503')
    t.denied('O05 generated domain cannot be supplied',f"INSERT INTO public.stock_items(id,workspace_id,model_id,ownership_key) VALUES('{uid(1000)}','{C}','{model}','workspace:{D}');",'428C9')
    t.denied('O05 missing parent member ID rejected',item()+f"INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,ordinal) VALUES(NULL,'{uid(1001)}','{C}',0);",'23502')
    t.denied('O05 workspace receipt NULL snapshot tuple rejected',f"INSERT INTO public.operation_receipts(workspace_id,request_id,op_type,payload_digest,request_context,receipt_version,auth_context) VALUES('{C}','{uid(1000)}','test',repeat('a',64),'{{}}',2,'{{}}');",'23514','receipt_workspace_complete')
    null_cases=[
        ('consists',f"INSERT INTO public.consists(id,name) VALUES('{uid(1001)}','null');"),
        ('layouts',f"INSERT INTO public.layouts(id,name,topology_hash) VALUES('{uid(1001)}','null','{p[C]['topologyHash']}');"),
        ('consist_members',item()+f"INSERT INTO public.consist_members(consist_id,stock_item_id,ordinal) VALUES('{cons}','{uid(1001)}',0);"),
        ('layout_placements',ready(1001)+f"INSERT INTO public.layout_placements(consist_id,layout_id,edge_id,s_mm,heading) VALUES('{uid(1002)}','{LC}','T47',120,1);"),
        ('loose_stock_placements',item()+f"INSERT INTO public.loose_stock_placements(stock_item_id,layout_id,edge_id,s_mm,heading) VALUES('{uid(1001)}','{LC}','T47',220,1);"),
        ('layout_snapshots',snapshot_insert(None,LC,p[C])),
        ('operation_receipts',f"INSERT INTO public.operation_receipts(request_id,op_type,payload_digest) VALUES('{uid(1001)}','null',repeat('a',64));")]
    for tab,q in null_cases:t.denied('O05 ownerNULL workspaceNULL '+tab,q,'23502','ownership_key')
    t.denied('O04 new workspace row cannot reuse historical owner',f"INSERT INTO public.stock_items(id,workspace_id,owner_id,model_id) VALUES('{uid(1001)}','{C}','{OWNER1}','{model}');",'23514','NEW_WORKSPACE_ROW_REQUIRES_NULL_OWNER')
    # Seven domain FK routes with ownerNULL (old owner FKs all skip and cannot mask the result).
    wagon=p[C]['items'][1]['modelId']
    cases=[('member consist domain',item(1001,C,wagon)+f"INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,ordinal) VALUES('{p[D]['consists'][0]['id']}','{uid(1001)}','{C}',1);"),
     ('member item domain',item(1001,D)+f"INSERT INTO public.consists(id,workspace_id,name) VALUES('{uid(1002)}','{C}','spare'); INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,ordinal) VALUES('{uid(1002)}','{uid(1001)}','{C}',0);"),
     ('placement consist domain',ready(1001,D)+f"INSERT INTO public.layout_placements(consist_id,workspace_id,layout_id,edge_id,s_mm,heading) VALUES('{uid(1002)}','{C}','{LC}','T47',120,1);"),
     ('placement layout domain',ready(1001,C)+f"INSERT INTO public.layout_placements(consist_id,workspace_id,layout_id,edge_id,s_mm,heading) VALUES('{uid(1002)}','{C}','{LD}','T47',120,1);"),
     ('loose item domain',item(1001,D)+f"INSERT INTO public.loose_stock_placements(stock_item_id,workspace_id,layout_id,edge_id,s_mm,heading) VALUES('{uid(1001)}','{C}','{LC}','T47',220,1);"),
     ('loose layout domain',item(1001,C)+f"INSERT INTO public.loose_stock_placements(stock_item_id,workspace_id,layout_id,edge_id,s_mm,heading) VALUES('{uid(1001)}','{C}','{LD}','T47',220,1);"),
     ('snapshot layout domain',snapshot_insert(C,LD,p[C]))]
    for name,q in cases:t.denied('O06 '+name,q,'23503','ownership_key_fkey')
    # Exercise every ordered pair A/B/C/D on every domain FK. ownerNULL avoids masking by old owner FKs.
    layouts={A:LA,B:LB,C:LC,D:LD};labels={A:'A',B:'B',C:'C',D:'D'}
    for child in [A,B,C,D]:
      for parent in [A,B,C,D]:
        if child==parent or (child,parent)==(C,D):continue
        cl,pl=layouts[child],layouts[parent]
        cross=[
          ('member consist',item(1001,child,wagon)+f"INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,ordinal) VALUES('{p[parent]['consists'][0]['id']}','{uid(1001)}','{child}',1);"),
          ('member item',item(1001,parent)+f"INSERT INTO public.consists(id,workspace_id,name) VALUES('{uid(1002)}','{child}','spare'); INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,ordinal) VALUES('{uid(1002)}','{uid(1001)}','{child}',0);"),
          ('placement consist',ready(1001,parent)+f"INSERT INTO public.layout_placements(consist_id,workspace_id,layout_id,edge_id,s_mm,heading) VALUES('{uid(1002)}','{child}','{cl}','T47',120,1);"),
          ('placement layout',ready(1001,child)+f"INSERT INTO public.layout_placements(consist_id,workspace_id,layout_id,edge_id,s_mm,heading) VALUES('{uid(1002)}','{child}','{pl}','T47',120,1);"),
          ('loose item',item(1001,parent)+f"INSERT INTO public.loose_stock_placements(stock_item_id,workspace_id,layout_id,edge_id,s_mm,heading) VALUES('{uid(1001)}','{child}','{cl}','T47',220,1);"),
          ('loose layout',item(1001,child)+f"INSERT INTO public.loose_stock_placements(stock_item_id,workspace_id,layout_id,edge_id,s_mm,heading) VALUES('{uid(1001)}','{child}','{pl}','T47',220,1);"),
          ('snapshot layout',snapshot_insert(child,pl,p[child]))]
        for name,q in cross:t.denied('O06 '+labels[child]+' to '+labels[parent]+' '+name,q,'23503','ownership_key_fkey')
    t.denied('O06 legacy same provenance cannot reference workspace domain',f"INSERT INTO public.stock_items(id,owner_id,model_id) VALUES('{uid(1001)}','{OWNER1}','{model}'); INSERT INTO public.consist_members(consist_id,stock_item_id,owner_id,ordinal) VALUES('{p[A]['consists'][0]['id']}','{uid(1001)}','{OWNER1}',1);",'23514') # kind before FK; next uses wagon.
    t.denied('O06 legacy to A domain FK with old owner FK satisfied',f"INSERT INTO public.stock_items(id,owner_id,model_id) VALUES('{uid(1001)}','{OWNER1}','{wagon}'); INSERT INTO public.consist_members(consist_id,stock_item_id,owner_id,ordinal) VALUES('{p[A]['consists'][0]['id']}','{uid(1001)}','{OWNER1}',1);",'23503','ownership_key_fkey')
    t.denied('O06 legacy owner1 cannot reference legacy owner2',f"INSERT INTO public.stock_items(id,owner_id,model_id) VALUES('{uid(1001)}','{OWNER1}','{wagon}'); INSERT INTO public.consist_members(consist_id,stock_item_id,owner_id,ordinal) VALUES('20000000-0000-4000-8000-000000000030','{uid(1001)}','{OWNER1}',1);",'23503')
    t.denied('O07 locomotive cannot follow ordinal zero',item()+f"INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,ordinal) VALUES('{cons}','{uid(1001)}','{C}',1);",'23514','First member')
    t.denied('O07 wagon cannot be first member',item(1001,C,wagon)+f"INSERT INTO public.consists(id,workspace_id,name) VALUES('{uid(1002)}','{C}','spare'); INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,ordinal) VALUES('{uid(1002)}','{uid(1001)}','{C}',0);",'23514','First member')
    t.denied('O07 ready member ordinals stay consecutive deferred',item(1001,C,wagon)+f"INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,ordinal) VALUES('{cons}','{uid(1001)}','{C}',2);",'23514','consecutive')
    t.denied('O07 member cannot also be loose',f"INSERT INTO public.loose_stock_placements(stock_item_id,workspace_id,layout_id,edge_id,s_mm,heading) VALUES('{p[C]['items'][0]['id']}','{C}','{LC}','T47',100,1);",'23514','already in consist')
    t.denied('O07 loose cannot also be member',f"INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,ordinal) VALUES('{cons}','{loose}','{C}',1);",'23514','already loose')
    for name,change in [('position',"s_mm=999"),('heading',"heading=0"),('edge',"edge_id='missing'")]:
        t.denied('O07 invalid '+name,f"UPDATE public.loose_stock_placements SET {change} WHERE stock_item_id='{loose}';",'23514')
    for name,mutate in [('topology',lambda s:s.update(topologyHash='f'*64)),('STOPPED',lambda s:s.update(resumePolicy='RUN')),('eight switches',lambda s:s['layout']['switches'].pop('WX-A')),('switch boolean',lambda s:s['layout']['switches'].update({'WX-A':1}))]:
        s=json.loads(json.dumps(p[C]));mutate(s)
        t.denied('O07 snapshot '+name,snapshot_insert(C,LC,s),'23514')
    for tab in ['stock_items','consists','consist_members','layouts','layout_placements','loose_stock_placements']:
        t.denied('O05 identity guard '+tab,f"UPDATE public.{tab} SET workspace_id='{D}' WHERE workspace_id='{C}';",'23514','OWNERSHIP_IDENTITY_IMMUTABLE')
    t.denied('O11 referenced provenance cannot be deleted',f"DELETE FROM serien_capability.legacy_owners WHERE id='{OWNER1}';",'23503')
    for scope in ['anon','authenticated','n10_device_0']:
        for query in ['SELECT * FROM public.stock_items','SELECT * FROM serien_capability.legacy_owners',f"SELECT serien_capability.create_ownerless_workspace('{uid(700)}')"]:
            t.denied('O12 '+scope+' denied '+query.split(' ')[0]+' '+query.split(' ')[-1],query+';','42501',user=scope)
    t.denied('O12 private creator denies unapproved foreign job',f"SELECT serien_capability.create_ownerless_workspace('{uid(999)}');",'P0001','FORBIDDEN',user='n10_workspace_operator')
    t.denied('O12 reader cannot Save',save_sql(C,LC,p[C],0,uid(1100)),'P0001','FORBIDDEN',user='n10_device_2')
    t.denied('O12 C cannot read D',f"SELECT serien_capability.read_head('{D}','{LD}');",'P0001','FORBIDDEN',user='n10_device_0')
    # Approved job identity and approval are operator-established, never browser-selected.
    t.q(f"INSERT INTO serien_capability.workspace_creation_jobs(id,operator_role,workspace_id,layout_id,source_workspace_id,source_layout_id,audience,approved) VALUES('{uid(710)}','n10_workspace_operator','{uid(711)}','{uid(712)}','{A}','{LA}','http://127.0.0.1:1',false),('{uid(713)}','another_operator','{uid(714)}','{uid(715)}','{A}','{LA}','http://127.0.0.1:1',true);")
    for job in [uid(710),uid(713)]:t.denied('O12 creation requires matching operator and approved job '+job,f"SELECT serien_capability.create_ownerless_workspace('{job}');",'P0001','FORBIDDEN',user='n10_workspace_operator')
    for name,q in [('approve raw',"UPDATE serien_capability.workspace_creation_jobs SET approved=true"),('workspace raw',f"INSERT INTO serien_capability.workspaces(id) VALUES('{uid(716)}')"),('role DDL','CREATE ROLE forbidden_workspace_operator_role')]:
        t.denied('O12 operator cannot '+name,q+';','42501',user='n10_workspace_operator')
    t.denied('O05 positive head requires complete snapshot receipt tuple',f"INSERT INTO public.layouts(id,workspace_id,name,topology_hash) VALUES('{uid(1001)}','{C}','head','{p[C]['topologyHash']}'); INSERT INTO serien_capability.session_heads(workspace_id,layout_id,revision) VALUES('{C}','{uid(1001)}',1);",'23514',user='postgres')
    # Real SQL faults in all six mutating substeps under the unchanged API executor.
    t.q("CREATE SCHEMA fault10; CREATE FUNCTION fault10.fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'N10_SQL_FAULT' USING ERRCODE='23514'; END $$; REVOKE ALL ON FUNCTION fault10.fail() FROM PUBLIC;")
    for tab,op in [('layout_snapshots','INSERT'),('layout_placements','UPDATE'),('loose_stock_placements','UPDATE'),('session_heads','UPDATE'),('operation_receipts','INSERT'),('audit_events','INSERT')]:
        schema='serien_capability' if tab in ['session_heads','audit_events'] else 'public'
        t.q(f"CREATE TRIGGER n10_fault AFTER {op} ON {schema}.{tab} FOR EACH ROW EXECUTE FUNCTION fault10.fail();")
        t.denied('O08 rollback after '+tab,save_sql(C,LC,p[C],0,uid(1100)),'23514','N10_SQL_FAULT',user='n10_device_0')
        t.q(f'DROP TRIGGER n10_fault ON {schema}.{tab};')
    t.q('CREATE CONSTRAINT TRIGGER n10_deferred AFTER INSERT ON public.layout_snapshots DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION fault10.fail();')
    t.denied('O08 deferred failure before API commit',save_sql(C,LC,p[C],0,uid(1100)),'23514','N10_SQL_FAULT',user='n10_device_0')
    t.q('DROP TRIGGER n10_deferred ON public.layout_snapshots; DROP FUNCTION fault10.fail(); DROP SCHEMA fault10;')
    req=uid(1100)
    receipts={}
    def firsts():
        for i,(w,l) in enumerate([(C,LC),(D,LD)]):receipts[w]=json.loads(t.q(save_sql(w,l,p[w],0,req),user='n10_device_'+str(i)).stdout)
        assert receipts[C]['revision']==receipts[D]['revision']=='1'
        return receipts
    t.record('O04 O09 both ownerless workspaces save same request_id independently',firsts,False)
    for tab in OWNED:assert int(t.value(f"SELECT count(*) FROM public.{tab} WHERE workspace_id='{C}' AND owner_id IS NULL AND ownership_key='workspace:{C}';"))>0
    # Fully supplied receipt FK cannot point at the other workspace's real snapshot.
    t.denied('O06 receipt tuple cannot reference snapshot D from C',f"INSERT INTO public.operation_receipts(workspace_id,layout_id,snapshot_id,revision,request_id,op_type,payload_digest,result,request_context,receipt_version,auth_context) VALUES('{C}','{LC}','{receipts[D]['snapshotId']}',1,'{uid(1109)}','SaveCheckpoint','{receipts[D]['digest']}','{{}}','{{}}',2,'{{}}');",'23503')
    next_state=json.loads(json.dumps(p[C]));next_state['ui']['day']=1
    t.record('O09 next head advances to 2',lambda:json.loads(t.q(save_sql(C,LC,next_state,1,uid(1101)),user='n10_device_0').stdout),False)
    t.record('O09 retry original envelope after head advanced returns original receipt',lambda:require(json.loads(t.q(save_sql(C,LC,p[C],0,req),user='n10_device_0').stdout)==receipts[C]))
    t.denied('O09 request_id different digest rejected',save_sql(C,LC,next_state,0,req),'P0001','IDEMPOTENCY_KEY_REUSED',user='n10_device_0')
    t.denied('O09 request_id different actor rejected',save_sql(C,LC,p[C],0,req),'P0001','IDEMPOTENCY_KEY_REUSED',user='n10_device_3')
    def history():
        snap=json.loads(t.q(f"SELECT serien_capability.read_snapshot('{C}','{LC}',1);",user='n10_device_0').stdout)
        assert snap['state']==p[C]
        items=json.loads(t.q(f"SELECT serien_capability.list_history('{C}','{LC}',0,2);",user='n10_device_0').stdout)['items'];assert [v['revision'] for v in items]==['1','2']
        receipt=json.loads(t.q(f"SELECT serien_capability.read_receipt('{C}','{LC}','{req}');",user='n10_device_0').stdout);assert receipt==receipts[C]
        return dict(snapshotVerified=True,revisions=['1','2'],receiptIdentical=True)
    t.record('O10 read snapshot history receipt before recovery',history)
    t.record('O10 RecoverRevision appends revision3 preserving source1',lambda:json.loads(t.q(f"SELECT serien_capability.recover_revision('{C}','{LC}',2,1,'{uid(1102)}');",user='n10_device_0').stdout),False)
    for tab in ['layout_snapshots','operation_receipts']:
        t.denied('O10 immutable '+tab+' UPDATE',f"UPDATE public.{tab} SET owner_id=owner_id WHERE workspace_id='{C}';",'P0001','IMMUTABLE_CHECKPOINT')
        t.denied('O10 immutable '+tab+' DELETE',f"DELETE FROM public.{tab} WHERE workspace_id='{C}';",'P0001','IMMUTABLE_CHECKPOINT')
    # Inventory uniqueness is tested on a disposable transaction; no historical renaming.
    t.record('O13 same inventory code in C D accepted',lambda:inventory_codes(t,item),True)
    t.denied('O13 duplicate code same domain rejected',item(1001,C,code="'same'")+item(1002,C,code="'same'"),'23505','stock_items_domain_inventory')
    t.denied('O13 duplicate legacy same owner rejected',f"INSERT INTO public.stock_items(id,owner_id,model_id,inventory_code) VALUES('{uid(1001)}','{OWNER1}','{model}','same'),('{uid(1002)}','{OWNER1}','{model}','same');",'23505','stock_items_domain_inventory')
    # Forward-safe containment after Auth deletion and ownerless writes: no destructive down.
    def readonly():
        t.q('REVOKE EXECUTE ON FUNCTION serien_capability.save_checkpoint(uuid,text,text),serien_capability.recover_revision(uuid,uuid,bigint,bigint,uuid) FROM serien_tm_worker;')
        r=t.q(save_sql(C,LC,p[C],3,uid(1103)),user='n10_device_0',ok=False);assert r.returncode and 'permission denied' in r.stderr
        head=json.loads(t.q(f"SELECT serien_capability.read_head('{C}','{LC}');",user='n10_device_0').stdout);assert head['revision']=='3'
        assert t.value('SELECT count(*) FROM auth.users;')=='0'
        return dict(writesDisabled=True,readHead=head,authUsers=0,destructiveDown=False,losslessHostedReplay='NOT VERIFIED; remain read-only')
    t.record('O14 after ownerless writes and Auth deletion read-only containment preserves data',readonly)
    assert historical(t.data(),json.loads((t.out/'manifest-before.json').read_text()))==json.loads((t.out/'manifest-before.json').read_text())
    (t.out/'manifest-structural-final.json').write_text(json.dumps(t.data(),indent=2)+'\n')

def inventory_codes(t,item):
    r=t.q('BEGIN;'+item(1001,C,code="'same'")+item(1002,D,code="'same'")+'ROLLBACK;',user='n10_maintenance')
    assert r.returncode==0;return dict(twoDomainsAccepted=True,rolledBackFixtureOnly=True)

def historical(current,original):
    """Compare every original row by exact JSON membership, also preserve original model catalog."""
    filtered={}
    for tab,old in original.items():
        # No original row may disappear or be rewritten; new rows belong only C/D.
        rows_now=current[tab];filtered[tab]=[]
        for row in old:
            assert row in rows_now,('historical row changed',tab,row)
            filtered[tab].append(row)
        for row in rows_now:
            if row not in old:
                allowed = row.get('layout_id') in [LC,LD] if tab=='layout_segments' else row.get('workspace_id') in [C,D]
                assert allowed,('unexpected application row',tab,row)
    return filtered

def finish(sql,out):
    original=json.loads((out/'manifest-before.json').read_text());after=rows(sql)
    assert historical(after,original)==original
    assert sql('SELECT count(*) FROM auth.users;').stdout.strip()=='0'
    for tab in OWNED:
        assert sql(f"SELECT count(*) FROM public.{tab} WHERE workspace_id IN('{C}','{D}') AND (owner_id IS NOT NULL OR ownership_key IS DISTINCT FROM 'workspace:'||workspace_id::text);").stdout.strip()=='0'
    database_auth_counts={}
    for name in sql("SELECT datname FROM pg_database WHERE datallowconn AND NOT datistemplate ORDER BY datname;").stdout.strip().splitlines():
        count=int(sql('SELECT count(*) FROM auth.users;',db=name).stdout)
        assert count==0,(name,count)
        database_auth_counts[name]=count
    (out/'manifest-after-browser.json').write_text(json.dumps(after,indent=2)+'\n')
    (out/'zero-auth-proof.json').write_text(json.dumps(dict(result='PASS',authUsers=0,allFixtureDatabasesAuthCounts=database_auth_counts,historicalApplicationRowsUnchanged=True,legacyOwnerCount=int(sql('SELECT count(*) FROM serien_capability.legacy_owners;').stdout),legacyNonempty=True,ownerlessWorkspaces=[C,D],browserSuite='unmodified 6A.9 integrated suite against ownerless C/D',newSnapshotsOwnerNULL=True,productionQueries=0),indent=2)+'\n')
