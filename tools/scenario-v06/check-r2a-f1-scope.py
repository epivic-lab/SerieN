"""Audit every approved R2A blob, and the complete set of candidate additions."""
import hashlib
import json
from pathlib import Path
import subprocess

BASE = '7bf4f1e04aef3ad0bc64ed8fb8fd82e3cbc43003'
ROOT = Path(__file__).resolve().parents[2]
allowed = {
    'PROGRESS.md', 'docs/_active/scenario-v06/STATUS.md',
    'src/next-switch.js', 'src/railway-guard.js', 'tests/route-performance.test.js',
}
new_allowed = {
    'tests/v06-r2a-f1.test.js',
    'docs/_active/scenario-v06/R2A_F1_SHARED_JUNCTION_REPORT.md',
    *('tools/scenario-v06/' + name for name in [
        'shared-junction-lab.js', 'shared-junction-validation.js',
        'audit-r2a-f1.js', 'check-r2a-f1-scope.py']),
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
unexpected_new = [n for n in new_names if n not in new_allowed and not n.startswith('docs/_active/scenario-v06/evidence/R2A-F1/')]
result = {'baseline': BASE, 'protectedIdentical': len([p for p in identical if p not in allowed]),
          'identicalTotal': len(identical), 'allowedChanged': changed, 'unexpectedChanged': errors,
          'newFiles': new_names, 'unexpectedNew': unexpected_new,
          'status': 'PASS' if not errors and not unexpected_new else 'FAIL'}
print(json.dumps(result, indent=2))
assert not errors and not unexpected_new, result
