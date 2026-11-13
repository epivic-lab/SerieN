"""Check every R1C blob and the complete candidate's new-file scope."""
import hashlib
import json
from pathlib import Path
import subprocess

BASE = 'b49320c6be4d9f149bb2c5473858c616925a5f6c'
ROOT = Path(__file__).resolve().parents[2]
allowed = {'PROGRESS.md', 'docs/_active/scenario-v06/STATUS.md'}
new_allowed = {
    'tests/v06-r2a.test.js',
    'docs/_active/scenario-v06/R2A_DYNAMIC_LOOP_REPORT.md',
    *('tools/scenario-v06/' + name for name in [
        'dynamic-lab.js', 'dynamic-oracle.js', 'dynamic-validation.js',
        'run-r2a.js', 'audit-r2a.js', 'check-r2a-scope.py']),
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
# Inspect tracked/index additions and untracked non-ignored files alike.
names = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT).decode().split('\0')
new_names = sorted(set(filter(None, names)) - baseline_names)
unexpected_new = [n for n in new_names if n not in new_allowed and not n.startswith('docs/_active/scenario-v06/evidence/R2A/')]
result = {'baseline': BASE, 'protectedIdentical': len([p for p in identical if p not in allowed]),
          'identicalTotal': len(identical), 'allowedChanged': changed, 'unexpectedChanged': errors,
          'newFiles': new_names, 'unexpectedNew': unexpected_new,
          'status': 'PASS' if not errors and not unexpected_new else 'FAIL'}
print(json.dumps(result, indent=2))
assert not errors and not unexpected_new, result
