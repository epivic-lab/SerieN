#!/usr/bin/env bash
# 6B.2-D isolated allowlist-revocation race tests. NEVER production.
set -euo pipefail
if [[ -z "$DB_CONTAINER" ]]; then echo 'Missing disposable DB_CONTAINER' >&2; exit 1; fi
state="$(cat /tmp/serien_state.json)"
db() { docker exec -i "$DB_CONTAINER" psql -X -qAt -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }
a="$(mktemp)"; b="$(mktemp)"
trap 'rm -f "$a" "$b"' EXIT

# Scenario 1: authenticated save has acquired the allowlist/auth SHARE locks.
# A separate administrative DELETE must not commit before that save commits.
echo '6B.2-D: save first, revoke must wait'
db -v "state=$state" >"$a" 2>&1 <<'SQL' &
SET ROLE authenticated;
SET application_name='serien_save_holder';
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
BEGIN;
SELECT public.serien_save_checkpoint(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '2','dddddddd-1111-4111-8111-111111111111',:'state');
SELECT pg_catalog.pg_sleep(7);
COMMIT;
SQL
a_pid=$!
seen=0
for _ in $(seq 1 90); do
 x="$(db -c "SELECT count(*) FROM pg_catalog.pg_stat_activity WHERE application_name='serien_save_holder' AND wait_event='PgSleep'")"
 if [[ "$x" =~ ^[0-9]+$ ]] && ((x>0)); then seen=1;break; fi
 sleep 0.1
done
if ((seen==0));then cat "$a";echo 'Save never reached hold after R3' >&2;exit 1;fi
db >"$b" 2>&1 <<'SQL' &
SET application_name='serien_admin_revoke';
BEGIN;
DELETE FROM serien_access.allowed_emails WHERE email='a@example.invalid';
COMMIT;
SQL
b_pid=$!
blocked=0
for _ in $(seq 1 60); do
 x="$(db -c "SELECT count(*) FROM pg_catalog.pg_stat_activity WHERE application_name='serien_admin_revoke' AND wait_event_type='Lock'")"
 if [[ "$x" =~ ^[0-9]+$ ]] && ((x>0)); then blocked=1;break;fi
 sleep 0.1
done
if ((blocked==0));then cat "$a" "$b";echo 'Admin revoke did not wait for authorized save' >&2;exit 1;fi
wait "$a_pid"
wait "$b_pid"
grep -q '"revision": "3"' "$a"
echo 'PASS: save R3 committed while admin revoke waited on row locks'

# Revocation has committed. A fresh save and a fresh READ are forbidden.
db -v "state=$state" <<'SQL'
SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.serien_test_expect_error(
 'FORBIDDEN','save',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '3','dddddddd-2222-4222-8222-222222222222',:'state');
SELECT public.serien_test_expect_error(
 'FORBIDDEN','head',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','3',NULL,NULL);
RESET ROLE;
SQL

# Scenario 2: DELETE wins the row lock before a save starts. The save must
# WAIT, then reject the revoked principal; it may never insert an R4.
echo '6B.2-D: revoke first, save must wait and fail'
db <<'SQL'
INSERT INTO serien_access.allowed_emails(email) VALUES('a@example.invalid');
SQL
db >"$a" 2>&1 <<'SQL' &
SET application_name='serien_admin_revoke_holder';
BEGIN;
DELETE FROM serien_access.allowed_emails WHERE email='a@example.invalid';
SELECT pg_catalog.pg_sleep(7);
COMMIT;
SQL
a_pid=$!
seen=0
for _ in $(seq 1 90); do
 x="$(db -c "SELECT count(*) FROM pg_catalog.pg_stat_activity WHERE application_name='serien_admin_revoke_holder' AND wait_event='PgSleep'")"
 if [[ "$x" =~ ^[0-9]+$ ]] && ((x>0)); then seen=1;break; fi
 sleep 0.1
done
if ((seen==0));then cat "$a";echo 'Delete never reached hold' >&2;exit 1;fi
db -v "state=$state" >"$b" 2>&1 <<'SQL' &
SET ROLE authenticated;
SET application_name='serien_save_after_revoke';
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.serien_test_expect_error(
 'FORBIDDEN','save',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '3','dddddddd-3333-4333-8333-333333333333',:'state');
SELECT 'PASS: save rejected after admin commit';
SQL
b_pid=$!
blocked=0
for _ in $(seq 1 60); do
 x="$(db -c "SELECT count(*) FROM pg_catalog.pg_stat_activity WHERE application_name='serien_save_after_revoke' AND wait_event_type='Lock'")"
 if [[ "$x" =~ ^[0-9]+$ ]] && ((x>0)); then blocked=1;break;fi
 sleep 0.1
done
if ((blocked==0));then cat "$a" "$b";echo 'Save did not wait on pending revoke' >&2;exit 1;fi
wait "$a_pid"
wait "$b_pid"
grep -q 'PASS: save rejected after admin commit' "$b"
db <<'SQL'
DO $f$
BEGIN
 IF (SELECT count(*) FROM public.layout_snapshots
     WHERE owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>3 OR
    (SELECT count(*) FROM public.operation_receipts
     WHERE owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>3 OR
    (SELECT count(*) FROM serien_access.allowed_emails
     WHERE email='a@example.invalid')<>0
 THEN RAISE EXCEPTION 'Post-revocation write or allowlist race'; END IF;
END $f$;
SQL
echo 'PASS: both revocation races are linearizable, without a new administrative endpoint'
