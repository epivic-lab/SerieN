# 6A.9 — broker laboratory

Run from the repository root with Node 24, Python/jsonschema, OpenSSL, Docker,
Chromium and a test-only Playwright installation:

```sh
npm ci --prefix prototypes/train-management/broker-lab --ignore-scripts --cache /workspace/work/6A9/npm-cache
PLAYWRIGHT_MODULE=/workspace/work/6A8/tools/node_modules/playwright \
SERIEN_DB_EVIDENCE=/workspace/work/6A9/results python3 tests/db/6A9/run.py
python3 tests/db/6A9/verify-invariants.py
```

The Playwright path is configurable; it is not a simulator dependency. The isolated
`pg@8.23.1` dependency and lockfile belong only to the broker. Root package files
and browser bundle remain unchanged. Docker and package download permissions are
needed by the **supervisor**, never by either data service.

`run.py` accepts no DSN or cloud project. It creates digest-pinned PostgreSQL 17
and Node 24 containers. PostgreSQL has tmpfs storage, an internal-only SQL network,
no published port, a generated two-day lab CA and a DNS:db server certificate.
The temporary trust bootstrap has no peers or published port; before starting
services the supervisor installs hostssl/SCRAM and rejects hostnossl. Only the
out-of-band operator uses local psql/DDL. Docker28 does not publish ports on an
internal bridge, so ingress uses a different ordinary bridge and publishes HTTP
only to 127.0.0.1. It has no route/membership on the SQL bridge.

Ingress UID10001:GID10009 serves only four explicit static paths and nine POST
routes. Broker UID10002:GID10009 listens on a mode660 Unix socket in a mode750
volume. Unauthorized UID10004 is tested. Both are read-only/cap-drop/no-new-privileges
containers with no Docker socket. Only broker mounts the mode700 private test
secret adapter. The supervisor prepares/approves NOLOGIN jobs and atomically
executes LOGIN plus complete_device_job; this is not an HTTP administrator API.

Every data proof is verified by the broker before a parameterized SQL claim under
its fixed device principal. The claim transaction COMMIT is acknowledged before
starting the data transaction. A data error discards its connection but never
rolls back a committed nonce. API COMMIT is acknowledged before HTTP success.
The database does not verify browser signatures and the trusted broker is D09=A.
The immutable APIs do not prevent a compromised broker calling them directly.

Initial pairing candidates cannot LOGIN and SQL claim_nonce accepts only the six
data operations. Lifecycle therefore combines the approved SQL job/ticket rules
with a separate exclusive, fsynced, shared-volume **lab lifecycle replay journal**.
Its filenames are hashes and entries expire after five minutes. It is not a RAM
fallback for data claims. Single-host volume durability, distributed filesystem
semantics, journal cleanup quota under concurrent load and disaster recovery are
not certified. Do not use it as a production nonce service.

The secret adapter is a private file replaced atomically by the supervisor;
passwords, ticket verifiers and recovery peppers are passed only through stdin or
private config, never argv, URLs, bundle or logs. Surviving a broker restart on the
same volume is not proof of recovery after losing that volume. Generated CA
private keys and runtime copies are removed in finally. The public CA is not a
secret. No production credentials are used.

The runner uses real Chromium contexts, reload-persistent non-exportable CryptoKeys,
HTTP aborts, process SIGKILL/restart, another broker, SCRAM/TLS failure probes,
PG backend kill and statement timeout, SQL lock rendezvous and default-sized
pool load. Time windows are administratively aged between batches to isolate pool
measurements from nonce/API rate limits; the idle eviction test actually waits
31 seconds. Fault hooks are private read-only files available only to the operator,
not routes. The test SQL triggers exist only in the disposable fixture.

`results.json` stores expected/observed outcomes and before/after SQL fingerprints,
deduplicated application and redacted authority states. `broker-audit.json` has
COMMIT milestones, real SQL PIDs and pool counters, not proofs or tokens. `metrics.json`
records actual HTTP latency/status/byte samples; it is not a hosting benchmark.
`cleanup.json` checks every created container/network/volume is absent after cleanup.
Failures are diagnostic attempts, never counted as gate passes.

The second broker is used only for replay and measured aggregate connections,
then removed before load. Global multi-instance budget coordination is NOT VERIFIED.
All tests use the unchanged closed synthetic profile and shared synthetic legacy
Auth owner. No general serializer, simulator restore or ownerless cutover is implied.
