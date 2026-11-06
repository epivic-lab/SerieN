-- OFFLINE ONLY. Run after 6b2c_rpc_gate.sql on a disposable PG17 database.
-- :state must come from gen-6b2c-fixture.mjs --with-loose, never production.
-- Roll back this probe so C/D concurrency and rollback fixtures keep R1.
BEGIN;
CREATE TEMP TABLE serien_e1_state(d jsonb NOT NULL);
INSERT INTO serien_e1_state VALUES (:'state'::jsonb);
GRANT SELECT ON serien_e1_state TO authenticated;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub"='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $e1$
DECLARE
 a constant uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 request constant uuid:='55555555-5555-4555-8555-555555555555';
 rejected_request constant uuid:='66666666-6666-4666-8666-666666666666';
 d jsonb; bad jsonb; j jsonb; result jsonb;
 collection text; path text[]; shifted jsonb; delta numeric; bound numeric;
BEGIN
 SELECT s.d INTO STRICT d FROM pg_temp.serien_e1_state s;
 IF pg_catalog.jsonb_array_length(d->'looseStock')<>1 THEN
  RAISE EXCEPTION 'E1_REQUIRES_REAL_CAPTURE_WITH_LOOSE';
 END IF;
 -- Positive control: complete, unmodified Capture R1 through the public RPC.
 result:=public.serien_save_checkpoint(a,a,'1',request,d::text);
 IF result->>'revision'<>'2' OR
    public.serien_read_snapshot(a,a,'2')->'state' IS DISTINCT FROM d
 THEN RAISE EXCEPTION 'E1_POSITIVE_CAPTURE_FAILED'; END IF;

 FOREACH collection IN ARRAY ARRAY['trains','looseStock'] LOOP
  path:=ARRAY[collection,'0','journey']; j:=d#>path;
  IF pg_catalog.jsonb_array_length(j->'segments')<2 THEN
   RAISE EXCEPTION 'E1_REQUIRES_MULTISEGMENT_CAPTURE'; END IF;
  -- Shift the suffix, preserving each edge ID and length: only continuity
  -- changes, so the old segment-length check cannot mask this rejection.
  FOREACH delta IN ARRAY ARRAY[1::numeric,-1::numeric] LOOP
   SELECT pg_catalog.jsonb_agg(
    CASE WHEN ord=1 THEN value ELSE
     value || pg_catalog.jsonb_build_object(
      'start',(value->>'start')::numeric+delta,
      'end',(value->>'end')::numeric+delta) END ORDER BY ord)
    INTO shifted
    FROM pg_catalog.jsonb_array_elements(j->'segments') WITH ORDINALITY AS s(value,ord);
   bad:=pg_catalog.jsonb_set(d,path||ARRAY['segments'],shifted);
   PERFORM public.serien_test_expect_error('INVALID_JOURNEY_CONTINUITY',
    'save',a,a,'2',rejected_request,bad::text);
  END LOOP;
  FOREACH delta IN ARRAY ARRAY[-0.0000001::numeric,0.0000001::numeric] LOOP
   bound:=CASE WHEN delta<0 THEN (j#>>'{segments,0,start}')::numeric
    ELSE (j->'segments'-> -1->>'end')::numeric END;
   bad:=pg_catalog.jsonb_set(d,path||ARRAY['position'],pg_catalog.to_jsonb(bound+delta));
   PERFORM public.serien_test_expect_error('INVALID_JOURNEY_POSITION',
    'save',a,a,'2',rejected_request,bad::text);
  END LOOP;
 END LOOP;
 IF public.serien_read_head(a,a)->>'revision'<>'2' THEN
  RAISE EXCEPTION 'E1_INVALID_SAVE_ADVANCED_HEAD'; END IF;
END $e1$;
RESET ROLE;
DO $rows$
BEGIN
 IF (SELECT count(*) FROM public.layout_snapshots)<>3 OR
    (SELECT count(*) FROM public.operation_receipts)<>3 THEN
  RAISE EXCEPTION 'E1_INVALID_SAVE_CREATED_ROWS'; END IF;
END $rows$;
SELECT 'PASS: E1 actual Capture R1 save/read + 8 targeted semantic rejections' AS result;
ROLLBACK;
