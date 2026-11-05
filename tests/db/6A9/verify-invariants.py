"""Read-only scope/hash/secret scan; writes only new 6A.9 invariant evidence."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[3]
BASE = 'd6aa13001ae10d23b2b3c8c6e45e1dcf8f4e3764'
ALLOWED = {'PROGRESS.md', 'docs/_active/train-management/STATUS.md'}
NEW = {'docs/_active/train-management/6A9_BROKER_GATE.md',
       'docs/_active/train-management/6A9_SECURITY_BOUNDARIES.md'}
PREFIXES = ('tests/db/6A9/', 'prototypes/train-management/broker-lab/',
            'docs/_active/train-management/evidence/6A9/')


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
    assert (ROOT / p).suffix in {'.md', '.py', '.json', '.txt', '.js', '.html'}, p
assert git('branch', '--show-current').decode().strip() == 'feature/train-management'
subprocess.run(['git', '-C', str(ROOT), 'merge-base', '--is-ancestor', BASE, 'HEAD'], check=True)
canonical = hashlib.sha256((ROOT / 'src/canonical-layout.json').read_bytes()).hexdigest()
bundle = hashlib.sha256((ROOT / 'dist/game.js').read_bytes()).hexdigest()
assert canonical == 'e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc'
assert bundle == '0622836cefcdbab60e6a71012f5228664f6d3ecfca228d970b1ad68c12a37a0b'
scan_paths = {ROOT / p for p in ALLOWED | NEW}
for prefix in PREFIXES:
    scan_paths.update(p for p in (ROOT / prefix).rglob('*') if p.is_file()
                      and not {'node_modules', '__pycache__'}.intersection(p.parts))
pattern = r'\b(?:sb_secret_[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|-----BEGIN (?:EC |RSA )?PRIVATE KEY-----)'
for p in sorted(scan_paths):
    assert not re.search(pattern, p.read_text()), p
for p in ['app.js', 'dist/game.js', 'package.json', 'package-lock.json']:
    text = (ROOT / p).read_text()
    assert 'broker-lab' not in text and 'claim_nonce' not in text, p
broker = (ROOT / 'prototypes/train-management/broker-lab/broker.js').read_text()
transport = (ROOT / 'prototypes/train-management/broker-lab/transport.js').read_text()
pool = (ROOT / 'prototypes/train-management/broker-lab/pool.js').read_text()
ingress = (ROOT / 'prototypes/train-management/broker-lab/ingress.js').read_text()
assert not re.search(r'\b(?:spawn|execFile|child_process|docker|psql)\b', re.sub(r'//[^\n]*', '', broker+transport+pool), re.I)
assert not re.search(r'\bSET ROLE\b', re.sub(r'//[^\n]*', '', broker+transport+pool), re.I)
assert not re.search(r"(?:from\s+['\"]pg['\"]|/secrets|password|CREATE ROLE)", ingress)
lock = json.loads((ROOT / 'prototypes/train-management/broker-lab/package-lock.json').read_text())
assert lock['packages']['node_modules/pg']['version'] == '8.23.1'
links = 0
for p in [*(ROOT / 'docs/_active/train-management').glob('6A9*.md'),
          ROOT / 'docs/_active/train-management/STATUS.md', ROOT / 'PROGRESS.md']:
    text = p.read_text()
    if p.name == 'PROGRESS.md':
        text = text.split('## Train Management — 6A.9 ', 1)[1]
    for target in re.findall(r'\]\(([^)]+)\)', text):
        if not target.startswith(('https:', 'http:', '#')):
            destination = (p.parent / target.split('#')[0]).resolve()
            own_output = ROOT / 'docs/_active/train-management/evidence/6A9/invariants.json'
            assert destination.exists() or destination == own_output, (p, target)
            links += 1
subprocess.run(['git', '-C', str(ROOT), 'diff', '--check'], check=True)
result = dict(result='PASS', baseline=BASE, unchangedBaselineFiles=unchanged,
    canonicalSHA256=canonical, bundleSHA256=bundle, scannedFiles=len(scan_paths), localLinksChecked=links,
    priorContractsR0SQLAndEvidence='byte identical', simulatorUIAssetsAndDependencies='byte identical',
    newMigrations=0, productionQueries=0, ownerless=False,
    driver='isolated pg@8.23.1 with locked transitive dependencies',
    limitation='source/pattern and generated-value evidence scans; not a general security audit or hosting certification')
out = ROOT / 'docs/_active/train-management/evidence/6A9/invariants.json'
out.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
