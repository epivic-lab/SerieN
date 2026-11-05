-- SerieN 6B.2-B — synthetic CAS/idempotency PROTOTYPE, not production SQL.
-- Run AFTER tests/db-security-6b2a.sql in the SAME disposable PostgreSQL 17 DB.
-- No Supabase endpoints, no user data, no production migration.
-- Deliberately partial DTO checks; full STATE_SCHEMA/catalog validation is NOT certified.

-- Disable the intentionally unsafe single-insert smoke RPC of 6B.2-A.
REVOKE EXECUTE ON FUNCTION public.serien_smoke_insert_snapshot(uuid) FROM authenticated;

CREATE FUNCTION public.serien_smoke_state(p_workspace uuid,p_layout uuid,p_note text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
SELECT pg_catalog.jsonb_build_object(
 'schemaVersion',1,
 'workspaceId',p_workspace::text,
 'layoutId',p_layout::text,
 'topologyHash',pg_catalog.repeat('a',64),
 'resumePolicy','STOPPED',
 'layout',pg_catalog.jsonb_build_object('switches',pg_catalog.jsonb_build_object(
  'WX-A',true,'WX-B',false,'Y-IN',true,'Y-2',false,
  'Y-3',true,'Y-R1',false,'Y-R2',true,'Y-4',false
 )),
 'note',p_note
)::text
$$;

-- TEST-ONLY RPC: implementation probe for one-user serial CAS and receipt replay.
-- p_test_fault is a fault-injection hook; it MUST NOT appear in production.
CREATE FUNCTION public.serien_smoke_save_checkpoint(
 p_workspace uuid,p_layout uuid,p_expected text,p_request uuid,
 p_state text,p_test_fault text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_topology text;
  v_state jsonb;
  v_head bigint;
  v_expected bigint;
  v_digest text;
  v_receipt public.operation_receipts%ROWTYPE;
  v_id uuid;
  v_result jsonb;
  v_switches jsonb;
  v_key text;
  v_count integer;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='P0001';
  END IF;
  IF p_workspace IS DISTINCT FROM v_owner OR p_layout IS NULL OR p_request IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001';
  END IF;

  -- Lock by authenticated user, not by request ID or untrusted layout.
  -- Serializes same-user requests even across different layouts.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text,0)
  );

  -- Authorization checked again while holding lock. Admin revocations would need
  -- this SAME lock protocol: revocation race remains a separate gate.
  IF NOT public.serien_access_allowed() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001';
  END IF;
  SELECT l.topology_hash INTO v_topology
  FROM public.layouts l
  WHERE l.id=p_layout AND l.owner_id=v_owner;
  IF v_topology IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001';
  END IF;

  -- Canonical decimal int64, no leading zero and no overflow.
  IF p_expected IS NULL OR length(p_expected)>19 OR
     p_expected !~ '^(0|[1-9][0-9]*)$' OR
     (length(p_expected)=19 AND p_expected>'9223372036854775807')
  THEN RAISE EXCEPTION 'INVALID_REVISION' USING ERRCODE='P0001'; END IF;
  v_expected := p_expected::bigint;

  -- BEFORE converting to jsonb: byte limit and duplicate-key rejection.
  IF p_state IS NULL OR pg_catalog.octet_length(p_state)>2097152
  THEN RAISE EXCEPTION 'PAYLOAD_TOO_LARGE' USING ERRCODE='P0001'; END IF;
  IF NOT (p_state IS JSON OBJECT WITH UNIQUE KEYS)
  THEN RAISE EXCEPTION 'INVALID_JSON' USING ERRCODE='P0001'; END IF;
  v_state:=p_state::jsonb;

  IF v_state->>'workspaceId' IS DISTINCT FROM v_owner::text OR
     v_state->>'layoutId' IS DISTINCT FROM p_layout::text OR
     v_state->>'topologyHash' IS DISTINCT FROM v_topology OR
     v_state->>'resumePolicy' IS DISTINCT FROM 'STOPPED' OR
     v_state->'schemaVersion' IS DISTINCT FROM '1'::jsonb
  THEN RAISE EXCEPTION 'INVALID_CONTEXT' USING ERRCODE='P0001'; END IF;

  v_switches:=v_state#>'{layout,switches}';
  IF pg_catalog.jsonb_typeof(v_switches) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'INVALID_SWITCHES' USING ERRCODE='P0001'; END IF;
  SELECT count(*) INTO v_count FROM pg_catalog.jsonb_object_keys(v_switches);
  IF v_count<>8 THEN RAISE EXCEPTION 'INVALID_SWITCHES' USING ERRCODE='P0001'; END IF;
  FOREACH v_key IN ARRAY ARRAY['WX-A','WX-B','Y-IN','Y-2','Y-3','Y-R1','Y-R2','Y-4']
  LOOP
    IF pg_catalog.jsonb_typeof(v_switches->v_key) IS DISTINCT FROM 'boolean'
    THEN RAISE EXCEPTION 'INVALID_SWITCHES' USING ERRCODE='P0001'; END IF;
  END LOOP;

  -- Digest of a structured envelope that includes the *exact* input text.
  -- Versioned and byte-sensitive; NOT JCS / RFC8785.
  v_digest:=pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(pg_catalog.jsonb_build_array(
      'serien-smoke-save-v1',v_owner::text,p_workspace::text,
      p_layout::text,p_expected,p_state
    )::text,'UTF8')),'hex');

  -- Deduplication MUST happen before reading head or comparing CAS.
  SELECT * INTO v_receipt FROM public.operation_receipts
  WHERE owner_id=v_owner AND request_id=p_request;
  IF FOUND THEN
    IF v_receipt.payload_digest<>v_digest THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE='P0001';
    END IF;
    RETURN v_receipt.result;
  END IF;

  SELECT coalesce(pg_catalog.max(s.revision),0) INTO v_head
  FROM public.layout_snapshots s
  WHERE s.layout_id=p_layout AND s.owner_id=v_owner;
  IF v_head<>v_expected THEN
    RAISE EXCEPTION 'REVISION_CONFLICT' USING ERRCODE='P0001';
  END IF;
  IF v_head=9223372036854775807 THEN
    RAISE EXCEPTION 'REVISION_OVERFLOW' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.layout_snapshots(owner_id,layout_id,revision,payload)
  VALUES(v_owner,p_layout,v_head+1,v_state)
  RETURNING id INTO v_id;

  IF p_test_fault='after_snapshot' THEN
    RAISE EXCEPTION 'TEST_FAULT_AFTER_SNAPSHOT' USING ERRCODE='P0001';
  END IF;

  v_result:=pg_catalog.jsonb_build_object(
    'revision',(v_head+1)::text,
    'snapshotId',v_id::text,
    'requestId',p_request::text,
    'digest',v_digest,
    'committedAt',pg_catalog.clock_timestamp()
  );
  INSERT INTO public.operation_receipts(owner_id,request_id,payload_digest,result)
  VALUES(v_owner,p_request,v_digest,v_result);

  IF p_test_fault='after_receipt' THEN
    RAISE EXCEPTION 'TEST_FAULT_AFTER_RECEIPT' USING ERRCODE='P0001';
  END IF;

  RETURN v_result;
