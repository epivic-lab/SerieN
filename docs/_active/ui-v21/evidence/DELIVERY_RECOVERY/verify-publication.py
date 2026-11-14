import concurrent.futures
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

root = Path('/workspace/SerieN')
out = Path('/workspace/work/delivery-recovery')
base = 'https://epivic-lab.github.io/SerieN/'
workflow = (root/'.github/workflows/pages.yml').read_text()
paths = ['index.html', 'style.css', 'auth-gate.js', 'auth-gate-core.js', 'legacy-v0.1.html', '.nojekyll']
for directory in ('dist', 'assets', 'ui'):
    paths.extend(str(p.relative_to(root)) for p in (root/directory).rglob('*') if p.is_file())
paths.extend(re.findall(r'^\s+(docs/\S+) \\\s*$', workflow, re.M))
assert len(paths) == len(set(paths)) == 97, len(paths)

def verify(path):
    expected = (root/path).read_bytes()
    with urlopen(base+path, timeout=45) as response:
        actual = response.read()
        return {'path': path, 'status': response.status, 'bytes': len(actual),
                'sha256': hashlib.sha256(actual).hexdigest(),
                'matchesCheckout': actual == expected}

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    checks = list(executor.map(verify, sorted(paths)))
invariants = json.loads((root/'docs/_active/ui-v21/evidence/HUD_CAMERA_HOTFIX/invariants.json').read_text())
protected = invariants['protectedFilesSHA256']
mismatch = [p for p, digest in protected.items() if hashlib.sha256((root/p).read_bytes()).hexdigest() != digest]
result = {'status': 'PASS' if all(x['status'] == 200 and x['matchesCheckout'] for x in checks) and not mismatch else 'FAIL',
          'checkedAtUTC': datetime.now(timezone.utc).isoformat(), 'base': base,
          'sourceCommit': 'f33377c3460ddf99bc5f5303f3fe0aa2a3da7fc1',
          'method': 'Read-only HTTP GET, exact file set from existing Pages workflow, byte comparison with verified source and fresh build',
          'fileCount': len(checks), 'totalBytes': sum(x['bytes'] for x in checks),
          'protectedFileCount': len(protected), 'protectedMismatches': mismatch,
          'files': checks}
(out/'publication.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k != 'files'}, indent=2))
assert result['status'] == 'PASS', result
