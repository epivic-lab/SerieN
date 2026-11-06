"""Disposable PG17 container only; no network DSN, credentials or new grants.

Each request has its own backend. Administrative observations use the existing
container test owner, while EVERY application call uses authenticated + fake UID.
No exception helper hides unexpected success. No production use.
"""
import json
import os
from pathlib import Path
import re
import subprocess
import sys

container = os.environ.get('DB_CONTAINER', '')
if not container or not re.fullmatch(r'[a-zA-Z0-9_.-]+', container):
    raise SystemExit('Disposable DB_CONTAINER is required')
source = Path(sys.argv[1])
output = Path(sys.argv[2])
bundle = json.loads(source.read_text())
owner = bundle['base']['workspaceId']
assert owner == bundle['base']['layoutId'] == 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
cases = bundle['cases']
assert len(cases) == 26 and len({c['requestId'] for c in cases}) == 26


def db(sql, **variables):
    args = ['docker', 'exec', '-i', container, 'psql', '-X', '-qAt',
            '-v', 'ON_ERROR_STOP=1', '-U', 'supabase_admin', '-d', 'postgres']
    for key, value in variables.items():
        args += ['-v', f'{key}={value}']
    return subprocess.run(args, input=sql, text=True, capture_output=True)


auth = "SET ROLE authenticated;\nSET \"request.jwt.claim.sub\"='" + owner + "';\n"


def observe():
    # Read all rows, not just counts: detect mutations as well as additions.
    r = db("""SELECT jsonb_build_object(
      'snapshots',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY id),'[]'::jsonb) FROM public.layout_snapshots s),
      'receipts',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY owner_id,request_id),'[]'::jsonb) FROM public.operation_receipts r));
    """ + auth + f"SELECT public.serien_read_head('{owner}','{owner}');\n")
    assert r.returncode == 0, r.stderr
    rows = [json.loads(line) for line in r.stdout.splitlines() if line.strip()]
    assert len(rows) == 2
    return {'tables': rows[0], 'head': rows[1]}


results = []
try:
    baseline = observe()
    assert baseline['head']['revision'] == '1', 'Run after C and before concurrency'
    for case in cases:
        before = observe()
        assert before == baseline, 'Previous case changed the persistent baseline'
        state_text = json.dumps(case['document'], separators=(',', ':'))
        if 'sqlExactSuffixDelta' in case:
            # Transform with PG numeric and retain its exact JSON text. These
            # cases test only the SQL threshold, not a full R1-valid document.
            assert case['collection'] in ('trains', 'looseStock')
            assert case['sqlExactSuffixDelta'] in ('0.000001', '-0.000001')
            transformed = db("""SELECT jsonb_set(:'state'::jsonb,
              ARRAY[:'collection','0','journey','segments'],
              (SELECT jsonb_agg(CASE WHEN ord=1 THEN value ELSE value ||
                jsonb_build_object('start',(value->>'start')::numeric+:'delta'::numeric,
                                   'end',(value->>'end')::numeric+:'delta'::numeric)
                END ORDER BY ord)
               FROM jsonb_array_elements(:'state'::jsonb #>
                 ARRAY[:'collection','0','journey','segments']) WITH ORDINALITY AS s(value,ord)));
            """, state=state_text, collection=case['collection'], delta=case['sqlExactSuffixDelta'])
            assert transformed.returncode == 0, transformed.stderr
            state_text = transformed.stdout.strip()
        expected_document = json.loads(state_text)
        # Fresh request ID for EVERY case; SQL error ends that request process.
        call = f"SELECT public.serien_save_checkpoint('{owner}','{owner}','1',:'request',:'state');\n"
        accept = case['expected'] == 'ACCEPT'
        if accept:
            # Explicit harness transaction, save/read unchanged DTO, then rollback
            # to retain C/D's revision-1 precondition for subsequent regressions.
            sql = 'BEGIN;\n' + auth + call + f"SELECT public.serien_read_snapshot('{owner}','{owner}','2');\nROLLBACK;\n"
        else:
            sql = auth + call
        r = db(sql, request=case['requestId'], state=state_text)
        after = observe()  # New backend, after the request connection has ended.
        record = {'id': case['id'], 'requestId': case['requestId'], 'scope': case['scope'],
                  'expected': case['expected'], 'exit_code': r.returncode,
                  'stdout': r.stdout, 'stderr': r.stderr, 'before': before, 'after': after}
        results.append(record)
        assert after == before, f"{case['id']}: head/snapshot/receipt changed"
        if accept:
            assert r.returncode == 0, r.stderr
            rows = [json.loads(line) for line in r.stdout.splitlines() if line.strip()]
            assert len(rows) == 2 and rows[0]['revision'] == '2'
            assert rows[1]['state'] == expected_document, 'Persisted DTO changed'
        else:
            assert r.returncode != 0, 'Unexpected successful write'
            errors = re.findall(r'ERROR:\s+([^\n]+)', r.stderr)
            assert errors == [case['expected']], (case['id'], errors)
        record['result'] = 'PASS'
        print(case['id'], 'PASS', flush=True)
finally:
    output.write_text(json.dumps(results, indent=2) + '\n')
