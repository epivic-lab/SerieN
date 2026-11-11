#!/usr/bin/env python3
"""Verify the pinned CLI executable using version/help commands only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--binary',type=Path,required=True)
parser.add_argument('--archive',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args = parser.parse_args()
settings = json.loads((ROOT/'docs/supabase/alignment/manifest.json').read_text())['toolchain']
if hashlib.sha256(args.archive.read_bytes()).hexdigest() != settings['cli_archive_sha256']:
    raise SystemExit('FAIL: CLI archive checksum mismatch')
args.output.mkdir(parents=True,exist_ok=True)
environment = dict(os.environ, SUPABASE_HOME=str(args.output.resolve()/'state'),
                   SUPABASE_TELEMETRY_DISABLED='1',SUPABASE_NO_UPDATE_NOTIFIER='1')
for key in list(environment):
    if key.startswith('SUPABASE_') and key not in {'SUPABASE_HOME','SUPABASE_TELEMETRY_DISABLED','SUPABASE_NO_UPDATE_NOTIFIER'}:
        environment.pop(key)
commands = {
 'version':['--version'],'root':['--help'],'db':['db','--help'],
 'migration':['migration','--help'],'query':['db','query','--help'],
 'list':['migration','list','--help'],'dump':['db','dump','--help'],
 'diff':['db','diff','--help'],'config-diff':['config','diff','--help'],
}
observations = {}
for name, arguments in commands.items():
    result = subprocess.run([str(args.binary.resolve()),*arguments],env=environment,
                            capture_output=True,text=True,timeout=30)
    if result.returncode:
        raise SystemExit('FAIL: CLI qualification command: '+name)
    text = result.stdout+result.stderr
    observations[name] = text
    (args.output/(name+'.txt')).write_text(text)
if observations['version'].strip() != settings['supabase_cli']:
    raise SystemExit('FAIL: unexpected CLI version')
for needle in ('--remote','--read-only','--file'):
    if needle not in observations['query']:
        raise SystemExit('FAIL: qualified query flag missing: '+needle)
for needle in ('Read-only','--remote','--exit-code'):
    if needle not in observations['config-diff']:
        raise SystemExit('FAIL: qualified config diff help missing: '+needle)
(args.output/'qualification.json').write_text(json.dumps({
 'status':'PASS','version':settings['supabase_cli'],
 'archive_sha256':settings['cli_archive_sha256'],
 'commands':commands,'scope':'version and help only; no database command executed'
},indent=2)+'\n')
print('PASS: Supabase CLI '+settings['supabase_cli']+' archive, version and nine version/help commands')
