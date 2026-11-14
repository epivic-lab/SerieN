#!/usr/bin/env python3
"""Validate the original V06 library without loading or enabling the scenario."""
import argparse
import hashlib
import json
from pathlib import Path
import struct

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2] / 'assets/scenario-v06')
parser.add_argument('--require-complete', action='store_true')
args = parser.parse_args()
lock = json.loads((args.root / 'asset-lock.json').read_text())
verified, missing, invalid = [], [], []
for entry in lock['files']:
    relative = Path(entry['path'])
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError('Invalid relative asset path')
    path = args.root / relative
    if not path.is_file():
        missing.append(entry['path'])
        continue
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        header = stream.read(12)
        digest.update(header)
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    size = path.stat().st_size
    valid = (len(header) == 12 and struct.unpack('<4sII', header) == (b'glTF', 2, size)
             and size == entry['bytes'] and digest.hexdigest() == entry['sha256'])
    result = {'file': entry['path'], 'bytes': size, 'sha256': digest.hexdigest()}
    (verified if valid else invalid).append(result)
required_missing = [name for name in missing if name != 'modules/technical_reference.glb']
print(json.dumps({'status': 'INVALID' if invalid else 'INCOMPLETE' if required_missing else 'COMPLETE',
                  'verified': verified, 'verifiedBytes': sum(v['bytes'] for v in verified),
                  'missingRequired': required_missing, 'missingOptional': [name for name in missing if name not in required_missing],
                  'invalid': invalid, 'runtimeAdmission': False}, indent=2))
raise SystemExit(1 if invalid else 2 if args.require_complete and required_missing else 0)
