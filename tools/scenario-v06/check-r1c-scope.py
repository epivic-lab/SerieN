"""Compare every baseline blob; never change or regenerate protected files."""
import hashlib
import json
from pathlib import Path
import subprocess

BASE = 'b8f4f3cb98a3c5f49aa8713a96d2c10b445fb67b'
ROOT = Path(__file__).resolve().parents[2]
allowed = {'PROGRESS.md', 'docs/_active/scenario-v06/STATUS.md'}
rows = subprocess.check_output(['git', 'ls-tree', '-r', '-z', BASE], cwd=ROOT).split(b'\0')
identical, changed, errors = [], [], []
for row in filter(None, rows):
    header, raw = row.split(b'\t', 1)
    mode, kind, expected = header.decode().split()
    name = raw.decode()
    data = (ROOT / name).read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
    if actual == expected:
        identical.append(name)
    elif name in allowed:
        changed.append(name)
    else:
        errors.append(name)
result = {'baseline': BASE, 'protectedIdentical': len([p for p in identical if p not in allowed]),
          'identicalTotal': len(identical), 'allowedChanged': changed, 'unexpectedChanged': errors,
          'status': 'PASS' if not errors else 'FAIL'}
print(json.dumps(result, indent=2))
assert not errors, errors
