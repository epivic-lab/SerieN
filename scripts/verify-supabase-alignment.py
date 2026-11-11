#!/usr/bin/env python3
"""Replay only in a new, private, network-none local Docker container.

No URL, remote target, existing container or credentials can be supplied.
The managed Docker socket is explicit; inherited endpoint/TLS selectors are
discarded only for Docker subprocesses. Production access is not implemented.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / 'tests/supabase-alignment'
DOCS = ROOT / 'docs/supabase/alignment'
spec = importlib.util.spec_from_file_location('alignment_compare', FIXTURES / 'compare.py')
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_files(manifest):
    migrations = sorted((ROOT / 'supabase/migrations').glob('*.sql'))
    expected_names = [m['file'] for m in manifest['migrations']]
    if [p.name for p in migrations] != expected_names:
        raise RuntimeError('Migration inventory differs from the three approved versions')
    for path, migration in zip(migrations, manifest['migrations']):
        if sha256(path) != migration['local_sha256']:
            raise RuntimeError('Migration checksum mismatch: ' + path.name)
    for relative, digest in manifest['pinned_files'].items():
        if sha256(ROOT / relative) != digest:
            raise RuntimeError('Evidence/tool input checksum mismatch: ' + relative)
    gate = migrations[-1].read_text()
    if comparison.sql_tokens(gate) != comparison.sql_tokens(manifest['remote_gate_sql']):
        raise RuntimeError('Email gate SQL tokens differ from the recorded remote history')
    if hashlib.sha256(manifest['remote_gate_sql'].encode()).hexdigest() != manifest['migrations'][-1]['remote_sha256']:
        raise RuntimeError('Recorded remote gate checksum mismatch')
    return migrations


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--check-files-only', action='store_true')
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((DOCS / 'manifest.json').read_text())
    migrations = verify_files(manifest)
    print('PASS: exact migration inventory, checksums, pinned evidence and gate SQL tokens', flush=True)
    if args.check_files_only:
        return
    docker_env = dict(os.environ)
    for key in ('DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'):
        docker_env.pop(key, None)
    docker = ['docker', '--host=unix:///var/run/docker.sock']

    def command(arguments, *, data=None, check=True):
        result = subprocess.run(docker + arguments, input=data, capture_output=True,
                                text=True, env=docker_env, timeout=180)
        if check and result.returncode:
            raise RuntimeError('Docker laboratory command failed: ' + result.stderr[-3000:])
        return result

    image = manifest['toolchain']['postgres_image']
    command(['info'])
    if command(['image','inspect',image], check=False).returncode:
        command(['pull',image])
    name = 'serien-s2-' + uuid.uuid4().hex
    created = False
    report = {'status':'FAIL','container_network':'none','ports_published':False,
              'image':image,'platform_scope':'synthetic Auth adapter + observed public default privileges',
              'migration_sha256':{p.name:sha256(p) for p in migrations}}
    try:
        command(['run','--detach','--name',name,'--network','none',
                 '--tmpfs','/var/lib/postgresql/data:rw,nosuid,size=384m',
                 '--tmpfs','/tmp:rw,nosuid,size=64m',
                 '-e','POSTGRES_HOST_AUTH_METHOD=trust',
                 '-e','POSTGRES_DB=postgres',image])
        created = True
        for _ in range(60):
            ready = command(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'], check=False)
            if ready.returncode == 0:
                break
            time.sleep(0.5)
        else:
            raise RuntimeError('Disposable PostgreSQL startup timeout')

        def sql(source):
            return command(['exec','-i',name,'psql','-X','-q','-A','-t',
                            '-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'], data=source).stdout.strip()

        version = sql('SELECT version();')
        report['server_version'] = version
        if sql('SHOW server_version_num;') != '170011':
            raise RuntimeError('Expected qualified PostgreSQL 17.11')
        info = json.loads(command(['inspect',name]).stdout)[0]
        if info['HostConfig']['NetworkMode'] != 'none' or info['HostConfig'].get('PortBindings'):
            raise RuntimeError('Laboratory isolation invariant violated')
        (out/'bootstrap.txt').write_text(sql((FIXTURES/'bootstrap.sql').read_text()))
        for migration in migrations:
            # Single transaction per original file, without editing its contents.
            sql('BEGIN;\n' + migration.read_text() + '\nCOMMIT;')
            print('PASS: replay ' + migration.name, flush=True)
        catalog_sql = (FIXTURES/'catalog.sql').read_text()

        def catalog():
            return json.loads(sql('BEGIN READ ONLY;\n' + catalog_sql + '\nCOMMIT;'))

        expected = json.loads((DOCS/'remote-catalog.json').read_text())['catalog']
        actual = catalog()
        (out/'replayed-catalog.json').write_text(json.dumps(actual, indent=2)+'\n')
        difference = comparison.compare(expected, actual)
        (out/'catalog.diff').write_text(difference)
        if difference:
            raise RuntimeError('Unexplained catalog differences; inspect catalog.diff')
        report['catalog_comparison'] = 'PASS'
        report['catalog_sections'] = {k:len(v or []) for k,v in actual.items()}
        print('PASS: all application catalog sections match remote-observed snapshot', flush=True)

        # Prove differences are not silently filtered out. All probes rollback.
        drift_probes = {
            'grant': 'GRANT SELECT ON public.layouts TO anon;',
            'column': 'ALTER TABLE public.layouts ADD COLUMN unexpected integer;',
            'function_security': 'ALTER FUNCTION serien_internal.touch_updated_at() SECURITY DEFINER;',
        }
        for label, statement in drift_probes.items():
            mutated = json.loads(sql('BEGIN;\n' + statement + '\n' + catalog_sql + '\nROLLBACK;'))
            if not comparison.compare(expected, mutated):
                raise RuntimeError('Comparator failed to detect temporary drift: ' + label)
        report['negative_drift_control'] = 'PASS'
        security = sql((FIXTURES/'security.sql').read_text())
        (out/'security.txt').write_text(security+'\n')
        print(security, flush=True)
        report['security_integrity_tests'] = 'PASS'
        deferred = command(['exec','-i',name,'psql','-X','-q','-A','-t',
                            '-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose',
                            '-U','postgres','-d','postgres'],
                           data=(FIXTURES/'deferred-commit.sql').read_text(),check=False)
        (out/'deferred-commit.txt').write_text(deferred.stdout+deferred.stderr)
        if deferred.returncode == 0 or 'REACHED_COMMIT' not in deferred.stdout or '23514' not in deferred.stderr:
            raise RuntimeError('Invalid ready consist did not fail at real COMMIT with SQLSTATE 23514')
        report['deferred_commit_rejection'] = 'PASS'
        after = catalog()
        if comparison.compare(expected, after):
            raise RuntimeError('Test transaction did not restore original catalog')
        nonempty = sql("SELECT count(*) FROM (SELECT 1 FROM public.layouts UNION ALL SELECT 1 FROM public.stock_models UNION ALL SELECT 1 FROM serien_access.allowed_emails UNION ALL SELECT 1 FROM auth.users) s;")
        if nonempty != '0':
            raise RuntimeError('Synthetic fixture cleanup failed')
        report['post_test_catalog_and_fixture_cleanup'] = 'PASS'
        report['status'] = 'PASS'
    finally:
        if created:
            cleanup = command(['rm','--force','--volumes',name], check=False)
            report['container_removed'] = cleanup.returncode == 0
            if cleanup.returncode:
                report['status'] = 'FAIL'
        (out/'result.json').write_text(json.dumps(report, indent=2)+'\n')
    print('PASS: disposable replay, comparison, negative control and security/integrity gates', flush=True)
    if report['status'] != 'PASS':
        raise RuntimeError('Laboratory cleanup failed')


if __name__ == '__main__':
    main()
