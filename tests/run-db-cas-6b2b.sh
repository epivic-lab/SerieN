#!/usr/bin/env bash
# 6B.2-B: disposable PostgreSQL 17 only. Never supply a production DB URL.
set -euo pipefail
if [[ -z "$DB_CONTAINER" ]]; then
  echo "ERROR: ephemeral PostgreSQL service ID is required" >&2
  exit 1
fi
pg() { docker exec -i "$DB_CONTAINER" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }

echo "6B.2-A synthetic security fixture (not production)"
pg < tests/db-security-6b2a.sql
echo "6B.2-B sequential/fault/idempotency checks (not production)"
pg < tests/db-cas-6b2b.sql

# The SQL script has COMMITTED. Simulate a response that was lost AFTER
# commit by reopening a fresh authenticated DB session with the same ID/text.
pg <<'SQL'
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $
DECLARE replay jsonb;
BEGIN
 replay:=public.serien_smoke_save_checkpoint(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '2','66666666-6666-4666-8666-666666666666',
  public.serien_smoke_state(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','lost response'));
 IF replay->>'revision'<>'3' THEN
   RAISE EXCEPTION 'Response-lost replay after real commit is incorrect';
 END IF;
END $;
RESET ROLE;
SQL
echo "PASS: same request recovered across committed DB sessions"

a_log="$(mktemp)"
b_log="$(mktemp)"
trap 'rm -f "$a_log" "$b_log"' EXIT

# Both transactions use distinct PostgreSQL sessions and the SAME old
# revision 3. Writer A acquires the advisory lock and holds it for 7 seconds
# after successful save, so B must actually wait and then see a CAS conflict.
echo "6B.2-B concurrent transactions: A writes R4; B must conflict"
pg >"$a_log" 2>&1 <<'SQL' &
SET ROLE authenticated;
SET "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
BEGIN;
SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0));
SELECT public.serien_smoke_save_checkpoint(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '3','aaaaaaaa-2222-4222-8222-222222222222',
  public.serien_smoke_state(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A concurrent winner'));
SELECT pg_catalog.pg_sleep(7);
COMMIT;
SQL
a_pid=$!

observed=0
for attempt in $(seq 1 90); do
  count="$(pg -c "SELECT count(*) FROM pg_catalog.pg_locks WHERE locktype='advisory' AND granted")"
  if [[ "$count" =~ ^[0-9]+$ ]] && (( count > 0 )); then
    observed=1
    break
  fi
  sleep 0.1
done
if (( observed != 1 )); then
  cat "$a_log"
  echo "ERROR: writer A advisory lock was never observed" >&2
  exit 1
fi

pg >"$b_log" 2>&1 <<'SQL' &
SET ROLE authenticated;
SET "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.serien_smoke_expect_error(
  'REVISION_CONFLICT',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '3','aaaaaaaa-3333-4333-8333-333333333333',
  public.serien_smoke_state(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','B concurrent loser'));
SELECT 'PASS CONCURRENT_CONFLICT';
SQL
b_pid=$!

waiter_observed=0
for attempt in $(seq 1 60); do
  count="$(pg -c "SELECT count(*) FROM pg_catalog.pg_locks WHERE locktype='advisory' AND NOT granted")"
  if [[ "$count" =~ ^[0-9]+$ ]] && (( count > 0 )); then
    waiter_observed=1
    break
  fi
  sleep 0.1
done
if (( waiter_observed != 1 )); then
  cat "$a_log" "$b_log"
  echo "ERROR: writer B was not observed waiting on A" >&2
  exit 1
fi

wait "$a_pid"
wait "$b_pid"
grep -q '"revision": "4"' "$a_log"
grep -q 'PASS CONCURRENT_CONFLICT' "$b_log"
echo "PASS: two distinct DB sessions contended on advisory lock; one R4 and one CAS conflict"

# Assertions under trusted test operator, not through application credentials.
pg <<'SQL'
DO $$
BEGIN
 IF (SELECT count(*) FROM public.layout_snapshots
    WHERE owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 4 OR
    (SELECT max(revision) FROM public.layout_snapshots
    WHERE owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 4 OR
    (SELECT count(*) FROM public.operation_receipts
    WHERE owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 3 OR
    (SELECT count(*) FROM public.layout_snapshots
    WHERE owner_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 2
 THEN RAISE EXCEPTION 'CAS concurrency caused missing/duplicate/cross-owner rows'; END IF;
END $$;
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $$
DECLARE replay jsonb;
BEGIN
 replay:=public.serien_smoke_save_checkpoint(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '3','aaaaaaaa-2222-4222-8222-222222222222',
  public.serien_smoke_state(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','A concurrent winner'));
 IF replay->>'revision'<>'4' THEN
   RAISE EXCEPTION 'Replay did not return original R4 receipt';
 END IF;
 PERFORM public.serien_smoke_expect_error(
   'IDEMPOTENCY_KEY_REUSED',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   '3','aaaaaaaa-2222-4222-8222-222222222222',
   public.serien_smoke_state(
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','different after concurrency'));
END $$;
RESET ROLE;
SELECT 'PASS: CAS, idempotency, fault recovery, and true contention in isolated PostgreSQL 17' AS result;
SQL
