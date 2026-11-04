"""Read-only source/scope/security audit. Writes only 6A.8 invariant evidence."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[3]
BASE = 'cec3a97042ddd1cbcacc7e50cb99a9f4b76c2afd'
ALLOWED = {'PROGRESS.md', 'docs/_active/train-management/STATUS.md'}
NEW = {'supabase/migrations/20261104231109_serien_capability_lifecycle.sql',
       'docs/_active/train-management/6A8_SQL_LIFECYCLE.md',
       'docs/_active/train-management/6A8_ACL_MATRIX.md'}
PREFIXES = ('tests/db/6A8/', 'docs/_active/train-management/evidence/6A8/')


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])


paths = git('ls-tree', '-r', '--name-only', BASE).decode().splitlines()
objects = subprocess.check_output(['git', '-C', str(ROOT), 'cat-file', '--batch'],
    input=('\n'.join(BASE + ':' + p for p in paths) + '\n').encode())
offset, unchanged = 0, 0
for p in paths:
    end = objects.index(b'\n', offset)
    size = int(objects[offset:end].split()[-1])
    content = objects[end+1:end+1+size]
    offset = end+size+2
    if p not in ALLOWED:
        assert (ROOT / p).read_bytes() == content, p
        unchanged += 1
changed = set(git('diff', '--name-only', BASE).decode().splitlines())
changed.update(line[3:] for line in git('status', '--porcelain=v1', '--untracked-files=all').decode().splitlines())
for p in changed:
    assert p in ALLOWED | NEW or p.startswith(PREFIXES), p
    assert (ROOT / p).suffix in {'.md','.py','.sql','.json','.txt'}, p
assert git('branch', '--show-current').decode().strip() == 'feature/train-management'
subprocess.run(['git', '-C', str(ROOT), 'merge-base', '--is-ancestor', BASE, 'HEAD'], check=True)
canonical = hashlib.sha256((ROOT / 'src/canonical-layout.json').read_bytes()).hexdigest()
bundle = hashlib.sha256((ROOT / 'dist/game.js').read_bytes()).hexdigest()
assert canonical == 'e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc'
assert bundle == '0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b'
scanned = 0
scan_paths = {ROOT / p for p in NEW}
for root in [ROOT / 'tests/db/6A8', ROOT / 'docs/_active/train-management/evidence/6A8']:
    scan_paths.update(p for p in root.rglob('*') if p.is_file() and p.suffix != '.pyc')
for p in sorted(scan_paths):
    text = p.read_text()
    assert not re.search(r'\b(?:sb_secret_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN (?:EC |RSA )?PRIVATE KEY-----)', text), p
    scanned += 1
for p in ['app.js','dist/game.js','package.json','package-lock.json']:
    text = (ROOT / p).read_text()
    assert 'claim_nonce' not in text and 'lifecycle_jobs' not in text, p
documents = list((ROOT / 'docs/_active/train-management').glob('6A8*.md'))
documents.extend([ROOT / 'docs/_active/train-management/evidence/6A8/REPORT.md',
                  ROOT / 'docs/_active/train-management/STATUS.md', ROOT / 'PROGRESS.md'])
links = 0
for p in documents:
    text = p.read_text()
    if p.name == 'PROGRESS.md':
        text = text.split('## Train Management — 6A.8 lifecycle/replay SQL isolato (2026-11-05)', 1)[1]
    for target in re.findall(r'\]\(([^)]+)\)', text):
        if not target.startswith(('https:', 'http:', '#')):
            assert (p.parent / target.split('#')[0]).exists(), (p, target)
            links += 1
subprocess.run(['git', '-C', str(ROOT), 'diff', '--check'], check=True)
result = dict(result='PASS', baseline=BASE, unchangedBaselineFiles=unchanged,
    canonicalSHA256=canonical, bundleSHA256=bundle, scannedFiles=scanned, localLinksChecked=links,
    priorContractsR0SQLAndEvidence='byte identical', simulatorUIAssetsAndDependencies='byte identical',
    newMigrations=1, newBrokerOrPool=False, ownerless=False, productionQueries=0,
    limitation='source and pattern scan, not a general security audit or a hosted proof')
out = ROOT / 'docs/_active/train-management/evidence/6A8/invariants.json'
out.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
