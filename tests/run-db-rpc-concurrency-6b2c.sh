#!/usr/bin/env bash
# SerieN 6B.2-C: REAL simultaneous transactions against candidate RPC.
# CI disposable Supabase PostgreSQL container ONLY. No remote DB endpoints.
set -euo pipefail
if [[ -z "$DB_CONTAINER" ]]; then
  echo 'Missing ephemeral DB_CONTAINER' >&2; exit 1
fi
state="$(cat /tmp/serien_state.json)"
db() { docker exec -i "$DB_CONTAINER" psql -X -qAt -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }
a_log="$(mktemp)"
b_log="$(mktemp)"
trap 'rm -f "$a_log" "$b_log"' EXIT
# Start two separate backend sessions at expected revision 1.
# A claims the exact UID lock and commits revision 2 after a deliberate hold.
db -v "state=$state" >"$a_log" 2>&1 <<'SQL' &
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
BEGIN;
SELECT pg_catalog.pg_advisory_xact_lock(
 pg_catalog.hashtextextended('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',0));
SELECT public.serien_save_checkpoint(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '1','22222222-2222-4222-8222-222222222222',:'state');
SELECT pg_catalog.pg_sleep(6);
COMMIT;
SQL
a_pid=$!
lock_seen=0
for _ in $(seq 1 90); do
 x="$(db -c "SELECT count(*) FROM pg_catalog.pg_locks WHERE locktype='advisory' AND granted")"
 if [[ "$x" =~ ^[0-9]+$ ]] && ((x>0)); then lock_seen=1;break;fi
 sleep 0.1
done
if ((lock_seen!=1)); then cat "$a_log";echo 'A lock not observed' >&2;exit 1;fi
db -v "state=$state" >"$b_log" 2>&1 <<'SQL' &
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.serien_test_expect_error(
 'REVISION_CONFLICT','save',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '1','33333333-3333-4333-8333-333333333333',:'state');
SELECT 'PASS: final RPC conflicting session rejected';
SQL
b_pid=$!
waiting=0
for _ in $(seq 1 60); do
 x="$(db -c "SELECT count(*) FROM pg_catalog.pg_locks WHERE locktype='advisory' AND NOT granted")"
 if [[ "$x" =~ ^[0-9]+$ ]] && ((x>0)); then waiting=1;break;fi
 sleep 0.1
done
if ((waiting!=1)); then cat "$a_log" "$b_log";echo 'B contention not observed' >&2;exit 1;fi
wait "$a_pid"
wait "$b_pid"
grep -q '"revision": "2"' "$a_log"
grep -q 'PASS: final RPC conflicting session rejected' "$b_log"
db <<'SQL'
DO $q$
BEGIN
 IF (SELECT count(*) FROM public.layout_snapshots
     WHERE owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>2 OR
    (SELECT count(*) FROM public.operation_receipts
     WHERE owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>2 OR
    (SELECT count(*) FROM public.layout_snapshots
     WHERE owner_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')<>1
 THEN RAISE EXCEPTION 'CAS invariant failure in final RPC'; END IF;
END $q$;
SQL
# New connection after COMMIT replays the winner's original request ID
# and recovers its existing revision 2, without adding another snapshot.
db -v "state=$state" <<'SQL'
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $q$
BEGIN
 IF public.serien_read_head(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->>'revision'<>'2'
 THEN RAISE EXCEPTION 'Head after contention != 2'; END IF;
END $q$;
-- psql variable substitution is unavailable inside dollar quoting.
SQL
rev="$(db -v "state=$state" <<'SQL'
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.serien_save_checkpoint(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '1','22222222-2222-4222-8222-222222222222',:'state')->>'revision';
SQL
)"
[[ "$rev" == *2* ]] || { echo "Replay returned wrong revision: $rev" >&2; exit 1; }
db <<'SQL'
DO $q$
BEGIN
 IF (SELECT count(*) FROM public.layout_snapshots
     WHERE owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>2 OR
    (SELECT count(*) FROM public.operation_receipts
     WHERE owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>2
 THEN RAISE EXCEPTION 'Replay created additional rows'; END IF;
END $q$;
SQL
echo 'PASS: 6B.2-C FINAL RPC — two real contending sessions, one R2, one conflict, retry after COMMIT'
