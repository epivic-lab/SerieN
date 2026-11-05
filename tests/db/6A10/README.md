# 6A.10 — ownerless cutover laboratory

From repository root (Node24, Python/jsonschema, OpenSSL, Docker, Chromium and a
separate test-only Playwright installation):

```sh
npm ci --prefix prototypes/train-management/broker-lab --ignore-scripts --cache /workspace/work/6A10/npm-cache-driver
PLAYWRIGHT_MODULE=/workspace/work/6A8/tools/node_modules/playwright \
SERIEN_DB_EVIDENCE=/workspace/work/6A10/results python3 tests/db/6A10/run.py
python3 tests/db/6A10/verify-invariants.py
```

Run one Docker laboratory at a time on small/vfs disks. No external DSN is accepted.
Images are the same digest-pinned PostgreSQL17 and Node24 used by6A.9. Neither
broker nor ingress receives the Docker socket. The supervisor alone uses Docker,
local psql and DDL. PostgreSQL is unpublished/internal and TLS/SCRAM protected;
ingress has a separate HTTP bridge, loopback publication and another UID.
The actual `broker-lab` sources and `tests/db/6A9/integration.test.js` are reused
**without editing**. No simulator dependency is added.

`fixture.py` loads the approved baseline twice with distinct synthetic legacy owner
IDs, then all approved6A.3–6A.8 migrations and the unchanged6A.6 synthetic graph for
A/B. A/B each commit a real checkpoint before cutover. Ten application tables are
nonempty; two owners, compositions, members, loose stock, placements, four snapshots,
four receipts and two revision1 heads exist before any ownerless DDL.

`inventory.sql` captures defaults/NULL/generated flags, every constraint/index,
internal/external trigger, function body/definer/owner/search_path/ACL, RLS/policies,
default ACL and dependency edges. `backup.raw.json` preserves the exact tested pg_dump bytes/hash; `backup.sql` is
the readable equivalent with only its final empty line removed for Git whitespace
checks. The full synthetic dump is
restored and checked on a separate copy before removal. PostgreSQL generates new
internal RI/TOAST OIDs on restore and can represent owner-only ACL as NULL; semantic
comparison normalizes only those physical names and compares effective ACL, while
both raw inventories are retained. All application IDs and row JSON must match.

`sql_checks.py` exercises O01–O14: injects a real SQL failure after each of14logical
DDL sections and compares original catalog, roles and rows; applies the migration;
verifies provenance and retires Auth policies; disables the creator before first
write and checks reversibility conditions; deletes all Auth rows; creates C/D via
a verified non-administrative SQL operator and approved job. C/D start at head0
with no invented snapshot/receipt. SQL maintenance is non-superuser/non-owner/
NOBYPASSRLS with explicit fixture-only grants/policies. FK failures must be23503,
not ACL failures. Seven FK paths are exercised across all12ordered A/B/C/D pairs.
NULL/NULL is rejected in all eight owner-bearing tables; scope, identity, inventory,
railway, immutable archives, substep/deferred rollback and read-only containment
have direct SQL oracles and before/after states.

The separate `n10_compat` copy commits new A/B checkpoints with ownerNULL and reads
old snapshots with zero Auth; it is removed after recording the result. The
`n10_struct` copy isolates destructive-attempt/fault tests and confirmed ownerless
history from the primary C/D fixture, which stays at head0 until Chromium starts.
The restored precutover Auth copy is removed before the zero-Auth proof. At finish,
every live non-template test database is checked for zero Auth rows.

The supervisor writes approved `workspace_creation_jobs` outside the data plane;
the creator accepts only the job ID, not a browser-selected owner/workspace/profile.
The runtime HTTP origin is assigned by Docker; its nonce audience is configured
out of band before broker traffic starts. SQL operator logins in the fixture have
no TCP password and cannot authenticate on the TLS/SCRAM network; the broker has
only its separately generated device/redeemer credentials.

The primary C/D then run all50approved6A.9 real Chromium/HTTP/broker/SQL cases:
pairing, reads/history/receipt, Save/Recover, claim COMMIT before data COMMIT,
restart/second broker replay, CAS, lost HTTP response, revocation, rotation, timeout/
backend kill, quota and pool limits. These are distinct from rerunning the original
6A.9 legacy runner as regression. Profile remains closed synthetic train+loose,
not a serializer/hydrator or restore of the simulator.

Every SQL test records expected/observed results, actual errors and before/after
fingerprints with deduplicated states. Full manifests before/after DDL, clone tests
and browser execution retain synthetic payload/digest/receipt/timestamp evidence.
`zero-auth-proof.json` and `cleanup.json` are assertions, not placeholders. Private
keys, generated passwords/tickets/peppers and credential manifests are not evidence.
Backup/restore is only proven for this fixture; post-write recovery uses a tested
read-only containment, not an unverified destructive down or a hosted PITR promise.
