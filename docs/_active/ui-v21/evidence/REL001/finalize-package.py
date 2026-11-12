"""Reprepare from the real workflow, including final docs, and measure a local tar.

Sizes use fixed-width decimal strings so recording them does not change the
measured documentation length. A second fresh preparation verifies the result.
"""
import json
import pathlib
import re
import shutil
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[5]
OUT = pathlib.Path(__file__).resolve().parent
SITE = ROOT / '_site'
REPORT = ROOT / 'docs/_active/ui-v21/REL001_REPORT.md'
ARCHIVE = ROOT / 'work/rel001-pages.tar'
ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
SIZE = OUT / 'artifact-size.json'
keys = ['siteFiles', 'siteBytes', 'docsFiles', 'docsBytes', 'uiBytes',
        'assetsBytes', 'distBytes', 'tarBytes']
if not SIZE.exists():
    SIZE.write_text(json.dumps({k: '000000000000' for k in keys}, indent=2) + '\n')
workflow = (ROOT / '.github/workflows/pages.yml').read_text()
block = workflow.split('      - name: Prepare site\n        run: |\n', 1)[1].split('      - name:', 1)[0]
block = '\n'.join(line[10:] for line in block.splitlines()) + '\n'


def prepare_and_measure():
    if SITE.exists():
        shutil.rmtree(SITE)
    subprocess.run(['bash', '-euo', 'pipefail', '-c', block], cwd=ROOT, check=True)
    files = [p for p in SITE.rglob('*') if p.is_file()]
    assert not any(p.is_symlink() for p in SITE.rglob('*'))
    docs = [p for p in (SITE / 'docs').rglob('*') if p.is_file()]
    # Every documentation file is included byte-identically, including REL001.
    source_docs = [p for p in (ROOT / 'docs').rglob('*') if p.is_file()]
    assert len(docs) == len(source_docs)
    for p in source_docs:
        assert p.read_bytes() == (SITE / p.relative_to(ROOT)).read_bytes(), p
    subprocess.run(['tar', '--format=gnu', '--dereference', '--hard-dereference',
                    '-cf', str(ARCHIVE), '-C', str(SITE), '.'], check=True)
    result = {'siteFiles': len(files), 'siteBytes': sum(p.stat().st_size for p in files),
              'docsFiles': len(docs), 'docsBytes': sum(p.stat().st_size for p in docs),
              'tarBytes': ARCHIVE.stat().st_size}
    for group in ['ui', 'assets', 'dist']:
        result[group + 'Bytes'] = sum(p.stat().st_size for p in (SITE / group).rglob('*') if p.is_file())
    assert result['siteBytes'] < 1024 ** 3
    assert result['tarBytes'] < 1024 ** 3
    return {k: f'{result[k]:012d}' for k in keys}


first = prepare_and_measure()
SIZE.write_text(json.dumps(first, indent=2) + '\n')
text = REPORT.read_text()
for key, value in first.items():
    text, n = re.subn(r'(?m)^' + key + r': [0-9]{12}$', key + ': ' + value, text)
    assert n == 1, (key, n)
REPORT.write_text(text)
second = prepare_and_measure()
assert first == second, (first, second)
assert (SITE / 'docs/_active/ui-v21/REL001_REPORT.md').read_bytes() == REPORT.read_bytes()
print('PASS final fresh package, all documentation byte-identical, local GNU tar below 1 GiB')
print(json.dumps(second, indent=2))
