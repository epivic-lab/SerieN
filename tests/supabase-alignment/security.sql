-- Disposable container only. Every synthetic row, test role and temporary grant
-- is rolled back. Production ACL checks run BEFORE the policy probe grants.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean, label text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF;
END $$;
CREATE FUNCTION pg_temp.must_fail(statement text, expected_state text, label text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE observed text;
BEGIN
 BEGIN
  EXECUTE statement;
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS observed=RETURNED_SQLSTATE;
 END;
 IF observed IS DISTINCT FROM expected_state THEN
  RAISE EXCEPTION 'FAIL: %, expected SQLSTATE %, observed %',label,expected_state,coalesce(observed,'SUCCESS');
 END IF;
END $$;

INSERT INTO auth.users VALUES
 ('00000000-0000-4000-8000-000000000001','owner-a@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000002','owner-b@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000003','outsider@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000004','unconfirmed@example.invalid',NULL);
INSERT INTO serien_access.allowed_emails(email) VALUES
 ('owner-a@example.invalid'),('owner-b@example.invalid'),('unconfirmed@example.invalid');
INSERT INTO public.stock_models(id,kind,name) VALUES
 ('00000000-0000-4000-8000-000000000101','locomotive','Synthetic locomotive'),
 ('00000000-0000-4000-8000-000000000102','wagon','Synthetic wagon');
INSERT INTO public.stock_items(id,owner_id,model_id) VALUES
 ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101'),
 ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102'),
 ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000102'),
 ('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000101'),
 ('00000000-0000-4000-8000-000000000212','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102'),
 ('00000000-0000-4000-8000-000000000213','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102');
INSERT INTO public.consists(id,owner_id,name) VALUES
 ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','A'),
 ('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000002','B'),
 ('00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000001','Empty draft');
INSERT INTO public.consist_members(consist_id,owner_id,stock_item_id,ordinal) VALUES
 ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000201',0),
 ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000202',1),
 ('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000211',0),
 ('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000212',1);
UPDATE public.consists SET status='ready' WHERE name IN ('A','B');
INSERT INTO public.layouts(id,owner_id,name,topology_hash) VALUES
 ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000001','A',repeat('a',64)),
 ('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000002','B',repeat('a',64));
INSERT INTO public.layout_segments(layout_id,edge_id,length_mm) VALUES
 ('00000000-0000-4000-8000-000000000401','T1',100),
 ('00000000-0000-4000-8000-000000000402','T1',100);
INSERT INTO public.layout_placements(consist_id,owner_id,layout_id,edge_id,s_mm,heading) VALUES
 ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000401','T1',20,1);
INSERT INTO public.loose_stock_placements(stock_item_id,owner_id,layout_id,edge_id,s_mm,heading) VALUES
 ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000401','T1',30,1);
INSERT INTO public.layout_snapshots(id,owner_id,layout_id,revision,payload) VALUES
 ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000401',1,
 jsonb_build_object('topologyHash',repeat('a',64),'resumePolicy','STOPPED','layout',jsonb_build_object('switches',
 '{"WX-A":false,"WX-B":false,"Y-IN":false,"Y-2":false,"Y-3":false,"Y-R1":false,"Y-R2":false,"Y-4":false}'::jsonb)));