END;
$$;

ALTER FUNCTION public.serien_smoke_save_checkpoint(uuid,uuid,text,uuid,text,text)
  OWNER TO serien_rpc;
REVOKE ALL ON FUNCTION public.serien_smoke_save_checkpoint(uuid,uuid,text,uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.serien_smoke_save_checkpoint(uuid,uuid,text,uuid,text,text)
  TO authenticated;

-- A failure-check helper; only used inside the isolated database.
CREATE FUNCTION public.serien_smoke_expect_error(
 p_error text,p_workspace uuid,p_layout uuid,p_expected text,
 p_request uuid,p_state text,p_fault text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE got text;
BEGIN
  BEGIN
    PERFORM public.serien_smoke_save_checkpoint(
      p_workspace,p_layout,p_expected,p_request,p_state,p_fault);
    RAISE EXCEPTION 'UNEXPECTED_SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS got = MESSAGE_TEXT;
    IF got IS DISTINCT FROM p_error THEN
      RAISE EXCEPTION 'Expected [%], got [%]',p_error,got;
    END IF;
  END;
END;
$$;

-- Negative privilege surface: only named RPC, no table writes, no test bypass RPC.
DO $$
BEGIN
 IF has_function_privilege('anon',
      'public.serien_smoke_save_checkpoint(uuid,uuid,text,uuid,text,text)','EXECUTE') OR
    has_function_privilege('authenticated',
      'public.serien_smoke_insert_snapshot(uuid)','EXECUTE') OR
    has_table_privilege('authenticated','public.layout_snapshots','INSERT') OR
    has_table_privilege('authenticated','public.operation_receipts','INSERT') OR
    has_table_privilege('serien_rpc','public.layout_snapshots','UPDATE') OR
    has_table_privilege('serien_rpc','public.operation_receipts','DELETE')
 THEN RAISE EXCEPTION 'CAS bypass privilege detected'; END IF;
END $$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

-- Both layouts start with revision 1 (inserted by 6B.2-A smoke).
DO $$
DECLARE
 w uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 req uuid:='11111111-1111-4111-8111-111111111111';
 s text;
 first_result jsonb;
 second_result jsonb;
BEGIN
 s:=public.serien_smoke_state(w,w,'initial');
 first_result:=public.serien_smoke_save_checkpoint(w,w,'1',req,s);
 IF first_result->>'revision'<>'2' THEN
   RAISE EXCEPTION 'Wrong revision after initial CAS save';
 END IF;
 second_result:=public.serien_smoke_save_checkpoint(w,w,'1',req,s);
 IF first_result IS DISTINCT FROM second_result THEN
   RAISE EXCEPTION 'Replay result drifted';
 END IF;
 PERFORM public.serien_smoke_expect_error(
   'IDEMPOTENCY_KEY_REUSED',w,w,'1',req,
   public.serien_smoke_state(w,w,'different text'));
 PERFORM public.serien_smoke_expect_error(
   'REVISION_CONFLICT',w,w,'1',
   '22222222-2222-4222-8222-222222222222',s);
 PERFORM public.serien_smoke_expect_error(
   'INVALID_REVISION',w,w,'01',
   '33333333-3333-4333-8333-333333333333',s);
 PERFORM public.serien_smoke_expect_error(
   'INVALID_REVISION',w,w,'9223372036854775808',
   '33333333-3333-4333-8333-333333333333',s);
 PERFORM public.serien_smoke_expect_error(
   'INVALID_JSON',w,w,'2',
   '33333333-3333-4333-8333-333333333333',
   '{"a":{"x":1,"x":2}}');
 PERFORM public.serien_smoke_expect_error(
   'PAYLOAD_TOO_LARGE',w,w,'2',
   '33333333-3333-4333-8333-333333333333',repeat('x',2097153));
 PERFORM public.serien_smoke_expect_error(
   'INVALID_CONTEXT',w,w,'2',
   '33333333-3333-4333-8333-333333333333',
   public.serien_smoke_state(w,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','wrong layout'));
 PERFORM public.serien_smoke_expect_error(
   'TEST_FAULT_AFTER_SNAPSHOT',w,w,'2',
   '44444444-4444-4444-8444-444444444444',s,'after_snapshot');
 PERFORM public.serien_smoke_expect_error(
   'TEST_FAULT_AFTER_RECEIPT',w,w,'2',
   '55555555-5555-4555-8555-555555555555',s,'after_receipt');
 -- A lost response: first request commits, client discards it; replay returns same receipt.
 IF public.serien_smoke_save_checkpoint(w,w,'2',
   '66666666-6666-4666-8666-666666666666',
   public.serien_smoke_state(w,w,'lost response'))->>'revision'<>'3'
 THEN RAISE EXCEPTION 'Lost response setup failed'; END IF;
 IF public.serien_smoke_save_checkpoint(w,w,'2',
   '66666666-6666-4666-8666-666666666666',
   public.serien_smoke_state(w,w,'lost response'))->>'revision'<>'3'
 THEN RAISE EXCEPTION 'Lost response replay failed'; END IF;
END $$;

-- Security checks under signed-in B, outsider, and missing user.
SET "request.jwt.claim.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $$
DECLARE a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
BEGIN
 PERFORM public.serien_smoke_expect_error('FORBIDDEN',b,a,'3',
  '77777777-7777-4777-8777-777777777777',
  public.serien_smoke_state(b,a,'other owner'));
 IF public.serien_smoke_save_checkpoint(b,b,'1',
   '88888888-8888-4888-8888-888888888888',
   public.serien_smoke_state(b,b,'B'))->>'revision'<>'2'
 THEN RAISE EXCEPTION 'B save failed'; END IF;
END $$;

SET "request.jwt.claim.sub"='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
SELECT public.serien_smoke_expect_error(
 'FORBIDDEN','cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','3',
 '99999999-9999-4999-8999-999999999999',
 public.serien_smoke_state(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','outsider'));

SET "request.jwt.claim.sub"='';
SELECT public.serien_smoke_expect_error(
 'UNAUTHORIZED','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','3',
 'aaaaaaaa-1111-4111-8111-111111111111',
 public.serien_smoke_state(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','missing jwt'));

RESET ROLE;

DO $$
BEGIN
 IF (SELECT count(*) FROM public.layout_snapshots WHERE
  owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>3 OR
    (SELECT count(*) FROM public.operation_receipts WHERE
  owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>2 OR
    (SELECT max(revision) FROM public.layout_snapshots WHERE
  owner_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>3 OR
    (SELECT count(*) FROM public.layout_snapshots WHERE
  owner_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')<>2
 THEN RAISE EXCEPTION 'Fault, replay, or invalid input wrote unexpected records';
 END IF;
END $$;

SELECT 'PASS: sequential CAS, same-ID replay, mismatch, rejection, both faults, lost response, A/B denial' AS result;
