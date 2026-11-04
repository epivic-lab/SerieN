# 6A.8 isolated laboratory

From repository root:

```sh
SERIEN_DB_EVIDENCE=/workspace/work/6A8/results python3 tests/db/6A8/run.py
python3 tests/db/6A8/verify-invariants.py
```

Requires local Docker socket permission, Python/jsonschema and Node24. The runner creates only a digest-pinned PostgreSQL17 container with network none, no published ports and tmpfs, removed in finally. It accepts no external DSN, production keys or database credentials. SERIEN_DB_EVIDENCE selects a local evidence directory only.

`run.py` applies immutable baseline migrations6A.3–6A.5 and the new6A.8 proposal, installs the unchanged synthetic profile from6A.6 and exercises actual SQL LOGIN/session_user connections. The privileged fixture operator creates NOLOGIN roles and activates LOGIN with the final job commit. Synthetic passwords stay in a memory-only secret adapter and SQL stdin; evidence excludes them and recovery/invitation verifier values. The adapter is not a production secret store.

Results contain real SQL errors/return codes, process/backend identity for claims, initial/final application-state hashes, deduplicated application states and redacted authority observations with server-computed hashes over all authority rows. Concurrency cases observe both backend sessions waiting on the workspace lock. Every claim starts a fresh psql process, and its autocommit completes before a data call. The persistent-session revocation case performs reads before and after revocation on the same backend.

`fault6a8` triggers exist only inside the runner's disposable fixture, not in the migration. Failures cover job/event insert, device/worker/device binding, LOGIN/final commit and a synthetic secret-adapter exception. Quota/expiry tests age specific rows administratively; they do not claim real elapsed minutes or a distributed clock. Atomicity/CAS/HTTP/backend-kill regressions also use the existing6A.6 runner on the upgraded schema.

The SQL does not verify P-256 or create autonomous transactions. A future trusted broker must verify the original proof and commit claim separately before data. Existing6A.5 entrypoints remain compatible and do not enforce that sequencing against a malicious caller. The broker, bounded pool, real secrets, ownerless cutover, Supabase staging and production remain outside6A.8.

Full contract, effective privileges, security/fault report and evidence are under `docs/_active/train-management/6A8_SQL_LIFECYCLE.md`, `6A8_ACL_MATRIX.md` and `evidence/6A8/`.