INSERT INTO public.operation_receipts(owner_id,request_id,op_type,payload_digest) VALUES
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000601','synthetic',repeat('a',64));
SET CONSTRAINTS ALL IMMEDIATE;
SELECT 'PASS: positive synthetic fixtures and deferred ready constraints';

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(public.serien_access_allowed(),'allowlisted confirmed A');
SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
SELECT pg_temp.assert_true(public.serien_access_allowed(),'allowlisted confirmed B');
SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
SELECT pg_temp.assert_true(NOT public.serien_access_allowed(),'outsider denied');
SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000004';
SELECT pg_temp.assert_true(NOT public.serien_access_allowed(),'unconfirmed denied');
SET LOCAL request.jwt.claim.sub='';
SELECT pg_temp.assert_true(NOT public.serien_access_allowed(),'missing identity denied');
SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
SELECT pg_temp.must_fail('SELECT * FROM public.layouts','42501','even own direct SELECT denied');
SELECT pg_temp.must_fail('INSERT INTO public.layouts(name,topology_hash) VALUES (''x'',repeat(''a'',64))','42501','direct INSERT denied');
SELECT pg_temp.must_fail('UPDATE public.layouts SET name=''x''','42501','direct UPDATE denied');
SELECT pg_temp.must_fail('DELETE FROM public.layouts','42501','direct DELETE denied');
SELECT pg_temp.must_fail('SELECT * FROM serien_access.allowed_emails','42501','private allowlist denied');
SELECT pg_temp.must_fail('SELECT serien_internal.assert_ready_consist(NULL)','42501','private helper denied');
SET LOCAL ROLE anon;
SELECT pg_temp.must_fail('SELECT public.serien_access_allowed()','42501','anonymous RPC denied');
SELECT pg_temp.must_fail('SELECT * FROM public.stock_models','42501','anonymous catalog denied');
RESET ROLE;
SELECT 'PASS: gate positive/negative identities and unchanged direct client denials';

SELECT pg_temp.must_fail('UPDATE public.consists SET status=''ready'' WHERE id=''00000000-0000-4000-8000-000000000303''','23514','empty ready denied');
SELECT pg_temp.must_fail('UPDATE public.consist_members SET ordinal=2 WHERE stock_item_id=''00000000-0000-4000-8000-000000000202''','23514','ready ordinal gap denied');
SELECT pg_temp.must_fail('INSERT INTO public.consist_members VALUES (''00000000-0000-4000-8000-000000000303'',''00000000-0000-4000-8000-000000000002'',''00000000-0000-4000-8000-000000000213'',0,1)','23514','wagon cannot be first member');
SELECT pg_temp.must_fail('INSERT INTO public.consist_members VALUES (''00000000-0000-4000-8000-000000000303'',''00000000-0000-4000-8000-000000000001'',''00000000-0000-4000-8000-000000000213'',1,1)','23503','cross-owner FK denied');
SELECT pg_temp.must_fail('INSERT INTO public.consist_members VALUES (''00000000-0000-4000-8000-000000000303'',''00000000-0000-4000-8000-000000000001'',''00000000-0000-4000-8000-000000000202'',1,1)','23505','same stock in two consists denied');
SELECT pg_temp.must_fail('INSERT INTO public.consist_members VALUES (''00000000-0000-4000-8000-000000000303'',''00000000-0000-4000-8000-000000000001'',''00000000-0000-4000-8000-000000000201'',1,1)','23514','locomotive after position zero denied');
SELECT pg_temp.must_fail('INSERT INTO public.consist_members VALUES (''00000000-0000-4000-8000-000000000303'',''00000000-0000-4000-8000-000000000001'',''00000000-0000-4000-8000-000000000203'',1,1)','23514','loose stock assigned to consist denied');
SELECT pg_temp.must_fail('UPDATE public.stock_models SET kind=''wagon'' WHERE id=''00000000-0000-4000-8000-000000000101''','23514','used model identity locked');
SELECT 'PASS: ready completeness, ownership FK, uniqueness, assignment and model identity';

