"""Run only the real production build and Prepare site block; no publication."""
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[5]
EVIDENCE = pathlib.Path(__file__).resolve().parent
commands = []


def run(command, name):
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    (EVIDENCE / f'{name}.txt').write_text(result.stdout + result.stderr)
    commands.append({'command': command, 'exitCode': result.returncode,
                     'log': f'{name}.txt'})
    (EVIDENCE / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n')
    print(name, 'exit', result.returncode, flush=True)
    if result.returncode:
        raise SystemExit(result.returncode)
    return result.stdout


baseline = '50d7c744e4b9dbbe20197ec8f959fdccb16edb5b'
assert run(['git', 'branch', '--show-current'], 'branch').strip() == 'codex/ui-v2-integration'
head = run(['git', 'rev-parse', 'HEAD'], 'baseline-head').strip()
assert head == baseline or '--recheck' in sys.argv
if head != baseline:
    run(['git', 'merge-base', '--is-ancestor', baseline, head], 'u9-ancestor')
run(['git', 'ls-remote', 'origin', 'refs/heads/main',
     'refs/heads/codex/ui-v2-integration'], 'remote-baseline')
run(['git', 'merge-base', '--is-ancestor',
     '184cc9ba93a6b35493f365b2ffcb20ef0645963d', baseline], 'main-ancestor')
run(['git', 'diff', '--exit-code', baseline, '--', 'app.js', 'index.html',
     'style.css', 'auth-gate.js', 'auth-gate-core.js', 'src', 'ui', 'assets',
     'tests', 'scripts', 'package.json', 'package-lock.json'], 'protected-files')
run(['bash', '-c', 'node --version && npm --version && python3 --version && chromium --version'], 'versions')
run(['npm', 'run', 'build'], 'build')
bundle = ROOT / 'dist/game.js'
record = {'sha256': hashlib.sha256(bundle.read_bytes()).hexdigest(),
          'bytes': bundle.stat().st_size}
expected = json.loads((EVIDENCE.parent / 'U9/bundle.json').read_text())
assert all(record[k] == expected[k] for k in record), (record, expected)
record['identicalToU9'] = True
(EVIDENCE / 'bundle.json').write_text(json.dumps(record, indent=2) + '\n')
workflow = (ROOT / '.github/workflows/pages.yml').read_text()
previous = subprocess.check_output(['git', 'show', baseline + ':.github/workflows/pages.yml'], cwd=ROOT, text=True)
assert workflow == previous.replace('cp -R dist assets _site/', 'cp -R dist assets ui _site/')
run(['git', 'diff', '--', '.github/workflows/pages.yml'], 'workflow-diff')
block = workflow.split('      - name: Prepare site\n        run: |\n', 1)[1].split('      - name:', 1)[0]
block = '\n'.join(line[10:] for line in block.splitlines()) + '\n'
(EVIDENCE / 'prepare-site.sh').write_text(block)
# _site is exclusively the ignored generated output of this workflow.
if (ROOT / '_site').exists():
    shutil.rmtree(ROOT / '_site')
run(['bash', '-euo', 'pipefail', '-c', block], 'prepare-site')
