"""Compare every baseline blob; only two minimal Node harness extensions are allowed; core/tests/R2A/F1 protected."""
import hashlib
import json
from pathlib import Path
import subprocess
BASE = 'ab9c9bacdba652209b2ffc14b7c70856645601ba'
ROOT = Path(__file__).resolve().parents[2]
allowed = {'PROGRESS.md', 'docs/_active/scenario-v06/STATUS.md', 'tools/scenario-v06/two-train-lab.js', 'tools/scenario-v06/two-train-validation.js'}
new_allowed = {
    'tests/v06-r2b2.test.js',
    'docs/_active/scenario-v06/R2B2_THREE_TRAIN_SAFETY_REPORT.md',
    *('tools/scenario-v06/' + name for name in [
        'three-train-validation.js', 'run-r2b2.js', 'audit-r2b2.js', 'check-r2b2-scope.py']),
}
rows = subprocess.check_output(['git', 'ls-tree', '-r', '-z', BASE], cwd=ROOT).split(b'\0')
identical, changed, errors, baseline_names = [], [], [], set()
for row in filter(None, rows):
    header, raw = row.split(b'\t', 1)
    name = raw.decode()
    baseline_names.add(name)
    expected = header.decode().split()[2]
    path = ROOT / name
    actual = None
    if path.is_file():
        data = path.read_bytes()
        actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    if actual == expected:
        identical.append(name)
    elif name in allowed:
        changed.append(name)
    else:
        errors.append(name)
names = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT).decode().split('\0')
new_names = sorted(set(filter(None, names)) - baseline_names)
unexpected_new = [n for n in new_names if n not in new_allowed and not n.startswith('docs/_active/scenario-v06/evidence/R2B2/')]
result = {'baseline': BASE, 'protectedIdentical': len([p for p in identical if p not in allowed]),
          'baselineBlobs': len(baseline_names), 'identicalTotal': len(identical),
          'allowedChanged': changed, 'unexpectedChanged': errors, 'newFiles': new_names,
          'unexpectedNew': unexpected_new, 'status': 'PASS' if not errors and not unexpected_new else 'FAIL'}
print(json.dumps(result, indent=2))
assert not errors and not unexpected_new, result