SELECT pg_temp.must_fail('UPDATE public.layout_placements SET edge_id=''missing''','23514','unknown edge denied');
SELECT pg_temp.must_fail('UPDATE public.layout_placements SET s_mm=101','23514','past edge length denied');
SELECT pg_temp.must_fail('UPDATE public.layout_placements SET s_mm=-1','23514','negative position denied');
SELECT pg_temp.must_fail('UPDATE public.layout_placements SET heading=0','23514','invalid heading denied');
SELECT pg_temp.must_fail('INSERT INTO public.layout_placements(consist_id,owner_id,layout_id,edge_id,s_mm,heading) VALUES (''00000000-0000-4000-8000-000000000303'',''00000000-0000-4000-8000-000000000001'',''00000000-0000-4000-8000-000000000401'',''T1'',0,1)','23514','draft placement denied');
SELECT pg_temp.must_fail('INSERT INTO public.loose_stock_placements(stock_item_id,owner_id,layout_id,edge_id,s_mm,heading) VALUES (''00000000-0000-4000-8000-000000000202'',''00000000-0000-4000-8000-000000000001'',''00000000-0000-4000-8000-000000000401'',''T1'',0,1)','23514','member cannot also be loose');
SELECT pg_temp.must_fail('UPDATE public.layout_snapshots SET payload=jsonb_set(payload,''{topologyHash}'',''"wrong"'')','23514','wrong topology denied');
SELECT pg_temp.must_fail('UPDATE public.layout_snapshots SET payload=jsonb_set(payload,''{resumePolicy}'',''"RUNNING"'')','23514','unsafe resume denied');
SELECT pg_temp.must_fail('UPDATE public.layout_snapshots SET payload=payload #- ''{layout,switches,Y-4}''','23514','missing switch denied');
SELECT pg_temp.must_fail('UPDATE public.layout_snapshots SET payload=jsonb_set(payload,''{layout,switches,Y-4}'',''1'')','23514','nonboolean switch denied');
SELECT pg_temp.must_fail('INSERT INTO public.layout_snapshots(owner_id,layout_id,revision,payload) SELECT owner_id,layout_id,revision,payload FROM public.layout_snapshots','23505','duplicate revision denied');
SELECT 'PASS: placement, snapshot topology, STOPPED, eight boolean switches and revisions';

-- Exercise RLS predicates that are otherwise unreachable because real client
-- table grants are revoked. These extra grants/role exist ONLY in this transaction.
CREATE ROLE s2_policy_probe NOLOGIN INHERIT NOBYPASSRLS;
GRANT authenticated TO s2_policy_probe;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO s2_policy_probe;
GRANT USAGE ON SCHEMA serien_internal TO s2_policy_probe;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA serien_internal TO s2_policy_probe;
SET LOCAL ROLE s2_policy_probe;
SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user),'probe does not bypass RLS');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.stock_models)=2,'shared catalog');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.stock_items)=3,'stock owner filter');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.consists)=2,'consists owner filter');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.consist_members)=2,'members owner filter');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.layouts)=1,'layouts owner filter');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.layout_segments)=1,'segments derived owner filter');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.layout_placements)=1,'placements owner filter');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.loose_stock_placements)=1,'loose owner filter');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.layout_snapshots)=1,'snapshots owner filter');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.operation_receipts)=1,'receipts owner filter');
WITH changed AS (UPDATE public.consists SET name='intrusion' WHERE id='00000000-0000-4000-8000-000000000302' RETURNING *)
 SELECT pg_temp.assert_true(count(*)=0,'cross-owner UPDATE cannot see row') FROM changed;
SELECT pg_temp.must_fail('UPDATE public.stock_items SET owner_id=''00000000-0000-4000-8000-000000000002'' WHERE id=''00000000-0000-4000-8000-000000000203''','42501','WITH CHECK prevents ownership transfer');
INSERT INTO public.consists(id,name) VALUES('00000000-0000-4000-8000-000000000311','Positive owner write');
DELETE FROM public.consists WHERE id='00000000-0000-4000-8000-000000000311';
SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
SELECT pg_temp.assert_true((SELECT count(*) FROM public.consists)=1,'B sees only B');
SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
SELECT pg_temp.assert_true((SELECT count(*) FROM public.stock_models)=0,'restrictive gate blocks global catalog');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.layouts)=0,'outsider sees no layouts');
SELECT pg_temp.must_fail('INSERT INTO public.layouts(name,topology_hash) VALUES(''outsider'',repeat(''a'',64))','42501','restrictive gate denies owned insert');
RESET ROLE;
DELETE FROM serien_access.allowed_emails WHERE email='owner-a@example.invalid';
SET LOCAL ROLE s2_policy_probe;
SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true(NOT public.serien_access_allowed(),'allowlist revocation takes effect');
SELECT pg_temp.assert_true((SELECT count(*) FROM public.layouts)=0,'revoked owner sees no layouts');
RESET ROLE;
SELECT 'PASS: isolated policy probe across all ten tables, WITH CHECK, two owners and revocation';
ROLLBACK;
