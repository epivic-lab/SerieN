-- 6B.2-C: Integration gate against isolated Supabase PG17, real 6B.1 DTO
-- and a synthetic replica of the REAL audited table columns/triggers/RLS.
-- Runs only in CI container, NO remote project.
CREATE TEMP TABLE serien_test_state(state_a text NOT NULL,state_b text);
INSERT INTO serien_test_state(state_a) VALUES (:'state');
UPDATE serien_test_state SET state_b=(
 pg_catalog.jsonb_set(
  pg_catalog.jsonb_set(state_a::jsonb,'{workspaceId}',
    '"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"'::jsonb),
  '{layoutId}',
    '"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"'::jsonb)
)::text;
GRANT SELECT ON serien_test_state TO authenticated;

-- Exception helper is INVOKER and exists ONLY in disposable test DB.
CREATE FUNCTION public.serien_test_expect_error(
 expected_message text,op text,ws uuid,lay uuid,expected_revision text,
 request_id uuid,doc text
) RETURNS void LANGUAGE plpgsql SET search_path='' AS $f$
DECLARE message text;
BEGIN
 BEGIN
   IF op='save' THEN
     PERFORM public.serien_save_checkpoint(ws,lay,expected_revision,request_id,doc);
   ELSIF op='head' THEN
     PERFORM public.serien_read_head(ws,lay);
   ELSIF op='snapshot' THEN
     PERFORM public.serien_read_snapshot(ws,lay,expected_revision);
   ELSIF op='open' THEN
     PERFORM public.serien_open_workspace();
   ELSE
     RAISE EXCEPTION 'TEST_UNKNOWN_OPERATION';
   END IF;
   RAISE EXCEPTION 'UNEXPECTED_SUCCESS';
 EXCEPTION WHEN OTHERS THEN
   GET STACKED DIAGNOSTICS message=MESSAGE_TEXT;
   IF message IS DISTINCT FROM expected_message THEN
     RAISE EXCEPTION 'Expected [%] got [%]',expected_message,message;
   END IF;
 END;
END $f$;
GRANT EXECUTE ON FUNCTION public.serien_test_expect_error(
 text,text,uuid,uuid,text,uuid,text) TO authenticated;

