"""6A.8 isolated SQL lifecycle/replay laboratory. Never accepts a remote DSN.

Docker Unix socket, pinned PG17, network none/tmpfs, real session_user logins.
The privileged fixture operator prepares SQL roles; it is never a data-plane role.
"""
import concurrent.futures as futures
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import secrets
import subprocess
import time
import uuid

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[3]
os.chdir(ROOT)
OUT = Path(os.environ.get('SERIEN_DB_EVIDENCE', '/workspace/work/6A8/results')).resolve()
OUT.mkdir(parents=True, exist_ok=True)
ENV = {k: v for k, v in os.environ.items() if k not in
       ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']}
DOCKER = ['docker', '--host=unix:///var/run/docker.sock']
NAME = 'serien-6a8-' + uuid.uuid4().hex[:10]
IMAGE = 'postgres:17@sha256:3b0cda93be7c8dba2ed484d19393d93845dc3dafb88973e248ba8e6d99d784e1'
MIGRATION = ROOT / 'supabase/migrations/20261104231109_serien_capability_lifecycle.sql'
ROWS, STATES = [], {}


def docker(args, **kw):
    return subprocess.run(DOCKER + args, env=ENV, text=True, capture_output=True, **kw)


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def sql(query, user='postgres', ok=True):
    result = docker(['exec', '-i', NAME, 'psql', '-XqAt', '-U', user, '-d', 'postgres',
                     '-v', 'ON_ERROR_STOP=1'], input=query)
    if ok and result.returncode:
        # Never include SQL input, failed rows, verifier values or passwords in diagnostics.
        error = next((line for line in result.stderr.splitlines() if 'ERROR:' in line), 'SQL process failed')
        raise AssertionError(error)
    return result


def value(query, user='postgres'):
    return sql(query, user).stdout.strip()


def uid(n):
    return f'10000000-0000-4000-8000-{n:012x}'


A, B, L, LB = [uid(n) for n in range(1, 5)]
PROFILES = {}
KEYS = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import{generateKeyPairSync}from'node:crypto';console.log(JSON.stringify(Array.from({length:8},()=>generateKeyPairSync('ec',{namedCurve:'prime256v1'}).publicKey.export({format:'jwk'}))))"], text=True))


def data_state():
    tables = ['public.' + t for t in ['stock_models', 'stock_items', 'consists', 'consist_members',
              'layouts', 'layout_segments', 'layout_placements', 'loose_stock_placements',
              'layout_snapshots', 'operation_receipts']] + ['serien_capability.session_heads']
    query = 'SELECT jsonb_build_object(' + ','.join(
        quote(t) + ", (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]') FROM " + t + ' x)'
        for t in tables) + ');'
    observed = json.loads(value(query))
    digest = hashlib.sha256(json.dumps(observed, sort_keys=True).encode()).hexdigest()
    STATES[digest] = observed
    return digest


def authority_state():
    # Hash verifiers; never copy their values or any SQL credential to evidence.
    query = """SELECT jsonb_build_object(
      'jobs',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'workspace',workspace_id,
        'device',device_id,'role',role_name,'kind',kind,'state',state,'resume',resume_state,
        'epoch',target_epoch,'key',target_key_version,'workspaceEpoch',target_workspace_epoch,
        'consumed',consumed_at IS NOT NULL,'active',activated_at IS NOT NULL) ORDER BY id),'[]')
        FROM serien_capability.lifecycle_jobs),
      'devices',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'workspace',workspace_id,
        'scope',scope,'epoch',epoch,'key',key_version,'revoked',revoked_at IS NOT NULL) ORDER BY id),'[]')
        FROM serien_capability.devices),
      'bindings',(SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY role_name),'[]') FROM serien_capability.device_bindings b),
      'nonces',(SELECT count(*) FROM serien_capability.replay_nonces));"""
    result = json.loads(value(query))
    tables = ['workspaces','devices','worker_bindings','device_bindings','replay_nonces','nonce_windows',
              'invitations','recovery_verifiers','lifecycle_jobs','lifecycle_events','control_bindings','lifecycle_limits','nonce_limits']
    # Include exact key, expiry, verifier and job contents only in a server-computed digest.
    content = 'jsonb_build_object(' + ','.join(quote(t) + ", (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]') FROM serien_capability." + t + ' x)' for t in tables) + ')'
    result['allAuthorityRowsSHA256'] = value("SELECT encode(sha256(convert_to(" + content + "::text,'UTF8')),'hex');")
    return result


def check(label, action, expected='success', unchanged=True, authority_unchanged=False):
    before = data_state()
    auth_before = authority_state()
    result = action()
    if isinstance(result, subprocess.CompletedProcess):
        if expected == 'success':
            assert result.returncode == 0, (label, 'SQL failed')
        else:
            assert result.returncode != 0 and expected in result.stderr, (label, 'unexpected SQL outcome')
        observed = {'exitCode': result.returncode,
                    'sqlError': next((line for line in result.stderr.splitlines() if 'ERROR:' in line), None),
                    'stdoutBytes': len(result.stdout.encode()),
                    'stdoutSHA256': hashlib.sha256(result.stdout.encode()).hexdigest()}
        for line in result.stdout.splitlines():
            if line.startswith('{'):
                metadata = json.loads(line)
                if 'backendPid' in metadata:
                    observed['sqlActor'] = metadata
    else:
        assert expected == 'success'
        observed = result
    after = data_state()
    auth_after = authority_state()
    if unchanged:
        assert before == after, label + ': checkpoint/legacy mutation'
    if authority_unchanged:
        assert auth_before == auth_after, label + ': unauthorized authority mutation'
    ROWS.append(dict(test=label, expected=expected, observed=observed, initial=before, final=after,
                     authorityBefore=auth_before, authorityAfter=auth_after, result='PASS'))
    print(label + ': PASS', flush=True)
    (OUT / 'results.json').write_text(json.dumps(dict(tests=ROWS, states=STATES), indent=2) + '\n')
    return result


class SyntheticSecretAdapter:
    """Idempotent fake secret store, no external service. Values stay in memory only."""
    def __init__(self):
        self.entries = {}

    def prepare(self, job):
        if job not in self.entries:
            self.entries[job] = secrets.token_urlsafe(32)
        return self.entries[job]


SECRETS = SyntheticSecretAdapter()


def job(n, workspace=A, scope='editor', kind='PAIR', device=None, key=0, recovery_version=None):
    return dict(id=uid(1000 + n), device=device or uid(2000 + n), role=f'lc_{n}',
                workspace=workspace, scope=scope, kind=kind, key=KEYS[key],
                verifier=hashlib.sha256(secrets.token_bytes(32)).hexdigest(), recovery_version=recovery_version)


def provision_role(j):
    credential = SECRETS.prepare(j['id'])
    if value('SELECT EXISTS(SELECT FROM pg_roles WHERE rolname=' + quote(j['role']) + ');') == 't':
        sql('SELECT serien_capability.safe_device_role(' + quote(j['role']) + ',true);')
        return
    # Synthetic password is sent on stdin, never argv, stdout or evidence. Unix trust is LAB ONLY.
    sql('CREATE ROLE ' + j['role'] + ' NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB IN ROLE serien_tm_worker PASSWORD ' + quote(credential) + ';')


def prepare(j, user='control_a', **changes):
    j = {**j, **changes}
    rv = 'NULL' if j['recovery_version'] is None else str(j['recovery_version'])
    query = 'SELECT serien_capability.prepare_device_job(' + ','.join([
        quote(j['id']), quote(j['workspace']), quote(j['device']), quote(j['role']), quote(j['kind']),
        quote(json.dumps(j['key'])) + '::jsonb', quote(j['scope']), quote(j['verifier']), rv]) + ');'
    return sql(query, user, False)


def approve(j, user='control_a', key=None, scope=None):
    return sql(f"SELECT serien_capability.approve_device_job({quote(j['id'])},{quote(json.dumps(key or j['key']))}::jsonb,{quote(scope or j['scope'])});", user, False)


def redeem(j, user='redeemer_a', key=None, recovery=None):
    rv = 'NULL' if recovery is None else quote(recovery)
    return sql(f"SELECT serien_capability.redeem_device_job({quote(j['id'])},{quote(json.dumps(key or j['key']))}::jsonb,{quote(j['verifier'])},{rv});", user, False)


def complete(j, fault=False):
    # This is the isolated privileged operator, NOT the worker/broker identity.
    return sql('BEGIN; ALTER ROLE ' + j['role'] + ' LOGIN; SELECT serien_capability.complete_device_job(' +
               quote(j['id']) + ');' + ('SELECT 1/0;' if fault else '') + 'COMMIT;', ok=False)


def activate(j, control='control_a', redeemer='redeemer_a', recovery=None):
    provision_role(j)
    assert prepare(j, control).returncode == 0
    assert approve(j, control).returncode == 0
    assert redeem(j, redeemer, recovery=recovery).returncode == 0
    assert complete(j).returncode == 0


def context(j, nonce=None, operation='ReadHead', **changes):
    binding = json.loads(value(f"SELECT to_jsonb(b) FROM serien_capability.device_bindings b WHERE role_name={quote(j['role'])};"))
    c = dict(domain='SerieN-capability-v1', version=1, contextVersion='sql-claim-v1',
             audience='https://lab.invalid', workspaceId=j['workspace'], layoutId=L if j['workspace'] == A else LB,
             deviceId=j['device'], keyId=j['device'], epoch=binding['device_epoch'],
             keyVersion=binding['key_version'], workspaceEpoch=binding['workspace_epoch'],
             method='POST', operation=operation, nonce=nonce or secrets.token_hex(16),
             request_id=str(uuid.uuid4()), issuedAt=int(value("SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint;")),
             bodyDigest='a' * 64)
    c['path'] = f"/v1/workspaces/{c['workspaceId']}/layouts/{c['layoutId']}/{operation}"
    c.update(changes)
    return c


def claim(j, c):
    # New process; metadata statement then a standalone autocommit claim. No data operation here.
    return sql("SELECT jsonb_build_object('sessionUser',session_user,'backendPid',pg_backend_pid()); SELECT serien_capability.claim_nonce(" + quote(json.dumps(c)) + '::jsonb);', j['role'], False)


def save(j, revision, request=None, day=0, mutate=None):
    state = copy.deepcopy(PROFILES[j['workspace']])
    state['ui']['day'] = day
    if mutate:
        mutate(state)
    e = dict(operation='SaveCheckpoint', workspaceId=j['workspace'], layoutId=state['layoutId'],
             expectedRevision=str(revision), state=state, recoverySourceRevision=None)
    adapter = subprocess.run(['node', 'prototypes/train-management/transaction-core/envelope.js',
                             json.dumps(dict(workspaceId=e['workspaceId'], layoutId=e['layoutId']))],
                             input=json.dumps(e), text=True, capture_output=True, env=ENV)
    assert adapter.returncode == 0
    p = json.loads(adapter.stdout)
    return sql('SELECT serien_capability.save_checkpoint(' + ','.join([
        quote(request or str(uuid.uuid4())), quote(p['wire']), quote(p['digest'])]) + ');', j['role'], False)


def schema():
    result = docker(['exec', NAME, 'pg_dump', '-U', 'postgres', '--schema-only', '--no-owner'])
    assert result.returncode == 0
    return '\n'.join(line for line in result.stdout.splitlines() if not line.startswith(('\\restrict', '\\unrestrict')))


def privileges():
    query = """SELECT jsonb_build_object(
     'tables',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM information_schema.table_privileges x WHERE table_schema IN('public','serien_capability')),
     'columns',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM information_schema.column_privileges x WHERE table_schema IN('public','serien_capability')),
     'functions',(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',r.rolname,'definer',prosecdef,'config',proconfig,'acl',proacl::text)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=proowner WHERE n.nspname='serien_capability'),
     'schemas',(SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl::text)) FROM pg_namespace WHERE nspname IN('public','serien_capability')),
     'memberships',(SELECT jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),'admin',admin_option,'inherit',inherit_option,'set',set_option)) FROM pg_auth_members),
     'roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'super',rolsuper,'bypass',rolbypassrls,'createrole',rolcreaterole,'createdb',rolcreatedb,'login',rolcanlogin)) FROM pg_roles WHERE rolname LIKE 'serien_%' OR rolname LIKE 'lc_%' OR rolname LIKE 'control_%' OR rolname LIKE 'redeemer_%'),
     'defaultPrivileges',(SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]') FROM pg_default_acl d),
     'policies',(SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p WHERE schemaname IN('public','serien_capability')));"""
    result = json.loads(value(query))
    roles = "(SELECT rolname FROM pg_roles WHERE rolname LIKE 'serien_%' OR rolname LIKE 'lc_%' OR rolname LIKE 'control_%' OR rolname LIKE 'redeemer_%' OR rolname IN('anon','authenticated'))"
    result['effectiveTables'] = json.loads(value("SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'table',n.nspname||'.'||c.relname,'select',has_table_privilege(r.rolname,c.oid,'SELECT'),'insert',has_table_privilege(r.rolname,c.oid,'INSERT'),'update',has_table_privilege(r.rolname,c.oid,'UPDATE'),'delete',has_table_privilege(r.rolname,c.oid,'DELETE'),'columnSelect',has_any_column_privilege(r.rolname,c.oid,'SELECT'),'columnUpdate',has_any_column_privilege(r.rolname,c.oid,'UPDATE'))) FROM "+roles+" r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','serien_capability') AND c.relkind='r';"))
    result['effectiveFunctions'] = json.loads(value("SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'function',p.oid::regprocedure::text,'execute',has_function_privilege(r.rolname,p.oid,'EXECUTE'))) FROM "+roles+" r CROSS JOIN pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='serien_capability';"))
    result['effectiveSchemas'] = json.loads(value("SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'schema',n.nspname,'usage',has_schema_privilege(r.rolname,n.oid,'USAGE'),'create',has_schema_privilege(r.rolname,n.oid,'CREATE'))) FROM "+roles+" r CROSS JOIN pg_namespace n WHERE n.nspname IN('public','serien_capability');"))
    result['effectiveSequences'] = json.loads(value("SELECT coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'sequence',c.relname,'usage',has_sequence_privilege(r.rolname,c.oid,'USAGE'),'select',has_sequence_privilege(r.rolname,c.oid,'SELECT'),'update',has_sequence_privilege(r.rolname,c.oid,'UPDATE'))),'[]') FROM "+roles+" r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='serien_capability' AND c.relkind='S';"))
    return result


def setup():
    r = docker(['run', '-d', '--name', NAME, '--network', 'none', '--tmpfs', '/var/lib/postgresql/data:rw',
                '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', IMAGE, '-c', 'listen_addresses=',
                '-c', 'log_min_error_statement=panic', '-c', 'log_error_verbosity=terse'])
    assert r.returncode == 0, 'Unable to start isolated container'
    for _ in range(100):
        if 'PostgreSQL init process complete' in docker(['logs', NAME]).stdout and docker(['exec', NAME, 'pg_isready', '-U', 'postgres']).returncode == 0:
            break
        time.sleep(.2)
    assert 170000 <= int(value("SELECT current_setting('server_version_num');")) < 180000
    for p in [Path('tests/db/6A3/bootstrap.sql'), *sorted(Path('tests/db/6A3').glob('2026*.sql')),
              Path('tests/db/6A3/fixture.sql'), *sorted(Path('supabase/migrations').glob('20261104*.sql'))]:
        if p.resolve() != MIGRATION:
            sql(p.read_text())
    # Legacy remains nonempty and unchanged; new fixtures still use its approved synthetic owner.
    legacy = {table: json.loads(value(f"SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.{table} x;"))
              for table in value("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;").splitlines()}
    assert len(legacy) == 10 and all(legacy.values())
    (OUT / 'legacy-before.json').write_text(json.dumps(legacy, indent=2) + '\n')
    before_schema = schema()
    before_data = data_state()
    before_roles = value("SELECT jsonb_agg(rolname ORDER BY rolname) FROM pg_roles;")
    before_acl = privileges()
    failed = sql(MIGRATION.read_text().replace('COMMIT;', 'SELECT 1/0; COMMIT;'), ok=False)
    assert failed.returncode != 0 and 'division by zero' in failed.stderr
    assert schema() == before_schema
    assert data_state() == before_data
    assert value("SELECT jsonb_agg(rolname ORDER BY rolname) FROM pg_roles;") == before_roles
    sql(MIGRATION.read_text())
    sql(f"INSERT INTO serien_capability.workspaces(id) VALUES('{A}'),('{B}'); INSERT INTO serien_capability.workspace_locks(workspace_id) VALUES('{A}'),('{B}'); INSERT INTO serien_capability.api_limits(workspace_id) VALUES('{A}'),('{B}'); INSERT INTO serien_capability.lifecycle_limits(workspace_id) VALUES('{A}'),('{B}'); INSERT INTO serien_capability.nonce_limits(workspace_id,audience) VALUES('{A}','https://lab.invalid'),('{B}','https://lab.invalid');")
    for w, suffix in [(A, 'a'), (B, 'b')]:
        sql(f"CREATE ROLE control_{suffix} LOGIN IN ROLE serien_tm_control; CREATE ROLE redeemer_{suffix} LOGIN IN ROLE serien_tm_redeemer; INSERT INTO serien_capability.control_bindings VALUES('control_{suffix}','{w}',true,false,false,'owner'),('redeemer_{suffix}','{w}',false,true,false,'owner'),('postgres','{w}',true,true,true,'owner');")
    spec = importlib.util.spec_from_file_location('approved_profile', ROOT / 'tests/db/6A6/profile_fixture.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    base = json.loads(Path('docs/_active/train-management/evidence/6A1/schema-fixture.json').read_text())
    validator = Draft202012Validator(json.loads(Path('docs/_active/train-management/STATE_SCHEMA.json').read_text()), format_checker=FormatChecker())
    def state(w, l):
        s = copy.deepcopy(base)
        s.update(workspaceId=w, layoutId=l)
        return s
    module.install(sql, uid, state, validator, A, B, L, LB, quote)
    for w in [A, B]:
        PROFILES[w] = json.loads(value(f"SELECT template FROM serien_capability.candidate_profiles WHERE workspace_id='{w}';"))
    (OUT / 'privileges-before.json').write_text(json.dumps(before_acl, indent=2) + '\n')
    return legacy


def main():
    legacy = setup()
    check('21 migration fault rolls back schema roles and data', lambda: {'schemaRollback': True, 'rolesRollback': True})
    a, reader, b = job(1, scope='owner'), job(2, scope='reader', key=1), job(3, workspace=B, scope='owner', key=2)
    provision_role(a)
    check('01 registration PREPARED', lambda: prepare(a))
    check('15 NOLOGIN prepared principal cannot connect', lambda: sql('SELECT 1;', a['role'], False), 'not permitted to log in', authority_unchanged=True)
    check('10 approved key cannot be substituted', lambda: approve(a, key=KEYS[1]), 'FORBIDDEN', authority_unchanged=True)
    check('01 controlled operator approval', lambda: approve(a))
    check('10 redemption key mismatch', lambda: redeem(a, key=KEYS[1]), 'FORBIDDEN', authority_unchanged=True)
    check('01 bound ticket redemption ACTIVATING', lambda: redeem(a))
    check('15 principal not made LOGIN by control plane', lambda: sql('SELECT 1;', a['role'], False), 'not permitted to log in', authority_unchanged=True)
    check('14 failure after LOGIN before commit rolls back role and activation', lambda: complete(a, fault=True), 'division by zero', authority_unchanged=True)
    assert value(f"SELECT NOT rolcanlogin FROM pg_roles WHERE rolname={quote(a['role'])};") == 't'
    check('01 activation commits before LOGIN is usable', lambda: complete(a))
    check('13 lost activation response repeat returns same job', lambda: complete(a), authority_unchanged=True)
    check('13 prepare retry after active does not create principal/device', lambda: prepare(a), authority_unchanged=True)
    check('13 same job different key rejected', lambda: prepare(a, key=KEYS[1]), 'IDEMPOTENCY_KEY_REUSED', authority_unchanged=True)
    check('12 same invitation retry cannot create second grant', lambda: redeem(a), authority_unchanged=True)
    activate(reader)
    activate(b, 'control_b', 'redeemer_b')
    check('08 reader cannot write', lambda: save(reader, 0), 'FORBIDDEN', authority_unchanged=True)
    check('09 reader job cannot be approved as owner', lambda: approve(reader, scope='owner'), 'FORBIDDEN', authority_unchanged=True)
    escalation = job(70, kind='ROTATE', device=reader['device'], scope='owner', key=3)
    provision_role(escalation)
    check('09 rotation cannot elevate reader to owner', lambda: prepare(escalation), 'FORBIDDEN', authority_unchanged=True)
    limited = job(71, scope='owner')
    provision_role(limited)
    sql(f"CREATE ROLE control_limited LOGIN IN ROLE serien_tm_control; INSERT INTO serien_capability.control_bindings VALUES('control_limited','{A}',true,false,false,'editor');")
    check('09 operator scope ceiling cannot be exceeded', lambda: prepare(limited, 'control_limited'), 'FORBIDDEN', authority_unchanged=True)
    assert prepare(limited).returncode == 0
    check('09 limited operator cannot approve preexisting owner job', lambda: approve(limited, 'control_limited'), 'FORBIDDEN', authority_unchanged=True)
    check('09 limited operator cannot issue owner recovery verifier', lambda: sql(f"SELECT serien_capability.set_recovery_verifier('{A}',1,{quote('b'*64)},1);", 'control_limited', False), 'FORBIDDEN', authority_unchanged=True)
    check('09 limited operator cannot revoke owner', lambda: sql(f"SELECT serien_capability.revoke_device('{A}','{a['device']}');", 'control_limited', False), 'FORBIDDEN', authority_unchanged=True)
    assert approve(limited).returncode == 0
    sql(f"CREATE ROLE redeemer_limited LOGIN IN ROLE serien_tm_redeemer; CREATE ROLE provisioner_limited LOGIN IN ROLE serien_tm_provisioner; INSERT INTO serien_capability.control_bindings VALUES('redeemer_limited','{A}',false,true,false,'editor'),('provisioner_limited','{A}',false,false,true,'editor');")
    check('09 limited redeemer cannot redeem owner job', lambda: redeem(limited, 'redeemer_limited'), 'FORBIDDEN', authority_unchanged=True)
    assert redeem(limited).returncode == 0
    check('09 limited provisioner cannot activate owner job', lambda: sql(f"SELECT serien_capability.complete_device_job('{limited['id']}');", 'provisioner_limited', False), 'FORBIDDEN', authority_unchanged=True)
    check('17 control A cannot approve job B', lambda: approve(b), 'FORBIDDEN', authority_unchanged=True)
    check('17 data A cannot read B', lambda: sql(f"SELECT serien_capability.read_head('{B}','{LB}');", a['role'], False), 'FORBIDDEN', authority_unchanged=True)
    check('17 broker control A cannot retrieve job B', lambda: sql(f"SELECT serien_capability.read_device_job('{b['id']}');", 'redeemer_a', False), 'FORBIDDEN', authority_unchanged=True)
    c = context(a)
    check('02 first durable nonce claim', lambda: claim(a, c))
    check('04 replay after new psql process and connection', lambda: claim(a, c), 'REPLAY', authority_unchanged=True)
    check('05 malformed nonce', lambda: claim(a, context(a, nonce='XYZ')), 'INVALID_NONCE_CONTEXT', authority_unchanged=True)
    check('05 expired nonce proof', lambda: claim(a, context(a, issuedAt=c['issuedAt']-300000)), 'NONCE_EXPIRED', authority_unchanged=True)
    check('05 another device context', lambda: claim(a, context(a, deviceId=reader['device'])), 'FORBIDDEN', authority_unchanged=True)
    check('07 stale proof epoch', lambda: claim(a, context(a, epoch=9)), 'FORBIDDEN', authority_unchanged=True)
    check('07 stale proof key version', lambda: claim(a, context(a, keyVersion=9)), 'FORBIDDEN', authority_unchanged=True)
    check('07 stale workspace epoch', lambda: claim(a, context(a, workspaceEpoch=9)), 'FORBIDDEN', authority_unchanged=True)
    check('09 signatureVerified boolean cannot authorize', lambda: claim(a, {**context(a), 'signatureVerified': True}), 'INVALID_NONCE_CONTEXT', authority_unchanged=True)
    check('05 wrong audience', lambda: claim(a, context(a, audience='https://other.invalid')), 'INVALID_NONCE_CONTEXT', authority_unchanged=True)
    check('05 wrong path', lambda: claim(a, context(a, path='/other')), 'INVALID_NONCE_CONTEXT', authority_unchanged=True)
    check('05 wrong protocol domain', lambda: claim(a, context(a, domain='other')), 'INVALID_NONCE_CONTEXT', authority_unchanged=True)
    check('18 device cannot SET ROLE authorizer', lambda: sql('SET ROLE serien_tm_authorizer;', a['role'], False), 'permission denied', authority_unchanged=True)
    check('18 forged GUC does not select B', lambda: sql(f"SET app.workspace_id='{B}'; SELECT serien_capability.read_head('{B}','{LB}');", a['role'], False), 'FORBIDDEN', authority_unchanged=True)
    check('18 raw registry update denied', lambda: sql(f"UPDATE serien_capability.devices SET scope='owner' WHERE id='{reader['device']}';", reader['role'], False), 'permission denied', authority_unchanged=True)
    check('18 device cannot invoke control function', lambda: approve(a, user=reader['role']), 'permission denied', authority_unchanged=True)
    check('18 control cannot modify session head', lambda: sql(f"UPDATE serien_capability.session_heads SET revision=99 WHERE workspace_id='{A}';", 'control_a', False), 'permission denied', authority_unchanged=True)
    check('18 redeemer cannot approve', lambda: approve(a, user='redeemer_a'), 'permission denied', authority_unchanged=True)
    check('18 device cannot GRANT admin role', lambda: sql(f"GRANT serien_tm_authorizer TO {reader['role']};", reader['role'], False), 'permission denied', authority_unchanged=True)
    durable_nonce = context(a, operation='SaveCheckpoint')
    check('03 nonce committed before failing Save', lambda: claim(a, durable_nonce))
    check('03 failed CAS after nonce commit', lambda: save(a, 900), 'REVISION_CONFLICT', authority_unchanged=True)
    check('03 replay survives separate Save rollback', lambda: claim(a, durable_nonce), 'REPLAY', authority_unchanged=True)
    request = str(uuid.uuid4())
    first = check('22 Save with compact receipt', lambda: save(a, 0, request), unchanged=False)
    original = json.loads(first.stdout)
    assert original['revision'] == '1' and 'envelope' not in original
    check('22 newer Save', lambda: save(a, 1, day=1), unchanged=False)
    retry = check('22 retry after lost response and head advance', lambda: save(a, 0, request))
    assert json.loads(retry.stdout) == original
    check('22 reused id different digest', lambda: save(a, 0, request, day=1), 'IDEMPOTENCY_KEY_REUSED', authority_unchanged=True)
    check('22 invalid profile rolls back all components', lambda: save(a, 2, mutate=lambda s: s['time'].update(tickCount=99)), 'INVALID_STATE_PROFILE', authority_unchanged=True)
    check('22 historical recovery creates new revision', lambda: sql(f"SELECT serien_capability.recover_revision('{A}','{L}',2,1,{quote(str(uuid.uuid4()))});", a['role'], False), unchanged=False)
    concurrency(a)
    lifecycle_races_and_faults(a)
    quotas_and_cleanup(a, reader)
    revocation_and_rotation(a)
    recovery_case(a)
    rls_checks(b)
    # Compare by original identities instead of assuming any fixture layout ID.
    for table, initial in legacy.items():
        current = json.loads(value(f"SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM public.{table} x;"))
        assert all(row in current for row in initial), table
    check('23 all ten nonempty legacy tables preserved', lambda: {'tables': 10, 'unchanged': True})
    acl = privileges()
    (OUT / 'privileges-after.json').write_text(json.dumps(acl, indent=2) + '\n')
    public_denials()
    (OUT / 'environment.json').write_text(json.dumps(dict(image=IMAGE, postgres=value('SELECT version();'),
        network='none', storage='tmpfs', hostCredentialsUsed=False, productionQueries=0,
        broker='NOT IMPLEMENTED', ownerless='NOT IMPLEMENTED', secrets='synthetic memory-only adapter; no production distribution proof'), indent=2) + '\n')
    (OUT / 'summary.json').write_text(json.dumps(dict(result='PASS', tests=len(ROWS), states=len(STATES), legacyTables=10), indent=2) + '\n')


# Additional cases below deliberately use separate server connections/processes and SQL rendezvous.
def wait_for(query):
    deadline = time.monotonic() + 12
    while time.monotonic() < deadline:
        if value(query) == 't':
            return
        time.sleep(.03)
    raise AssertionError('SQL rendezvous timeout')


def concurrency(a):
    c = context(a)
    def race():
        with futures.ThreadPoolExecutor(max_workers=3) as pool:
            blocker = pool.submit(sql, f"BEGIN; SELECT 1 FROM serien_capability.workspace_locks WHERE workspace_id='{A}' FOR UPDATE; SELECT pg_sleep(2); COMMIT;")
            wait_for("SELECT EXISTS(SELECT FROM pg_stat_activity WHERE usename='postgres' AND wait_event='PgSleep');")
            one, two = pool.submit(claim, a, c), pool.submit(claim, a, c)
            wait_for(f"SELECT count(*)=2 FROM pg_stat_activity WHERE usename='{a['role']}' AND wait_event_type='Lock';")
            blocker.result()
            results = [one.result(), two.result()]
        assert sorted(r.returncode == 0 for r in results) == [False, True]
        assert any('REPLAY' in r.stderr for r in results)
        return {'simultaneousBlockedBackends': 2, 'committedClaims': 1, 'replaysDenied': 1}
    check('02 simultaneous real connections one claim', race)


def lifecycle_races_and_faults(a):
    for n, grant in [(60, 'extra'), (61, 'column')]:
        unsafe = job(n)
        provision_role(unsafe)
        if grant == 'extra':
            sql(f"CREATE ROLE unsafe_parent NOLOGIN; GRANT unsafe_parent TO {unsafe['role']};")
        else:
            sql(f"GRANT SELECT(payload) ON public.layout_snapshots TO {unsafe['role']};")
        check('18 reject unsafe principal '+grant, lambda: prepare(unsafe), 'UNSAFE_PRINCIPAL', authority_unchanged=True)
        if grant == 'extra':
            sql(f"REVOKE unsafe_parent FROM {unsafe['role']}; DROP ROLE unsafe_parent;")
        else:
            sql(f"REVOKE SELECT(payload) ON public.layout_snapshots FROM {unsafe['role']};")
    synthetic = job(62)
    def secret_fault():
        credential = SECRETS.prepare(synthetic['id'])
        try:
            raise RuntimeError('synthetic adapter crash after put')
        except RuntimeError:
            assert SECRETS.prepare(synthetic['id']) == credential
        assert value('SELECT NOT EXISTS(SELECT FROM pg_roles WHERE rolname='+quote(synthetic['role'])+');') == 't'
        return {'syntheticSecretObjects': 1, 'retrySameObject': True, 'principalCreated': False}
    check('14 secret adapter put before SQL fault is idempotent', secret_fault, authority_unchanged=True)
    provision_role(synthetic)
    provision_role(synthetic)
    check('14 role creation before job retry retains one NOLOGIN role', lambda: {'principalCount': int(value('SELECT count(*) FROM pg_roles WHERE rolname='+quote(synthetic['role'])+';'))}, authority_unchanged=True)
    expired = job(63)
    provision_role(expired)
    assert prepare(expired).returncode == 0
    sql(f"UPDATE serien_capability.lifecycle_jobs SET created_at=clock_timestamp()-interval '20 minutes',expires_at=clock_timestamp()-interval '1 second' WHERE id='{expired['id']}';")
    check('12 expired invitation cannot be approved', lambda: approve(expired), 'INVALID_TRANSITION', authority_unchanged=True)
    pending = job(10, key=3)
    provision_role(pending)
    assert prepare(pending).returncode == 0
    assert approve(pending).returncode == 0
    def race():
        with futures.ThreadPoolExecutor(max_workers=3) as pool:
            blocker = pool.submit(sql, f"BEGIN; SELECT 1 FROM serien_capability.workspace_locks WHERE workspace_id='{A}' FOR UPDATE; SELECT pg_sleep(2); COMMIT;")
            wait_for("SELECT EXISTS(SELECT FROM pg_stat_activity WHERE usename='postgres' AND wait_event='PgSleep');")
            one, two = pool.submit(redeem, pending), pool.submit(redeem, pending)
            wait_for("SELECT count(*)=2 FROM pg_stat_activity WHERE usename='redeemer_a' AND wait_event_type='Lock';")
            blocker.result()
            results = [one.result(), two.result()]
        assert all(r.returncode == 0 for r in results)
        assert results[0].stdout == results[1].stdout
        assert value(f"SELECT count(*) FROM serien_capability.devices WHERE id='{pending['device']}';") == '1'
        return {'simultaneousBlockedBackends': 2, 'devicesCreated': 1, 'sameJobRetry': True}
    check('11 concurrent identical pairing one grant', race)
    assert complete(pending).returncode == 0
    capped = job(12)
    provision_role(capped)
    assert prepare(capped).returncode == 0
    assert approve(capped).returncode == 0
    sql(f"UPDATE serien_capability.lifecycle_limits SET max_devices=(SELECT count(*) FROM serien_capability.devices WHERE workspace_id='{A}') WHERE workspace_id='{A}';")
    check('20 prepared jobs cannot overrun device quota at redemption', lambda: redeem(capped), 'LIFECYCLE_QUOTA', authority_unchanged=True)
    sql(f"UPDATE serien_capability.lifecycle_limits SET max_devices=64 WHERE workspace_id='{A}';")
    assert redeem(capped).returncode == 0
    assert complete(capped).returncode == 0
    reused = job(11)
    provision_role(reused)
    check('12 invitation verifier cannot be assigned to second job', lambda: prepare(reused, verifier=pending['verifier']), 'duplicate key', authority_unchanged=True)
    # Fixture-only injected trigger, never shipped in the migration.
    sql("""CREATE SCHEMA fault6a8; CREATE TABLE fault6a8.mode(target text);
      CREATE FUNCTION fault6a8.inject() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
      BEGIN IF EXISTS(SELECT FROM fault6a8.mode WHERE target=TG_TABLE_NAME) THEN RAISE EXCEPTION 'LAB_LIFECYCLE_FAULT'; END IF; RETURN NEW; END $$;
      REVOKE ALL ON SCHEMA fault6a8 FROM PUBLIC; REVOKE ALL ON FUNCTION fault6a8.inject() FROM PUBLIC;
      CREATE TRIGGER lab_fault AFTER INSERT OR UPDATE ON serien_capability.lifecycle_jobs FOR EACH ROW EXECUTE FUNCTION fault6a8.inject();
      CREATE TRIGGER lab_fault AFTER INSERT ON serien_capability.devices FOR EACH ROW EXECUTE FUNCTION fault6a8.inject();
      CREATE TRIGGER lab_fault AFTER INSERT ON serien_capability.worker_bindings FOR EACH ROW EXECUTE FUNCTION fault6a8.inject();
      CREATE TRIGGER lab_fault AFTER INSERT ON serien_capability.device_bindings FOR EACH ROW EXECUTE FUNCTION fault6a8.inject();
      CREATE TRIGGER lab_fault AFTER INSERT ON serien_capability.lifecycle_events FOR EACH ROW EXECUTE FUNCTION fault6a8.inject();""")
    for i, target in enumerate(['lifecycle_jobs','devices','worker_bindings','device_bindings','lifecycle_events']):
        j = job(20+i, key=4)
        provision_role(j)
        if target != 'lifecycle_jobs':
            assert prepare(j).returncode == 0
            assert approve(j).returncode == 0
        sql('INSERT INTO fault6a8.mode VALUES(' + quote(target) + ');')
        check('14 provisioning fault at '+target, lambda: prepare(j) if target == 'lifecycle_jobs' else redeem(j), 'LAB_LIFECYCLE_FAULT', authority_unchanged=True)
        assert value(f"SELECT NOT rolcanlogin FROM pg_roles WHERE rolname='{j['role']}';") == 't'
        sql('DELETE FROM fault6a8.mode;')
        if target == 'lifecycle_jobs':
            assert prepare(j).returncode == 0
            assert approve(j).returncode == 0
        assert redeem(j).returncode == 0
        assert complete(j).returncode == 0
    j = job(30, key=5)
    secret = SECRETS.prepare(j['id'])
    assert SECRETS.prepare(j['id']) == secret
    assert len([key for key in SECRETS.entries if key == j['id']]) == 1
    provision_role(j)
    assert prepare(j).returncode == 0
    check('14 durable RECOVERABLE fault state', lambda: sql(f"SELECT serien_capability.transition_failed_job('{j['id']}','fault');", ok=False))
    check('14 resume exact provisioning state', lambda: sql(f"SELECT serien_capability.transition_failed_job('{j['id']}','resume');", ok=False))
    assert approve(j).returncode == 0
    assert redeem(j).returncode == 0
    check('14 terminal FAILED never reactivated', lambda: sql(f"SELECT serien_capability.transition_failed_job('{j['id']}','fail');", ok=False))
    check('14 FAILED cannot resume', lambda: sql(f"SELECT serien_capability.transition_failed_job('{j['id']}','resume');", ok=False), 'INVALID_TRANSITION', authority_unchanged=True)
    check('14 FAILED cannot complete even after operator LOGIN', lambda: complete(j), 'INVALID_TRANSITION', authority_unchanged=True)
    # A raw administrative early LOGIN is not a grant: staged device is still revoked.
    sql(f"ALTER ROLE {j['role']} LOGIN;")
    check('15 early LOGIN still has zero data authority', lambda: sql(f"SELECT serien_capability.read_head('{A}','{L}');", j['role'], False), 'FORBIDDEN', authority_unchanged=True)
    sql(f"ALTER ROLE {j['role']} NOLOGIN;")


def quotas_and_cleanup(a, reader):
    sql(f"UPDATE serien_capability.nonce_limits SET device_live=1 WHERE workspace_id='{A}';")
    check('20 live nonce quota denies unbounded growth', lambda: claim(a, context(a)), 'NONCE_QUOTA', authority_unchanged=True)
    sql(f"UPDATE serien_capability.nonce_limits SET device_live=1000,workspace_live=1 WHERE workspace_id='{A}';")
    check('20 workspace nonce quota', lambda: claim(reader, context(reader)), 'NONCE_QUOTA', authority_unchanged=True)
    sql(f"UPDATE serien_capability.nonce_limits SET workspace_live=10000,device_rate=1 WHERE workspace_id='{A}';")
    check('20 claim rate quota', lambda: claim(a, context(a)), 'NONCE_RATE_LIMITED', authority_unchanged=True)
    sql(f"UPDATE serien_capability.nonce_limits SET device_rate=60 WHERE workspace_id='{A}';")
    old = context(reader)
    assert claim(reader, old).returncode == 0
    before = value(f"SELECT count(*) FROM serien_capability.replay_nonces WHERE device_id='{reader['device']}';")
    assert int(before) > 0
    # Admin changes expiry only for this synthetic expired row. Runtime cannot set expiry or clock.
    sql(f"UPDATE serien_capability.replay_nonces SET expires_at=clock_timestamp()-interval '1 second' WHERE device_id='{reader['device']}';")
    old['issuedAt'] -= 600000
    check('20 expired proof stays denied after retention cleanup horizon', lambda: claim(reader, old), 'NONCE_EXPIRED', authority_unchanged=True)
    live_before = value(f"SELECT count(*) FROM serien_capability.replay_nonces WHERE device_id='{a['device']}';")
    check('20 expired rows cleaned on a later successful claim', lambda: claim(reader, context(reader)))
    assert value(f"SELECT count(*) FROM serien_capability.replay_nonces WHERE device_id='{reader['device']}';") == '1'
    assert value(f"SELECT count(*) FROM serien_capability.replay_nonces WHERE device_id='{a['device']}';") == live_before
    check('20 device cannot delete live nonce', lambda: sql('DELETE FROM serien_capability.replay_nonces;', reader['role'], False), 'permission denied', authority_unchanged=True)
    check('20 device cannot change retention or limits', lambda: sql(f"UPDATE serien_capability.nonce_limits SET device_live=9999 WHERE workspace_id='{A}';", reader['role'], False), 'permission denied', authority_unchanged=True)


def revocation_and_rotation(a):
    victim = job(40, key=6)
    activate(victim)
    c = context(victim, operation='SaveCheckpoint')
    assert claim(victim, c).returncode == 0
    def open_session_revoke():
        with futures.ThreadPoolExecutor(max_workers=1) as pool:
            pending = pool.submit(sql, f"SELECT serien_capability.read_head('{A}','{L}'); SELECT pg_sleep(2); SELECT serien_capability.read_head('{A}','{L}');", victim['role'], False)
            wait_for(f"SELECT EXISTS(SELECT FROM pg_stat_activity WHERE usename='{victim['role']}' AND wait_event='PgSleep');")
            pid = int(value(f"SELECT pid FROM pg_stat_activity WHERE usename='{victim['role']}' AND wait_event='PgSleep';"))
            assert sql(f"SELECT serien_capability.revoke_device('{A}','{victim['device']}');", 'control_a', False).returncode == 0
            result = pending.result()
        assert result.returncode and 'FORBIDDEN' in result.stderr
        assert json.loads(result.stdout.splitlines()[0])['revision'] == '3'
        return {'sameBackendPid': pid, 'firstReadSucceeded': True, 'secondReadDeniedAfterRevokeCommit': True}
    check('16 revocation denies second read on already open session', open_session_revoke)
    check('06 revocation between claim and Save is authoritative', lambda: save(victim, 3), 'FORBIDDEN', authority_unchanged=True)
    check('16 revoked principal read on fresh connection', lambda: sql(f"SELECT serien_capability.read_head('{A}','{L}');", victim['role'], False), 'FORBIDDEN', authority_unchanged=True)
    rotated = job(41, kind='ROTATE', device=a['device'], scope='owner', key=7)
    activate(rotated)
    check('07 old epoch binding denied after rotation', lambda: sql(f"SELECT serien_capability.read_head('{A}','{L}');", a['role'], False), 'FORBIDDEN', authority_unchanged=True)
    check('07 new key version and epoch accepted', lambda: claim(rotated, context(rotated)))
    a.update(rotated)


def recovery_case(a):
    verifier = hashlib.sha256(secrets.token_bytes(32)).hexdigest()
    assert sql(f"SELECT serien_capability.set_recovery_verifier('{A}',1,{quote(verifier)},1);", 'control_a', False).returncode == 0
    check('17 recovery reservation FK cannot reference workspace B job', lambda: sql(f"UPDATE serien_capability.recovery_verifiers SET reserved_job='{uid(1003)}' WHERE workspace_id='{A}' AND version=1;", ok=False), 'foreign key constraint', authority_unchanged=True)
    recovered = job(50, kind='RECOVER', scope='owner', key=5, recovery_version=1)
    activate(recovered, recovery=verifier)
    check('12 confirmed recovery revokes preceding devices', lambda: sql(f"SELECT serien_capability.read_head('{A}','{L}');", a['role'], False), 'FORBIDDEN', authority_unchanged=True)
    check('12 new recovered device authorized', lambda: claim(recovered, context(recovered)))
    check('13 lost recovery response same job idempotent', lambda: redeem(recovered, recovery=verifier), authority_unchanged=True)
    reuse = job(51, kind='RECOVER', scope='owner', key=6, recovery_version=1)
    provision_role(reuse)
    assert prepare(reuse).returncode == 0
    assert approve(reuse).returncode == 0
    check('12 kit cannot be reused for another job', lambda: redeem(reuse, recovery=verifier), 'FORBIDDEN', authority_unchanged=True)
    check('12 consumed recovery version cannot be reissued', lambda: sql(f"SELECT serien_capability.set_recovery_verifier('{A}',1,{quote(verifier)},1);", 'control_a', False), 'IDEMPOTENCY_KEY_REUSED', authority_unchanged=True)


def public_denials():
    for role in ['anon', 'authenticated']:
        result = value("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='serien_capability' AND has_function_privilege(" + quote(role) + ",p.oid,'EXECUTE');")
        assert result == '0'
    check('19 zero private EXECUTE for anon authenticated', lambda: {'anonExecutable': 0, 'authenticatedExecutable': 0})
    for role in ['serien_tm_worker','serien_tm_control','serien_tm_redeemer','serien_tm_provisioner','serien_tm_executor','serien_tm_lifecycle_executor']:
        assert value("SELECT NOT(rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolcanlogin) FROM pg_roles WHERE rolname="+quote(role)+';') == 't'
        assert value("SELECT count(*)=0 FROM pg_class WHERE relowner="+quote(role)+'::regrole;') == 't'
    check('18 owners are NOLOGIN NOBYPASSRLS without table ownership', lambda: {'rolesChecked': 6})


def rls_checks(b):
    # Fixture-only executor probe isolates RLS from entrypoint authorization and ACL denials.
    sql(f"CREATE ROLE probe_rls LOGIN IN ROLE serien_tm_lifecycle_executor; INSERT INTO serien_capability.control_bindings VALUES('probe_rls','{A}',true,false,false,'owner');")
    def using():
        assert value(f"SELECT count(*) FROM serien_capability.devices WHERE workspace_id='{B}';", 'probe_rls') == '0'
        assert value(f"UPDATE serien_capability.devices SET scope='reader' WHERE id='{b['device']}' RETURNING id;", 'probe_rls') == ''
        return {'foreignRowsVisible': 0, 'foreignRowsUpdated': 0}
    check('17 RLS USING independently hides B', using, authority_unchanged=True)
    check('17 RLS WITH CHECK independently rejects foreign INSERT', lambda: sql(f"INSERT INTO serien_capability.devices(id,workspace_id,public_key,scope) VALUES('{uid(9999)}','{B}',{quote(json.dumps(KEYS[0]))}::jsonb,'owner');", 'probe_rls', False), 'row-level security', authority_unchanged=True)
    sql("DELETE FROM serien_capability.control_bindings WHERE role_name='probe_rls'; DROP ROLE probe_rls;")


if __name__ == '__main__':
    try:
        main()
    finally:
        docker(['rm', '-f', NAME])
