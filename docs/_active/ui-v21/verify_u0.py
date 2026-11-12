"""Read-only U0 documentary checks; writes a report only with --output.
Not a runtime/browser test; deliberately isolated from tests/ and npm scripts.
Run from any cwd: python3 docs/_active/ui-v21/verify_u0.py [--output PATH]
"""
import argparse
import csv
import hashlib
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
BASELINE = '91722fbdf6671e69deebf645c3d8bf389212f421'
CHECKPOINT = 'af67ee5c65679b7e5fa384d76a0825dff022f27d'
checks = []

def check(name, passed, details=None):
    checks.append({'check': name, 'status': 'PASS' if passed else 'FAIL', 'details': details})

def read(name):
    return json.loads((HERE / name).read_text())

def git(*args):
    return subprocess.check_output(['git', *args], cwd=REPO)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    controls = read('CONTROLS.json')
    screens = read('SCREENS.json')['screens']
    gates = read('TEST_GATES.json')['gates']
    provenance = read('PROVENANCE.json')
    original = json.loads((REPO / controls['meta']['frozen_source']).read_text())
    rows = controls['controls']
    ids = [c['id'] for c in rows]
    expected = [f'CTRL-{i:03}' for i in range(1, 67)]
    check('66 unique contiguous controls and frozen source IDs', ids == expected == [c['id'] for c in original['controls']])
    screen_ids = [s['id'] for s in screens]
    check('31 unique screen IDs preserved', len(screen_ids) == len(set(screen_ids)) == 31 and screen_ids == [s['id'] for s in original['screens']])
    check('normalized branch/base/checkpoint', controls['meta']['branch'] == 'codex/ui-v2-integration' and controls['meta']['application_baseline'] == BASELINE and controls['meta']['readiness_checkpoint'] == CHECKPOINT and provenance['baseline'] == BASELINE)
    adapter_ids = set(re.findall(r'^\| (A\d{2}) /', (HERE / 'ADAPTERS.md').read_text(), re.M))
    check('13 unique documented adapters', adapter_ids == {f'A{i:02}' for i in range(1, 14)})
    gate_ids = [g['id'] for g in gates]
    check('U0 and nine future gates, unique', gate_ids == [f'G-U{i}' for i in range(10)])
    fields = ['id', 'name', 'authority', 'source_modules', 'source_anchors', 'current_dom', 'new_dom', 'effective_callback', 'state_read', 'state_modified', 'constraints', 'integration_phases', 'existing_tests', 'future_test_ids', 'acceptance', 'adapter_ids', 'implementation_status', 'design_mock_authority']
    invalid_fields = [(c['id'], k) for c in rows for k in fields if k not in c or c[k] in (None, '')]
    check('required control fields complete', not invalid_fields, invalid_fields)
    anchors = []
    for c in rows:
        for a in c['source_anchors']:
            path = REPO / a['file']
            if not path.is_file() or a['contains'] not in path.read_text():
                anchors.append({'id': c['id'], **a})
    check('actual source anchors exist (literal static check)', not anchors, anchors)
    paths = sorted({p for c in rows for p in c['source_modules'] + c['existing_tests']} | {p for g in gates for p in g['existing_tests']})
    missing = [p for p in paths if not (REPO / p).is_file()]
    check('source and historical test file paths exist', not missing, missing)
    unresolved = []
    for c in rows:
        if not set(c['adapter_ids']) <= adapter_ids or not set(c['future_test_ids']) <= set(gate_ids):
            unresolved.append(c['id'])
        if set(c['future_test_ids']) != {'G-' + p for p in c['integration_phases']}:
            unresolved.append(c['id'] + ':phase')
    for s in screens:
        if not set(s['control_ids']) <= set(ids) or not set(s['future_gate_ids']) <= set(gate_ids):
            unresolved.append(s['id'])
    for g in gates:
        if not set(g.get('control_ids', [])) <= set(ids) or not set(g.get('adapter_ids', [])) <= adapter_ids:
            unresolved.append(g['id'])
        expected_controls = set(ids) if g['phase'] == 'U9' else {c['id'] for c in rows if g['phase'] in c['integration_phases']}
        if g['phase'] != 'U0' and set(g['control_ids']) != expected_controls:
            unresolved.append(g['id'] + ':coverage')
    check('control-screen-adapter-test cross references and gate coverage', not unresolved, unresolved)
    check('every control appears in screen registry', set(ids) <= {i for s in screens for i in s['control_ids']})
    check('mock and future screens not presented as live DOM', all(not s['current_dom'] for s in screens if s['authority'] != 'REAL_BASELINE'))
    by_id = {c['id']: c for c in rows}
    check('event-only controls not fabricated as CSS', all(by_id[i]['current_dom']['kind'] == 'event' and not by_id[i]['current_dom']['css'] for i in ['CTRL-050', 'CTRL-051', 'CTRL-063']))
    check('logout/zoom/HUD/bell documentary corrections', 'addEventListener' in by_id['CTRL-002']['effective_callback'] and 'not exported' in by_id['CTRL-040']['effective_callback'] and 'read-only' in by_id['CTRL-052']['effective_callback'] and 'bell.setMuted' in by_id['CTRL-046']['effective_callback'])
    csv_rows = list(csv.DictReader((HERE / 'SOURCE_DOM_CALLBACK_TEST.csv').open()))
    csv_fail = []
    for c, v in zip(rows, csv_rows):
        if any(v[k] != c[field] for k, field in [('id','id'), ('callback','effective_callback'), ('read','state_read'), ('modified','state_modified'), ('v21_destination','new_dom'), ('status','implementation_status')]):
            csv_fail.append(c['id'])
        if (v['tests_existing'] != '; '.join(c['existing_tests']) or v['adapters'] != '; '.join(c['adapter_ids']) or v['phase'] != '/'.join(c['integration_phases']) or v['source'] != '; '.join(c['source_modules']) or v['existing_dom'] != '; '.join(c['current_dom']['css']) or v['constraints'] != '; '.join(c['constraints']) or v['test_gates_new'] != '; '.join(c['future_test_ids'])):
            csv_fail.append(c['id'] + ':references')
    check('66-row CSV crosswalk equals normalized registry', len(csv_rows) == 66 and not csv_fail, csv_fail)
    bad_hashes = []
    for v in provenance['versioned_evidence']:
        path = REPO / v['path']
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != v['sha256']:
            bad_hashes.append(v['path'])
    inventory = json.loads((REPO / 'docs/ui-v2-integration/evidence/final-package/file-inventory.json').read_text())
    indexed = {v['path']: v for v in inventory}
    for v in provenance['technical_sources']:
        expected_file = indexed.get(v['package_path'])
        if expected_file is None or (v['sha256'], v['size']) != (expected_file['sha256'], expected_file['size']):
            bad_hashes.append(v['package_path'])
    check('frozen provenance/evidence hashes unchanged', not bad_hashes, bad_hashes)
    check('Regia U0 mandate preserved', hashlib.sha256((HERE/'AUTHORIZATION_U0.md').read_bytes()).hexdigest() == provenance['authorization_sha256'])
    invariant_paths = ['app.js','index.html','style.css','src','assets','tests','scripts','supabase','.github','auth-gate.js','auth-gate-core.js','package.json','package-lock.json','AGENTS.md','.gitignore','.nojekyll']
    entries = git('ls-tree', '-rz', BASELINE, '--', *invariant_paths).split(b'\0')
    invariants = []
    for entry in entries:
        if not entry:
            continue
        info, raw_path = entry.split(b'\t', 1)
        mode, kind, blob = info.decode().split()
        path = raw_path.decode()
        f = REPO / path
        data = f.read_bytes() if f.is_file() else None
        actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() if data is not None else None
        invariants.append({'path':path,'baseline_git_blob':blob,'current_git_blob':actual,'sha256':hashlib.sha256(data).hexdigest() if data is not None else None,'status':'PASS' if actual == blob else 'FAIL'})
    check('application/runtime/assets/tests/scripts/config byte-identical to 91722fb', bool(invariants) and all(i['status']=='PASS' for i in invariants), {'files':len(invariants), 'failures':[i['path'] for i in invariants if i['status']!='PASS']})
    # Include untracked paths so a new runtime/test file cannot evade the byte comparison.
    changes = set(git('diff', '--name-only', CHECKPOINT).decode().splitlines()) | set(git('ls-files','--others','--exclude-standard').decode().splitlines())
    allowed = lambda p: p.startswith('docs/_active/ui-v21/') or p in ['PROGRESS.md','docs/ui-v2-integration/U0_REPORT.md','docs/ui-v2-integration/STATUS.md']
    forbidden = sorted(p for p in changes if not allowed(p))
    check('U0 work limited to explicit document/evidence paths including untracked files', not forbidden, forbidden)
    source_text = '\n'.join((REPO / p).read_text() for p in ['app.js'] + [str(p.relative_to(REPO)) for p in (REPO/'src').rglob('*.js')])
    check('reference JS absent from application imports/text', all(x not in source_text for x in ['tm-reference.js','tm-catalog.js','tm-shell-v21.js']))
    report = {'status':'PASS' if all(c['status']=='PASS' for c in checks) else 'FAIL','scope':'static U0 consistency and file invariance only; not browser/runtime/font verification','application_baseline':BASELINE,'readiness_checkpoint':CHECKPOINT,'controls':len(rows),'screens':len(screens),'checks':checks,'invariant_files':invariants}
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='invariant_files'},ensure_ascii=False,indent=2))
    return 0 if report['status']=='PASS' else 1

if __name__ == '__main__':
    raise SystemExit(main())