DO $f$
BEGIN
 IF has_table_privilege('authenticated','public.layouts','SELECT') OR
    has_table_privilege('authenticated','public.layouts','INSERT') OR
    has_table_privilege('authenticated','public.layout_snapshots','SELECT') OR
    has_table_privilege('authenticated','public.layout_snapshots','INSERT') OR
    has_table_privilege('authenticated','public.operation_receipts','SELECT') OR
    has_table_privilege('serien_rpc','public.layout_snapshots','UPDATE') OR
    has_table_privilege('serien_rpc','public.operation_receipts','DELETE') OR
    has_function_privilege('anon','public.serien_save_checkpoint(uuid,uuid,text,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Privilege breach'; END IF;
END $f$;

-- Exact 64MiB quota threshold is tested algebraically without writing 64MiB.
DO $quota$
BEGIN
 IF NOT serien_internal.serien_within_quota_v1(0,67108864)
  OR NOT serien_internal.serien_within_quota_v1(67108863,1)
  OR serien_internal.serien_within_quota_v1(1,67108864)
  OR serien_internal.serien_within_quota_v1(67108864,1)
  OR serien_internal.serien_within_quota_v1(-1,1)
 THEN RAISE EXCEPTION 'Owner quota boundary failed'; END IF;
END $quota$;

SET ROLE authenticated;
SET "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $f$
DECLARE a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 s text; initial jsonb; first jsonb; again jsonb; head jsonb; loaded jsonb;
BEGIN
 SELECT state_a INTO STRICT s FROM pg_temp.serien_test_state;
 initial:=public.serien_open_workspace();
 IF initial->>'workspaceId'<>a::text OR initial->>'layoutId'<>a::text
 THEN RAISE EXCEPTION 'Owner A bootstrap failed'; END IF;
 IF public.serien_open_workspace() IS DISTINCT FROM initial THEN
  RAISE EXCEPTION 'Bootstrap not idempotent'; END IF;
 head:=public.serien_read_head(a,a);
 IF head->>'revision'<>'0' THEN RAISE EXCEPTION 'New head not 0'; END IF;
 first:=public.serien_save_checkpoint(a,a,'0',
   '11111111-1111-4111-8111-111111111111',s);
 IF first->>'revision'<>'1' THEN RAISE EXCEPTION 'Wrong first revision'; END IF;
 head:=public.serien_read_head(a,a);
 IF head->>'revision'<>'1' OR
  head->>'snapshotId' IS DISTINCT FROM first->>'snapshotId' OR
  head->>'digest' IS DISTINCT FROM first->>'digest'
 THEN RAISE EXCEPTION 'ReadHead inconsistency'; END IF;
 loaded:=public.serien_read_snapshot(a,a,'1');
 IF loaded->>'digest' IS DISTINCT FROM first->>'digest' OR
    loaded->'state' IS DISTINCT FROM s::jsonb
 THEN RAISE EXCEPTION 'Snapshot is not exact restored DTO'; END IF;
 again:=public.serien_save_checkpoint(a,a,'0',
   '11111111-1111-4111-8111-111111111111',s);
 IF again IS DISTINCT FROM first THEN RAISE EXCEPTION 'Receipt replay drift'; END IF;
 PERFORM public.serien_test_expect_error('IDEMPOTENCY_KEY_REUSED','save',a,a,'0',
  '11111111-1111-4111-8111-111111111111',s||' ');
 PERFORM public.serien_test_expect_error('REVISION_CONFLICT','save',a,a,'0',
  '22222222-2222-4222-8222-222222222222',s);
 PERFORM public.serien_test_expect_error('INVALID_REVISION','save',a,a,'01',
  '33333333-3333-4333-8333-333333333333',s);
 PERFORM public.serien_test_expect_error('PAYLOAD_TOO_LARGE','save',a,a,'1',
  '33333333-3333-4333-8333-333333333333',
  pg_catalog.repeat('x',2097153));
 PERFORM public.serien_test_expect_error('INVALID_JSON','save',a,a,'1',
  '33333333-3333-4333-8333-333333333333',
  '{"a":{"z":1,"z":2}}');
 PERFORM public.serien_test_expect_error('INVALID_STATE_SCHEMA','save',a,a,'1',
  '33333333-3333-4333-8333-333333333333',
  pg_catalog.jsonb_set(s::jsonb,'{models,0,id}','"INVALID"'::jsonb)::text);
 PERFORM public.serien_test_expect_error('INVALID_STATE_CONTEXT','save',a,a,'1',
  '33333333-3333-4333-8333-333333333333',
  pg_catalog.jsonb_set(s::jsonb,'{layoutId}',
   '"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"'::jsonb)::text);
 PERFORM public.serien_test_expect_error('DUPLICATE_ITEM','save',a,a,'1',
  '33333333-3333-4333-8333-333333333333',
  pg_catalog.jsonb_set(s::jsonb,'{items,1,id}',
   (s::jsonb)#>'{items,0,id}')::text);
 PERFORM public.serien_test_expect_error('UNTRUSTED_ASSET_MANIFEST','save',a,a,'1',
  '33333333-3333-4333-8333-333333333333',
  pg_catalog.jsonb_set(s::jsonb,'{models,0,asset,digest}',
    pg_catalog.to_jsonb(pg_catalog.repeat('0',64)))::text);
 -- Functional R1 semantics not implicit in JSON Schema:
 -- storage is a FUTURE feature; selected LRU order, train-to-loco and
 -- native fallback model must match the actual 6B.1 validator.
 PERFORM public.serien_test_expect_error(
  'UNSUPPORTED_INVENTORY_STORAGE','save',a,a,'1',
  '33333333-3333-4333-8333-333333333333',
  pg_catalog.jsonb_set(s::jsonb,'{inventoryStorage}',
   pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'itemId',s::jsonb#>>'{items,0,id}','bayId',NULL)))::text);
 PERFORM public.serien_test_expect_error(
  'TRAIN_LOCO_IDENTITY_INVALID','save',a,a,'1',
  '33333333-3333-4333-8333-333333333333',
  pg_catalog.jsonb_set(s::jsonb,'{trains,0,id}',
   '"dddddddd-dddd-4ddd-8ddd-dddddddddddd"'::jsonb)::text);
 PERFORM public.serien_test_expect_error(
  'NATIVE_MODEL_MISSING','save',a,a,'1',
  '33333333-3333-4333-8333-333333333333',
  pg_catalog.jsonb_set(s::jsonb,'{items,0,nativeModelId}',
   '"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"'::jsonb)::text);
 PERFORM public.serien_test_expect_error(
  'INVALID_UI_LRU','save',a,a,'1',
  '33333333-3333-4333-8333-333333333333',
  pg_catalog.jsonb_set(
   pg_catalog.jsonb_set(s::jsonb,'{ui,recentTrainIds,0}',
      s::jsonb#>'{ui,recentTrainIds,1}'),
   '{ui,recentTrainIds,1}',
      s::jsonb#>'{ui,recentTrainIds,0}')::text);

END $f$;

SET "request.jwt.claim.sub"='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $f$
DECLARE a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; s text;
BEGIN
 SELECT state_b INTO STRICT s FROM pg_temp.serien_test_state;
 IF public.serien_open_workspace()->>'layoutId'<>b::text
 THEN RAISE EXCEPTION 'Owner B bootstrap failed'; END IF;
 PERFORM public.serien_test_expect_error('FORBIDDEN','head',b,a,'0',NULL,NULL);
 PERFORM public.serien_test_expect_error('FORBIDDEN','snapshot',b,a,'1',NULL,NULL);
 PERFORM public.serien_test_expect_error('INCOMPATIBLE_LAYOUT','save',b,a,'0',
  '44444444-4444-4444-8444-444444444444',s);
 IF public.serien_save_checkpoint(b,b,'0',
  '11111111-1111-4111-8111-111111111111',s)->>'revision'<>'1'
 THEN RAISE EXCEPTION 'B isolated save failed'; END IF;
END $f$;

SET "request.jwt.claim.sub"='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
SELECT public.serien_test_expect_error('FORBIDDEN','open',NULL,NULL,NULL,NULL,NULL);
SET "request.jwt.claim.sub"='';
SELECT public.serien_test_expect_error('FORBIDDEN','open',NULL,NULL,NULL,NULL,NULL);
RESET ROLE;

DO $f$
BEGIN
 IF (SELECT count(*) FROM public.layouts)<>2 OR
   (SELECT count(*) FROM public.layout_snapshots)<>2 OR
   (SELECT count(*) FROM public.operation_receipts)<>2
 THEN RAISE EXCEPTION 'Extra rows created on replay or invalid save'; END IF;
END $f$;
SELECT 'PASS: audited schema RPC candidate — owner, open, full DTO, save/load, replay, conflicts, invalid-input denial' AS result;
