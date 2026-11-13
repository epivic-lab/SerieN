"""Check every preexisting Git blob against the approved R02 checkpoint."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
BASELINE = '7118c99a9367da61f0042dfe40240fe78dc0d7c6'
ALLOWED = {'src/network.js', 'PROGRESS.md', 'docs/_active/scenario-v06/STATUS.md'}

def git(*args, **kwargs):
    return subprocess.check_output(['git', *args], cwd=ROOT, **kwargs)

entries = []
for row in git('ls-tree', '-r', BASELINE).decode().splitlines():
    metadata, name = row.split('\t', 1)
    entries.append((name, metadata.split()[2]))
actual = git('hash-object', '--stdin-paths', input=('\n'.join(name for name, _ in entries)+'\n').encode()).decode().splitlines()
changed = [name for (name, expected), observed in zip(entries, actual, strict=True) if expected != observed]
assert set(changed) <= ALLOWED, changed
protected = [(name, sha) for name, sha in entries if name not in ALLOWED]
result = dict(status='PASS', baseline=BASELINE, preexistingFiles=len(entries),
              protectedFiles=len(protected), protectedDifferences=[], allowedChangedFiles=changed,
              protectedManifestSha256=hashlib.sha256(json.dumps(protected, separators=(',', ':')).encode()).hexdigest())
print(json.dumps(result, indent=2))
